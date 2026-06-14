"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Lock, Loader2, ShieldCheck } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/academy/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      // Store in sessionStorage so admin page can use it for API calls
      sessionStorage.setItem("admin_secret", password);
      router.push("/admin");
      router.refresh();
    } else {
      setError("Invalid admin password.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#1a596c]/15 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-[#1a596c] to-[#0f2e38] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-[#1a596c]/30">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <GraduationCap className="w-4 h-4 text-white/40" />
            <span className="text-white/40 text-sm">Code Illustrated</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
        </div>

        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          {error && (
            <div className="mb-5 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-white/60 text-sm font-medium mb-2">Admin Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  id="admin-password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter admin password"
                  className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 pl-11 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#1a596c]/60 transition-all"
                />
              </div>
            </div>
            <button
              id="admin-login-btn"
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#1a596c] to-[#3da3bc] hover:from-[#174f60] hover:to-[#1a596c] text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#1a596c]/25 disabled:opacity-60"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : "Access Admin"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
