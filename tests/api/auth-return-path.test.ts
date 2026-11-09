// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
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
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth: { signUp } }) }));
vi.mock("@/lib/supabase", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
      upsert: async () => ({ error: null }),
    }),
    auth: { admin: { deleteUser: vi.fn() } },
  }),
}));

const link = (type: string) => new NextRequest(`https://x.test/academy/auth/confirm?token_hash=abc&type=${type}`);

beforeEach(() => {
  state.verifyError = null;
  state.nextPath = undefined;
  signUp.mockReset().mockResolvedValue({ data: { user: { id: "u1", identities: [{}] } }, error: null });
});

describe("verification link", () => {
  it("lands a new learner on the dashboard", async () => {
    expect((await confirm(link("email"))).headers.get("location")).toBe("/academy/dashboard");
  });

  it("brings them back to the course they were enrolling in", async () => {
    state.nextPath = "/courses/junior-web-creator#enroll";
    expect((await confirm(link("signup"))).headers.get("location")).toBe("/academy/courses/junior-web-creator#enroll");
  });

  it("ignores a return path to another site", async () => {
    state.nextPath = "//evil.test/phish";
    expect((await confirm(link("email"))).headers.get("location")).toBe("/academy/dashboard");
  });

  it("sends password resets and bad links to the new account pages", async () => {
    expect((await confirm(link("recovery"))).headers.get("location")).toBe("/academy/reset-password");
    state.verifyError = { message: "expired" };
    expect((await confirm(link("email"))).headers.get("location")).toBe("/academy/login?error=link_invalid");
  });
});

describe("signup", () => {
  const post = (body: object) =>
    completeSignup(
      new NextRequest("https://x.test/academy/api/auth/complete-signup", { method: "POST", body: JSON.stringify(body) })
    );
  const base = { email: "new@x.test", password: "password123", fullName: "New Learner" };

  it("saves the course to return to once verified", async () => {
    expect((await post({ ...base, redirectTo: "/courses/web#enroll" })).status).toBe(201);
    expect(signUp.mock.calls[0][0].options.data).toEqual({ full_name: "New Learner", next_path: "/courses/web#enroll" });
  });

  it("drops a return path to another site", async () => {
    await post({ ...base, redirectTo: "https://evil.test" });
    expect(signUp.mock.calls[0][0].options.data).toEqual({ full_name: "New Learner" });
  });
});
