"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Eye, EyeOff, Loader2, GraduationCap,
  CheckCircle2, ArrowRight, Key, User, Mail, Lock,
} from "lucide-react";

type Step = "invite" | "register" | "success";

export default function SignupPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("invite");
  const [inviteCode, setInviteCode] = useState("");
  const [inviteData, setInviteData] = useState<{ course_id: string; id: string } | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Validate invite code
  async function handleValidateInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/academy/api/auth/validate-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inviteCode.trim().toUpperCase() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid invite code.");
        setLoading(false);
        return;
      }

      setInviteData({ course_id: data.course_id, id: data.id });
      setStep("register");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Register account
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });

      if (authError || !authData.user) {
        setError(authError?.message || "Failed to create account.");
        setLoading(false);
        return;
      }

      // Mark invite code as used + create enrollment via API
      const res = await fetch("/academy/api/auth/complete-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: authData.user.id,
          fullName,
          inviteId: inviteData!.id,
          courseId: inviteData!.course_id,
        }),
      });

      if (!res.ok) {
        setError("Account created but enrollment failed. Contact support.");
        setLoading(false);
        return;
      }

      setStep("success");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#1a596c]/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#c31d24]/15 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
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

        {/* Progress steps */}
        <div className="flex items-center gap-2 mb-6 justify-center">
          {[
            { key: "invite", label: "Invite Code" },
            { key: "register", label: "Create Account" },
            { key: "success", label: "Done" },
          ].map((s, i, arr) => (
            <div key={s.key} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                step === s.key ? "text-white" :
                (step === "register" && s.key === "invite") || step === "success"
                  ? "text-[#ffbd59]" : "text-white/30"
              }`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                  (step === "register" && s.key === "invite") || step === "success"
                    ? "bg-[#ffbd59] text-black"
                    : step === s.key
                    ? "bg-white text-black"
                    : "bg-white/10 text-white/30"
                }`}>
                  {(step === "register" && s.key === "invite") || step === "success" ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (i + 1)}
                </div>
                <span className="hidden sm:block">{s.label}</span>
              </div>
              {i < arr.length - 1 && (
                <div className={`w-8 h-px transition-colors ${
                  (step === "register" && s.key === "invite") || step === "success"
                    ? "bg-[#ffbd59]/50" : "bg-white/10"
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 backdrop-blur-sm shadow-2xl">
          {/* STEP 1: Invite Code */}
          {step === "invite" && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#ffbd59]/15 rounded-xl flex items-center justify-center">
                  <Key className="w-5 h-5 text-[#ffbd59]" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Enter your invite code</h1>
                  <p className="text-white/40 text-xs">This is provided by Code Illustrated after payment</p>
                </div>
              </div>

              {error && (
                <div className="mb-5 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleValidateInvite} className="space-y-5">
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">Invite Code</label>
                  <input
                    id="invite-code-input"
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    required
                    placeholder="e.g. CILEARN-A1B2C3"
                    maxLength={20}
                    className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm tracking-widest font-mono focus:outline-none focus:border-[#ffbd59]/50 focus:bg-white/[0.08] transition-all uppercase"
                  />
                </div>

                <button
                  id="validate-invite-btn"
                  type="submit"
                  disabled={loading || !inviteCode.trim()}
                  className="w-full bg-gradient-to-r from-[#ffbd59] to-[#f5a623] hover:from-[#f5a623] hover:to-[#d9890a] text-black font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#ffbd59]/20 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Validating...</>
                  ) : (
                    <><span>Continue</span><ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </form>

              <p className="text-center text-white/30 text-xs mt-6">
                Don&apos;t have a code?{" "}
                <a href="https://codeillustrated.com" className="text-white/50 hover:text-white underline transition-colors">
                  Enroll in a course
                </a>
              </p>
            </>
          )}

          {/* STEP 2: Register */}
          {step === "register" && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#c31d24]/15 rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-[#c31d24]" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Create your account</h1>
                  <p className="text-white/40 text-xs">Invite code verified ✓ — almost there!</p>
                </div>
              </div>

              {error && (
                <div className="mb-5 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">Full name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      id="signup-fullname"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder="Jane Doe"
                      className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 pl-11 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#c31d24]/60 focus:bg-white/[0.08] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                      className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 pl-11 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#c31d24]/60 focus:bg-white/[0.08] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Min. 8 characters"
                      className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 pl-11 pr-12 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#c31d24]/60 focus:bg-white/[0.08] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">Confirm password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      id="signup-confirm-password"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Repeat password"
                      className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 pl-11 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#c31d24]/60 focus:bg-white/[0.08] transition-all"
                    />
                  </div>
                </div>

                <button
                  id="signup-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#c31d24] to-[#e53535] hover:from-[#b01a20] hover:to-[#c31d24] text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#c31d24]/25 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</>
                  ) : (
                    "Create my account"
                  )}
                </button>
              </form>
            </>
          )}

          {/* STEP 3: Success */}
          {step === "success" && (
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-green-500/15 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">You&apos;re in! 🎉</h1>
              <p className="text-white/50 text-sm mb-8">
                Your account has been created and you&apos;ve been enrolled in your course.
                <br />Check your email to verify your account.
              </p>
              <button
                id="go-to-dashboard-btn"
                onClick={() => router.push("/auth/login")}
                className="w-full bg-gradient-to-r from-[#c31d24] to-[#e53535] text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#c31d24]/25"
              >
                Go to Login <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-white/25 text-xs mt-6">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-white/40 hover:text-white transition-colors underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
