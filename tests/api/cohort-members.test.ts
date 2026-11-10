// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "@/app/api/admin/cohorts/[id]/members/route";

const { state, update } = vi.hoisted(() => ({ state: { kind: null as string | null }, update: vi.fn() }));

vi.mock("@/lib/supabase", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: { subscriptions: state.kind ? { offerings: { kind: state.kind } } : null } }),
        }),
      }),
      update: (fields: unknown) => {
        update(fields);
        return { eq: () => ({ select: () => ({ maybeSingle: async () => ({ data: { id: "e1" }, error: null }) }) }) };
      },
    }),
  }),
}));
vi.mock("@/lib/supabase-server", () => ({ rejectNonAdmin: async () => null }));

const ENROLMENT = "11111111-1111-4111-8111-111111111111";
const add = () =>
  POST(
    new NextRequest("https://x.test/api/admin/cohorts/k1/members", { method: "POST", body: JSON.stringify({ enrollment_id: ENROLMENT }) }),
    { params: Promise.resolve({ id: "k1" }) }
  );

beforeEach(() => {
  state.kind = null;
  update.mockClear();
});

describe("placing a learner in a cohort", () => {
  it("refuses a self-paced subscriber", async () => {
    state.kind = "self_paced";
    const res = await add();
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/self-paced/);
    expect(update).not.toHaveBeenCalled();
  });

  it.each([null, "cohort_group"])("places a learner on %s", async (kind) => {
    state.kind = kind;
    expect((await add()).status).toBe(200);
    expect(update).toHaveBeenCalledWith({ cohort_id: "k1" });
  });
});
