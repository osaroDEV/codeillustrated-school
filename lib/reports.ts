import { monthlyEquivalent, type BillingInterval } from "./billing";

// Pure calculations behind Admin → Reports. NGN and USD are never added
// together: every money figure is kept per currency.

const DAY_MS = 24 * 60 * 60 * 1000;
export const CHURN_WINDOW_DAYS = 30;

export type Money = Record<string, number>;

export interface ReportInput {
  courses: { id: string; title: string }[];
  enrollments: { course_id: string; status: string }[];
  orders: {
    course_id: string;
    kind: string;
    status: string;
    currency: string;
    amount: number | string;
    amount_paid: number | string | null;
    paid_at: string | null;
  }[];
  subscriptions: {
    course_id: string;
    status: string;
    currency: string;
    amount: number | string;
    updated_at: string;
    interval: BillingInterval | null;
  }[];
  cohorts: { id: string; name: string; course_id: string }[];
  /** Classes that have already happened. */
  pastSessions: { id: string; cohort_id: string }[];
  attendance: { session_id: string; status: string }[];
  /** Learners currently placed in each cohort. */
  members: { cohort_id: string }[];
}

export interface CourseReport {
  id: string;
  title: string;
  enrolled: number;
  completed: number;
  completionRate: number | null;
  liveSubscribers: number;
  mrr: Money;
  /** Share of subscribers lost in the last 30 days, 0 to 1. */
  churn: number | null;
  subscriptionRevenue: Money;
  oneOffRevenue: Money;
}

export interface CohortReport {
  id: string;
  name: string;
  course: string;
  learners: number;
  pastClasses: number;
  attendanceRate: number | null;
}

export interface MonthRevenue {
  month: string;
  label: string;
  subscription: number;
  oneOff: number;
}

export interface Reports {
  totals: { enrolled: number; completed: number; completionRate: number | null; liveSubscribers: number; mrr: Money };
  courses: CourseReport[];
  cohorts: CohortReport[];
  monthly: Record<string, MonthRevenue[]>;
}

const add = (money: Money, currency: string, amount: number) => {
  money[currency] = Math.round(((money[currency] ?? 0) + amount) * 100) / 100;
};
const isLive = (status: string) => status === "active" || status === "past_due";
const ratio = (part: number, whole: number) => (whole === 0 ? null : part / whole);

function lastMonths(now: Date, count: number): { month: string; label: string }[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1 - i), 1));
    return {
      month: d.toISOString().slice(0, 7),
      label: d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }),
    };
  });
}

export function buildReports(input: ReportInput, now: Date = new Date(), months = 12): Reports {
  const churnFrom = now.getTime() - CHURN_WINDOW_DAYS * DAY_MS;
  const paid = input.orders.filter((o) => o.status === "paid" && o.paid_at);
  const title = new Map(input.courses.map((c) => [c.id, c.title]));

  const courses: CourseReport[] = input.courses.map((course) => {
    const enrolments = input.enrollments.filter((e) => e.course_id === course.id);
    const completed = enrolments.filter((e) => e.status === "completed").length;
    const subs = input.subscriptions.filter((s) => s.course_id === course.id);
    const live = subs.filter((s) => isLive(s.status));
    const lost = subs.filter((s) => s.status === "expired" && new Date(s.updated_at).getTime() >= churnFrom).length;

    const mrr: Money = {};
    for (const s of live) add(mrr, s.currency, monthlyEquivalent(Number(s.amount), s.interval));

    const subscriptionRevenue: Money = {};
    const oneOffRevenue: Money = {};
    for (const o of paid.filter((x) => x.course_id === course.id)) {
      add(o.kind === "one_off" ? oneOffRevenue : subscriptionRevenue, o.currency, Number(o.amount_paid ?? o.amount));
    }

    return {
      id: course.id,
      title: course.title,
      enrolled: enrolments.length,
      completed,
      completionRate: ratio(completed, enrolments.length),
      liveSubscribers: live.length,
      mrr,
      churn: ratio(lost, live.length + lost),
      subscriptionRevenue,
      oneOffRevenue,
    };
  });

  const cohorts: CohortReport[] = input.cohorts.map((cohort) => {
    const sessionIds = new Set(input.pastSessions.filter((s) => s.cohort_id === cohort.id).map((s) => s.id));
    const learners = input.members.filter((m) => m.cohort_id === cohort.id).length;
    const attended = input.attendance.filter(
      (a) => sessionIds.has(a.session_id) && (a.status === "present" || a.status === "late")
    ).length;
    const expected = sessionIds.size * learners;
    return {
      id: cohort.id,
      name: cohort.name,
      course: title.get(cohort.course_id) ?? cohort.course_id,
      learners,
      pastClasses: sessionIds.size,
      // Past members' attendance can push this over; a rate can't exceed 100%.
      attendanceRate: expected === 0 ? null : Math.min(1, attended / expected),
    };
  });

  const window = lastMonths(now, months);
  const currencies = Array.from(new Set(paid.map((o) => o.currency))).sort();
  const monthly: Record<string, MonthRevenue[]> = {};
  for (const currency of currencies) {
    monthly[currency] = window.map(({ month, label }) => {
      const row: MonthRevenue = { month, label, subscription: 0, oneOff: 0 };
      for (const o of paid) {
        if (o.currency !== currency || o.paid_at!.slice(0, 7) !== month) continue;
        const key = o.kind === "one_off" ? "oneOff" : "subscription";
        row[key] = Math.round((row[key] + Number(o.amount_paid ?? o.amount)) * 100) / 100;
      }
      return row;
    });
  }

  const enrolled = input.enrollments.length;
  const completed = input.enrollments.filter((e) => e.status === "completed").length;
  const mrr: Money = {};
  for (const c of courses) for (const [currency, amount] of Object.entries(c.mrr)) add(mrr, currency, amount);

  return {
    totals: {
      enrolled,
      completed,
      completionRate: ratio(completed, enrolled),
      liveSubscribers: courses.reduce((n, c) => n + c.liveSubscribers, 0),
      mrr,
    },
    courses,
    cohorts,
    monthly,
  };
}
