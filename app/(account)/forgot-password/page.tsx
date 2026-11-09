"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { LOGIN_PATH } from "@/lib/routes";
import { KeyRound, Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

// Emails a password-reset link (supabase/templates/recovery.html). Supabase
// answers the same way whether or not the address has an account, so the
// confirmation below doesn't reveal which emails are registered.
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError("");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/academy/auth/confirm`,
    });
    if (resetError) {
      setError(resetError.message);
      setState("idle");
      return;
    }
    setState("sent");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#c31d24]/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#1a596c]/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <BrandLogo href="/" size={56} priority />
        </div>

        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 backdrop-blur-sm shadow-2xl">
          <div className="w-16 h-16 bg-[#ffbd59]/15 rounded-full flex items-center justify-center mx-auto mb-6">
            {state === "sent" ? (
              <MailCheck className="w-8 h-8 text-[#ffbd59]" />
            ) : (
              <KeyRound className="w-8 h-8 text-[#ffbd59]" />
            )}
          </div>

          {state === "sent" ? (
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-2">Check your inbox</h1>
              <p className="text-white/50 text-sm">
                If an account exists for <span className="text-white">{email.trim()}</span>, we&apos;ve
                emailed it a link to choose a new password. The link expires in one hour.
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white mb-1 text-center">Forgot your password?</h1>
              <p className="text-white/50 text-sm mb-8 text-center">
                Enter your email and we&apos;ll send you a link to choose a new one.
              </p>

              {error && (
                <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <input
                  id="forgot-password-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#c31d24]/60 focus:bg-white/[0.08] transition-all"
                />
                <button
                  id="forgot-password-submit"
                  type="submit"
                  disabled={state === "sending"}
                  className="w-full bg-gradient-to-r from-[#c31d24] to-[#e53535] hover:from-[#b01a20] hover:to-[#c31d24] text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#c31d24]/25 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {state === "sending" && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send reset link
                </button>
              </form>
            </>
          )}

          <p className="text-center text-white/40 text-sm mt-6">
            <Link href={LOGIN_PATH} className="text-[#ffbd59] hover:text-[#f5a623] font-medium transition-colors">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
