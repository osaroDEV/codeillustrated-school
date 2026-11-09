// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getSession: async () => ({ data: { session: null } }) } }),
}));

import { middleware } from "@/middleware";

describe("middleware", () => {
  it("sends signed-out visitors to /login with an absolute URL, keeping their place", async () => {
    const req = new NextRequest("https://codeillustrated.com/academy/admin/learners", { nextConfig: { basePath: "/academy" } });
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://codeillustrated.com/academy/login?redirectTo=%2Fadmin%2Flearners");
  });
});
