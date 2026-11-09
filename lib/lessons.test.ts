// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { getCourseRecordings, getLessonClasses, getLessonRecordings } from "./lessons";

vi.mock("./supabase-server", () => ({ getRole: vi.fn() }));

function fakeAdmin() {
  const filters: unknown[][] = [];
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "order", "limit"]) chain[m] = () => chain;
  for (const m of ["eq", "in", "not"]) {
    chain[m] = (...args: unknown[]) => {
      filters.push(args);
      return chain;
    };
  }
  chain.then = (ok: (v: unknown) => unknown) => Promise.resolve({ data: [] }).then(ok);
  return { admin: { from: () => chain } as never, filters };
}

const SHARED = ["shared_with_self_paced", true];

describe("recordings for self-paced subscribers", () => {
  it("only includes shared ones on a lesson", async () => {
    const { admin, filters } = fakeAdmin();
    await getLessonRecordings(admin, "l1");
    expect(filters).toContainEqual(SHARED);
  });

  it("only includes shared ones on a course", async () => {
    const { admin, filters } = fakeAdmin();
    await getCourseRecordings(admin, ["c1"]);
    expect(filters).toContainEqual(SHARED);
  });

  it("doesn't limit what a learner's own cohort can see", async () => {
    const { admin, filters } = fakeAdmin();
    await getLessonClasses(admin, "l1", "k1");
    expect(filters).not.toContainEqual(SHARED);
  });
});
