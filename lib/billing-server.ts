import type { User } from "@supabase/supabase-js";
import type { createAdminClient } from "./supabase";
import {
  cancelSubscription,
  createCheckoutLink,
  createPaymentPlan,
  findActiveSubscriptionIds,
  findSubscriptionId,
  verifyByReference,
  verifyTransaction,
  type FlwTransaction,
} from "./flutterwave";
import {
  chargeProblem,
  formatMoney,
  matchRenewal,
  newTxRef,
  PURCHASABLE_KINDS,
  type Currency,
  type PurchasableKind,
} from "./billing";
import { sendEmail } from "./email";
import { BASE_PATH, SITE_URL } from "./seo";

// Server-side billing flows. Everything here runs with the service-role
// client; callers authenticate the request first. Money-moving decisions are
// made in SQL (fulfil_subscription_order, record_renewal) so they're atomic
// and idempotent; this module talks to Flutterwave and decides what to call.

type AdminClient = ReturnType<typeof createAdminClient>;

/** Public base URL for links sent to Flutterwave and in emails. */
export function appUrl(): string {
  return (process.env.APP_URL || `${SITE_URL}${BASE_PATH}`).replace(/\/+$/, "");
}

const KIND_LABEL: Record<PurchasableKind, string> = {
  cohort_group: "Group classes",
  cohort_1on1: "1-on-1 classes",
};

export class CheckoutError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

// ─── Checkout ───

