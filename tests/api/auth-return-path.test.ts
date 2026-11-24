// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET as confirm } from "@/app/auth/confirm/route";
import { POST as completeSignup } from "@/app/api/auth/complete-signup/route";

const { state, signUp } = vi.hoisted(() => ({
  state: { verifyError: null as null | { message: string }, nextPath: undefined as unknown },
  signUp: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  createServerSupabase: async () => ({
    auth: {
      verifyOtp: async () => ({ error: state.verifyError }),
      exchangeCodeForSession: async () => ({ error: null }),
      getUser: async () => ({ data: { user: { id: "u1", user_metadata: { next_path: state.nextPath } } } }),
    },
  }),
}));
vi.mock("@/lib/supabase", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
      upsert: async () => ({ error: null }),
    }),
    auth: { signUp, admin: { deleteUser: vi.fn() } },
  }),
}));

const link = (type: string) => new NextRequest(`https://x.test/auth/confirm?token_hash=abc&type=${type}`);

beforeEach(() => {
  state.verifyError = null;
  state.nextPath = undefined;
  signUp.mockReset().mockResolvedValue({ data: { user: { id: "u1", identities: [{}] } }, error: null });
});

describe("verification link", () => {
  it("lands a new learner on the dashboard", async () => {
    expect((await confirm(link("email"))).headers.get("location")).toBe("/dashboard");
  });

  it("brings them back to the course they were enrolling in", async () => {
    state.nextPath = "/courses/junior-web-creator#enroll";
    expect((await confirm(link("signup"))).headers.get("location")).toBe("/courses/junior-web-creator#enroll");
  });

  it("ignores a return path to another site", async () => {
    state.nextPath = "//evil.test/phish";
    expect((await confirm(link("email"))).headers.get("location")).toBe("/dashboard");
  });

  it("sends password resets and bad links to the new account pages", async () => {
    expect((await confirm(link("recovery"))).headers.get("location")).toBe("/reset-password");
    state.verifyError = { message: "expired" };
    expect((await confirm(link("email"))).headers.get("location")).toBe("/login?error=link_invalid");
  });
});

describe("signup", () => {
  const post = (body: object) =>
    completeSignup(
      new NextRequest("https://x.test/api/auth/complete-signup", { method: "POST", body: JSON.stringify(body) })
    );
  const base = { email: "new@x.test", password: "password123", fullName: "New Learner", formMs: 20_000 };

  it("saves the course to return to once verified", async () => {
    expect((await post({ ...base, redirectTo: "/courses/web#enroll" })).status).toBe(201);
    expect(signUp.mock.calls[0][0].options.data).toEqual({ full_name: "New Learner", next_path: "/courses/web#enroll" });
  });

  it("drops a return path to another site", async () => {
    await post({ ...base, redirectTo: "https://evil.test" });
    expect(signUp.mock.calls[0][0].options.data).toEqual({ full_name: "New Learner" });
  });
});

describe("signup bot checks", () => {
  const post = (body: object, headers: Record<string, string> = {}) =>
    completeSignup(
      new NextRequest("https://x.test/api/auth/complete-signup", { method: "POST", body: JSON.stringify(body), headers })
    );
  const base = { email: "new@x.test", password: "password123", fullName: "New Learner", formMs: 20_000 };

  it("refuses a form submitted too fast, with a message a person can act on", async () => {
    const res = await post({ ...base, formMs: 1_200 });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/press Create my account again/);
    expect(signUp).not.toHaveBeenCalled();
  });

  it("refuses requests that skip the signup page", async () => {
    const { formMs, ...direct } = base;
    void formMs;
    expect((await post(direct)).status).toBe(400);
    expect(signUp).not.toHaveBeenCalled();
  });

  it("pretends to succeed when the hidden field is filled, but creates nothing", async () => {
    const res = await post({ ...base, honeypot: "spam" });
    expect(res.status).toBe(201);
    expect(signUp).not.toHaveBeenCalled();
  });

  describe("with the CAPTCHA configured", () => {
    const fetchMock = vi.fn();
    beforeEach(() => {
      vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
      fetchMock.mockReset();
      vi.stubGlobal("fetch", fetchMock);
    });
    afterEach(() => {
      vi.unstubAllEnvs();
      vi.unstubAllGlobals();
    });

    it("refuses a signup without a passing check", async () => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: false })));
      const res = await post({ ...base, captchaToken: "bad" });
      expect(res.status).toBe(400);
      expect((await res.json()).code).toBe("captcha_failed");
      expect(signUp).not.toHaveBeenCalled();
    });

    it("signs up once the check passes, checking it against the visitor's IP", async () => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true })));
      const res = await post({ ...base, captchaToken: "good" }, { "x-real-ip": "203.0.113.9" });
      expect(res.status).toBe(201);
      expect(Object.fromEntries(fetchMock.mock.calls[0][1].body as URLSearchParams)).toMatchObject({
        response: "good",
        remoteip: "203.0.113.9",
      });
      expect(signUp).toHaveBeenCalledTimes(1);
    });
  });
});
