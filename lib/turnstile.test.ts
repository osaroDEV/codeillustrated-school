// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstile } from "./turnstile";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("verifyTurnstile", () => {
  it("is skipped until a secret is configured", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    expect(await verifyTurnstile(undefined)).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires a token once configured", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    expect(await verifyTurnstile(undefined)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("asks Cloudflare, passing the visitor's IP", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true })));
    expect(await verifyTurnstile("tok", "203.0.113.9")).toBe(true);
    const body = fetchMock.mock.calls[0][1].body as URLSearchParams;
    expect(Object.fromEntries(body)).toEqual({ secret: "secret", response: "tok", remoteip: "203.0.113.9" });
  });

  it("rejects a failed check, and fails closed if Cloudflare can't be reached", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ success: false, "error-codes": ["invalid-input-response"] })));
    expect(await verifyTurnstile("bad")).toBe(false);
    fetchMock.mockRejectedValueOnce(new Error("network"));
    expect(await verifyTurnstile("tok")).toBe(false);
  });
});
