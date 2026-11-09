// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutError, processCharge, runDailyBilling, startCheckout } from "./billing-server";

// vi.mock calls below are hoisted above the import.

const { flw, sendEmail } = vi.hoisted(() => ({
  flw: {
    verifyTransaction: vi.fn(),
    findSubscriptionId: vi.fn(),
    cancelSubscription: vi.fn(),
    createCheckoutLink: vi.fn(),
    createPaymentPlan: vi.fn(),
    findActiveSubscriptionIds: vi.fn(),
    verifyByReference: vi.fn(),
  },
  sendEmail: vi.fn().mockResolvedValue(true),
}));
vi.mock("./flutterwave", () => flw);
vi.mock("./email", () => ({ sendEmail }));


// ─── A tiny stand-in for the Supabase query builder ───
// Every chain method returns the builder; awaiting it (or .single() /
// .maybeSingle()) resolves to whatever `respond` returns for that table and
// operation. Calls are recorded for assertions.

type Op = { table: string; op: string; payload?: unknown; filters: [string, unknown][] };

function fakeAdmin(respond: (q: Op) => { data?: unknown; error?: unknown }) {
  const ops: Op[] = [];
  const rpcs: { name: string; args: Record<string, unknown> }[] = [];
  let rpcResult: (name: string) => { data?: unknown; error?: unknown } = () => ({ data: null });

  const from = (table: string) => {
    const q: Op = { table, op: "select", filters: [] };
    ops.push(q);
    const run = () => Promise.resolve({ data: null, error: null, ...respond(q) });
    const builder: Record<string, unknown> = {};
    for (const m of ["select", "eq", "in", "not", "lt", "gt", "order", "limit", "is", "neq"]) {
      builder[m] = (...args: unknown[]) => {
        if (m !== "select") q.filters.push([m, args]);
        return builder;
      };
    }
    builder.insert = (payload: unknown) => ((q.op = "insert"), (q.payload = payload), builder);
    builder.update = (payload: unknown) => ((q.op = "update"), (q.payload = payload), builder);
    builder.single = run;
    builder.maybeSingle = run;
    builder.then = (ok: (v: unknown) => unknown, bad: (e: unknown) => unknown) => run().then(ok, bad);
    return builder;
  };

  const admin = {
    from,
    rpc: (name: string, args: Record<string, unknown>) => {
      rpcs.push({ name, args });
      return Promise.resolve({ error: null, ...rpcResult(name) });
    },
  };
  return {
    admin: admin as never,
    ops,
    rpcs,
    onRpc: (fn: typeof rpcResult) => (rpcResult = fn),
  };
}

const order = {
  id: "order-1",
  user_id: "user-1",
  customer_email: "ada@x.test",
  kind: "subscription",
  course_id: "junior-web-creator",
  status: "pending",
  currency: "NGN",
  amount: "50000.00",
  tx_ref: "sub_abc",
  is_renewal: false,
};

const tx = (over: Record<string, unknown> = {}) => ({
  id: 4242,
  tx_ref: "sub_abc",
  status: "successful",
  amount: 50000,
  charged_amount: 50700,
  currency: "NGN",
  created_at: "2026-11-05T10:00:00.000Z",
  customer: { email: "Ada@X.test" },
  ...over,
});

const ctx = { event: "charge.completed", payload: { raw: true } };

beforeEach(() => {
  for (const f of Object.values(flw)) f.mockReset();
  sendEmail.mockClear();
});

