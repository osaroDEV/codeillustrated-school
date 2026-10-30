"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, GraduationCap, KeyRound, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

const MIN_PASSWORD_LENGTH = 8;

// Where /auth/confirm sends a learner after they click a password-reset link.
// That click already signed them in, so this page only sets the new password.
export default function ResetPasswordPage() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setHasSession(!!data.user));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("The passwords don't match.");
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  const inputClass =
    "w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#c31d24]/60 focus:bg-white/[0.08] transition-all";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#c31d24]/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#1a596c]/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="w-12 h-12 bg-gradient-to-br from-[#c31d24] to-[#9b161c] rounded-xl flex items-center justify-center shadow-lg shadow-[#c31d24]/30 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="text-white font-bold text-lg leading-tight">Code Illustrated</p>
              <p className="text-white/40 text-xs">Online School</p>
            </div>
          </Link>
        </div>

        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 backdrop-blur-sm shadow-2xl">
          <div className="w-16 h-16 bg-[#ffbd59]/15 rounded-full flex items-center justify-center mx-auto mb-6">
            <KeyRound className="w-8 h-8 text-[#ffbd59]" />
          </div>

          {hasSession === null ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 text-[#c31d24] animate-spin" />
            </div>
          ) : !hasSession ? (
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-2">Link expired</h1>
              <p className="text-white/50 text-sm mb-6">
                This password-reset link is invalid or has expired. Request a new one to continue.
              </p>
              <Link
                href="/auth/forgot-password"
                className="inline-block w-full bg-gradient-to-r from-[#c31d24] to-[#e53535] text-white font-semibold py-3 rounded-xl"
              >
                Send a new link
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white mb-1 text-center">Choose a new password</h1>
              <p className="text-white/50 text-sm mb-8 text-center">
                You&apos;ll use it the next time you sign in.
              </p>

              {error && (
                <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="relative">
                  <input
                    id="reset-password-new"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="New password"
                    className={`${inputClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <input
                  id="reset-password-confirm"
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="Confirm new password"
                  className={inputClass}
                />
                <button
                  id="reset-password-submit"
                  type="submit"
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-[#c31d24] to-[#e53535] hover:from-[#b01a20] hover:to-[#c31d24] text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#c31d24]/25 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save password
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
