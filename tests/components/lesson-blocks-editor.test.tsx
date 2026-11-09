import * as React from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { blockProblem, LessonBlocksEditor, toBlockPayload, toDraftBlocks, type DraftBlock } from "@/components/admin/lesson-blocks-editor";

// React 19 exports act, but the installed @types/react doesn't list it yet.
const act = (React as unknown as { act: (fn: () => unknown) => Promise<void> }).act;

vi.mock("@/components/admin/file-upload", () => ({
  FileUpload: ({ onUploaded }: { onUploaded: (path: string, name: string) => void }) => (
    <button type="button" data-upload onClick={() => onUploaded("lessons/a1b2c3d4e5f6-notes.pdf", "notes.pdf")}>
      upload
    </button>
  ),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
let current: DraftBlock[];

function Harness({ initial }: { initial: DraftBlock[] }) {
  const [blocks, setBlocks] = React.useState(initial);
  current = blocks;
  return <LessonBlocksEditor blocks={blocks} onChange={setBlocks} />;
}

const button = (label: string, within: ParentNode = host) =>
  Array.from(within.querySelectorAll("button")).find((b) => b.getAttribute("aria-label") === label || b.textContent?.trim() === label)!;
const click = (el: Element) => act(async () => (el as HTMLElement).click());
const blockAt = (i: number) => host.querySelectorAll("[data-block]")[i];
async function type(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")!.set!.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
const render = (initial: DraftBlock[] = []) => act(async () => root.render(<Harness initial={initial} />));

beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("LessonBlocksEditor", () => {
  it("builds a lesson from several blocks of each kind, in the order added", async () => {
    await render();
    await click(button("Text"));
    await type(blockAt(0).querySelector("textarea")!, "Intro");
    await click(button("Video"));
    await type(blockAt(1).querySelector<HTMLInputElement>('input[type="url"]')!, "https://youtu.be/abcdefg");
    await click(button("File"));
    await click(blockAt(2).querySelector("[data-upload]")!);
    await click(button("Text"));
    await type(blockAt(3).querySelector("textarea")!, "Outro");

    expect(toBlockPayload(current)).toEqual([
      { kind: "text", content: "Intro" },
      { kind: "video", title: "", video_url: "https://youtu.be/abcdefg" },
      { kind: "file", title: "", file_path: "lessons/a1b2c3d4e5f6-notes.pdf" },
      { kind: "text", content: "Outro" },
    ]);
    expect(blockProblem(current)).toBeNull();
  });

  it("reorders and removes blocks, keeping what was typed", async () => {
    await render();
    await click(button("Text"));
    await type(blockAt(0).querySelector("textarea")!, "First");
    await click(button("Text"));
    await type(blockAt(1).querySelector("textarea")!, "Second");
    await click(button("Video"));

    await click(button("Move block down", blockAt(0)));
    expect(current.map((b) => b.content)).toEqual(["Second", "First", ""]);
    expect(blockAt(0).querySelector("textarea")!.value).toBe("Second");

    await click(button("Remove block", blockAt(2)));
    expect(current.map((b) => b.kind)).toEqual(["text", "text"]);
  });

  it("can't move past either end", async () => {
    await render();
    await click(button("Text"));
    expect(button("Move block up", blockAt(0)).disabled).toBe(true);
    expect(button("Move block down", blockAt(0)).disabled).toBe(true);
  });

  it("keeps a saved block's id so learner work stays attached", async () => {
    await render(
      toDraftBlocks([
        { id: "11111111-1111-4111-8111-111111111111", lesson_id: "l", position: 1, kind: "assignment", title: "A", content: "Brief", video_url: null, file_path: null, quiz: null, pass_mark: 70, is_required: false },
      ])
    );
    await click(button("Text"));
    const [saved, added] = toBlockPayload(current);
    expect(saved).toEqual({ id: "11111111-1111-4111-8111-111111111111", kind: "assignment", title: "A", content: "Brief", is_required: false });
    expect(added).not.toHaveProperty("id");
  });

  it("builds a quiz with several answers and a chosen correct one", async () => {
    await render();
    await click(button("Quiz"));
    const quiz = blockAt(0);
    await type(quiz.querySelector<HTMLInputElement>('input[aria-label="Question 1"]')!, "2 + 2?");
    await type(quiz.querySelector<HTMLInputElement>('input[aria-label="Answer 1"]')!, "3");
    await type(quiz.querySelector<HTMLInputElement>('input[aria-label="Answer 2"]')!, "4");
    expect(blockProblem(current)).toBeNull();
    await click(quiz.querySelector('input[aria-label="Answer 2 is correct"]')!);
    expect(toBlockPayload(current)[0]).toMatchObject({
      kind: "quiz",
      quiz: [{ question: "2 + 2?", options: ["3", "4"], correct: 1 }],
      pass_mark: "70",
      is_required: true,
    });
  });

  it("loads existing blocks", async () => {
    await render(
      toDraftBlocks([
        { id: "b1", lesson_id: "l", position: 1, kind: "video", title: "Cap", content: null, video_url: "https://youtu.be/abcdefg", file_path: null, quiz: null, pass_mark: 70, is_required: true },
      ])
    );
    expect(blockAt(0).querySelector<HTMLInputElement>('input[type="url"]')!.value).toBe("https://youtu.be/abcdefg");
    expect(host.querySelector<HTMLInputElement>('input[aria-label="Video caption"]')!.value).toBe("Cap");
  });
});

describe("blockProblem", () => {
  const draft = (over: Partial<DraftBlock>): DraftBlock => ({ key: "k", kind: "text", title: "", content: "", video_url: "", file_path: "", quiz: [], pass_mark: "70", is_required: true, ...over });

  it("names the first unfinished block", () => {
    expect(blockProblem([draft({ content: "ok" }), draft({ content: "  " })])).toMatch(/^Block 2: add some text/);
    expect(blockProblem([draft({ kind: "video" })])).toMatch(/video link/);
    expect(blockProblem([draft({ kind: "file" })])).toMatch(/upload a file/);
    expect(blockProblem([draft({ kind: "assignment" })])).toMatch(/assignment brief/);
    expect(blockProblem([draft({ kind: "quiz" })])).toMatch(/add a question/);
    expect(blockProblem([draft({ kind: "quiz", quiz: [{ question: "Q", options: ["a", ""], correct: 0 }] })])).toMatch(/every question/);
  });

  it("allows a lesson with no blocks", () => {
    expect(blockProblem([])).toBeNull();
  });
});
