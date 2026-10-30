"use client";

import { useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

// Sends a fresh verification link. Supabase rate-limits resends per address,
// so a too-soon retry surfaces its error message instead of a second email.
export function ResendVerification({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  async function handleResend() {
    if (!email) return;
    setState("sending");
    setError("");
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/academy/auth/confirm` },
    });
    if (resendError) {
      setError(resendError.message);
      setState("idle");
      return;
    }
    setState("sent");
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-red-400 text-xs">{error}</p>}
      {state === "sent" ? (
        <p className="flex items-center justify-center gap-2 text-green-400 text-sm">
          <MailCheck className="w-4 h-4" /> New link sent to {email}
        </p>
      ) : (
        <button
          id="resend-verification-btn"
          type="button"
          onClick={handleResend}
          disabled={state === "sending" || !email}
          className="w-full flex items-center justify-center gap-2 border border-white/15 hover:border-white/30 text-white/70 hover:text-white text-sm font-medium py-3 rounded-xl transition-all disabled:opacity-50"
        >
          {state === "sending" && <Loader2 className="w-4 h-4 animate-spin" />}
          Resend verification link
        </button>
      )}
    </div>
  );
}
