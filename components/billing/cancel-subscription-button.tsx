"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function CancelSubscriptionButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function cancel() {
    if (!confirm("Cancel this subscription? You'll keep your seat until the end of the month you've paid for.")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/academy/api/billing/subscriptions/${id}/cancel`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't cancel. Please try again.");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={cancel}
        disabled={busy}
        className="flex items-center gap-2 text-sm text-white/50 hover:text-red-400 border border-white/10 hover:border-red-500/30 px-4 py-2 rounded-xl transition-all disabled:opacity-60"
      >
        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        Cancel subscription
      </button>
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  );
}
