import { describe, expect, it } from "vitest";
import { buildReports, type ReportInput } from "./reports";

const now = new Date("2026-11-15T12:00:00Z");
const order = (over: Partial<ReportInput["orders"][number]>) => ({
  course_id: "a", kind: "subscription", status: "paid", currency: "NGN", amount: "1000", amount_paid: "1000", paid_at: "2026-11-02T10:00:00Z", ...over,
});
const sub = (over: Partial<ReportInput["subscriptions"][number]>) => ({
  course_id: "a", status: "active", currency: "NGN", amount: "1000", updated_at: "2026-10-01T00:00:00Z", interval: "monthly" as const, ...over,
});
const empty: ReportInput = {
  courses: [{ id: "a", title: "Course A" }, { id: "b", title: "Course B" }],
  enrollments: [], orders: [], subscriptions: [], cohorts: [], pastSessions: [], attendance: [], members: [],
};
const build = (over: Partial<ReportInput>) => buildReports({ ...empty, ...over }, now);

describe("buildReports", () => {
  it("never adds different currencies together", () => {
    const r = build({ subscriptions: [sub({}), sub({ currency: "USD", amount: "10" })] });
    expect(r.totals.mrr).toEqual({ NGN: 1000, USD: 10 });
    expect(r.courses[0].mrr).toEqual({ NGN: 1000, USD: 10 });
  });

  it("counts yearly plans as a twelfth and ignores ended subscriptions in recurring revenue", () => {
    const r = build({ subscriptions: [sub({ amount: "12000", interval: "yearly" }), sub({ status: "cancelled" }), sub({ status: "past_due", amount: "500" })] });
    expect(r.courses[0].mrr).toEqual({ NGN: 1500 });
    expect(r.courses[0].liveSubscribers).toBe(2);
  });

  it("separates subscription and one-off revenue, using what was actually paid", () => {
    const r = build({ orders: [order({ amount: "1000", amount_paid: "1200" }), order({ kind: "one_off", amount: "300", amount_paid: null })] });
    expect(r.courses[0].subscriptionRevenue).toEqual({ NGN: 1200 });
    expect(r.courses[0].oneOffRevenue).toEqual({ NGN: 300 });
  });

  it("leaves out unpaid and refunded orders", () => {
    const r = build({ orders: [order({ status: "refunded" }), order({ status: "pending", paid_at: null })] });
    expect(r.courses[0].subscriptionRevenue).toEqual({});
    expect(r.monthly).toEqual({});
  });

  it("works out churn from the last 30 days only", () => {
    const r = build({
      subscriptions: [
        sub({}), sub({}), sub({}),
        sub({ status: "expired", updated_at: "2026-11-10T00:00:00Z" }),
        sub({ status: "expired", updated_at: "2026-09-01T00:00:00Z" }),
      ],
    });
    expect(r.courses[0].churn).toBe(0.25);
    expect(r.courses[1].churn).toBeNull();
  });

  it("works out completion", () => {
    const r = build({ enrollments: [{ course_id: "a", status: "completed" }, { course_id: "a", status: "active" }, { course_id: "b", status: "active" }] });
    expect(r.courses[0].completionRate).toBe(0.5);
    expect(r.courses[1].completionRate).toBe(0);
    expect(r.totals).toMatchObject({ enrolled: 3, completed: 1 });
  });

  it("has no rate when there's nothing to measure", () => {
    expect(build({}).totals.completionRate).toBeNull();
  });

  it("works out attendance per cohort from classes already held", () => {
    const r = build({
      cohorts: [{ id: "k", name: "Evenings", course_id: "a" }],
      pastSessions: [{ id: "s1", cohort_id: "k" }, { id: "s2", cohort_id: "k" }],
      members: [{ cohort_id: "k" }, { cohort_id: "k" }],
      attendance: [{ session_id: "s1", status: "present" }, { session_id: "s1", status: "late" }, { session_id: "s2", status: "absent" }, { session_id: "other", status: "present" }],
    });
    expect(r.cohorts[0]).toMatchObject({ course: "Course A", learners: 2, pastClasses: 2, attendanceRate: 0.5 });
  });

  it("never reports attendance over 100%", () => {
    const r = build({
      cohorts: [{ id: "k", name: "K", course_id: "a" }],
      pastSessions: [{ id: "s1", cohort_id: "k" }],
      members: [{ cohort_id: "k" }],
      attendance: [{ session_id: "s1", status: "present" }, { session_id: "s1", status: "present" }],
    });
    expect(r.cohorts[0].attendanceRate).toBe(1);
  });

  it("charts twelve months per currency, split by kind", () => {
    const r = build({ orders: [order({}), order({ kind: "one_off", amount_paid: "200" }), order({ currency: "USD", amount_paid: "5", paid_at: "2026-02-10T00:00:00Z" })] });
    expect(Object.keys(r.monthly)).toEqual(["NGN", "USD"]);
    expect(r.monthly.NGN).toHaveLength(12);
    expect(r.monthly.NGN[11]).toMatchObject({ month: "2026-11", subscription: 1000, oneOff: 200 });
    expect(r.monthly.USD.find((m) => m.month === "2026-02")).toMatchObject({ subscription: 5 });
  });
});
