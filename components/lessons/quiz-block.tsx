"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import type { PublicQuizQuestion } from "@/lib/assessments";

export function QuizBlock({
  blockId,
  title,
  questions,
  passMark,
  required,
  interactive,
  bestScore,
  passed,
}: {
  blockId: string;
  title: string | null;
  questions: PublicQuizQuestion[];
  passMark: number;
  required: boolean;
  interactive: boolean;
  bestScore: number | null;
  passed: boolean;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [result, setResult] = useState<{ score: number; passed: boolean; results: boolean[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const complete = answers.every((a) => a !== null);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/academy/api/lesson-blocks/${blockId}/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't mark your answers. Please try again.");
      setResult(data);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  }

  function retry() {
    setResult(null);
    setAnswers(questions.map(() => null));
  }

  return (
    <section data-quiz className="p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-white font-semibold">{title || "Quiz"}</h2>
          <p className="text-white/40 text-xs mt-0.5">
            Pass mark {passMark}%{required ? " · required to complete the course" : " · optional"}
          </p>
        </div>
        {bestScore !== null && (
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${passed ? "bg-green-500/15 text-green-400" : "bg-[#ffbd59]/15 text-[#ffbd59]"}`}>
            Best score {bestScore}%{passed ? " · Passed" : ""}
          </span>
        )}
      </div>

      <ol className="mt-4 space-y-5">
        {questions.map((q, i) => (
          <li key={i}>
            <p className="text-white/85 text-sm font-medium flex items-center gap-2">
              {result && (result.results[i] ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" /> : <XCircle className="w-4 h-4 text-red-400 shrink-0" />)}
              {i + 1}. {q.question}
            </p>
            <div className="mt-2 space-y-1">
              {q.options.map((option, o) => (
                <label key={o} className="flex items-center gap-2 text-sm text-white/65 px-2 py-1 rounded-lg hover:bg-white/[0.04]">
                  <input
                    type="radio"
                    name={`${blockId}-${i}`}
                    checked={answers[i] === o}
                    disabled={!interactive || !!result}
                    onChange={() => setAnswers((list) => list.map((a, x) => (x === i ? o : a)))}
                    className="accent-[#3da3bc]"
                  />
                  {option}
                </label>
              ))}
            </div>
          </li>
        ))}
      </ol>

      {!interactive ? (
        <p className="text-white/40 text-xs mt-4">Only learners with a place on this course can take this quiz.</p>
      ) : result ? (
        <div className="mt-4 flex items-center gap-4 flex-wrap">
          <p className={`text-sm font-semibold ${result.passed ? "text-green-400" : "text-[#ffbd59]"}`}>
            You scored {result.score}%. {result.passed ? "You passed!" : "Not quite. You can try again."}
          </p>
          <button onClick={retry} className="text-sm text-white/50 hover:text-white underline underline-offset-2">Try again</button>
        </div>
      ) : (
        <button onClick={submit} disabled={!complete || busy} className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/10 disabled:opacity-50">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Submit answers
        </button>
      )}
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </section>
  );
}
