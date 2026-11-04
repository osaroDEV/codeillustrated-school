// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "@/app/api/payments/flutterwave/webhook/route";

const { processCharge, applySubscriptionCancelled } = vi.hoisted(() => ({
  processCharge: vi.fn(),
  applySubscriptionCancelled: vi.fn(),
}));
vi.mock("@/lib/billing-server", () => ({ processCharge, applySubscriptionCancelled }));
vi.mock("@/lib/supabase", () => ({ createAdminClient: () => ({}) }));

const post = (body: unknown, hash: string | null = "test-hash") =>
  POST(
    new NextRequest("https://x.test/academy/api/payments/flutterwave/webhook", {
      method: "POST",
      headers: { "content-type": "application/json", ...(hash ? { "verif-hash": hash } : {}) },
      body: JSON.stringify(body),
    })
  );

beforeEach(() => {
  process.env.FLW_SECRET_HASH = "test-hash";
  processCharge.mockReset();
  applySubscriptionCancelled.mockReset();
});

describe("Flutterwave webhook", () => {
  it("rejects a missing or wrong verif-hash without touching anything", async () => {
    expect((await post({ event: "charge.completed", data: { id: 1 } }, null)).status).toBe(401);
    expect((await post({ event: "charge.completed", data: { id: 1 } }, "nope")).status).toBe(401);
    expect(processCharge).not.toHaveBeenCalled();
  });

  it("processes charge.completed by transaction id", async () => {
    processCharge.mockResolvedValue({ outcome: "enrolled" });
    const res = await post({ event: "charge.completed", data: { id: 4242, tx_ref: "sub_x", status: "successful" } });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ outcome: "enrolled" });
    expect(processCharge).toHaveBeenCalledWith({}, 4242, expect.objectContaining({ event: "charge.completed" }));
  });

  it("routes subscription.cancelled", async () => {
    applySubscriptionCancelled.mockResolvedValue({ outcome: "cancelled" });
    const res = await post({ event: "subscription.cancelled", data: { plan: { id: 9 }, customer: { email: "a@b.test" } } });
    expect(res.status).toBe(200);
    expect(applySubscriptionCancelled).toHaveBeenCalled();
  });

  it("acknowledges events it doesn't handle", async () => {
    const res = await post({ event: "transfer.completed", data: { id: 1 } });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ outcome: "ignored" });
  });

  it("returns 500 so Flutterwave retries when processing fails", async () => {
    processCharge.mockRejectedValue(new Error("Flutterwave unreachable"));
    const res = await post({ event: "charge.completed", data: { id: 1 } });
    expect(res.status).toBe(500);
  });
});
