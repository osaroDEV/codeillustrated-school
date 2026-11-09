import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, Receipt } from "lucide-react";
import { requireUser } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase";
import { formatMoney, subscriptionCovers, SUBSCRIPTION_GRACE_DAYS, intervalNoun, type BillingInterval } from "@/lib/billing";
import { LocalTime } from "@/components/local-time";
import { CancelSubscriptionButton } from "@/components/billing/cancel-subscription-button";

export const metadata: Metadata = { title: "Billing | Code Illustrated Dashboard" };

const DATE = { day: "numeric", month: "long", year: "numeric" } as const;

interface Sub {
  id: string;
  course_id: string;
  status: "active" | "past_due" | "cancelled" | "expired";
  currency: string;
  amount: number;
  current_period_end: string;
  created_at: string;
  courses: { title: string; slug: string } | null;
  payment_plans: { interval: BillingInterval } | null;
  offerings: { kind: string } | null;
}

interface Order {
  id: string;
  amount_paid: number | null;
  amount: number;
  currency: string;
  paid_at: string | null;
  status: string;
  is_renewal: boolean;
  courses: { title: string } | null;
}

export default async function BillingPage() {
  const user = await requireUser();
  const admin = createAdminClient();
  const [{ data: subs }, { data: orders }] = await Promise.all([
    admin
      .from("subscriptions")
      .select("id, course_id, status, currency, amount, current_period_end, created_at, courses(title, slug), payment_plans(interval), offerings(kind)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    admin
      .from("orders")
      .select("id, amount, amount_paid, currency, paid_at, status, is_renewal, courses(title)")
      .eq("user_id", user.id)
      .in("status", ["paid", "refunded"])
      .order("paid_at", { ascending: false })
      .limit(50),
  ]);

  // One row per course: the live subscription if there is one, else the newest.
  // (Rows arrive newest first; a duplicate checkout leaves a newer cancelled
  // row that mustn't hide the live one.)
  const isLive = (s: Sub) => s.status === "active" || s.status === "past_due";
  const byCourse = new Map<string, Sub>();
  for (const s of (subs ?? []) as unknown as Sub[]) {
    const current = byCourse.get(s.course_id);
    if (!current || (!isLive(current) && isLive(s))) byCourse.set(s.course_id, s);
  }
  const subscriptions = Array.from(byCourse.values());

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Billing</h1>
        <p className="text-white/40 text-sm mt-1">Your course subscriptions and payments</p>
      </div>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-[#ffbd59]" /> Subscriptions
        </h2>
        {subscriptions.length === 0 ? (
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 text-center text-white/40 text-sm">
            You don&apos;t have any subscriptions.{" "}
            <Link href="/courses" className="text-[#ffbd59] hover:text-[#f5a623]">Browse courses →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {subscriptions.map((s) => {
              const covers = subscriptionCovers(s);
              const live = s.status === "active" || s.status === "past_due";
              return (
                <div key={s.id} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-white font-semibold">{s.courses?.title ?? s.course_id}</p>
                      <p className="text-white/40 text-sm">{formatMoney(s.amount, s.currency)} / {intervalNoun(s.payment_plans?.interval)} · card
                        {s.offerings?.kind === "self_paced" && " · Self-paced"}
                      </p>
                    </div>
                    <StatusBadge status={s.status} covers={covers} />
                  </div>
                  <p className="text-white/50 text-sm mt-3">
                    {s.status === "active" && (
                      <>Renews on <LocalTime iso={s.current_period_end} format={DATE} />.</>
                    )}
                    {s.status === "past_due" && (
                      <>
                        Your last payment didn&apos;t go through. Flutterwave will retry your card; your access is kept for{" "}
                        {SUBSCRIPTION_GRACE_DAYS} days after <LocalTime iso={s.current_period_end} format={DATE} />.
                      </>
                    )}
                    {s.status === "cancelled" &&
                      (covers ? (
                        <>Cancelled. You keep access until <LocalTime iso={s.current_period_end} format={DATE} />.</>
                      ) : (
                        <>Cancelled.</>
                      ))}
                    {s.status === "expired" && <>This subscription has ended.</>}
                  </p>
                  <div className="mt-4 flex gap-3 flex-wrap">
                    {live && <CancelSubscriptionButton id={s.id} />}
                    {!live && (
                      <Link
                        href={`/courses/${s.courses?.slug ?? s.course_id}#enroll`}
                        className="text-sm font-medium text-[#ffbd59] hover:text-[#f5a623]"
                      >
                        Subscribe again →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-[#3da3bc]" /> Payments
        </h2>
        {(orders ?? []).length === 0 ? (
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 text-center text-white/40 text-sm">
            No payments yet.
          </div>
        ) : (
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl divide-y divide-white/[0.06]">
            {((orders ?? []) as unknown as Order[]).map((o) => (
              <div key={o.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white/80 text-sm truncate">
                    {o.courses?.title ?? "Course"} {o.is_renewal ? "· monthly renewal" : "· first payment"}
                  </p>
                  {o.paid_at && <LocalTime iso={o.paid_at} format={DATE} className="text-white/30 text-xs" />}
                </div>
                <span className="text-white text-sm font-medium">
                  {formatMoney(o.amount_paid ?? o.amount, o.currency)}
                </span>
                {o.status === "refunded" && <span className="text-xs text-[#3da3bc]">Refunded</span>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatusBadge({ status, covers }: { status: Sub["status"]; covers: boolean }) {
  const styles: Record<Sub["status"], string> = {
    active: "bg-green-500/15 text-green-400",
    past_due: "bg-[#ffbd59]/15 text-[#ffbd59]",
    cancelled: covers ? "bg-white/10 text-white/60" : "bg-white/10 text-white/40",
    expired: "bg-white/10 text-white/40",
  };
  const label = { active: "Active", past_due: "Payment due", cancelled: "Cancelled", expired: "Ended" }[status];
  return <span className={`text-xs font-semibold px-3 py-1 rounded-full ${styles[status]}`}>{label}</span>;
}
