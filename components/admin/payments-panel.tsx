"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, RefreshCw, Undo2, XCircle } from "lucide-react";
import { LocalTime } from "@/components/local-time";
import { formatMoney } from "@/lib/billing";
import { cardClass, errorClass, request, secondaryButtonClass } from "./ui";

export interface AdminSubscription {
  id: string;
  status: "active" | "past_due" | "cancelled" | "expired";
  amount: number;
  currency: string;
  current_period_end: string;
  created_at: string;
  learner: string;
  email: string;
  course: string;
}

export interface AdminCharge {
  id: string;
  status: "pending" | "paid" | "failed" | "cancelled" | "refunded";
  amount: number;
  currency: string;
  is_renewal: boolean;
  tx_ref: string;
  failure_reason: string | null;
  at: string;
  learner: string;
  email: string;
  course: string;
}

export interface AdminEvent {
  id: string;
  event: string;
  outcome: string;
  detail: string | null;
  tx_ref: string | null;
  flw_transaction_id: number | null;
  created_at: string;
}

export interface Unplaced {
  id: string;
  course_id: string;
  enrolled_at: string;
  learner: string;
  course: string;
}

const SUB_BADGE: Record<AdminSubscription["status"], string> = {
  active: "bg-green-500/15 text-green-400",
  past_due: "bg-[#ffbd59]/15 text-[#ffbd59]",
  cancelled: "bg-white/10 text-white/50",
  expired: "bg-white/10 text-white/30",
};
const CHARGE_BADGE: Record<AdminCharge["status"], string> = {
  paid: "bg-green-500/15 text-green-400",
  pending: "bg-[#ffbd59]/15 text-[#ffbd59]",
  failed: "bg-red-500/15 text-red-400",
  cancelled: "bg-white/10 text-white/40",
  refunded: "bg-[#3da3bc]/15 text-[#3da3bc]",
};
const DATE = { day: "numeric", month: "short", year: "numeric" } as const;

type Tab = "attention" | "subscriptions" | "charges";

