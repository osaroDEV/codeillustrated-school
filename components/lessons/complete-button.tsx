"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

export function CompleteButton({ lessonId, done, nextHref }: { lessonId: string; done: boolean; nextHref: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/academy/api/lessons/${lessonId}/progress`, { method: done ? "DELETE" : "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Couldn't save that. Please try again.");
      }
      if (!done && nextHref) router.push(nextHref);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  }

  return (
    <div>
      <button
        onClick={toggle}
        disabled={busy}
        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 ${
          done
            ? "bg-green-500/15 text-green-400 border border-green-500/25 hover:bg-green-500/20"
            : "bg-gradient-to-r from-[#c31d24] to-[#f5a623] text-white hover:opacity-90"
        }`}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
        {done ? "Completed" : nextHref ? "Mark complete and continue" : "Mark complete"}
      </button>
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  );
}
