"use client";

import { ArrowDown, ArrowUp, ClipboardList, FileText, HelpCircle, Plus, Trash2, Type, Video } from "lucide-react";
import { useRef } from "react";
import type { AdminLessonBlock } from "@/lib/catalogue-admin";
import { storedFileName } from "@/lib/lesson-access";
import { FileUpload } from "./file-upload";
import { inputClass, secondaryButtonClass } from "./ui";

export interface DraftBlock {
  key: string;
  kind: AdminLessonBlock["kind"];
  title: string;
  content: string;
  video_url: string;
  file_path: string;
  quiz: { question: string; options: string[]; correct: number }[];
  pass_mark: string;
  is_required: boolean;
}

const blankQuestion = () => ({ question: "", options: ["", ""], correct: 0 });

export function toDraftBlocks(blocks: AdminLessonBlock[]): DraftBlock[] {
  return blocks.map((b) => ({
    key: b.id,
    kind: b.kind,
    title: b.title ?? "",
    content: b.content ?? "",
    video_url: b.video_url ?? "",
    file_path: b.file_path ?? "",
    quiz: b.quiz ?? [],
    pass_mark: String(b.pass_mark ?? 70),
    is_required: b.is_required ?? true,
  }));
}

/** What the API expects, in the order shown. */
export function toBlockPayload(blocks: DraftBlock[]) {
  return blocks.map((b) => {
    // Saved blocks keep their id, so learner work stays attached.
    const id = b.key.startsWith("new-") ? {} : { id: b.key };
    if (b.kind === "text") return { ...id, kind: b.kind, content: b.content };
    if (b.kind === "video") return { ...id, kind: b.kind, title: b.title, video_url: b.video_url };
    if (b.kind === "quiz") {
      return { ...id, kind: b.kind, title: b.title, quiz: b.quiz, pass_mark: b.pass_mark, is_required: b.is_required };
    }
    if (b.kind === "assignment") return { ...id, kind: b.kind, title: b.title, content: b.content, is_required: b.is_required };
    return { ...id, kind: b.kind, title: b.title, file_path: b.file_path };
  });
}

/** The first block that can't be saved yet, as a message for the admin. */
export function blockProblem(blocks: DraftBlock[]): string | null {
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const n = `Block ${i + 1}`;
    if (b.kind === "text" && !b.content.trim()) return `${n}: add some text, or remove the block.`;
    if (b.kind === "video" && !b.video_url.trim()) return `${n}: add a video link, or remove the block.`;
    if (b.kind === "file" && !b.file_path) return `${n}: upload a file, or remove the block.`;
    if (b.kind === "assignment" && !b.content.trim()) return `${n}: write the assignment brief, or remove the block.`;
    if (b.kind === "quiz") {
      if (b.quiz.length === 0) return `${n}: add a question, or remove the block.`;
      if (b.quiz.some((q) => !q.question.trim() || q.options.some((o) => !o.trim()))) {
        return `${n}: fill in every question and answer.`;
      }
    }
  }
  return null;
}

const LABEL: Record<DraftBlock["kind"], string> = { text: "Text", video: "Video", file: "File", quiz: "Quiz", assignment: "Assignment" };
const ICON = { text: Type, video: Video, file: FileText, quiz: HelpCircle, assignment: ClipboardList };