describe("processCharge — first charge", () => {
  it("re-verifies, fulfils, stores the Flutterwave subscription id and sends a receipt", async () => {
    flw.verifyTransaction.mockResolvedValue(tx());
    flw.findSubscriptionId.mockResolvedValue(777);
    const db = fakeAdmin((q) => (q.table === "orders" && q.op === "select" ? { data: order } : {}));
    db.onRpc(() => ({ data: { outcome: "enrolled", subscription_id: "sub-1" } }));

    const result = await processCharge(db.admin, 4242, ctx);

    expect(result.outcome).toBe("enrolled");
    expect(flw.verifyTransaction).toHaveBeenCalledWith(4242);
    expect(db.rpcs).toEqual([
      {
        name: "fulfil_subscription_order",
        args: { p_tx_ref: "sub_abc", p_flw_transaction_id: 4242, p_amount_paid: 50000, p_paid_at: "2026-11-05T10:00:00.000Z" },
      },
    ]);
    const subUpdate = db.ops.find((o) => o.table === "subscriptions" && o.op === "update");
    expect(subUpdate?.payload).toEqual({ flw_subscription_id: 777 });
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "ada@x.test", subject: expect.stringMatching(/enrolled/) }));
    const logged = db.ops.find((o) => o.table === "payment_events" && o.op === "insert");
    expect(logged?.payload).toMatchObject({ event: "charge.completed", flw_transaction_id: 4242, outcome: "enrolled" });
  });

  it("rejects an underpayment without fulfilling", async () => {
    flw.verifyTransaction.mockResolvedValue(tx({ amount: 100 }));
    const db = fakeAdmin((q) => (q.table === "orders" && q.op === "select" ? { data: order } : {}));

    const result = await processCharge(db.admin, 4242, ctx);

    expect(result.outcome).toBe("rejected");
    expect(db.rpcs).toHaveLength(0);
    expect(sendEmail).not.toHaveBeenCalled();
    const update = db.ops.find((o) => o.table === "orders" && o.op === "update");
    expect((update?.payload as { failure_reason: string }).failure_reason).toMatch(/Paid 100/);
  });

  it("marks a pending order failed when the charge failed", async () => {
    flw.verifyTransaction.mockResolvedValue(tx({ status: "failed" }));
    const db = fakeAdmin((q) => (q.table === "orders" && q.op === "select" ? { data: order } : {}));

    const result = await processCharge(db.admin, 4242, ctx);

    expect(result.outcome).toBe("failed");
    const update = db.ops.find((o) => o.table === "orders" && o.op === "update");
    expect(update?.payload).toMatchObject({ status: "failed" });
    expect(update?.filters).toContainEqual(["eq", ["status", "pending"]]);
  });

  it("cancels the new subscription at Flutterwave when the learner already had a seat", async () => {
    flw.verifyTransaction.mockResolvedValue(tx());
    flw.findSubscriptionId.mockResolvedValue(778);
    const db = fakeAdmin((q) => (q.table === "orders" && q.op === "select" ? { data: order } : {}));
    db.onRpc(() => ({ data: { outcome: "already_enrolled", subscription_id: "sub-2" } }));

    const result = await processCharge(db.admin, 4242, ctx);

    expect(result.outcome).toBe("already_enrolled");
    expect(flw.cancelSubscription).toHaveBeenCalledWith(778);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("does nothing more for a duplicate delivery", async () => {
    flw.verifyTransaction.mockResolvedValue(tx());
    const db = fakeAdmin((q) => (q.table === "orders" && q.op === "select" ? { data: { ...order, status: "paid" } } : {}));
    db.onRpc(() => ({ data: { outcome: "duplicate", subscription_id: "sub-1" } }));

    expect((await processCharge(db.admin, 4242, ctx)).outcome).toBe("duplicate");
    expect(flw.findSubscriptionId).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("propagates verification errors so the webhook is retried", async () => {
    flw.verifyTransaction.mockRejectedValue(new Error("unreachable"));
    const db = fakeAdmin(() => ({}));
    await expect(processCharge(db.admin, 4242, ctx)).rejects.toThrow("unreachable");
    expect(db.ops).toHaveLength(0);
  });
});

describe("processCharge — renewals", () => {
  const live = [
    {
      id: "sub-1",
      user_id: "user-1",
      course_id: "junior-web-creator",
      first_tx_ref: "sub_abc",
      currency: "NGN",
      amount: "50000.00",
      current_period_end: "2026-12-05T10:00:00Z",
      customer_email: "ada@x.test",
      status: "active",
    },
  ];

  it("matches by lower-cased email and records the renewal", async () => {
    flw.verifyTransaction.mockResolvedValue(tx({ id: 5000, tx_ref: "rave-renewal-1" }));
    const db = fakeAdmin((q) => {
      if (q.table === "orders" && q.op === "select") return { data: null };
      if (q.table === "subscriptions" && q.op === "select") return { data: live };
      return {};
    });
    db.onRpc(() => ({ data: { outcome: "renewed" } }));

    const result = await processCharge(db.admin, 5000, ctx);

    expect(result.outcome).toBe("renewed");
    const lookup = db.ops.find((o) => o.table === "subscriptions" && o.op === "select");
    expect(lookup?.filters).toContainEqual(["eq", ["customer_email", "ada@x.test"]]);
    expect(db.rpcs[0]).toEqual({
      name: "record_renewal",
      args: {
        p_subscription_id: "sub-1",
        p_tx_ref: "rave-renewal-1",
        p_flw_transaction_id: 5000,
        p_amount_paid: 50000,
        p_paid_at: "2026-11-05T10:00:00.000Z",
      },
    });
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ subject: expect.stringMatching(/Payment received/) }));
  });

  it("marks the subscription past due when a renewal fails", async () => {
    flw.verifyTransaction.mockResolvedValue(tx({ id: 5001, tx_ref: "rave-renewal-2", status: "failed" }));
    const db = fakeAdmin((q) => {
      if (q.table === "orders" && q.op === "select") return { data: null };
      if (q.table === "subscriptions" && q.op === "select") return { data: live };
      return {};
    });

    expect((await processCharge(db.admin, 5001, ctx)).outcome).toBe("failed");
    const update = db.ops.find((o) => o.table === "subscriptions" && o.op === "update");
    expect(update?.payload).toMatchObject({ status: "past_due" });
    expect(db.rpcs).toHaveLength(0);
  });

  it("logs charges it can't match instead of guessing", async () => {
    flw.verifyTransaction.mockResolvedValue(tx({ id: 5002, tx_ref: "rave-x", amount: 12345 }));
    const db = fakeAdmin((q) => {
      if (q.table === "orders" && q.op === "select") return { data: null };
      if (q.table === "subscriptions" && q.op === "select") return { data: live };
      return {};
    });

    expect((await processCharge(db.admin, 5002, ctx)).outcome).toBe("unmatched");
    expect(db.rpcs).toHaveLength(0);
    const logged = db.ops.find((o) => o.table === "payment_events" && o.op === "insert");
    expect(logged?.payload).toMatchObject({ outcome: "unmatched" });
  });
});

