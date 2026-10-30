"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth";
import { ResendVerification } from "@/components/auth/resend-verification";
import { Eye, EyeOff, Loader2, GraduationCap } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    searchParams.get("error") === "link_invalid"
      ? "That verification link is invalid or has expired. Sign in to request a new one."
      : ""
  );
  const [unverified, setUnverified] = useState(false);
  const notice =
    searchParams.get("notice") === "verified"
      ? "If you just clicked a verification link, your email is verified. Sign in to continue."
      : "";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setUnverified(false);

    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      const msg = signInError.message.toLowerCase();
      if (msg.includes("email not confirmed")) {
        setError("Please verify your email first. Check your inbox for the link, or send a new one below.");
        setUnverified(true);
      } else if (msg.includes("invalid login credentials")) {
        setError("Invalid email or password. Please try again.");
      } else {
        setError(signInError.message);
      }
      setLoading(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#c31d24]/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#1a596c]/20 rounded-full blur-3xl" />
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

        {/* Card */}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 backdrop-blur-sm shadow-2xl">
          <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-white/50 text-sm mb-8">Sign in to access your learner dashboard</p>

          {notice && !error && (
            <div className="mb-6 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
              {notice}
            </div>
          )}
          {error && (
            <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          {unverified && (
            <div className="mb-6">
              <ResendVerification email={email.trim()} />
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-white/70 text-sm font-medium mb-2">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#c31d24]/60 focus:bg-white/[0.08] transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-white/70 text-sm font-medium">Password</label>
                <Link
                  href="/auth/forgot-password"
                  className="text-white/40 hover:text-white/70 text-xs transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#c31d24]/60 focus:bg-white/[0.08] transition-all"
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

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#c31d24] to-[#e53535] hover:from-[#b01a20] hover:to-[#c31d24] text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#c31d24]/25 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="text-center text-white/40 text-sm mt-6">
            New to Code Illustrated?{" "}
            <Link href="/auth/signup" className="text-[#ffbd59] hover:text-[#f5a623] font-medium transition-colors">
              Create your account
            </Link>
          </p>
        </div>

        <p className="text-center text-white/25 text-xs mt-6">
          © {new Date().getFullYear()} Code Illustrated Online School
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-[#0a0a0f]">
        <div className="text-center flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#c31d24] animate-spin" />
          <p className="text-white/40 text-sm">Loading login portal...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
