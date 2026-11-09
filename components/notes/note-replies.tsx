"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";

export interface NoteReply {
  id: string;
  author_id: string | null;
  body: string;
  created_at: string;
}

export function NoteReplies({
  noteId,
  replies,
  ownerId,
  ownerLabel,
  staffLabel,
  onPosted,
}: {
  noteId: string;
  replies: NoteReply[] | null | undefined;
  /** The learner the note is for. */
  ownerId: string;
  ownerLabel: string;
  staffLabel: string;
  /** Defaults to refreshing the page. */
  onPosted?: () => void;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ordered = [...(replies ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/academy/api/notes/${noteId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't send your reply. Please try again.");
      setBody("");
      if (onPosted) onPosted();
      else router.refresh();
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  }

  return (
    <div className="mt-3 pt-3 border-t border-white/[0.08] space-y-2">
      {ordered.map((r) => (
        <div key={r.id}>
          <p className="text-white/35 text-[10px]">
            {r.author_id === ownerId ? ownerLabel : staffLabel} ·{" "}
            {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </p>
          <p className="text-white/65 text-xs leading-relaxed whitespace-pre-wrap">{r.body}</p>
        </div>
      ))}
      <form onSubmit={send} className="flex items-end gap-2">
        <textarea
          aria-label="Your reply"
          rows={1}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a reply"
          className="flex-1 bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs placeholder-white/25 focus:outline-none resize-y"
        />
        <button type="submit" aria-label="Send reply" disabled={busy || !body.trim()} className="p-2 rounded-lg bg-white/10 hover:bg-white/15 text-white disabled:opacity-40">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </button>
      </form>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}
