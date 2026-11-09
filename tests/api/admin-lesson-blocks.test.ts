// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

import { PATCH } from "@/app/api/admin/lessons/[id]/route";

const { state, rpc, removeCourseFile, update } = vi.hoisted(() => ({
  state: { denied: false, lesson: { id: "l1" } as object | null, rpcResult: { data: [] as string[] | null, error: null as object | null } },
  rpc: vi.fn(),
  removeCourseFile: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  createAdminClient: () => {
    const chain = { eq: () => chain, select: () => chain, maybeSingle: async () => ({ data: state.lesson, error: null }) };
    return {
      rpc,
      from: () => ({
        update: (fields: unknown) => (update(fields), chain),
        select: () => chain,
      }),
    };
  },
}));
vi.mock("@/lib/supabase-server", () => ({
  rejectNonAdmin: async () => (state.denied ? NextResponse.json({ error: "Forbidden" }, { status: 403 }) : null),
}));
vi.mock("@/lib/lessons", () => ({ removeCourseFile }));
vi.mock("@/lib/catalogue-admin", () => ({ refreshCatalogue: vi.fn() }));

const ctx = { params: Promise.resolve({ id: "l1" }) };
const patch = (body: unknown) =>
  PATCH(new NextRequest("https://x.test/academy/api/admin/lessons/l1", { method: "PATCH", body: JSON.stringify(body) }), ctx);

const blocks = [
  { kind: "text", content: "Intro" },
  { kind: "video", video_url: "https://youtu.be/abcdefg" },
  { kind: "text", content: "Outro" },
];

beforeEach(() => {
  state.denied = false;
  state.lesson = { id: "l1" };
  state.rpcResult = { data: [], error: null };
  update.mockClear();
  removeCourseFile.mockClear();
  rpc.mockReset().mockImplementation(async () => state.rpcResult);
});

describe("PATCH /api/admin/lessons/[id] with blocks", () => {
  it("saves the fields and the blocks separately, in order", async () => {
    const res = await patch({ title: "New", blocks });
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ title: "New" });
    expect(rpc).toHaveBeenCalledWith("replace_lesson_blocks", { p_lesson_id: "l1", p_blocks: blocks });
  });

  it("can save only blocks", async () => {
    expect((await patch({ blocks })).status).toBe(200);
    expect(update).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("leaves blocks alone when none are sent", async () => {
    await patch({ title: "New" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("deletes files the lesson no longer uses", async () => {
    state.rpcResult = { data: ["lessons/old.pdf"], error: null };
    await patch({ blocks });
    expect(removeCourseFile).toHaveBeenCalledWith(expect.anything(), ["lessons/old.pdf"]);
  });

  it("keeps files when the blocks can't be saved", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    state.rpcResult = { data: null, error: { message: "boom" } };
    expect((await patch({ blocks })).status).toBe(500);
    expect(removeCourseFile).not.toHaveBeenCalled();
  });

  it("404s an unknown lesson without touching blocks", async () => {
    state.lesson = null;
    expect((await patch({ blocks })).status).toBe(404);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("is admin only", async () => {
    state.denied = true;
    expect((await patch({ blocks })).status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });
});
