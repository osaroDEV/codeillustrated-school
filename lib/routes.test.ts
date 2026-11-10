import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ACCOUNT_PATHS, isAppChromeFree, loginPath, signupPath, verifyEmailPath } from "./routes";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextConfig = require("../next.config.js");
const ROOT = join(__dirname, "..");

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
    const redirects: { source: string; destination: string; permanent: boolean }[] = (await nextConfig.redirects()).filter(
      (r: { source: string }) => r.source.startsWith("/auth/")
    );
    expect(redirects.map((r) => r.destination).sort()).toEqual([...ACCOUNT_PATHS].sort());
    for (const r of redirects) {
      expect(r.source).toBe(`/auth${r.destination}`);
      expect(r.permanent).toBe(true);
    }
    expect(redirects.some((r) => r.source === "/auth/confirm")).toBe(false);
  });
});

describe("site address", () => {
  it("serves the site from the root, sending old /academy and /labs links on", async () => {
    expect(nextConfig.basePath).toBeUndefined();
    const redirects: { source: string; destination: string; permanent: boolean }[] = await nextConfig.redirects();
    const to = (source: string) => redirects.find((r) => r.source === source);
    expect(to("/academy")).toMatchObject({ destination: "/", permanent: true });
    expect(to("/academy/:path((?!api(?:/|$)).*)")).toMatchObject({ destination: "/:path", permanent: true });
    expect(to("/labs")).toMatchObject({ destination: "https://labs.codeillustrated.com", permanent: true });
    expect(to("/labs/:path*")).toMatchObject({ destination: "https://labs.codeillustrated.com/:path*" });
    // webhooks and the scheduler still POST to /academy/api/…: served in place, not redirected
    const rewrites = await nextConfig.rewrites();
    expect(rewrites.beforeFiles).toContainEqual({ source: "/academy/api/:path*", destination: "/api/:path*" });
  });

  it("has no hard-coded /academy paths left in the code", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(ts|tsx|js|json|sql|toml|html)$/.test(name) && !name.includes(".test.") && /["'`(]\/academy\b/.test(readFileSync(full, "utf8"))) {
          offenders.push(full);
        }
      }
    };
    for (const dir of ["app", "components", "lib", "hooks", "supabase/sql", "supabase/templates"]) walk(join(ROOT, dir));
    for (const file of ["middleware.ts", "vercel.json", "supabase/config.toml"]) {
      if (/["'`(]\/academy\b|codeillustrated\.com\/academy/.test(readFileSync(join(ROOT, file), "utf8"))) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});
