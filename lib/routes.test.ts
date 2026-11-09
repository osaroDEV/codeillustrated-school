import { describe, expect, it } from "vitest";
import { ACCOUNT_PATHS, isAppChromeFree, loginPath, signupPath, verifyEmailPath } from "./routes";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextConfig = require("../next.config.js");

describe("account routes", () => {
  it("carry a safe return path", () => {
    expect(loginPath()).toBe("/login");
    expect(loginPath("/admin")).toBe("/login?redirectTo=%2Fadmin");
    expect(signupPath("/courses/web#enroll")).toBe("/signup?redirectTo=%2Fcourses%2Fweb%23enroll");
    expect(loginPath("https://evil.test")).toBe("/login");
    expect(signupPath("//evil.test")).toBe("/signup");
    expect(verifyEmailPath("a+b@x.test")).toBe("/verify-email?email=a%2Bb%40x.test");
  });

  it("hide the site chrome on app and account pages only", () => {
    for (const p of ["/login", "/signup", "/verify-email", "/auth/confirm", "/dashboard", "/dashboard/courses", "/admin/learners"]) {
      expect(isAppChromeFree(p), p).toBe(true);
    }
    for (const p of ["/", "/courses", "/start", "/login-help", "/signups"]) {
      expect(isAppChromeFree(p), p).toBe(false);
    }
  });

  it("permanently redirect every old /auth page, and only those", async () => {
    const redirects: { source: string; destination: string; permanent: boolean }[] = await nextConfig.redirects();
    expect(redirects.map((r) => r.destination).sort()).toEqual([...ACCOUNT_PATHS].sort());
    for (const r of redirects) {
      expect(r.source).toBe(`/auth${r.destination}`);
      expect(r.permanent).toBe(true);
    }
    expect(redirects.some((r) => r.source === "/auth/confirm")).toBe(false);
  });
});