export function LessonBlocksEditor({
  blocks,
  onChange,
}: {
  blocks: DraftBlock[];
  onChange: (update: (blocks: DraftBlock[]) => DraftBlock[]) => void;
}) {
  const nextKey = useRef(0);

  function add(kind: DraftBlock["kind"]) {
    const key = `new-${nextKey.current++}`;
    onChange((list) => [...list, {
      key,
      kind,
      title: "",
      content: "",
      video_url: "",
      file_path: "",
      quiz: kind === "quiz" ? [blankQuestion()] : [],
      pass_mark: "70",
      is_required: true,
    }]);
  }

  const patch = (key: string, fields: Partial<DraftBlock>) =>
    onChange((list) => list.map((b) => (b.key === key ? { ...b, ...fields } : b)));

  function move(index: number, delta: number) {
    onChange((list) => {
      const next = [...list];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      return next;
    });
  }

  const iconButton = "p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <div className="space-y-2">
      {blocks.map((b, i) => {
        const Icon = ICON[b.kind];
        return (
          <div key={b.key} data-block={b.kind} className="border border-white/[0.08] rounded-xl p-3 bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-3.5 h-3.5 text-[#3da3bc]" />
              <span className="flex-1 text-xs text-white/60">{LABEL[b.kind]}</span>
              <button type="button" aria-label="Move block up" disabled={i === 0} onClick={() => move(i, -1)} className={iconButton}>
                <ArrowUp className="w-3 h-3" />
              </button>
              <button type="button" aria-label="Move block down" disabled={i === blocks.length - 1} onClick={() => move(i, 1)} className={iconButton}>
                <ArrowDown className="w-3 h-3" />
              </button>
              <button type="button" aria-label="Remove block" onClick={() => onChange((list) => list.filter((x) => x.key !== b.key))} className={iconButton}>
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            {b.kind === "text" && (
              <textarea
                aria-label="Text (Markdown)"
                rows={5}
                value={b.content}
                onChange={(e) => patch(b.key, { content: e.target.value })}
                placeholder="Write here. Markdown works: # heading, **bold**, - lists, [links](https://…)"
                className={`${inputClass} resize-y`}
              />
            )}

            {b.kind === "video" && (
              <div className="space-y-2">
                <input
                  aria-label="Video link"
                  type="url"
                  value={b.video_url}
                  onChange={(e) => patch(b.key, { video_url: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=…"
                  className={inputClass}
                />
                <input aria-label="Video caption" value={b.title} onChange={(e) => patch(b.key, { title: e.target.value })} placeholder="Caption (optional)" className={inputClass} />
                <p className="text-white/30 text-[11px]">YouTube and Vimeo play inside the lesson. Other links open in a new tab.</p>
              </div>
            )}

            {b.kind === "quiz" && <QuizFields block={b} patch={(fields) => patch(b.key, fields)} />}

            {b.kind === "assignment" && (
              <div className="space-y-2">
                <input aria-label="Assignment title" value={b.title} onChange={(e) => patch(b.key, { title: e.target.value })} placeholder="Title (optional)" className={inputClass} />
                <textarea
                  aria-label="Assignment brief"
                  rows={4}
                  value={b.content}
                  onChange={(e) => patch(b.key, { content: e.target.value })}
                  placeholder="What should the learner hand in? Markdown works."
                  className={`${inputClass} resize-y`}
                />
                <RequiredTick block={b} patch={(fields) => patch(b.key, fields)} />
              </div>
            )}

            {b.kind === "file" && (
              <div className="space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  {b.file_path && <span className="text-white/70 text-xs">{storedFileName(b.file_path)}</span>}
                  <FileUpload
                    scope="lessons"
                    label={b.file_path ? "Replace file" : "Upload file (up to 50 MB)"}
                    onUploaded={(path) => patch(b.key, { file_path: path })}
                  />
                </div>
                <input aria-label="Download label" value={b.title} onChange={(e) => patch(b.key, { title: e.target.value })} placeholder="Button label (optional), e.g. Week 1 worksheet" className={inputClass} />
              </div>
            )}
          </div>
        );
      })}

      <div className="flex items-center gap-2 flex-wrap">
        {(["text", "video", "file", "quiz", "assignment"] as const).map((kind) => (
          <button key={kind} type="button" onClick={() => add(kind)} className={secondaryButtonClass}>
            <Plus className="w-3.5 h-3.5" /> {LABEL[kind]}
          </button>
        ))}
      </div>
    </div>
  );
}

function RequiredTick({ block, patch }: { block: DraftBlock; patch: (fields: Partial<DraftBlock>) => void }) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-white/60">
      <input type="checkbox" checked={block.is_required} onChange={(e) => patch({ is_required: e.target.checked })} className="accent-[#3da3bc]" />
      Required to complete the course
    </label>
  );
}

function QuizFields({ block, patch }: { block: DraftBlock; patch: (fields: Partial<DraftBlock>) => void }) {
  const setQuestion = (i: number, fields: Partial<DraftBlock["quiz"][number]>) =>
    patch({ quiz: block.quiz.map((q, x) => (x === i ? { ...q, ...fields } : q)) });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_110px] gap-2">
        <input aria-label="Quiz title" value={block.title} onChange={(e) => patch({ title: e.target.value })} placeholder="Title (optional)" className={inputClass} />
        <input aria-label="Pass mark" type="number" min="1" max="100" value={block.pass_mark} onChange={(e) => patch({ pass_mark: e.target.value })} placeholder="Pass %" className={inputClass} />
      </div>
      {block.quiz.map((q, i) => (
        <div key={i} data-question className="border border-white/[0.06] rounded-lg p-2 space-y-1.5">
          <div className="flex items-center gap-2">
            <input aria-label={`Question ${i + 1}`} value={q.question} onChange={(e) => setQuestion(i, { question: e.target.value })} placeholder={`Question ${i + 1}`} className={inputClass} />
            <button type="button" aria-label="Remove question" disabled={block.quiz.length === 1} onClick={() => patch({ quiz: block.quiz.filter((_, x) => x !== i) })} className="p-1.5 text-white/40 hover:text-white disabled:opacity-30">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
          {q.options.map((option, o) => (
            <div key={o} className="flex items-center gap-2 pl-2">
              <input type="radio" aria-label={`Answer ${o + 1} is correct`} name={`${block.key}-${i}`} checked={q.correct === o} onChange={() => setQuestion(i, { correct: o })} className="accent-[#3da3bc]" />
              <input
                aria-label={`Answer ${o + 1}`}
                value={option}
                onChange={(e) => setQuestion(i, { options: q.options.map((x, y) => (y === o ? e.target.value : x)) })}
                placeholder={`Answer ${o + 1}`}
                className={inputClass}
              />
              <button
                type="button"
                aria-label="Remove answer"
                disabled={q.options.length === 2}
                onClick={() => setQuestion(i, { options: q.options.filter((_, y) => y !== o), correct: q.correct === o ? 0 : q.correct > o ? q.correct - 1 : q.correct })}
                className="p-1.5 text-white/40 hover:text-white disabled:opacity-30"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button type="button" disabled={q.options.length >= 8} onClick={() => setQuestion(i, { options: [...q.options, ""] })} className="pl-2 text-xs text-white/40 hover:text-white disabled:opacity-30">
            + Add answer
          </button>
        </div>
      ))}
      <button type="button" disabled={block.quiz.length >= 50} onClick={() => patch({ quiz: [...block.quiz, blankQuestion()] })} className={secondaryButtonClass}>
        <Plus className="w-3.5 h-3.5" /> Add question
      </button>
      <RequiredTick block={block} patch={patch} />
    </div>
  );
}
