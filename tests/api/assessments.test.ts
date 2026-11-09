// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

import { POST as takeQuiz } from "@/app/api/lesson-blocks/[id]/quiz/route";
import { POST as handIn } from "@/app/api/lesson-blocks/[id]/submission/route";
import { PATCH as grade } from "@/app/api/admin/submissions/[id]/route";

const { state, insert, upsert, update, removeCourseFile } = vi.hoisted(() => ({
  state: {
    user: { id: "u1" } as object | null,
    access: "enrolled",
    found: true,
    block: null as unknown,
    existing: null as unknown,
    staffSubmission: { id: "s1" } as unknown,
  },
  insert: vi.fn(async () => ({ error: null })),
  upsert: vi.fn(async () => ({ error: null })),
  update: vi.fn(),
  removeCourseFile: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const chain = {
        eq: () => chain,
        maybeSingle: async () => ({ data: table === "lesson_blocks" ? state.block : state.existing }),
      };
      return {
        insert,
        upsert,
        select: () => chain,
        update: (fields: unknown) => (update(fields), { eq: async () => ({ error: null }) }),
      };
    },
  }),
}));
vi.mock("@/lib/supabase-server", () => ({
  requireVerifiedUserApi: async () =>
    state.user ? { user: state.user } : { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) },
  requireStaffApi: async () => ({ user: { id: "staff" }, role: "instructor" }),
}));
vi.mock("@/lib/lessons", () => ({
  loadLesson: async () => (state.found ? { lesson: {}, courseId: "c", seat: { access: state.access } } : null),
  removeCourseFile,
}));
vi.mock("@/lib/notifications", () => ({ enqueueGradeEmail: vi.fn() }));
vi.mock("@/lib/assessments-server", () => ({ loadSubmissionForStaff: async () => state.staffSubmission }));

const BLOCK = "11111111-1111-4111-8111-111111111111";
const ctx = { params: Promise.resolve({ id: BLOCK }) };
const req = (body: unknown) => new NextRequest(`https://x.test/x`, { method: "POST", body: JSON.stringify(body) });

const quiz = [
  { question: "A", options: ["x", "y"], correct: 1 },
  { question: "B", options: ["x", "y"], correct: 0 },
];

beforeEach(() => {
  state.user = { id: "u1" };
  state.access = "enrolled";
  state.found = true;
  state.existing = null;
  state.staffSubmission = { id: "s1" };
  insert.mockClear();
  upsert.mockClear();
  update.mockClear();
  removeCourseFile.mockClear();
});

describe("taking a quiz", () => {
  beforeEach(() => {
    state.block = { id: BLOCK, lesson_id: "l", quiz, pass_mark: 70 };
  });

  it("marks on the server and records the attempt", async () => {
    const res = await takeQuiz(req({ answers: [1, 0] }), ctx);
    expect(await res.json()).toEqual({ score: 100, passed: true, results: [true, true] });
    expect(insert).toHaveBeenCalledWith({ block_id: BLOCK, user_id: "u1", answers: [1, 0], score: 100, passed: true });
  });

  it("records a fail below the pass mark", async () => {
    expect(await (await takeQuiz(req({ answers: [1, 1] }), ctx)).json()).toMatchObject({ score: 50, passed: false });
  });

  it("never tells the browser the right answers", async () => {
    expect(JSON.stringify(await (await takeQuiz(req({ answers: [0, 1] }), ctx)).json())).not.toContain("correct");
  });

  it("needs every question answered", async () => {
    expect((await takeQuiz(req({ answers: [1] }), ctx)).status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });

  it.each(["none", "lapsed", "preview", "staff"])("refuses %s", async (access) => {
    state.access = access;
    expect((await takeQuiz(req({ answers: [1, 0] }), ctx)).status).toBe(403);
    expect(insert).not.toHaveBeenCalled();
  });

  it("requires sign-in", async () => {
    state.user = null;
    expect((await takeQuiz(req({ answers: [1, 0] }), ctx)).status).toBe(401);
  });
});

describe("handing in an assignment", () => {
  const own = `submissions/${BLOCK}/u1/abc-work.pdf`;

  beforeEach(() => {
    state.block = { id: BLOCK, lesson_id: "l" };
  });

  it("saves the work as waiting for review", async () => {
    expect((await handIn(req({ body: "My answer", file_path: own }), ctx)).status).toBe(200);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "u1", body: "My answer", file_path: own, status: "submitted", feedback: null }),
      { onConflict: "block_id,user_id" }
    );
  });

  it("needs an answer or a file", async () => {
    expect((await handIn(req({ body: "  ", file_path: null }), ctx)).status).toBe(400);
  });

  it("won't attach a file from someone else's folder", async () => {
    const res = await handIn(req({ body: null, file_path: `submissions/${BLOCK}/other/x.pdf` }), ctx);
    expect(res.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("won't reopen a passed assignment", async () => {
    state.existing = { status: "passed", file_path: null };
    expect((await handIn(req({ body: "Again", file_path: null }), ctx)).status).toBe(409);
  });

  it("replaces the old file when handing in again", async () => {
    state.existing = { status: "needs_work", file_path: `submissions/${BLOCK}/u1/old.pdf` };
    await handIn(req({ body: null, file_path: own }), ctx);
    expect(removeCourseFile).toHaveBeenCalledWith(expect.anything(), `submissions/${BLOCK}/u1/old.pdf`);
  });

  it.each(["none", "lapsed", "preview"])("refuses %s", async (access) => {
    state.access = access;
    expect((await handIn(req({ body: "x", file_path: null }), ctx)).status).toBe(403);
  });
});

describe("grading", () => {
  const patch = (body: unknown) => grade(new NextRequest("https://x.test/x", { method: "PATCH", body: JSON.stringify(body) }), ctx);

  it("records the result and who gave it", async () => {
    expect((await patch({ status: "needs_work", score: "40", feedback: "Add a footer" })).status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: "needs_work", score: 40, feedback: "Add a footer", graded_by: "staff" }));
  });

  it("hides submissions from staff who don't teach that learner", async () => {
    state.staffSubmission = null;
    expect((await patch({ status: "passed" })).status).toBe(404);
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects an unknown result or an impossible score", async () => {
    expect((await patch({ status: "maybe" })).status).toBe(400);
    expect((await patch({ status: "passed", score: 101 })).status).toBe(400);
  });
});
