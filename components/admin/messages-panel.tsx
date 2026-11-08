"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Mail, Phone, RotateCcw, Trash2 } from "lucide-react";
import { LocalTime } from "@/components/local-time";
import { cardClass, dangerButtonClass, errorClass, secondaryButtonClass, send } from "./ui";

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  course: string;
  message: string;
  status: "new" | "handled";
  email_sent: boolean;
  created_at: string;
}

const TABS: { key: ContactMessage["status"]; label: string }[] = [
  { key: "new", label: "New" },
  { key: "handled", label: "Handled" },
];

export function MessagesPanel({ messages, loadError }: { messages: ContactMessage[]; loadError: string | null }) {
  const router = useRouter();
  const [tab, setTab] = useState<ContactMessage["status"]>("new");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const shown = messages.filter((m) => m.status === tab);

  async function run(id: string, method: "PATCH" | "DELETE", body?: unknown) {
    setBusy(id);
    setError("");
    const err = await send(`/messages/${id}`, method, body);
    setBusy(null);
    if (err) return setError(err);
    router.refresh();
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`text-sm px-4 py-2 rounded-xl transition-all ${
              tab === key ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
            }`}
          >
            {label} ({messages.filter((m) => m.status === key).length})
          </button>
        ))}
      </div>

      {(loadError || error) && <div className={`${errorClass} mb-4`}>{loadError || error}</div>}

      <div className="space-y-3">
        {shown.map((m) => (
          <article key={m.id} className={`${cardClass} p-5`}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-white font-semibold">{m.name}</p>
                <p className="text-white/40 text-xs mt-0.5">
                  {m.course} · <LocalTime iso={m.created_at} />
                </p>
              </div>
              <div className="flex gap-2">
                {m.status === "new" ? (
                  <button disabled={busy === m.id} onClick={() => run(m.id, "PATCH", { status: "handled" })} className={secondaryButtonClass}>
                    <Check className="w-3.5 h-3.5" /> Mark handled
                  </button>
                ) : (
                  <button disabled={busy === m.id} onClick={() => run(m.id, "PATCH", { status: "new" })} className={secondaryButtonClass}>
                    <RotateCcw className="w-3.5 h-3.5" /> Move to new
                  </button>
                )}
                <button
                  disabled={busy === m.id}
                  onClick={() => confirm(`Delete the message from ${m.name}? This can't be undone.`) && run(m.id, "DELETE")}
                  className={dangerButtonClass}
                  title="Delete message"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-white/80 text-sm mt-3 whitespace-pre-wrap break-words">{m.message}</p>

            <div className="flex gap-4 flex-wrap mt-3 text-xs">
              <a href={`mailto:${m.email}`} className="inline-flex items-center gap-1.5 text-[#3da3bc] hover:text-white">
                <Mail className="w-3.5 h-3.5" /> {m.email}
              </a>
              <a href={`tel:${m.phone}`} className="inline-flex items-center gap-1.5 text-[#3da3bc] hover:text-white">
                <Phone className="w-3.5 h-3.5" /> {m.phone}
              </a>
              {!m.email_sent && <span className="text-[#ffbd59]">Email to the school failed; this is the only copy.</span>}
            </div>
          </article>
        ))}
        {shown.length === 0 && !loadError && (
          <div className="text-center py-12 text-white/30 text-sm border border-white/[0.08] rounded-2xl">
            {tab === "new" ? "No new messages." : "Nothing handled yet."}
          </div>
        )}
      </div>
    </div>
  );
}
