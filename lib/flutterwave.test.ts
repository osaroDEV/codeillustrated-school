// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelSubscription,
  createCheckoutLink,
  FlutterwaveError,
  verifyByReference,
  verifyTransaction,
  webhookHashMatches,
} from "./flutterwave";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  process.env.FLW_SECRET_KEY = "FLWSECK_TEST-123";
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

const reply = (status: number, body: unknown) =>
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));

describe("createCheckoutLink", () => {
  it("posts a card-only plan checkout and returns the link", async () => {
    reply(200, { status: "success", data: { link: "https://checkout.flutterwave.com/v3/hosted/pay/abc" } });
    const link = await createCheckoutLink({
      txRef: "sub_1",
      amount: 50000,
      currency: "NGN",
      redirectUrl: "https://codeillustrated.com/academy/checkout/complete",
      customer: { email: "a@b.test", name: "Ada" },
      paymentPlan: 9001,
      title: "Junior Web Creator",
    });
    expect(link).toMatch(/hosted\/pay/);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.flutterwave.com/v3/payments");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer FLWSECK_TEST-123");
    expect(JSON.parse(init.body)).toMatchObject({
      tx_ref: "sub_1",
      amount: 50000,
      currency: "NGN",
      payment_plan: 9001,
      payment_options: "card",
      customer: { email: "a@b.test", name: "Ada" },
    });
  });

  it("throws FlutterwaveError with the API message", async () => {
    reply(400, { status: "error", message: "Invalid currency" });
    await expect(
      createCheckoutLink({ txRef: "x", amount: 1, currency: "USD", redirectUrl: "u", customer: { email: "e" }, title: "t" })
    ).rejects.toThrow(new FlutterwaveError("Invalid currency", 400));
  });

  it("refuses to run without a secret key", async () => {
    delete process.env.FLW_SECRET_KEY;
    await expect(verifyTransaction(1)).rejects.toThrow(/FLW_SECRET_KEY/);
  });
});

describe("verify", () => {
  it("returns the transaction", async () => {
    reply(200, { status: "success", data: { id: 42, tx_ref: "sub_1", status: "successful", amount: 10, currency: "USD" } });
    expect((await verifyTransaction(42)).tx_ref).toBe("sub_1");
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.flutterwave.com/v3/transactions/42/verify");
  });

  it("returns null by reference when nothing was paid", async () => {
    reply(400, { status: "error", message: "No transaction was found for this id" });
    expect(await verifyByReference("sub_1")).toBeNull();
    expect(fetchMock.mock.calls[0][0]).toContain("verify_by_reference?tx_ref=sub_1");
  });

  it("rethrows server errors so callers can retry", async () => {
    reply(503, { status: "error", message: "Unavailable" });
    await expect(verifyByReference("sub_1")).rejects.toThrow("Unavailable");
  });

  it("wraps network failures", async () => {
    fetchMock.mockRejectedValueOnce(new Error("ECONNRESET"));
    await expect(verifyTransaction(1)).rejects.toThrow(/Could not reach Flutterwave/);
  });
});

describe("cancelSubscription", () => {
  it("PUTs to the cancel endpoint", async () => {
    reply(200, { status: "success", data: {} });
    await cancelSubscription(77);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.flutterwave.com/v3/subscriptions/77/cancel");
    expect(fetchMock.mock.calls[0][1].method).toBe("PUT");
  });
});

describe("webhookHashMatches", () => {
  it("compares the header with the secret hash", () => {
    expect(webhookHashMatches("s3cret-hash", "s3cret-hash")).toBe(true);
    expect(webhookHashMatches("s3cret-hasx", "s3cret-hash")).toBe(false);
    expect(webhookHashMatches("short", "s3cret-hash")).toBe(false);
  });

  it("fails closed without a header or configured secret", () => {
    expect(webhookHashMatches(null, "s3cret-hash")).toBe(false);
    expect(webhookHashMatches("anything", undefined)).toBe(false);
    expect(webhookHashMatches("", "")).toBe(false);
  });
});
