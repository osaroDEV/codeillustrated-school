import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LessonPage from "@/app/dashboard/courses/[courseId]/lessons/[lessonId]/page";
import type { LessonBlock } from "@/lib/lessons";

const { state, getLessonBlocks, getLessonClasses, getLessonRecordings } = vi.hoisted(() => ({
  state: { access: "enrolled", type: "text", selfPaced: false, blocks: [] as unknown[] },
  getLessonBlocks: vi.fn(),
  getLessonClasses: vi.fn(),
  getLessonRecordings: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/lib/supabase-server", () => ({ requireUser: async () => ({ id: "u1" }) }));
vi.mock("@/lib/supabase", () => ({
  createAdminClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { title: "Course", slug: "course" } }) }) }) }),
  }),
}));
vi.mock("@/lib/lessons", () => ({
  loadLesson: async () => ({
    lesson: { id: "l1", title: "Lesson one", type: state.type, is_preview: false, is_published: true, duration_min: null },
    courseId: "c1",
    seat: { access: state.access, source: "manual", cohortId: null, selfPaced: state.selfPaced },
  }),
  getCourseOutlines: async () => new Map(),
  getLessonClasses,
  getLessonRecordings,
  getLessonBlocks,
}));

const block = (over: Partial<LessonBlock>): LessonBlock => ({
  id: "b",
  kind: "text",
  title: null,
  content: null,
  video_url: null,
  file_path: null,
  ...over,
});

const render = async () =>
  renderToStaticMarkup(await LessonPage({ params: Promise.resolve({ courseId: "c1", lessonId: "l1" }) }));

beforeEach(() => {
  state.access = "enrolled";
  state.type = "text";
  state.selfPaced = false;
  getLessonClasses.mockReset().mockResolvedValue([]);
  getLessonRecordings.mockReset().mockResolvedValue([]);
  state.blocks = [
    block({ id: "t1", content: "Intro words" }),
    block({ id: "v1", kind: "video", video_url: "https://youtu.be/abcdefg", title: "Watch this" }),
    block({ id: "f1", kind: "file", file_path: "lessons/a1b2c3d4e5f6-sheet-one.pdf", title: "Worksheet" }),
    block({ id: "t2", content: "Closing words" }),
    block({ id: "f2", kind: "file", file_path: "lessons/a1b2c3d4e5f6-sheet-two.pdf" }),
  ];
  getLessonBlocks.mockReset().mockImplementation(async () => state.blocks);
});

describe("lesson page", () => {
  it("shows every block in the saved order", async () => {
    const html = await render();
    const order = ["Intro words", "youtube-nocookie.com/embed/abcdefg", "Worksheet", "Closing words", "sheet-two.pdf"].map((t) => html.indexOf(t));
    expect(order.every((n) => n >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("links files by block, without exposing where they're stored", async () => {
    const html = await render();
    expect(html).toContain('href="/academy/api/lesson-blocks/f1/file"');
    expect(html).toContain('href="/academy/api/lesson-blocks/f2/file"');
    expect(html).not.toContain("lessons/a1b2c3d4e5f6");
  });

  it.each(["none", "lapsed"])("never loads the material for %s", async (access) => {
    state.access = access;
    const html = await render();
    expect(getLessonBlocks).not.toHaveBeenCalled();
    expect(html).not.toContain("Intro words");
  });

  it("says so when a lesson has no material", async () => {
    state.blocks = [];
    expect(await render()).toContain("hasn&#x27;t been added yet");
  });

  it("shows self-paced subscribers the recording, never a Join button", async () => {
    state.type = "live";
    state.selfPaced = true;
    getLessonRecordings.mockResolvedValue([
      { id: "r1", title: "Week 1", starts_at: new Date(Date.now() - 60_000).toISOString(), duration_min: 60, recording_url: "https://rec.test/1" },
    ]);
    const html = await render();
    expect(getLessonClasses).not.toHaveBeenCalled();
    expect(html).toContain("https://rec.test/1");
    expect(html).not.toContain("Join class");
    expect(html).not.toContain("/api/sessions/");
  });

  it("doesn't promise self-paced subscribers a recording", async () => {
    state.type = "live";
    state.selfPaced = true;
    expect(await render()).toContain("If a recording is shared");
  });

  it("keeps the live class notice alongside blocks", async () => {
    state.type = "live";
    const html = await render();
    expect(html).toContain("taught live");
    expect(html).toContain("Intro words");
  });
});
