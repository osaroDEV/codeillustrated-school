"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Paperclip } from "lucide-react";
import { COURSE_FILES_BUCKET, MAX_COURSE_FILE_BYTES, storedFileName } from "@/lib/lesson-access";
import { supabase } from "@/lib/supabase";

export interface AssignmentState {
  id: string;
  status: "submitted" | "passed" | "needs_work";
  score: number | null;
  feedback: string | null;
  body: string | null;
  file_path: string | null;
}

const STATUS = {
  submitted: { label: "Waiting for review", className: "bg-blue-500/15 text-blue-300" },
  passed: { label: "Passed", className: "bg-green-500/15 text-green-400" },
  needs_work: { label: "Needs more work", className: "bg-[#ffbd59]/15 text-[#ffbd59]" },
};

export function AssignmentBlock({
  blockId,
  title,
  required,
  interactive,
  submission,
  children,
}: {
  blockId: string;
  title: string | null;
  required: boolean;
  interactive: boolean;
  submission: AssignmentState | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState(submission?.body ?? "");
  const [filePath, setFilePath] = useState(submission?.file_path ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const locked = submission?.status === "passed";

  async function attach(file: File) {
    setError("");
    if (file.size > MAX_COURSE_FILE_BYTES) return setError("Files can be up to 50 MB.");
    setBusy(true);
    try {
      const res = await fetch(`/academy/api/lesson-blocks/${blockId}/submission/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_name: file.name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't start the upload.");
      const { error: uploadError } = await supabase.storage.from(COURSE_FILES_BUCKET).uploadToSignedUrl(data.path, data.token, file);
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
      setFilePath(data.path);
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  }

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/academy/api/lesson-blocks/${blockId}/submission`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, file_path: filePath }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't hand this in. Please try again.");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  }

  return (
    <section data-assignment className="p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-white font-semibold">{title || "Assignment"}</h2>
          <p className="text-white/40 text-xs mt-0.5">{required ? "Required to complete the course" : "Optional"}</p>
        </div>
        {submission && (
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS[submission.status].className}`}>
            {STATUS[submission.status].label}
            {submission.score !== null ? ` · ${submission.score}%` : ""}
          </span>
        )}
      </div>

      <div className="mt-2">{children}</div>

      {submission?.feedback && (
        <div className="mt-4 bg-[#ffbd59]/5 border border-[#ffbd59]/15 rounded-xl p-4">
          <p className="text-[#ffbd59] text-xs font-semibold uppercase tracking-wider mb-1.5">Feedback</p>
          <p className="text-white/70 text-sm whitespace-pre-wrap">{submission.feedback}</p>
        </div>
      )}

      {!interactive ? (
        <p className="text-white/40 text-xs mt-4">Only learners with a place on this course can hand this in.</p>
      ) : (
        <div className="mt-4 space-y-3">
          <textarea
            aria-label="Your answer"
            rows={5}
            value={body}
            disabled={locked}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your answer here"
            className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-white/25 focus:outline-none resize-y disabled:opacity-60"
          />
          {filePath && <p className="text-white/60 text-xs">Attached: {storedFileName(filePath)}</p>}
          {!locked && (
            <div className="flex items-center gap-3 flex-wrap">
              <input
                ref={input}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) attach(file);
                }}
              />
              <button type="button" disabled={busy} onClick={() => input.current?.click()} className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white">
                <Paperclip className="w-3.5 h-3.5" /> {filePath ? "Replace file" : "Attach a file"}
              </button>
              <button onClick={submit} disabled={busy || (!body.trim() && !filePath)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/10 disabled:opacity-50">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {submission ? "Hand in again" : "Hand in"}
              </button>
            </div>
          )}
        </div>
      )}
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </section>
  );
}
