import type { Metadata } from "next";
import { requireAdmin } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase";
import { PaymentsPanel, type AdminCharge, type AdminEvent, type AdminSubscription, type Unplaced } from "@/components/admin/payments-panel";

export const metadata: Metadata = { title: "Payments | Admin" };

const person = (p: unknown) => {
  const v = p as { full_name: string | null; email: string | null } | null;
  return v?.full_name || v?.email || "—";
};
const title = (c: unknown) => (c as { title: string } | null)?.title ?? "—";

export default async function PaymentsPage() {
  await requireAdmin();
  const admin = createAdminClient();

  const [subs, orders, events, unplaced] = await Promise.all([
    admin
      .from("subscriptions")
      .select("id, status, currency, amount, current_period_end, created_at, customer_email, course_id, profiles(full_name, email), courses(title), payment_plans(interval), offerings(kind)")
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("orders")
      .select("id, status, currency, amount, amount_paid, is_renewal, tx_ref, failure_reason, paid_at, created_at, customer_email, profiles(full_name, email), courses(title)")
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("payment_events")
      .select("id, event, outcome, detail, tx_ref, flw_transaction_id, created_at")
      .in("outcome", ["unmatched", "rejected", "already_enrolled"])
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("enrollments")
      .select("id, enrolled_at, course_id, profiles(full_name, email), courses(title), subscriptions(offerings(kind))")
      .eq("source", "subscription")
      .eq("status", "active")
      .is("cohort_id", null)
      .order("enrolled_at"),
  ]);

  const loadError = [subs, orders, events, unplaced].find((r) => r.error)?.error?.message ?? null;

  return (
    <PaymentsPanel
      loadError={loadError}
      subscriptions={(subs.data ?? []).map(
        (s): AdminSubscription => ({
          id: s.id,
          status: s.status,
          amount: Number(s.amount),
          currency: s.currency,
          current_period_end: s.current_period_end,
          created_at: s.created_at,
          learner: person(s.profiles),
          email: s.customer_email,
          course: title(s.courses),
          interval: (s.payment_plans as unknown as { interval: AdminSubscription["interval"] } | null)?.interval ?? "monthly",
          selfPaced: (s.offerings as unknown as { kind: string } | null)?.kind === "self_paced",
        })
      )}
      charges={(orders.data ?? []).map(
        (o): AdminCharge => ({
          id: o.id,
          status: o.status,
          amount: Number(o.amount_paid ?? o.amount),
          currency: o.currency,
          is_renewal: o.is_renewal,
          tx_ref: o.tx_ref,
          failure_reason: o.failure_reason,
          at: o.paid_at ?? o.created_at,
          learner: person(o.profiles),
          email: o.customer_email,
          course: title(o.courses),
        })
      )}
      events={(events.data ?? []) as AdminEvent[]}
      unplaced={(unplaced.data ?? [])
        // Self-paced subscribers never join a cohort.
        .filter((e) => (e.subscriptions as unknown as { offerings: { kind: string } | null } | null)?.offerings?.kind !== "self_paced").map(
        (e): Unplaced => ({
          id: e.id,
          course_id: e.course_id,
          enrolled_at: e.enrolled_at,
          learner: person(e.profiles),
          course: title(e.courses),
        })
      )}
    />
  );
}
