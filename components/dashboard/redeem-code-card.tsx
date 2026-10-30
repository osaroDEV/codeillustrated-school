"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Key, Loader2 } from "lucide-react";

export function RedeemCodeCard() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/academy/api/enrollments/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to redeem code.");
        return;
      }
      setCode("");
      setSuccess(true);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 bg-[#ffbd59]/10 rounded-xl flex items-center justify-center">
          <Key className="w-4 h-4 text-[#ffbd59]" />
        </div>
        <div>
          <h2 className="text-white text-sm font-semibold">Have an invite code?</h2>
          <p className="text-white/40 text-xs">Redeem a scholarship or invite code to unlock a course</p>
        </div>
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-3 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5" /> Code redeemed. Your new course is now in My Courses.
        </div>
      )}

      <form onSubmit={handleRedeem} className="flex gap-2">
        <input
          id="redeem-code-input"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="CILEARN-A1B2C3"
          maxLength={20}
          className="flex-1 min-w-0 bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/25 text-sm tracking-widest font-mono focus:outline-none focus:border-[#ffbd59]/50 transition-all uppercase"
        />
        <button
          id="redeem-code-btn"
          type="submit"
          disabled={loading || !code.trim()}
          className="flex items-center gap-2 bg-gradient-to-r from-[#ffbd59] to-[#f5a623] hover:from-[#f5a623] hover:to-[#d9890a] text-black text-sm font-semibold px-4 py-2.5 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Redeem"}
        </button>
      </form>
    </div>
  );
}
