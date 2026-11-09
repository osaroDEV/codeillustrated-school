import { describe, expect, it } from "vitest";
import {
  chargeProblem,
  formatMoney,
  hasSeatAccess,
  matchRenewal,
  newTxRef,
  resolveCurrency,
  subscriptionCovers,
  checkoutAmount,
  intervalNoun,
  monthlyEquivalent,
} from "./billing";

describe("resolveCurrency", () => {
  it("honours NGN for visitors in Nigeria", () => {
    expect(resolveCurrency("NGN", "NG")).toBe("NGN");
    expect(resolveCurrency("NGN", "ng")).toBe("NGN");
  });

  it("charges USD when NGN is requested from elsewhere", () => {
    expect(resolveCurrency("NGN", "GB")).toBe("USD");
  });

  it("uses the request without a country header (local development)", () => {
    expect(resolveCurrency("NGN", null)).toBe("NGN");
  });

  it("always allows USD", () => {
    expect(resolveCurrency("USD", "NG")).toBe("USD");
  });
});

describe("chargeProblem", () => {
  const order = { tx_ref: "sub_abc", currency: "NGN", amount: "50000.00" };
  const tx = { tx_ref: "sub_abc", status: "successful", currency: "NGN", amount: 50000 };

  it("accepts a matching successful charge", () => {
    expect(chargeProblem(order, tx)).toBeNull();
  });

  it("accepts an overpayment", () => {
    expect(chargeProblem(order, { ...tx, amount: 50001 })).toBeNull();
  });

  it.each([
    [{ status: "failed" }, /status is failed/],
    [{ tx_ref: "sub_other" }, /tx_ref/],
    [{ currency: "USD" }, /Paid in USD/],
    [{ amount: 49999 }, /Paid 49999/],
  ])("rejects %o", (change, message) => {
    expect(chargeProblem(order, { ...tx, ...change })).toMatch(message);
  });
});

describe("matchRenewal", () => {
  const sub = (id: string, over: Partial<{ first_tx_ref: string; currency: string; amount: number; current_period_end: string }> = {}) => ({
    id,
    first_tx_ref: `sub_${id}`,
    currency: "NGN",
    amount: 50000,
    current_period_end: "2026-12-05T00:00:00Z",
    ...over,
  });

  it("prefers a tx_ref derived from the first checkout", () => {
    const subs = [sub("a"), sub("b")];
    expect(matchRenewal(subs, { tx_ref: "sub_b_renewal_1", currency: "NGN", amount: 50000 })?.id).toBe("b");
  });

  it("falls back to currency and amount, soonest due first", () => {
    const subs = [
      sub("later", { current_period_end: "2026-12-20T00:00:00Z" }),
      sub("sooner", { current_period_end: "2026-12-01T00:00:00Z" }),
      sub("usd", { currency: "USD", amount: 40 }),
    ];
    expect(matchRenewal(subs, { tx_ref: "rave-123", currency: "NGN", amount: 50000 })?.id).toBe("sooner");
    expect(matchRenewal(subs, { tx_ref: "rave-123", currency: "USD", amount: 40 })?.id).toBe("usd");
  });

  it("returns null when nothing matches", () => {
    expect(matchRenewal([sub("a")], { tx_ref: "x", currency: "NGN", amount: 1 })).toBeNull();
    expect(matchRenewal([], { tx_ref: "x", currency: "NGN", amount: 50000 })).toBeNull();
  });
});

describe("subscriptionCovers / hasSeatAccess", () => {
  const now = new Date("2026-12-10T00:00:00Z");

  it("covers the paid period plus three days' grace", () => {
    expect(subscriptionCovers({ status: "active", current_period_end: "2026-12-07T00:00:01Z" }, now)).toBe(true);
    expect(subscriptionCovers({ status: "active", current_period_end: "2026-12-06T23:59:59Z" }, now)).toBe(false);
  });

  it("keeps a cancelled subscription's seat until the period ends", () => {
    expect(subscriptionCovers({ status: "cancelled", current_period_end: "2026-12-31T00:00:00Z" }, now)).toBe(true);
  });

  it("never covers an expired subscription", () => {
    expect(subscriptionCovers({ status: "expired", current_period_end: "2027-01-31T00:00:00Z" }, now)).toBe(false);
  });

  it("gives manual and code enrolments access without a subscription", () => {
    expect(hasSeatAccess({ source: "manual" }, null, now)).toBe(true);
    expect(hasSeatAccess({ source: "code" }, null, now)).toBe(true);
    expect(hasSeatAccess({ source: "subscription" }, null, now)).toBe(false);
  });
});

describe("helpers", () => {
  it("makes unique sub_ tx_refs", () => {
    const a = newTxRef();
    expect(a).toMatch(/^sub_[\w-]{20}$/);
    expect(newTxRef()).not.toBe(a);
  });

  it("formats money", () => {
    expect(formatMoney(50000, "NGN")).toBe("₦50,000");
    expect(formatMoney("49.5", "USD")).toBe("$49.5");
  });
});

describe("checkoutAmount", () => {
  const offering = { price_usd: "10.00", price_ngn: "15000.00", yearly_price_usd: "100.00", yearly_price_ngn: "150000.00" };

  it("picks the price for the currency and billing period", () => {
    expect(checkoutAmount(offering, "USD", "monthly")).toBe(10);
    expect(checkoutAmount(offering, "NGN", "monthly")).toBe(15000);
    expect(checkoutAmount(offering, "USD", "yearly")).toBe(100);
    expect(checkoutAmount(offering, "NGN", "yearly")).toBe(150000);
  });

  it("is null when that option isn't priced", () => {
    expect(checkoutAmount({ price_usd: 10, price_ngn: 0 }, "NGN", "monthly")).toBeNull();
    expect(checkoutAmount({ price_usd: 10, price_ngn: 10, yearly_price_usd: null, yearly_price_ngn: null }, "USD", "yearly")).toBeNull();
    expect(checkoutAmount({ price_usd: 10, price_ngn: 10 }, "USD", "yearly")).toBeNull();
  });
});

describe("billing periods", () => {
  it("names the period", () => {
    expect(intervalNoun("monthly")).toBe("month");
    expect(intervalNoun("yearly")).toBe("year");
    expect(intervalNoun(undefined)).toBe("month");
  });

  it("spreads yearly plans over twelve months for recurring revenue", () => {
    expect(monthlyEquivalent(120, "yearly")).toBe(10);
    expect(monthlyEquivalent(100, "yearly")).toBe(8.33);
    expect(monthlyEquivalent(50, "monthly")).toBe(50);
  });
});
