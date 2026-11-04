"use client";

import { useState, useEffect, useCallback } from "react";
import type { CourseSummary } from "@/lib/courses";
import { Key, Copy, Check, Trash2, Plus, Loader2, RefreshCw } from "lucide-react";

interface InviteCode {
  id: string;
  code: string;
  course_id: string;
  used_by: string | null;
  used_at: string | null;
  expires_at: string | null;
  created_at: string;
  profiles?: { full_name: string } | null;
}

export function CodesTab({ courses }: { courses: CourseSummary[] }) {
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(courses[0]?.id ?? "");
  const [expiresDays, setExpiresDays] = useState("30");
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState("");

  const fetchInvites = useCallback(async () => {
    setLoadingInvites(true);
    const res = await fetch("/academy/api/admin/invite");
    if (res.ok) setInvites(await res.json());
    setLoadingInvites(false);
  }, []);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  async function generateInvite() {
    setGenerating(true);
    setInviteError("");
    try {
      const res = await fetch("/academy/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: selectedCourse, expires_days: expiresDays ? parseInt(expiresDays) : null }),
      });
      if (res.ok) {
        const newCode = await res.json();
        setInvites((prev) => [newCode, ...prev]);
      } else {
        const data = await res.json();
        setInviteError(data.error || "Failed to generate invite code.");
      }
    } catch {
      setInviteError("Network error. Please check your database settings or try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function deleteInvite(id: string) {
    setInviteError("");
    try {
      const res = await fetch("/academy/api/admin/invite", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setInvites((prev) => prev.filter((inv) => inv.id !== id));
      } else {
        const data = await res.json();
        setInviteError(data.error || "Failed to delete invite code.");
      }
    } catch {
      setInviteError("Network error. Failed to delete invite code.");
    }
  }

  function copyCode(code: string, id: string) {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div>
      {/* Generator */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 mb-6">
        <h2 className="text-white font-semibold mb-5 flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#ffbd59]" /> Generate New Invite Code
        </h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-white/50 text-xs mb-2 uppercase tracking-wider">Course</label>
            <select
              id="invite-course-select"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#1a596c]/60 transition-all"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#0d0d14]">
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:w-40">
            <label className="block text-white/50 text-xs mb-2 uppercase tracking-wider">Expires in (days)</label>
            <input
              id="invite-expires-input"
              type="number"
              value={expiresDays}
              onChange={(e) => setExpiresDays(e.target.value)}
              placeholder="30"
              min="1"
              className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#1a596c]/60 transition-all"
            />
          </div>
          <div className="sm:self-end">
            <button
              id="generate-invite-btn"
              onClick={generateInvite}
              disabled={generating}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-[#1a596c] to-[#3da3bc] hover:from-[#174f60] hover:to-[#1a596c] text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-lg shadow-[#1a596c]/25 disabled:opacity-60 whitespace-nowrap"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
              Generate Code
            </button>
          </div>
        </div>
      </div>

      {inviteError && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {inviteError}
        </div>
      )}

      {/* Codes list */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold">All Invite Codes</h2>
        <button onClick={fetchInvites} className="text-white/40 hover:text-white transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loadingInvites ? (
        <div className="flex items-center justify-center py-12 text-white/30">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
        </div>
      ) : invites.length === 0 ? (
        <div className="text-center py-12 text-white/30 text-sm border border-white/[0.08] rounded-2xl">
          No invite codes yet. Generate one above.
        </div>
      ) : (
        <div className="space-y-3">
          {invites.map((inv) => {
            const course = courses.find((c) => c.id === inv.course_id);
            const isUsed = !!inv.used_by;
            const isExpired = inv.expires_at && new Date(inv.expires_at) < new Date();
            return (
              <div key={inv.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                isUsed
                  ? "bg-white/[0.02] border-white/[0.05] opacity-60"
                  : isExpired
                  ? "bg-yellow-500/[0.03] border-yellow-500/10"
                  : "bg-white/[0.04] border-white/[0.08] hover:border-white/[0.15]"
              }`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-white font-mono font-bold tracking-wider text-sm">{inv.code}</code>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      isUsed
                        ? "bg-white/10 text-white/40"
                        : isExpired
                        ? "bg-yellow-500/15 text-yellow-400"
                        : "bg-green-500/15 text-green-400"
                    }`}>
                      {isUsed ? "Used" : isExpired ? "Expired" : "Active"}
                    </span>
                  </div>
                  <p className="text-white/40 text-xs mt-1">
                    {course?.title || inv.course_id}
                    {inv.used_by && inv.profiles?.full_name && ` · Used by ${inv.profiles.full_name}`}
                    {inv.expires_at && !isUsed && ` · Expires ${new Date(inv.expires_at).toLocaleDateString("en-GB")}`}
                    {isUsed && inv.used_at && ` on ${new Date(inv.used_at).toLocaleDateString("en-GB")}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!isUsed && (
                    <button
                      onClick={() => copyCode(inv.code, inv.id)}
                      className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white/50 hover:text-white transition-all"
                      title="Copy code"
                    >
                      {copiedId === inv.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}
                  <button
                    onClick={() => deleteInvite(inv.id)}
                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400/50 hover:text-red-400 transition-all"
                    title="Delete code"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
