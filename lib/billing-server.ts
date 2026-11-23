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
  checkoutAmount,
  newCertificateCode,
  formatMoney,
  intervalNoun,
  matchRenewal,
  newTxRef,
  PURCHASABLE_KINDS,
  SUBSCRIPTION_GRACE_DAYS,
  type BillingInterval,
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
  self_paced: "Self-paced",
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
  input: { courseId: string; kind: string; currency: Currency; interval?: BillingInterval }
): Promise<{ link: string; txRef: string }> {
  if (!(PURCHASABLE_KINDS as readonly string[]).includes(input.kind)) {
    throw new CheckoutError("That option can't be bought online yet.", 400);
  }
  const kind = input.kind as PurchasableKind;
  const interval = input.interval ?? "monthly";
  if (interval === "yearly" && kind !== "self_paced") {
    throw new CheckoutError("Live classes are billed monthly.", 400);
  }
  if (!user.email) throw new CheckoutError("Your account has no email address.", 400);

  const [{ data: course }, { data: offering }, { data: profile }] = await Promise.all([
    admin.from("courses").select("id, title, is_published").eq("id", input.courseId).maybeSingle(),
    admin
      .from("offerings")
      .select("id, kind, price_usd, price_ngn, yearly_price_usd, yearly_price_ngn, is_active")
      .eq("course_id", input.courseId)
      .eq("kind", kind)
      .maybeSingle(),
    admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);
  if (!course?.is_published) throw new CheckoutError("Course not found.", 404);
  if (!offering?.is_active) throw new CheckoutError("That option isn't on sale right now.", 409);

  await assertNoCurrentAccess(admin, user.id, input.courseId);

  const amount = checkoutAmount(offering, input.currency, interval);
  if (amount === null) throw new CheckoutError("That option has no price set yet. Please contact us.", 409);

  const plan = await getOrCreatePlan(admin, {
    offeringId: offering.id,
    currency: input.currency,
    amount,
    interval,
    name: `${course.title} – ${KIND_LABEL[kind]}, ${interval} (${input.currency})`,
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
      description: `${KIND_LABEL[kind]}, billed ${interval}`,
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
  input: { offeringId: string; currency: Currency; amount: number; interval: BillingInterval; name: string }
): Promise<{ id: string; flw_plan_id: number }> {
  const find = () =>
    admin
      .from("payment_plans")
      .select("id, flw_plan_id")
      .eq("offering_id", input.offeringId)
      .eq("currency", input.currency)
      .eq("amount", input.amount)
      .eq("interval", input.interval)
      .maybeSingle();

  const { data: existing } = await find();
  if (existing) return existing;

  const flwPlanId = await createPaymentPlan({
    name: input.name,
    amount: input.amount,
    currency: input.currency,
    interval: input.interval,
  });
  const { data, error } = await admin
    .from("payment_plans")
    .insert({
      offering_id: input.offeringId,
      currency: input.currency,
      amount: input.amount,
      interval: input.interval,
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
  | "issued"
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
  if ((order.kind !== "subscription" && order.kind !== "one_off") || order.is_renewal) {
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

  if (order.kind === "one_off") return applyCertificateCharge(admin, order, tx);

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
      subscriptionId: result.subscription_id,
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

async function applyCertificateCharge(admin: AdminClient, order: OrderRow, tx: FlwTransaction) {
  const { data, error } = await admin.rpc("fulfil_certificate_order", {
    p_tx_ref: order.tx_ref,
    p_flw_transaction_id: tx.id,
    p_amount_paid: tx.amount,
    p_paid_at: tx.created_at || new Date().toISOString(),
    p_code: newCertificateCode(),
  });
  if (error) throw new Error(`fulfil_certificate_order failed: ${error.message}`);
  const result = data as { outcome: ChargeOutcome; code?: string };

  if (result.outcome === "issued" && result.code) {
    const { title, profile, name } = await subscriberDetails(admin, order.course_id, order.user_id);
    await sendEmail({
      to: order.customer_email,
      toName: profile?.full_name,
      subject: `Your certificate is ready: ${title}`,
      paragraphs: [
        `Hi${name ? ` ${name}` : ""},`,
        `Congratulations on completing ${title}! We received your payment of ${formatMoney(tx.amount, tx.currency)} and your certificate is ready.`,
        `View and download it: ${appUrl()}/certificates/${result.code}`,
        "Code Illustrated",
      ],
    });
  }
  return { outcome: result.outcome };
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
    const { data: nowPastDue } = await admin
      .from("subscriptions")
      .update({ status: "past_due", updated_at: new Date().toISOString() })
      .eq("id", sub.id)
      .eq("status", "active")
      .select("id");
    // Only on the first failure, not on every retry.
    if (nowPastDue?.length) await sendPaymentFailedNotice(admin, sub);
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
      subscriptionId: sub.id,
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
  // Read before expiring, so the notice goes only to people who were still paying.
  const graceCutoff = new Date(now.getTime() - SUBSCRIPTION_GRACE_DAYS * DAY_MS).toISOString();
  const { data: ending } = await admin
    .from("subscriptions")
    .select(SUBSCRIBER_FIELDS)
    .in("status", ["active", "past_due"])
    .lt("current_period_end", graceCutoff);

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

  for (const sub of (ending ?? []) as unknown as Subscriber[]) {
    await sendExpiredNotice(admin, sub);
  }
  const reminders = await sendYearlyReminders(admin, now);

  return { expired: Number(expired ?? 0), reconciled, reminders };
}

// ─── Receipts ───

const DAY_MS = 24 * 60 * 60 * 1000;
const YEARLY_REMINDER_DAYS = 7;
const SUBSCRIBER_FIELDS = "id, user_id, course_id, customer_email, current_period_end";

interface Subscriber {
  id: string;
  user_id: string | null;
  course_id: string;
  customer_email: string;
  current_period_end: string;
}

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

async function subscriberDetails(admin: AdminClient, courseId: string, userId: string | null) {
  const [{ data: course }, { data: profile }] = await Promise.all([
    admin.from("courses").select("title").eq("id", courseId).maybeSingle(),
    userId ? admin.from("profiles").select("full_name").eq("id", userId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return { title: course?.title ?? courseId, profile, name: profile?.full_name?.split(" ")[0] as string | undefined };
}

async function notify(admin: AdminClient, sub: Subscriber, subject: (title: string) => string, body: (title: string) => string[]) {
  const { title, profile, name } = await subscriberDetails(admin, sub.course_id, sub.user_id);
  return sendEmail({
    to: sub.customer_email,
    toName: profile?.full_name,
    subject: subject(title),
    paragraphs: [`Hi${name ? ` ${name}` : ""},`, ...body(title), `Dashboard: ${appUrl()}/dashboard/billing`, "Code Illustrated"],
  });
}

function sendPaymentFailedNotice(admin: AdminClient, sub: Subscriber) {
  return notify(
    admin,
    sub,
    (title) => `Your payment for ${title} didn't go through`,
    (title) => [
      `We couldn't take your latest payment for ${title}, so please check your card with your bank.`,
      `We'll keep your access for ${SUBSCRIPTION_GRACE_DAYS} days after ${longDate(sub.current_period_end)} while the payment is retried.`,
    ]
  );
}

function sendExpiredNotice(admin: AdminClient, sub: Subscriber) {
  return notify(
    admin,
    sub,
    (title) => `Your subscription to ${title} has ended`,
    (title) => [
      `Your subscription to ${title} has ended because we couldn't take payment.`,
      "Your progress is saved. Subscribe again from the course page and you'll pick up where you left off.",
    ]
  );
}

/** One reminder per renewal, about a week before a yearly charge. */
async function sendYearlyReminders(admin: AdminClient, now: Date): Promise<number> {
  const { data } = await admin
    .from("subscriptions")
    .select(`${SUBSCRIBER_FIELDS}, amount, currency, renewal_reminder_for, payment_plans!inner(interval)`)
    .eq("status", "active")
    .eq("cancel_at_period_end", false)
    .eq("payment_plans.interval", "yearly")
    .gt("current_period_end", now.toISOString())
    .lt("current_period_end", new Date(now.getTime() + YEARLY_REMINDER_DAYS * DAY_MS).toISOString());

  type Row = Subscriber & { amount: number | string; currency: string; renewal_reminder_for: string | null };
  const due = ((data ?? []) as unknown as Row[]).filter(
    (s) => !s.renewal_reminder_for || new Date(s.renewal_reminder_for).getTime() !== new Date(s.current_period_end).getTime()
  );

  let sent = 0;
  for (const sub of due) {
    const ok = await notify(
      admin,
      sub,
      (title) => `Your yearly subscription to ${title} renews soon`,
      (title) => [
        `Your yearly subscription to ${title} renews on ${longDate(sub.current_period_end)}, and we'll charge ${formatMoney(sub.amount, sub.currency)} to your card.`,
        "To keep learning, you don't need to do anything. If you'd rather stop, you can cancel from your dashboard before that date.",
      ]
    );
    // Left unmarked if the email failed, so tomorrow's run tries again.
    if (ok) {
      await admin.from("subscriptions").update({ renewal_reminder_for: sub.current_period_end }).eq("id", sub.id);
      sent++;
    }
  }
  return sent;
}

async function sendReceipt(
  admin: AdminClient,
  r: {
    subscriptionId: string;
    email: string;
    userId: string | null;
    courseId: string;
    amount: number;
    currency: string;
    first: boolean;
  }
) {
  const [{ title, profile, name }, { data: plan }] = await Promise.all([
    subscriberDetails(admin, r.courseId, r.userId),
    admin.from("subscriptions").select("offerings(kind), payment_plans(interval)").eq("id", r.subscriptionId).maybeSingle(),
  ]);
  const paid = formatMoney(r.amount, r.currency);
  const interval = (plan?.payment_plans as unknown as { interval: BillingInterval } | null)?.interval ?? "monthly";
  const selfPaced = (plan?.offerings as unknown as { kind: string } | null)?.kind === "self_paced";

  await sendEmail({
    to: r.email,
    toName: profile?.full_name,
    subject: r.first ? `You're enrolled: ${title}` : `Payment received: ${title}`,
    paragraphs: [
      `Hi${name ? ` ${name}` : ""},`,
      r.first
        ? `Thanks for joining ${title}. We received your payment of ${paid}. Your subscription renews every ${intervalNoun(interval)} and you can cancel any time from your dashboard.`
        : `We received your ${interval} payment of ${paid} for ${title}. Thank you!`,
      selfPaced
        ? r.first
          ? "Your lessons are ready in your dashboard."
          : "Your access continues as normal."
        : r.first
          ? "We'll place you in a class group shortly and your schedule will appear in your dashboard."
          : "Your classes continue as normal.",
      `Dashboard: ${appUrl()}/dashboard/billing`,
      "Code Illustrated",
    ],
  });
}
