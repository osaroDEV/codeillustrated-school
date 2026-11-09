// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

import { DELETE, POST } from "@/app/api/lessons/[id]/progress/route";
import { GET as getFile } from "@/app/api/lesson-blocks/[id]/file/route";

const { state, upsert, del, signedFileUrl } = vi.hoisted(() => ({
  state: {
    user: { id: "u1", email_confirmed_at: "2026-01-01" } as object | null,
    found: null as unknown,
    block: null as null | { lesson_id: string; file_path: string | null },
  },
  upsert: vi.fn(async () => ({ error: null })),
  del: vi.fn(),
  signedFileUrl: vi.fn(async () => "https://storage.test/signed?token=abc"),
}));

vi.mock("@/lib/supabase", () => ({
  createAdminClient: () => ({
    from: () => ({
      upsert,
      delete: () => ({ eq: () => ({ eq: del }) }),
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.block }) }) }) }),
    }),
  }),
}));
vi.mock("@/lib/supabase-server", () => ({
  getCurrentUser: async () => state.user,
  isEmailVerified: (u: { email_confirmed_at?: string }) => !!u.email_confirmed_at,
  requireVerifiedUserApi: async () =>
    state.user ? { user: state.user } : { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) },
}));
vi.mock("@/lib/lessons", () => ({ loadLesson: async () => state.found, signedFileUrl }));

const LESSON = "11111111-1111-4111-8111-111111111111";
const ctx = { params: Promise.resolve({ id: LESSON }) };
const req = new NextRequest(`https://x.test/academy/api/lessons/${LESSON}/progress`, { method: "POST" });
const found = (access: string) => ({
  lesson: { id: LESSON },
  courseId: "c1",
  seat: { access, source: "manual", cohortId: null },
});

beforeEach(() => {
  state.user = { id: "u1", email_confirmed_at: "2026-01-01" };
  state.found = found("enrolled");
  state.block = { lesson_id: LESSON, file_path: "lessons/abc-notes.pdf" };
  upsert.mockClear();
  del.mockReset().mockResolvedValue({ error: null });
  signedFileUrl.mockClear();
});

describe("lesson progress", () => {
  it("requires sign-in", async () => {
    state.user = null;
    expect((await POST(req, ctx)).status).toBe(401);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("records a completion for a learner with a seat", async () => {
    expect((await POST(req, ctx)).status).toBe(200);
    expect(upsert).toHaveBeenCalledWith(
      { user_id: "u1", lesson_id: LESSON },
      { onConflict: "user_id,lesson_id", ignoreDuplicates: true }
    );
  });

  it.each(["none", "lapsed", "preview", "staff"])("refuses %s", async (access) => {
    state.found = found(access);
    expect((await POST(req, ctx)).status).toBe(403);
    expect((await DELETE(req, ctx)).status).toBe(403);
    expect(upsert).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });

  it("404s an unknown lesson", async () => {
    state.found = null;
    expect((await POST(req, ctx)).status).toBe(404);
  });

  it("can be undone", async () => {
    expect((await DELETE(req, ctx)).status).toBe(200);
    expect(del).toHaveBeenCalledWith("lesson_id", LESSON);
  });
});

describe("lesson files", () => {
  it("sends someone with access to a short-lived link", async () => {
    const res = await getFile(req, ctx);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://storage.test/signed?token=abc");
  });

  it("sends signed-out visitors to login without a file link", async () => {
    state.user = null;
    const res = await getFile(req, ctx);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("/academy/auth/login");
    expect(signedFileUrl).not.toHaveBeenCalled();
  });

  it.each(["none", "lapsed"])("refuses %s without creating a link", async (access) => {
    state.found = found(access);
    expect((await getFile(req, ctx)).status).toBe(403);
    expect(signedFileUrl).not.toHaveBeenCalled();
  });

  it("allows a free preview's file", async () => {
    state.found = found("preview");
    expect((await getFile(req, ctx)).status).toBe(303);
  });

  it("404s a block that isn't a file", async () => {
    state.block = null;
    expect((await getFile(req, ctx)).status).toBe(404);
    expect(signedFileUrl).not.toHaveBeenCalled();
  });

  it("404s a file in a lesson hidden from this person", async () => {
    state.found = null;
    expect((await getFile(req, ctx)).status).toBe(404);
    expect(signedFileUrl).not.toHaveBeenCalled();
  });
});