describe("processCharge — notices", () => {
  const live = [
    { id: "sub-1", user_id: "user-1", course_id: "c", first_tx_ref: "sub_abc", currency: "NGN", amount: "50000.00", current_period_end: "2026-12-05T10:00:00Z", customer_email: "ada@x.test", status: "active" },
  ];

  const failing = (nowPastDue: unknown) =>
    fakeAdmin((q) => {
      if (q.table === "orders" && q.op === "select") return { data: null };
      if (q.table === "subscriptions" && q.op === "select") return { data: live };
      if (q.table === "subscriptions" && q.op === "update") return { data: nowPastDue };
      return {};
    });

  it("tells the learner the first time a renewal fails", async () => {
    flw.verifyTransaction.mockResolvedValue(tx({ id: 5001, tx_ref: "rave-1", status: "failed" }));
    await processCharge(failing([{ id: "sub-1" }]).admin, 5001, ctx);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "ada@x.test", subject: expect.stringMatching(/didn't go through/) }));
  });

  it("stays quiet on later retries", async () => {
    flw.verifyTransaction.mockResolvedValue(tx({ id: 5002, tx_ref: "rave-2", status: "failed" }));
    await processCharge(failing([]).admin, 5002, ctx);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("words a self-paced yearly receipt for what was bought", async () => {
    flw.verifyTransaction.mockResolvedValue(tx());
    flw.findSubscriptionId.mockResolvedValue(777);
    const db = fakeAdmin((q) => {
      if (q.table === "orders" && q.op === "select") return { data: order };
      if (q.table === "subscriptions" && q.op === "select") {
        return { data: { offerings: { kind: "self_paced" }, payment_plans: { interval: "yearly" } } };
      }
      return {};
    });
    db.onRpc(() => ({ data: { outcome: "enrolled", subscription_id: "sub-1" } }));
    await processCharge(db.admin, 4242, ctx);
    const text = sendEmail.mock.calls[0][0].paragraphs.join(" ");
    expect(text).toMatch(/renews every year/);
    expect(text).toMatch(/lessons are ready/);
    expect(text).not.toMatch(/class group/);
  });
});

describe("startCheckout", () => {
  const user = { id: "user-1", email: "ada@x.test" } as never;
  const offering = {
    id: "o1", kind: "self_paced", price_usd: "10.00", price_ngn: "15000.00",
    yearly_price_usd: "100.00", yearly_price_ngn: "150000.00", is_active: true,
  };

  function checkoutDb(over: { enrollment?: unknown; live?: number; offering?: unknown; plan?: unknown } = {}) {
    return fakeAdmin((q) => {
      if (q.table === "courses") return { data: { id: "c", title: "Course", is_published: true } };
      if (q.table === "offerings") return { data: "offering" in over ? over.offering : offering };
      if (q.table === "profiles") return { data: { full_name: "Ada" } };
      if (q.table === "enrollments") return { data: over.enrollment ?? null };
      if (q.table === "subscriptions") return { count: over.live ?? 0 } as never;
      if (q.table === "payment_plans" && q.op === "select") return { data: over.plan ?? null };
      if (q.table === "payment_plans") return { data: { id: "p1", flw_plan_id: 99 } };
      if (q.table === "orders") return { data: { id: "ord-1" } };
      return {};
    });
  }

  beforeEach(() => {
    flw.createPaymentPlan.mockResolvedValue(99);
    flw.createCheckoutLink.mockResolvedValue("https://pay.test/x");
  });

  it("creates a yearly plan and charges the yearly price", async () => {
    const db = checkoutDb();
    const result = await startCheckout(db.admin, user, { courseId: "c", kind: "self_paced", currency: "USD", interval: "yearly" });
    expect(result.link).toBe("https://pay.test/x");
    expect(flw.createPaymentPlan).toHaveBeenCalledWith(expect.objectContaining({ amount: 100, currency: "USD", interval: "yearly" }));
    expect(flw.createCheckoutLink).toHaveBeenCalledWith(expect.objectContaining({ amount: 100, paymentPlan: 99 }));
    expect(db.ops.find((o) => o.table === "orders" && o.op === "insert")?.payload).toMatchObject({ amount: 100 });
  });

  it("defaults to monthly and reuses a matching plan", async () => {
    const db = checkoutDb({ plan: { id: "p9", flw_plan_id: 7 } });
    await startCheckout(db.admin, user, { courseId: "c", kind: "self_paced", currency: "NGN" });
    expect(flw.createPaymentPlan).not.toHaveBeenCalled();
    const lookup = db.ops.find((o) => o.table === "payment_plans");
    expect(lookup?.filters).toContainEqual(["eq", ["interval", "monthly"]]);
    expect(flw.createCheckoutLink).toHaveBeenCalledWith(expect.objectContaining({ amount: 15000, paymentPlan: 7 }));
  });

  it("refuses a yearly charge for live classes", async () => {
    const attempt = startCheckout(checkoutDb({ offering: { ...offering, kind: "cohort_group" } }).admin, user, {
      courseId: "c", kind: "cohort_group", currency: "USD", interval: "yearly",
    });
    await expect(attempt).rejects.toBeInstanceOf(CheckoutError);
    expect(flw.createCheckoutLink).not.toHaveBeenCalled();
  });

  it("refuses yearly when no yearly price is set", async () => {
    const attempt = startCheckout(checkoutDb({ offering: { ...offering, yearly_price_usd: null, yearly_price_ngn: null } }).admin, user, {
      courseId: "c", kind: "self_paced", currency: "USD", interval: "yearly",
    });
    await expect(attempt).rejects.toThrow(/no price/);
  });

  it("refuses someone who already has full access", async () => {
    const attempt = startCheckout(checkoutDb({ enrollment: { source: "manual" } }).admin, user, { courseId: "c", kind: "self_paced", currency: "USD" });
    await expect(attempt).rejects.toThrow(/already enrolled/);
  });
});

describe("runDailyBilling — notices", () => {
  const now = new Date("2026-11-20T06:00:00Z");
  const sub = (over: object) => ({
    id: "s1", user_id: "user-1", course_id: "c", customer_email: "ada@x.test",
    current_period_end: "2026-11-25T00:00:00Z", amount: "100.00", currency: "USD", renewal_reminder_for: null, ...over,
  });

  function dailyDb(rows: { ending?: unknown[]; yearly?: unknown[] }) {
    const db = fakeAdmin((q) => {
      if (q.table === "subscriptions" && q.op === "select") {
        const isYearly = q.filters.some(([m, a]) => m === "eq" && (a as unknown[])[0] === "payment_plans.interval");
        return { data: isYearly ? (rows.yearly ?? []) : (rows.ending ?? []) };
      }
      if (q.table === "orders" && q.op === "select") return { data: [] };
      return {};
    });
    db.onRpc(() => ({ data: (rows.ending ?? []).length }));
    return db;
  }

  it("tells people whose subscription just ended", async () => {
    const db = dailyDb({ ending: [sub({})] });
    expect((await runDailyBilling(db.admin, now)).expired).toBe(1);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ subject: expect.stringMatching(/has ended/) }));
  });

  it("reminds yearly subscribers once and records it", async () => {
    const db = dailyDb({ yearly: [sub({})] });
    expect((await runDailyBilling(db.admin, now)).reminders).toBe(1);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ subject: expect.stringMatching(/renews soon/) }));
    const mark = db.ops.find((o) => o.table === "subscriptions" && o.op === "update");
    expect(mark?.payload).toEqual({ renewal_reminder_for: "2026-11-25T00:00:00Z" });
  });

  it("doesn't repeat a reminder for the same renewal", async () => {
    const db = dailyDb({ yearly: [sub({ renewal_reminder_for: "2026-11-25T00:00:00.000Z" })] });
    expect((await runDailyBilling(db.admin, now)).reminders).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("reminds again for the next year's renewal", async () => {
    const db = dailyDb({ yearly: [sub({ renewal_reminder_for: "2025-11-25T00:00:00Z" })] });
    expect((await runDailyBilling(db.admin, now)).reminders).toBe(1);
  });

  it("tries again tomorrow if the reminder email fails", async () => {
    sendEmail.mockResolvedValueOnce(false);
    const db = dailyDb({ yearly: [sub({})] });
    expect((await runDailyBilling(db.admin, now)).reminders).toBe(0);
    expect(db.ops.find((o) => o.table === "subscriptions" && o.op === "update")).toBeUndefined();
  });
});
