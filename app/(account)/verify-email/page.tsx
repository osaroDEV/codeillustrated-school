"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { LOGIN_PATH } from "@/lib/routes";
import { Loader2, Mail } from "lucide-react";
import { ResendVerification } from "@/components/auth/resend-verification";

// Where requireUser() sends signed-in but unverified learners, and where
// signup points them after creating an account.
function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#1a596c]/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#c31d24]/15 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <BrandLogo href="/" size={56} priority />
        </div>

        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 backdrop-blur-sm shadow-2xl text-center">
          <div className="w-16 h-16 bg-[#ffbd59]/15 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-[#ffbd59]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Verify your email</h1>
          <p className="text-white/50 text-sm mb-6">
            Click the link we emailed you to activate your account. You need to verify your
            email before you can use your dashboard.
          </p>

          {searchParams.get("email") ? (
            <p className="text-white text-sm font-medium mb-6">{email}</p>
          ) : (
            <input
              id="verify-email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full mb-4 bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#c31d24]/60 transition-all"
            />
          )}

          <ResendVerification email={email.trim()} />

          <p className="text-white/30 text-xs mt-6">
            Already verified?{" "}
            <Link href={LOGIN_PATH} className="text-white/50 hover:text-white underline transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#c31d24] animate-spin" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
