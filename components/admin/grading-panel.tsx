"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Paperclip } from "lucide-react";
import type { SubmissionRow } from "@/lib/assessments-server";
import { storedFileName } from "@/lib/lesson-access";
import { LocalTime } from "@/components/local-time";
import { cardClass, errorClass, inputClass, secondaryButtonClass, send } from "./ui";

export function GradingPanel({ submissions, loadError }: { submissions: SubmissionRow[]; loadError: string | null }) {
  const [tab, setTab] = useState<"waiting" | "graded">("waiting");
  const waiting = submissions.filter((s) => s.status === "submitted");
  const graded = submissions.filter((s) => s.status !== "submitted").reverse();
  const shown = tab === "waiting" ? waiting : graded;

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(
          [
            ["waiting", `To grade (${waiting.length})`],
            ["graded", `Graded (${graded.length})`],
          ] as const
        ).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`text-sm px-4 py-2 rounded-xl transition-all ${tab === key ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}>
            {label}
          </button>
        ))}
      </div>
      {loadError && <div className={`${errorClass} mb-4`}>{loadError}</div>}
      <div className="space-y-3">
        {shown.map((s) => <Submission key={s.id} submission={s} />)}
        {shown.length === 0 && !loadError && (
          <div className="text-center py-12 text-white/30 text-sm border border-white/[0.08] rounded-2xl">
            {tab === "waiting" ? "Nothing waiting to be graded." : "Nothing graded yet."}
          </div>
        )}
      </div>
    </div>
  );
}

function Submission({ submission: s }: { submission: SubmissionRow }) {
  const router = useRouter();
  const [score, setScore] = useState(s.score?.toString() ?? "");
  const [feedback, setFeedback] = useState(s.feedback ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function grade(status: "passed" | "needs_work") {
    setBusy(true);
    setError("");
    const err = await send(`/submissions/${s.id}`, "PATCH", { status, score, feedback });
    setBusy(false);
    if (err) return setError(err);
    router.refresh();
  }

  return (
    <article className={`${cardClass} p-5`}>
      <p className="text-white font-semibold">{s.learner}</p>
      <p className="text-white/40 text-xs mt-0.5">
        {s.course} · {s.lesson} · {s.assignment} · <LocalTime iso={s.submitted_at} />
      </p>
      {s.body && <p className="text-white/80 text-sm mt-3 whitespace-pre-wrap break-words">{s.body}</p>}
      {s.file_path && (
        <a href={`/api/submissions/${s.id}/file`} className="inline-flex items-center gap-1.5 text-[#3da3bc] hover:text-white text-xs mt-3">
          <Paperclip className="w-3.5 h-3.5" /> {storedFileName(s.file_path)}
        </a>
      )}
      <div className="mt-4 grid sm:grid-cols-[110px_1fr] gap-2">
        <input aria-label="Score" type="number" min="0" max="100" value={score} onChange={(e) => setScore(e.target.value)} placeholder="Score %" className={inputClass} />
        <textarea aria-label="Feedback" rows={2} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Feedback for the learner" className={`${inputClass} resize-y`} />
      </div>
      <div className="flex gap-2 mt-3">
        <button disabled={busy} onClick={() => grade("passed")} className={secondaryButtonClass}><Check className="w-3.5 h-3.5" /> Pass</button>
        <button disabled={busy} onClick={() => grade("needs_work")} className={secondaryButtonClass}>Needs more work</button>
      </div>
      {error && <div className={`${errorClass} mt-3`}>{error}</div>}
    </article>
  );
}
