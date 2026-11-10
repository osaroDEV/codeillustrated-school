"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ResendVerification } from "@/components/auth/resend-verification";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { loginPath } from "@/lib/routes";
import { safeRedirectPath } from "@/lib/utils";
import {
  Eye, EyeOff, Loader2, CheckCircle2, ArrowRight, Key, User, Mail, Lock,
} from "lucide-react";

type Step = "register" | "success";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get("redirectTo"), "/dashboard");
  // Keep the visitor's place when they move between login and signup.
  const loginHref = loginPath(redirectTo === "/dashboard" ? null : redirectTo);
  // Signed out visitors are sent here from a course's Subscribe button.
  const fromCourse = redirectTo.startsWith("/courses/");

  const [step, setStep] = useState<Step>("register");
  const [inviteCode, setInviteCode] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [enrolled, setEnrolled] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Register account (an invite code is optional)
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
      const res = await fetch("/api/auth/complete-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          fullName,
          inviteCode: inviteCode.trim() || undefined,
          // the verification link brings them back here
          redirectTo: redirectTo === "/dashboard" ? undefined : redirectTo,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || "Failed to create account. Please try again.");
        setLoading(false);
        return;
      }

      const data = await res.json().catch(() => ({}));
      setEnrolled(!!data.enrolled);
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
          <BrandLogo href="/" size={56} priority />
        </div>

        {/* Card */}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 backdrop-blur-sm shadow-2xl">
          {/* Register */}
          {step === "register" && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#c31d24]/15 rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-[#c31d24]" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Create your account</h1>
                  <p className="text-white/40 text-xs">
                    {fromCourse
                      ? "Then you'll come back to the course to finish enrolling"
                      : "Free to create. You choose a course next."}
                  </p>
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

                {showInvite ? (
                  <div>
                    <label className="block text-white/70 text-sm font-medium mb-2">Invite code (optional)</label>
                    <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        id="invite-code-input"
                        type="text"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        placeholder="e.g. CILEARN-A1B2C3"
                        maxLength={20}
                        className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 pl-11 text-white placeholder-white/25 text-sm tracking-widest font-mono focus:outline-none focus:border-[#ffbd59]/50 focus:bg-white/[0.08] transition-all uppercase"
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowInvite(true)}
                    className="text-[#ffbd59] hover:text-[#f5a623] text-xs font-medium transition-colors"
                  >
                    Have an invite or scholarship code?
                  </button>
                )}

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

          {/* Success */}
          {step === "success" && (
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-green-500/15 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Check your inbox</h1>
              <p className="text-white/50 text-sm mb-2">
                Your account has been created
                {enrolled ? " and you’ve been enrolled in your course" : ""}. We&apos;ve sent a
                verification link to <span className="text-white">{email}</span>.
              </p>
              <p className="text-white/50 text-sm mb-6">
                {fromCourse
                  ? "Click it to activate your account. It brings you straight back to the course to finish enrolling."
                  : "Click it to activate your account. It takes you to your dashboard, where you can choose your course."}
              </p>
              <div className="mb-4">
                <ResendVerification email={email.trim()} />
              </div>
              <button
                id="go-to-dashboard-btn"
                onClick={() => router.push(loginHref)}
                className="w-full bg-gradient-to-r from-[#c31d24] to-[#e53535] text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#c31d24]/25"
              >
                Go to Login <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-white/25 text-xs mt-6">
          Already have an account?{" "}
          <Link href={loginHref} className="text-white/40 hover:text-white transition-colors underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#c31d24] animate-spin" />
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
