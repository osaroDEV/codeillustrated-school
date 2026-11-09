"use client";

import { ArrowDown, ArrowUp, FileText, Plus, Trash2, Type, Video } from "lucide-react";
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
}

export function toDraftBlocks(blocks: AdminLessonBlock[]): DraftBlock[] {
  return blocks.map((b) => ({
    key: b.id,
    kind: b.kind,
    title: b.title ?? "",
    content: b.content ?? "",
    video_url: b.video_url ?? "",
    file_path: b.file_path ?? "",
  }));
}

/** What the API expects, in the order shown. */
export function toBlockPayload(blocks: DraftBlock[]) {
  return blocks.map((b) => {
    if (b.kind === "text") return { kind: b.kind, content: b.content };
    if (b.kind === "video") return { kind: b.kind, title: b.title, video_url: b.video_url };
    return { kind: b.kind, title: b.title, file_path: b.file_path };
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
  }
  return null;
}

const LABEL: Record<DraftBlock["kind"], string> = { text: "Text", video: "Video", file: "File" };
const ICON = { text: Type, video: Video, file: FileText };

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
    onChange((list) => [...list, { key, kind, title: "", content: "", video_url: "", file_path: "" }]);
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
        {(["text", "video", "file"] as const).map((kind) => (
          <button key={kind} type="button" onClick={() => add(kind)} className={secondaryButtonClass}>
            <Plus className="w-3.5 h-3.5" /> {LABEL[kind]}
          </button>
        ))}
      </div>
    </div>
  );
}