export function PaymentsPanel({
  subscriptions,
  charges,
  events,
  unplaced,
  loadError,
}: {
  subscriptions: AdminSubscription[];
  charges: AdminCharge[];
  events: AdminEvent[];
  unplaced: Unplaced[];
  loadError: string | null;
}) {
  const router = useRouter();
  const attention = events.length + unplaced.length;
  const [tab, setTab] = useState<Tab>(attention ? "attention" : "subscriptions");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const live = subscriptions.filter((s) => s.status === "active" || s.status === "past_due");
  const mrr = live.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.currency]: (acc[s.currency] ?? 0) + s.amount }), {});

  async function act(key: string, path: string, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(key);
    setError("");
    setMessage("");
    const { error: err, data } = await request<{ outcome?: string }>(path, "POST");
    setBusy(null);
    if (err) return setError(err);
    if (data?.outcome) setMessage(`Result: ${data.outcome.replace(/_/g, " ")}`);
    router.refresh();
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "attention", label: "Needs attention", count: attention },
    { key: "subscriptions", label: "Subscriptions", count: live.length },
    { key: "charges", label: "Charges", count: charges.length },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Stat label="Active subscriptions" value={String(live.length)} />
        {(["NGN", "USD"] as const).map((c) => (
          <Stat key={c} label={`Monthly recurring (${c})`} value={formatMoney(mrr[c] ?? 0, c)} />
        ))}
      </div>

      <div className="flex gap-1 bg-white/[0.04] border border-white/[0.08] rounded-2xl p-1 mb-6 w-fit max-w-full overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${
              tab === t.key ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${t.key === "attention" ? "bg-[#ffbd59]/20 text-[#ffbd59]" : "bg-white/10 text-white/40"}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loadError && <div className={`${errorClass} mb-4`}>{loadError}</div>}
      {error && <div className={`${errorClass} mb-4`}>{error}</div>}
      {message && <p className="text-green-400 text-sm mb-4">{message}</p>}

      {tab === "attention" && (
        <div className="space-y-6">
          <section>
            <h3 className="text-white font-semibold mb-1">Paid, waiting for a cohort ({unplaced.length})</h3>
            <p className="text-white/40 text-xs mb-3">Place these learners from the course&apos;s cohort page.</p>
            {unplaced.length === 0 ? (
              <Empty text="Everyone who has paid is in a cohort." />
            ) : (
              <div className={`${cardClass} divide-y divide-white/[0.06]`}>
                {unplaced.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{u.learner}</p>
                      <p className="text-white/40 text-xs truncate">
                        {u.course} · since <LocalTime iso={u.enrolled_at} format={DATE} />
                      </p>
                    </div>
                    <Link href="/admin/cohorts" className={secondaryButtonClass}>Cohorts</Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="text-white font-semibold mb-1">Payment issues ({events.length})</h3>
            <p className="text-white/40 text-xs mb-3">
              Charges we couldn&apos;t match to a subscription, charges that didn&apos;t match their order, and
              duplicate purchases that need a refund in the Flutterwave dashboard.
            </p>
            {events.length === 0 ? (
              <Empty text="No payment issues." />
            ) : (
              <div className={`${cardClass} divide-y divide-white/[0.06]`}>
                {events.map((e) => (
                  <div key={e.id} className="flex items-start gap-3 px-4 py-3">
                    <AlertTriangle className="w-4 h-4 text-[#ffbd59] mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm">
                        {e.outcome.replace(/_/g, " ")} <span className="text-white/30">· {e.event}</span>
                      </p>
                      {e.detail && <p className="text-white/50 text-xs break-words">{e.detail}</p>}
                      <p className="text-white/30 text-[11px] mt-0.5 break-all">
                        <LocalTime iso={e.created_at} /> {e.flw_transaction_id && `· Flutterwave #${e.flw_transaction_id}`}{" "}
                        {e.tx_ref && `· ${e.tx_ref}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "subscriptions" && (
        subscriptions.length === 0 ? (
          <Empty text="No subscriptions yet." />
        ) : (
          <div className={`${cardClass} divide-y divide-white/[0.06]`}>
            {subscriptions.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                <div className="flex-1 min-w-[12rem]">
                  <p className="text-white text-sm truncate">
                    {s.learner} <span className="text-white/30 text-xs">{s.email}</span>
                  </p>
                  <p className="text-white/40 text-xs">
                    {s.course} · {formatMoney(s.amount, s.currency)}/mo · paid to <LocalTime iso={s.current_period_end} format={DATE} />
                  </p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${SUB_BADGE[s.status]}`}>
                  {s.status.replace("_", " ")}
                </span>
                {(s.status === "active" || s.status === "past_due") && (
                  <button
                    onClick={() =>
                      act(s.id, `/subscriptions/${s.id}/cancel`, `Stop billing ${s.learner} for ${s.course}? They keep their seat until the paid period ends.`)
                    }
                    disabled={busy !== null}
                    className={secondaryButtonClass}
                  >
                    {busy === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />} Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {tab === "charges" && (
        charges.length === 0 ? (
          <Empty text="No charges yet." />
        ) : (
          <div className={`${cardClass} divide-y divide-white/[0.06]`}>
            {charges.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                <div className="flex-1 min-w-[12rem]">
                  <p className="text-white text-sm truncate">
                    {formatMoney(c.amount, c.currency)} · {c.learner}{" "}
                    <span className="text-white/30 text-xs">{c.is_renewal ? "renewal" : "first payment"}</span>
                  </p>
                  <p className="text-white/40 text-xs truncate">
                    {c.course} · <LocalTime iso={c.at} /> {c.failure_reason && `· ${c.failure_reason}`}
                  </p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${CHARGE_BADGE[c.status]}`}>{c.status}</span>
                {c.status === "pending" && (
                  <button onClick={() => act(c.id, `/orders/${c.id}/recheck`)} disabled={busy !== null} className={secondaryButtonClass}>
                    {busy === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Re-check
                  </button>
                )}
                {c.status === "paid" && (
                  <button
                    onClick={() =>
                      act(
                        c.id,
                        `/orders/${c.id}/refund`,
                        "Mark this charge refunded? Do the refund itself in the Flutterwave dashboard. Refunding a first payment also ends the learner's seat."
                      )
                    }
                    disabled={busy !== null}
                    className={secondaryButtonClass}
                  >
                    {busy === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />} Mark refunded
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${cardClass} p-4`}>
      <p className="text-white/40 text-xs">{label}</p>
      <p className="text-white text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="text-center py-8 text-white/30 text-sm border border-white/[0.08] rounded-2xl">{text}</div>;
}