export async function startCheckout(
  admin: AdminClient,
  user: User,
  input: { courseId: string; kind: string; currency: Currency }
): Promise<{ link: string; txRef: string }> {
  if (!(PURCHASABLE_KINDS as readonly string[]).includes(input.kind)) {
    throw new CheckoutError("That option can't be bought online yet.", 400);
  }
  const kind = input.kind as PurchasableKind;
  if (!user.email) throw new CheckoutError("Your account has no email address.", 400);

  const [{ data: course }, { data: offering }, { data: profile }] = await Promise.all([
    admin.from("courses").select("id, title, is_published").eq("id", input.courseId).maybeSingle(),
    admin
      .from("offerings")
      .select("id, kind, price_usd, price_ngn, is_active")
      .eq("course_id", input.courseId)
      .eq("kind", kind)
      .maybeSingle(),
    admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);
  if (!course?.is_published) throw new CheckoutError("Course not found.", 404);
  if (!offering?.is_active) throw new CheckoutError("That option isn't on sale right now.", 409);

  await assertNoCurrentAccess(admin, user.id, input.courseId);

  const amount = Number(input.currency === "NGN" ? offering.price_ngn : offering.price_usd);
  if (!(amount > 0)) throw new CheckoutError("That option has no price set yet. Please contact us.", 409);

  const plan = await getOrCreatePlan(admin, {
    offeringId: offering.id,
    currency: input.currency,
    amount,
    name: `${course.title} – ${KIND_LABEL[kind]} (${input.currency})`,
  });

  const txRef = newTxRef();
  const { data: order, error } = await admin
    .from("orders")
    .insert({
      user_id: user.id,
      customer_email: user.email,
      kind: "subscription",
      course_id: course.id,
      offering_id: offering.id,
      plan_id: plan.id,
      currency: input.currency,
      amount,
      tx_ref: txRef,
    })
    .select("id")
    .single();
  if (error || !order) throw new Error(`Couldn't create order: ${error?.message}`);

  try {
    const link = await createCheckoutLink({
      txRef,
      amount,
      currency: input.currency,
      redirectUrl: `${appUrl()}/checkout/complete`,
      customer: { email: user.email, name: profile?.full_name },
      paymentPlan: plan.flw_plan_id,
      title: course.title,
      description: `${KIND_LABEL[kind]}, billed monthly`,
      meta: { order_id: order.id, course_id: course.id },
    });
    return { link, txRef };
  } catch (err) {
    await admin
      .from("orders")
      .update({ status: "failed", failure_reason: (err as Error).message, updated_at: new Date().toISOString() })
      .eq("id", order.id);
    throw new CheckoutError("We couldn't start the payment. Please try again in a moment.", 502);
  }
}

/** Refuse a checkout for someone who already has a seat in the course. */
async function assertNoCurrentAccess(admin: AdminClient, userId: string, courseId: string) {
  const { data: enrollment } = await admin
    .from("enrollments")
    .select("source")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (!enrollment) return;
  if (enrollment.source !== "subscription") {
    throw new CheckoutError("You're already enrolled in this course.", 409);
  }
  const { count } = await admin
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .in("status", ["active", "past_due"]);
  if (count) throw new CheckoutError("You already have an active subscription for this course.", 409);
}

async function getOrCreatePlan(
  admin: AdminClient,
  input: { offeringId: string; currency: Currency; amount: number; name: string }
): Promise<{ id: string; flw_plan_id: number }> {
  const find = () =>
    admin
      .from("payment_plans")
      .select("id, flw_plan_id")
      .eq("offering_id", input.offeringId)
      .eq("currency", input.currency)
      .eq("amount", input.amount)
      .eq("interval", "monthly")
      .maybeSingle();

  const { data: existing } = await find();
  if (existing) return existing;

  const flwPlanId = await createPaymentPlan({
    name: input.name,
    amount: input.amount,
    currency: input.currency,
    interval: "monthly",
  });
  const { data, error } = await admin
    .from("payment_plans")
    .insert({
      offering_id: input.offeringId,
      currency: input.currency,
      amount: input.amount,
      interval: "monthly",
      flw_plan_id: flwPlanId,
    })
    .select("id, flw_plan_id")
    .single();
  if (data) return data;
  // Two checkouts raced to create the plan; use the one that won. The extra
  // Flutterwave plan is unused and harmless.
  if (error?.code === "23505") {
    const { data: winner } = await find();
    if (winner) return winner;
  }
  throw new Error(`Couldn't save payment plan: ${error?.message}`);
}

// ─── Processing charges (webhook, redirect, cron) ───

export type ChargeOutcome =
  | "enrolled"
  | "reactivated"
  | "already_enrolled"
  | "duplicate"
  | "refunded"
  | "renewed"
  | "failed"
  | "rejected"
  | "unmatched"
  | "ignored";

/**
 * Re-verify a Flutterwave transaction and apply it: a first charge for one of
 * our checkouts, a renewal of a subscription, or a failed charge. Safe to call
 * any number of times for the same transaction. Throws only on errors worth
 * retrying (e.g. Flutterwave unreachable).
 */
export async function processCharge(
  admin: AdminClient,
  transactionId: number | string,
  context: { event: string; payload: unknown }
): Promise<{ outcome: ChargeOutcome; detail?: string }> {
  const tx = await verifyTransaction(transactionId);
  const result = await applyTransaction(admin, tx);
  await logEvent(admin, { event: context.event, tx, payload: context.payload, ...result });
  return result;
}

async function applyTransaction(
  admin: AdminClient,
  tx: FlwTransaction
): Promise<{ outcome: ChargeOutcome; detail?: string }> {
  const { data: order } = await admin.from("orders").select("*").eq("tx_ref", tx.tx_ref).maybeSingle();
  if (order) return applyFirstCharge(admin, order, tx);
  return applyRenewal(admin, tx);
}

interface OrderRow {
  id: string;
  user_id: string | null;
  customer_email: string;
  kind: string;
  course_id: string;
  status: string;
  currency: string;
  amount: number | string;
  tx_ref: string;
  is_renewal: boolean;
}

async function applyFirstCharge(admin: AdminClient, order: OrderRow, tx: FlwTransaction) {
  if (order.kind !== "subscription" || order.is_renewal) {
    return { outcome: "ignored" as const, detail: `Order kind ${order.kind}` };
  }

  if (tx.status !== "successful") {
    if (order.status === "pending") {
      await admin
        .from("orders")
        .update({
          status: tx.status === "cancelled" ? "cancelled" : "failed",
          failure_reason: `Flutterwave status: ${tx.status}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id)
        .eq("status", "pending");
    }
    return { outcome: "failed" as const, detail: tx.status };
  }

  const problem = chargeProblem(order, tx);
  if (problem) {
    await admin
      .from("orders")
      .update({ failure_reason: problem, updated_at: new Date().toISOString() })
      .eq("id", order.id);
    console.error("Rejected charge", tx.id, problem);
    return { outcome: "rejected" as const, detail: problem };
  }

  const { data, error } = await admin.rpc("fulfil_subscription_order", {
    p_tx_ref: order.tx_ref,
    p_flw_transaction_id: tx.id,
    p_amount_paid: tx.amount,
    p_paid_at: tx.created_at || new Date().toISOString(),
  });
  if (error) throw new Error(`fulfil_subscription_order failed: ${error.message}`);
  const result = data as { outcome: ChargeOutcome; subscription_id?: string };

  if (result.subscription_id && result.outcome !== "duplicate" && result.outcome !== "refunded") {
    let flwSubId: number | null = null;
    try {
      flwSubId = await findSubscriptionId(tx.id);
    } catch (err) {
      console.error("Subscription lookup failed", tx.id, err);
    }
    if (flwSubId) {
      await admin.from("subscriptions").update({ flw_subscription_id: flwSubId }).eq("id", result.subscription_id);
    }

    if (result.outcome === "already_enrolled") {
      // They already had a seat: stop future charges straight away. The
      // first charge needs a manual refund (admin → Payments).
      if (flwSubId) {
        try {
          await cancelSubscription(flwSubId);
        } catch (err) {
          console.error("Cancelling duplicate subscription failed", flwSubId, err);
          return { outcome: result.outcome, detail: "Already had access; cancel the new subscription and refund the charge" };
        }
      } else {
        return { outcome: result.outcome, detail: "Already had access; cancel the new subscription in Flutterwave and refund the charge" };
      }
      return { outcome: result.outcome, detail: "Already had access; subscription cancelled, refund the charge" };
    }

    await sendReceipt(admin, {
      email: order.customer_email,
      userId: order.user_id,
      courseId: order.course_id,
      amount: tx.amount,
      currency: tx.currency,
      first: true,
    });
  }
  return { outcome: result.outcome };
}

interface SubscriptionRow {
  id: string;
  user_id: string | null;
  course_id: string;
  first_tx_ref: string;
  currency: string;
  amount: number | string;
  current_period_end: string;
  customer_email: string;
  status: string;
}

async function applyRenewal(admin: AdminClient, tx: FlwTransaction) {
  const email = tx.customer?.email?.toLowerCase();
  if (!email) return { outcome: "unmatched" as const, detail: "No customer email" };

  const { data: candidates } = await admin
    .from("subscriptions")
    .select("id, user_id, course_id, first_tx_ref, currency, amount, current_period_end, customer_email, status")
    .eq("customer_email", email)
    .in("status", ["active", "past_due"]);
  const sub = matchRenewal((candidates ?? []) as SubscriptionRow[], tx);
  if (!sub) {
    return { outcome: "unmatched" as const, detail: `No live ${tx.currency} ${tx.amount} subscription for ${email}` };
  }

  if (tx.status !== "successful") {
    await admin
      .from("subscriptions")
      .update({ status: "past_due", updated_at: new Date().toISOString() })
      .eq("id", sub.id)
      .eq("status", "active");
    return { outcome: "failed" as const, detail: `Renewal ${tx.status}; subscription past due` };
  }

  const { data, error } = await admin.rpc("record_renewal", {
    p_subscription_id: sub.id,
    p_tx_ref: tx.tx_ref,
    p_flw_transaction_id: tx.id,
    p_amount_paid: tx.amount,
    p_paid_at: tx.created_at || new Date().toISOString(),
  });
  if (error) throw new Error(`record_renewal failed: ${error.message}`);
  const outcome = (data as { outcome: ChargeOutcome }).outcome;

  if (outcome === "renewed") {
    await sendReceipt(admin, {
      email: sub.customer_email,
      userId: sub.user_id,
      courseId: sub.course_id,
      amount: tx.amount,
      currency: tx.currency,
      first: false,
    });
  }
  return { outcome };
}

/** `subscription.cancelled` from Flutterwave (customer, card failures or us). */
export async function applySubscriptionCancelled(
  admin: AdminClient,
  data: { plan?: { id?: number }; customer?: { email?: string; customer_email?: string } },
  payload: unknown
): Promise<{ outcome: string; detail?: string }> {
  const email = (data.customer?.email || data.customer?.customer_email || "").toLowerCase();
  const planId = data.plan?.id;
  let outcome = "unmatched";
  let detail: string | undefined;

  if (email && planId) {
    const { data: plan } = await admin.from("payment_plans").select("id").eq("flw_plan_id", planId).maybeSingle();
    if (plan) {
      const { data: updated } = await admin
        .from("subscriptions")
        .update({
          status: "cancelled",
          cancel_at_period_end: true,
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("plan_id", plan.id)
        .eq("customer_email", email)
        .in("status", ["active", "past_due"])
        .select("id");
      outcome = updated?.length ? "cancelled" : "already_cancelled";
    } else {
      detail = `Unknown plan ${planId}`;
    }
  }

  await admin.from("payment_events").insert({
    event: "subscription.cancelled",
    outcome,
    detail: detail ?? null,
    payload: payload as object,
  });
  return { outcome, detail };
}

async function logEvent(
  admin: AdminClient,
  e: { event: string; tx: FlwTransaction; payload: unknown; outcome: string; detail?: string }
) {
  const { error } = await admin.from("payment_events").insert({
    event: e.event,
    flw_transaction_id: e.tx.id,
    tx_ref: e.tx.tx_ref,
    outcome: e.outcome,
    detail: e.detail ?? null,
    payload: (e.payload ?? null) as object,
  });
  if (error) console.error("payment_events insert failed:", error.message);
}

// ─── Cancellation ───

/**
 * Stop future charges for a subscription. The learner keeps their seat until
 * the end of the period they've paid for. Throws if Flutterwave can't be
 * told, so we never show "cancelled" while the card keeps being charged.
 */
export async function cancelSubscriptionById(admin: AdminClient, subscriptionId: string): Promise<boolean> {
  const { data: sub } = await admin
    .from("subscriptions")
    .select("id, status, flw_subscription_id, customer_email, first_tx_ref, payment_plans(flw_plan_id)")
    .eq("id", subscriptionId)
    .maybeSingle();
  if (!sub || (sub.status !== "active" && sub.status !== "past_due")) return false;

  let flwIds: number[] = sub.flw_subscription_id ? [Number(sub.flw_subscription_id)] : [];
  if (flwIds.length === 0) {
    const { data: first } = await admin
      .from("orders")
      .select("flw_transaction_id")
      .eq("tx_ref", sub.first_tx_ref)
      .maybeSingle();
    const viaTx = first?.flw_transaction_id ? await findSubscriptionId(Number(first.flw_transaction_id)) : null;
    if (viaTx) flwIds = [viaTx];
  }
  const plan = (sub as unknown as { payment_plans: { flw_plan_id: number } | null }).payment_plans;
  if (flwIds.length === 0 && plan) {
    flwIds = await findActiveSubscriptionIds(sub.customer_email, plan.flw_plan_id);
  }
  for (const id of flwIds) await cancelSubscription(id);

  const { error } = await admin
    .from("subscriptions")
    .update({
      status: "cancelled",
      cancel_at_period_end: true,
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...(flwIds[0] && !sub.flw_subscription_id ? { flw_subscription_id: flwIds[0] } : {}),
    })
    .eq("id", sub.id);
  if (error) throw new Error(`Couldn't mark subscription cancelled: ${error.message}`);
  return true;
}

/** When a cohort finishes, its members' subscriptions stop billing. */
export async function cancelCohortSubscriptions(
  admin: AdminClient,
  cohortId: string
): Promise<{ cancelled: number; failed: number }> {
  const { data: rows } = await admin
    .from("enrollments")
    .select("subscription_id")
    .eq("cohort_id", cohortId)
    .eq("source", "subscription")
    .not("subscription_id", "is", null);
  let cancelled = 0;
  let failed = 0;
  for (const r of rows ?? []) {
    try {
      if (await cancelSubscriptionById(admin, r.subscription_id as string)) cancelled++;
    } catch (err) {
      failed++;
      console.error("Cohort subscription cancel failed", r.subscription_id, err);
    }
  }
  return { cancelled, failed };
}

// ─── Daily job ───

/**
 * Expire lapsed subscriptions (pausing their seats) and re-check checkouts
 * still pending after 15 minutes, in case a webhook was missed.
 */
export async function runDailyBilling(admin: AdminClient, now = new Date()) {
  const { data: expired, error } = await admin.rpc("expire_subscriptions", { p_now: now.toISOString() });
  if (error) throw new Error(`expire_subscriptions failed: ${error.message}`);

  const { data: pending } = await admin
    .from("orders")
    .select("id, tx_ref")
    .eq("status", "pending")
    .lt("created_at", new Date(now.getTime() - 15 * 60 * 1000).toISOString())
    .gt("created_at", new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString())
    .limit(50);

  let reconciled = 0;
  for (const o of pending ?? []) {
    try {
      const tx = await verifyByReference(o.tx_ref);
      if (tx) {
        await processCharge(admin, tx.id, { event: "cron.reconcile", payload: { tx_ref: o.tx_ref } });
        reconciled++;
      }
    } catch (err) {
      console.error("Reconcile failed", o.tx_ref, err);
    }
  }

  // Abandoned checkouts older than three days.
  await admin
    .from("orders")
    .update({ status: "cancelled", failure_reason: "Checkout abandoned", updated_at: now.toISOString() })
    .eq("status", "pending")
    .lt("created_at", new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString());

  return { expired: Number(expired ?? 0), reconciled };
}

// ─── Receipts ───

async function sendReceipt(
  admin: AdminClient,
  r: { email: string; userId: string | null; courseId: string; amount: number; currency: string; first: boolean }
) {
  const [{ data: course }, { data: profile }] = await Promise.all([
    admin.from("courses").select("title").eq("id", r.courseId).maybeSingle(),
    r.userId
      ? admin.from("profiles").select("full_name").eq("id", r.userId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const title = course?.title ?? r.courseId;
  const name = profile?.full_name?.split(" ")[0];
  const paid = formatMoney(r.amount, r.currency);

  await sendEmail({
    to: r.email,
    toName: profile?.full_name,
    subject: r.first ? `You're enrolled: ${title}` : `Payment received: ${title}`,
    paragraphs: [
      `Hi${name ? ` ${name}` : ""},`,
      r.first
        ? `Thanks for joining ${title}. We received your payment of ${paid}. Your subscription renews monthly and you can cancel any time from your dashboard.`
        : `We received your monthly payment of ${paid} for ${title}. Thank you!`,
      r.first
        ? "We'll place you in a class group shortly and your schedule will appear in your dashboard."
        : "Your classes continue as normal.",
      `Dashboard: ${appUrl()}/dashboard/billing`,
      "Code Illustrated",
    ],
  });
}
