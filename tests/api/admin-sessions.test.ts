// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { PATCH } from "@/app/api/admin/sessions/[id]/route";

const { state, update } = vi.hoisted(() => ({
  state: { role: "admin", recording: "https://rec.test/old" as string | null },
  update: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  createAdminClient: () => ({
    from: () => ({
      update: (fields: unknown) => {
        update(fields);
        return { eq: () => ({ select: () => ({ single: async () => ({ data: {}, error: null }) }) }) };
      },
    }),
  }),
}));
vi.mock("@/lib/supabase-server", () => ({
  requireStaffApi: async () => ({ user: { id: "u1" }, role: state.role }),
  rejectNonAdmin: async () => null,
}));
vi.mock("@/lib/cohorts", async (original) => ({
  ...(await original<typeof import("@/lib/cohorts")>()),
  loadSessionForStaff: async () => ({ session: { recording_url: state.recording }, cohort: {} }),
}));

const patch = (body: unknown) =>
  PATCH(new NextRequest("https://x.test/academy/api/admin/sessions/s1", { method: "PATCH", body: JSON.stringify(body) }), {
    params: Promise.resolve({ id: "s1" }),
  });

beforeEach(() => {
  state.role = "admin";
  state.recording = "https://rec.test/old";
  update.mockClear();
});

describe("sharing a recording with self-paced subscribers", () => {
  it("lets an admin share and unshare", async () => {
    expect((await patch({ shared_with_self_paced: true })).status).toBe(200);
    expect(update).toHaveBeenLastCalledWith({ shared_with_self_paced: true });
    await patch({ shared_with_self_paced: false });
    expect(update).toHaveBeenLastCalledWith({ shared_with_self_paced: false });
  });

  it("refuses an instructor", async () => {
    state.role = "instructor";
    const res = await patch({ shared_with_self_paced: true });
    expect(res.status).toBe(403);
    expect((await res.json()).error).toContain("shared_with_self_paced");
    expect(update).not.toHaveBeenCalled();
  });

  it("clears sharing when an instructor swaps in a different video", async () => {
    state.role = "instructor";
    await patch({ recording_url: "https://rec.test/new" });
    expect(update).toHaveBeenCalledWith({ recording_url: "https://rec.test/new", shared_with_self_paced: false });
  });

  it("clears sharing when an instructor removes the video", async () => {
    state.role = "instructor";
    await patch({ recording_url: "" });
    expect(update).toHaveBeenCalledWith({ recording_url: null, shared_with_self_paced: false });
  });

  it("keeps sharing when an instructor saves the same video", async () => {
    state.role = "instructor";
    await patch({ recording_url: "https://rec.test/old", meeting_url: "https://meet.test/x" });
    expect(update).toHaveBeenCalledWith({ recording_url: "https://rec.test/old", meeting_url: "https://meet.test/x" });
  });

  it("doesn't touch sharing when an instructor only changes the meeting link", async () => {
    state.role = "instructor";
    await patch({ meeting_url: "https://meet.test/x" });
    expect(update).toHaveBeenCalledWith({ meeting_url: "https://meet.test/x" });
  });

  it("lets an admin replace the video and keep it shared", async () => {
    await patch({ recording_url: "https://rec.test/new", shared_with_self_paced: true });
    expect(update).toHaveBeenCalledWith({ recording_url: "https://rec.test/new", shared_with_self_paced: true });
  });
});
