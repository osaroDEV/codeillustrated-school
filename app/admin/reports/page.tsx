import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/supabase-server";
import { formatMoney, type BillingInterval } from "@/lib/billing";
import { buildReports, CHURN_WINDOW_DAYS, type Money } from "@/lib/reports";
import { MonthlyRevenueChart } from "@/components/reports/monthly-revenue-chart";
import { cardClass, errorClass } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Reports | Admin" };
export const dynamic = "force-dynamic";

const MAX_ROWS = 10_000;
const money = (m: Money) =>
  Object.keys(m).length === 0
    ? "—"
    : Object.keys(m)
        .sort()
        .map((c) => formatMoney(m[c], c))
        .join(" · ");
const percent = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);

export default async function ReportsPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const [courses, enrollments, orders, subscriptions, cohorts, sessions, attendance, members] = await Promise.all([
    admin.from("courses").select("id, title").order("position"),
    admin.from("enrollments").select("course_id, status").range(0, MAX_ROWS),
    admin.from("orders").select("course_id, kind, status, currency, amount, amount_paid, paid_at").eq("status", "paid").range(0, MAX_ROWS),
    admin.from("subscriptions").select("course_id, status, currency, amount, updated_at, payment_plans(interval)").range(0, MAX_ROWS),
    admin.from("cohorts").select("id, name, course_id").order("created_at", { ascending: false }),
    admin.from("class_sessions").select("id, cohort_id").lt("starts_at", nowIso).range(0, MAX_ROWS),
    admin.from("attendance").select("session_id, status").range(0, MAX_ROWS),
    admin.from("enrollments").select("cohort_id").not("cohort_id", "is", null).range(0, MAX_ROWS),
  ]);
  const loadError = [courses, enrollments, orders, subscriptions, cohorts, sessions, attendance, members].find((r) => r.error)?.error?.message;

  const report = buildReports({
    courses: courses.data ?? [],
    enrollments: enrollments.data ?? [],
    orders: orders.data ?? [],
    subscriptions: (subscriptions.data ?? []).map(({ payment_plans, ...s }) => ({
      ...s,
      interval: (payment_plans as unknown as { interval: BillingInterval } | null)?.interval ?? null,
    })),
    cohorts: cohorts.data ?? [],
    pastSessions: sessions.data ?? [],
    attendance: attendance.data ?? [],
    members: (members.data ?? []) as { cohort_id: string }[],
  });
  const currencies = Object.keys(report.monthly);

  const th = "py-2 pr-4 font-medium whitespace-nowrap";
  const td = "py-2 pr-4 whitespace-nowrap";

  return (
    <div className="space-y-8">
      {loadError && <div className={errorClass}>{loadError}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Monthly recurring revenue" value={money(report.totals.mrr)} />
        <Stat label="Live subscribers" value={String(report.totals.liveSubscribers)} />
        <Stat label="Enrolments" value={String(report.totals.enrolled)} />
        <Stat label="Completion rate" value={percent(report.totals.completionRate)} />
      </div>

      {currencies.length > 0 ? (
        <div className={`grid gap-4 ${currencies.length > 1 ? "lg:grid-cols-2" : ""}`}>
          {currencies.map((c) => (
            <div key={c} className={`${cardClass} p-5`}>
              <MonthlyRevenueChart currency={c} data={report.monthly[c]} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-white/30 text-sm">No payments yet.</p>
      )}

      <section>
        <h2 className="text-white font-semibold mb-3">Courses</h2>
        <div className={`${cardClass} p-4 overflow-x-auto`}>
          <table className="w-full text-sm text-white/75">
            <thead>
              <tr className="text-white/40 text-xs text-left">
                <th scope="col" className={th}>Course</th>
                <th scope="col" className={th}>Enrolled</th>
                <th scope="col" className={th}>Completed</th>
                <th scope="col" className={th}>Completion</th>
                <th scope="col" className={th}>Live subscribers</th>
                <th scope="col" className={th}>Monthly recurring</th>
                <th scope="col" className={th}>Churn ({CHURN_WINDOW_DAYS} days)</th>
              </tr>
            </thead>
            <tbody>
              {report.courses.map((c) => (
                <tr key={c.id} className="border-t border-white/[0.06]">
                  <td className={`${td} text-white`}>{c.title}</td>
                  <td className={td}>{c.enrolled}</td>
                  <td className={td}>{c.completed}</td>
                  <td className={td}>{percent(c.completionRate)}</td>
                  <td className={td}>{c.liveSubscribers}</td>
                  <td className={td}>{money(c.mrr)}</td>
                  <td className={td}>{percent(c.churn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-white/30 text-xs mt-2">
          Yearly plans count as one-twelfth a month. Churn is subscriptions that ended in the last {CHURN_WINDOW_DAYS} days, as a share of those plus current subscribers.
        </p>
      </section>

      <section>
        <h2 className="text-white font-semibold mb-3">Revenue by course</h2>
        <div className={`${cardClass} p-4 overflow-x-auto`}>
          <table className="w-full text-sm text-white/75">
            <thead>
              <tr className="text-white/40 text-xs text-left">
                <th scope="col" className={th}>Course</th>
                <th scope="col" className={th}>Subscriptions</th>
                <th scope="col" className={th}>Certificates (one-off)</th>
              </tr>
            </thead>
            <tbody>
              {report.courses.map((c) => (
                <tr key={c.id} className="border-t border-white/[0.06]">
                  <td className={`${td} text-white`}>{c.title}</td>
                  <td className={td}>{money(c.subscriptionRevenue)}</td>
                  <td className={td}>{money(c.oneOffRevenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-white/30 text-xs mt-2">Refunded payments are left out.</p>
      </section>

      <section>
        <h2 className="text-white font-semibold mb-3">Attendance by cohort</h2>
        {report.cohorts.length === 0 ? (
          <p className="text-white/30 text-sm">No cohorts yet.</p>
        ) : (
          <div className={`${cardClass} p-4 overflow-x-auto`}>
            <table className="w-full text-sm text-white/75">
              <thead>
                <tr className="text-white/40 text-xs text-left">
                  <th scope="col" className={th}>Cohort</th>
                  <th scope="col" className={th}>Course</th>
                  <th scope="col" className={th}>Learners</th>
                  <th scope="col" className={th}>Classes held</th>
                  <th scope="col" className={th}>Attendance</th>
                </tr>
              </thead>
              <tbody>
                {report.cohorts.map((c) => (
                  <tr key={c.id} className="border-t border-white/[0.06]">
                    <td className={`${td} text-white`}>{c.name}</td>
                    <td className={td}>{c.course}</td>
                    <td className={td}>{c.learners}</td>
                    <td className={td}>{c.pastClasses}</td>
                    <td className={td}>{percent(c.attendanceRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${cardClass} p-4`}>
      <p className="text-white/40 text-xs">{label}</p>
      <p className="text-white text-xl font-bold mt-1">{value}</p>
    </div>
  );
}
