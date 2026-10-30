"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth";
import type { CourseSummary } from "@/lib/courses";
import {
  Key, Users, Megaphone, Copy, Check, Trash2, Plus,
  Loader2, LogOut, GraduationCap, ShieldCheck, RefreshCw,
  BookOpen, Calendar, ChevronDown, ChevronUp, Send, FileText, Pencil, MailWarning,
} from "lucide-react";

type Tab = "invites" | "learners" | "announcements";

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

interface Enrollment {
  id: string;
  course_id: string;
  progress: number;
  status: string;
  next_session: string | null;
  enrolled_at: string;
}

interface Learner {
  id: string;
  full_name: string | null;
  email: string | null;
  /** null when verification status couldn't be loaded */
  email_verified: boolean | null;
  created_at: string;
  enrollments: Enrollment[];
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  course_id: string | null;
  created_at: string;
}

interface LearnerNote {
  id: string;
  user_id: string;
  title: string | null;
  body: string;
  created_at: string;
  updated_at: string;
}

interface AdminPanelProps {
  courses: CourseSummary[];
}

export function AdminPanel({ courses }: AdminPanelProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("invites");

  // Invites state
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(courses[0]?.id ?? "");
  const [expiresDays, setExpiresDays] = useState("30");
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState("");

  // Learners state
  const [learners, setLearners] = useState<Learner[]>([]);
  const [loadingLearners, setLoadingLearners] = useState(false);
  const [expandedLearner, setExpandedLearner] = useState<string | null>(null);
  const [editingEnrollment, setEditingEnrollment] = useState<string | null>(null);
  const [progressEdit, setProgressEdit] = useState(0);
  const [nextSessionEdit, setNextSessionEdit] = useState("");
  const [notesEdit, setNotesEdit] = useState("");
  const [savingEnrollment, setSavingEnrollment] = useState(false);
  const [enrollingLearnerId, setEnrollingLearnerId] = useState<string | null>(null);
  const [enrollCourseId, setEnrollCourseId] = useState(courses[0]?.id ?? "");
  const [creatingEnrollment, setCreatingEnrollment] = useState(false);

  // Announcements state
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [annCourseId, setAnnCourseId] = useState("");
  const [postingAnn, setPostingAnn] = useState(false);
  const [annError, setAnnError] = useState("");
  const [learnersError, setLearnersError] = useState("");
  const [sendingVerification, setSendingVerification] = useState(false);
  const [verificationResult, setVerificationResult] = useState("");

  // Notes state
  const [notesByUser, setNotesByUser] = useState<Record<string, LearnerNote[]>>({});
  const [newNoteTitle, setNewNoteTitle] = useState<Record<string, string>>({});
  const [newNoteBody, setNewNoteBody] = useState<Record<string, string>>({});
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteTitle, setEditingNoteTitle] = useState("");
  const [editingNoteBody, setEditingNoteBody] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const fetchInvites = useCallback(async () => {
    setLoadingInvites(true);
    const res = await fetch("/academy/api/admin/invite");
    if (res.ok) setInvites(await res.json());
    setLoadingInvites(false);
  }, []);

  const fetchLearners = useCallback(async () => {
    setLoadingLearners(true);
    setLearnersError("");
    const res = await fetch("/academy/api/admin/learners");
    if (res.ok) {
      setLearners(await res.json());
    } else {
      const d = await res.json().catch(() => ({}));
      setLearnersError(d.error || "Failed to load learners.");
    }
    setLoadingLearners(false);
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    setLoadingAnnouncements(true);
    const res = await fetch("/academy/api/admin/announcements");
    if (res.ok) setAnnouncements(await res.json());
    setLoadingAnnouncements(false);
  }, []);

  useEffect(() => {
    if (tab === "invites") fetchInvites();
    if (tab === "learners") fetchLearners();
    if (tab === "announcements") fetchAnnouncements();
  }, [tab, fetchInvites, fetchLearners, fetchAnnouncements]);

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

  async function saveEnrollment(enrollmentId: string) {
    setSavingEnrollment(true);
    await fetch("/academy/api/admin/learners", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enrollment_id: enrollmentId,
        progress: progressEdit,
        next_session: nextSessionEdit || null,
        notes: notesEdit || null,
      }),
    });
    setSavingEnrollment(false);
    setEditingEnrollment(null);
    fetchLearners();
  }

  async function postAnnouncement() {
    if (!annTitle || !annBody) return;
    setPostingAnn(true);
    setAnnError("");
    const res = await fetch("/academy/api/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: annTitle, body: annBody, course_id: annCourseId || null }),
    });
    if (res.ok) {
      setAnnTitle("");
      setAnnBody("");
      setAnnCourseId("");
      fetchAnnouncements();
    } else {
      const d = await res.json().catch(() => ({}));
      setAnnError(d.error || "Failed to post announcement.");
    }
    setPostingAnn(false);
  }

  async function deleteEnrollment(enrollmentId: string) {
    await fetch("/academy/api/admin/learners", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollment_id: enrollmentId }),
    });
    fetchLearners();
  }

  async function fetchNotes(userId: string) {
    const res = await fetch(`/academy/api/admin/notes?user_id=${userId}`);
    if (res.ok) {
      const data = await res.json();
      setNotesByUser((prev) => ({ ...prev, [userId]: data }));
    }
  }

  async function addNote(userId: string) {
    const body = newNoteBody[userId]?.trim();
    if (!body) return;
    setSavingNote(true);
    const res = await fetch("/academy/api/admin/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, title: newNoteTitle[userId]?.trim() || null, body }),
    });
    if (res.ok) {
      setNewNoteTitle((p) => ({ ...p, [userId]: "" }));
      setNewNoteBody((p) => ({ ...p, [userId]: "" }));
      fetchNotes(userId);
    }
    setSavingNote(false);
  }

  async function saveNoteEdit(userId: string) {
    if (!editingNoteId || !editingNoteBody.trim()) return;
    setSavingNote(true);
    const res = await fetch("/academy/api/admin/notes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingNoteId, title: editingNoteTitle || null, body: editingNoteBody }),
    });
    if (res.ok) {
      setEditingNoteId(null);
      fetchNotes(userId);
    }
    setSavingNote(false);
  }

  async function deleteNote(userId: string, noteId: string) {
    await fetch("/academy/api/admin/notes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: noteId }),
    });
    fetchNotes(userId);
  }

  async function createEnrollment(userId: string) {
    setCreatingEnrollment(true);
    setLearnersError("");
    const res = await fetch("/academy/api/admin/learners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, course_id: enrollCourseId }),
    });
    setCreatingEnrollment(false);
    setEnrollingLearnerId(null);
    if (res.ok) {
      fetchLearners();
    } else {
      const d = await res.json().catch(() => ({}));
      setLearnersError(d.error || "Failed to enroll learner.");
    }
  }

  async function sendVerificationLinks(email?: string) {
    setSendingVerification(true);
    setVerificationResult("");
    try {
      const res = await fetch("/academy/api/admin/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(email ? { email } : {}),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setVerificationResult(d.error || "Failed to send verification links.");
      } else {
        const failed: { email: string; error: string }[] = d.failed || [];
        setVerificationResult(
          `Sent ${d.sent.length} verification link${d.sent.length === 1 ? "" : "s"}.` +
            (failed.length ? ` ${failed.length} failed (${failed.map((f) => `${f.email}: ${f.error}`).join("; ")}).` : "")
        );
      }
    } catch {
      setVerificationResult("Network error. Failed to send verification links.");
    } finally {
      setSendingVerification(false);
    }
  }

  async function deleteAnnouncement(id: string) {
    await fetch("/academy/api/admin/announcements", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleSignOut() {
    await signOut();
    router.push("/auth/login");
    router.refresh();
  }

  const tabs = [
    { key: "invites" as Tab, label: "Invite Codes", icon: Key, count: invites.filter((i) => !i.used_by).length },
    { key: "learners" as Tab, label: "Learners", icon: Users, count: learners.length },
    { key: "announcements" as Tab, label: "Announcements", icon: Megaphone, count: announcements.length },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-white/[0.08] bg-[#0d0d14]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-[#1a596c] to-[#0f2e38] rounded-xl flex items-center justify-center shadow-md shadow-[#1a596c]/30">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">Admin Panel</p>
              <div className="flex items-center gap-1.5">
                <GraduationCap className="w-3 h-3 text-white/30" />
                <p className="text-white/30 text-[10px]">Code Illustrated</p>
              </div>
            </div>
          </div>
          <button
            id="admin-signout-btn"
            onClick={handleSignOut}
            className="flex items-center gap-2 text-white/40 hover:text-red-400 text-sm transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] rounded-2xl p-1 mb-8 w-fit">
          {tabs.map((t) => (
            <button
              key={t.key}
              id={`admin-tab-${t.key}`}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                tab === t.key
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-white/40 hover:text-white"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              {t.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  tab === t.key ? "bg-[#c31d24]/30 text-[#c31d24]" : "bg-white/10 text-white/40"
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ─── INVITE CODES TAB ─── */}
        {tab === "invites" && (
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
        )}

        {/* ─── LEARNERS TAB ─── */}
        {tab === "learners" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold">Registered Learners ({learners.length})</h2>
              <div className="flex items-center gap-3">
                {learners.some((l) => l.email_verified === false) && (
                  <button
                    id="send-verification-btn"
                    onClick={() => sendVerificationLinks()}
                    disabled={sendingVerification}
                    className="flex items-center gap-1.5 text-[#ffbd59] hover:text-[#f5a623] border border-[#ffbd59]/30 hover:border-[#ffbd59]/50 text-xs px-3 py-2 rounded-xl transition-all disabled:opacity-60"
                  >
                    {sendingVerification ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MailWarning className="w-3.5 h-3.5" />}
                    Email verification links to all unverified
                  </button>
                )}
                <button onClick={fetchLearners} className="text-white/40 hover:text-white transition-colors">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {verificationResult && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-[#ffbd59]/10 border border-[#ffbd59]/30 text-[#ffbd59] text-sm">
                {verificationResult}
              </div>
            )}

            {learnersError && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {learnersError}
              </div>
            )}

            {loadingLearners ? (
              <div className="flex items-center justify-center py-12 text-white/30">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
              </div>
            ) : learners.length === 0 ? (
              <div className="text-center py-12 text-white/30 text-sm border border-white/[0.08] rounded-2xl">
                No learners registered yet
              </div>
            ) : (
              <div className="space-y-4">
                {learners.map((learner) => {
                  const isExpanded = expandedLearner === learner.id;
                  return (
                    <div key={learner.id} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden">
                      {/* Learner header */}
                      <button
                        className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/[0.02] transition-colors"
                        onClick={() => {
                          const next = isExpanded ? null : learner.id;
                          setExpandedLearner(next);
                          if (next && !notesByUser[next]) fetchNotes(next);
                        }}
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1a596c] to-[#0f2e38] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {(learner.full_name || "?").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-white font-semibold">{learner.full_name || "—"}</p>
                            {learner.email_verified === false && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400">
                                Unverified
                              </span>
                            )}
                          </div>
                          {learner.email && <p className="text-white/50 text-xs">{learner.email}</p>}
                          <p className="text-white/40 text-xs">
                            {learner.enrollments?.length || 0} course{(learner.enrollments?.length || 0) !== 1 ? "s" : ""} ·{" "}
                            Joined {new Date(learner.created_at).toLocaleDateString("en-GB")}
                          </p>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                      </button>

                      {/* Expanded enrollments */}
                      {isExpanded && (
                        <div className="border-t border-white/[0.06] px-5 pb-5">
                          {/* Enroll in course */}
                          <div className="pt-4 pb-2">
                            {enrollingLearnerId === learner.id ? (
                              <div className="flex items-center gap-2">
                                <select
                                  value={enrollCourseId}
                                  onChange={(e) => setEnrollCourseId(e.target.value)}
                                  className="flex-1 bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#1a596c]/60"
                                >
                                  {courses.map((c) => (
                                    <option key={c.id} value={c.id} className="bg-[#0d0d14]">{c.title}</option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => createEnrollment(learner.id)}
                                  disabled={creatingEnrollment}
                                  className="flex items-center gap-1.5 bg-[#1a596c] hover:bg-[#174f60] text-white text-xs font-medium px-3 py-2 rounded-xl transition-colors disabled:opacity-60"
                                >
                                  {creatingEnrollment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setEnrollingLearnerId(null)}
                                  className="text-white/30 hover:text-white text-xs px-3 py-2 rounded-xl border border-white/10 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setEnrollingLearnerId(learner.id); setEnrollCourseId(courses[0]?.id ?? ""); }}
                                className="flex items-center gap-1.5 text-white/40 hover:text-white border border-white/10 hover:border-white/20 text-xs px-3 py-2 rounded-xl transition-all"
                              >
                                <Plus className="w-3.5 h-3.5" /> Enroll in course
                              </button>
                            )}
                          </div>

                          {(learner.enrollments || []).length === 0 ? (
                            <p className="text-white/30 text-sm py-2">No enrollments yet</p>
                          ) : (
                            <div className="space-y-4 pt-2">
                              {learner.enrollments.map((enr) => {
                                const course = courses.find((c) => c.id === enr.course_id);
                                const isEditing = editingEnrollment === enr.id;
                                return (
                                  <div key={enr.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-2">
                                        <BookOpen className="w-4 h-4 text-[#c31d24]" />
                                        <span className="text-white text-sm font-medium">{course?.title || enr.course_id}</span>
                                      </div>
                                      <button
                                        onClick={() => {
                                          if (isEditing) {
                                            setEditingEnrollment(null);
                                          } else {
                                            setEditingEnrollment(enr.id);
                                            setProgressEdit(enr.progress || 0);
                                            setNextSessionEdit(enr.next_session ? enr.next_session.slice(0, 16) : "");
                                            setNotesEdit("");
                                          }
                                        }}
                                        className="text-xs text-white/40 hover:text-white border border-white/10 px-3 py-1 rounded-lg hover:border-white/20 transition-all"
                                      >
                                        {isEditing ? "Cancel" : "Edit"}
                                      </button>
                                      {!isEditing && (
                                        <button
                                          onClick={() => deleteEnrollment(enr.id)}
                                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400/50 hover:text-red-400 transition-all"
                                          title="Remove course"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>

                                    {isEditing ? (
                                      <div className="space-y-3">
                                        <div>
                                          <label className="text-white/40 text-xs mb-1 block">Progress: {progressEdit}%</label>
                                          <input
                                            type="range" min="0" max="100" value={progressEdit}
                                            onChange={(e) => setProgressEdit(parseInt(e.target.value))}
                                            className="w-full accent-[#c31d24]"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-white/40 text-xs mb-1 block">Next session (date & time)</label>
                                          <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                            <input
                                              type="datetime-local"
                                              value={nextSessionEdit}
                                              onChange={(e) => setNextSessionEdit(e.target.value)}
                                              className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5 pl-10 text-white text-sm focus:outline-none focus:border-[#c31d24]/50"
                                            />
                                          </div>
                                        </div>
                                        <div>
                                          <label className="text-white/40 text-xs mb-1 block">Instructor notes (optional)</label>
                                          <textarea
                                            value={notesEdit}
                                            onChange={(e) => setNotesEdit(e.target.value)}
                                            rows={2}
                                            placeholder="e.g. Great progress on Module 2..."
                                            className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#c31d24]/50 resize-none placeholder-white/20"
                                          />
                                        </div>
                                        <button
                                          onClick={() => saveEnrollment(enr.id)}
                                          disabled={savingEnrollment}
                                          className="flex items-center gap-2 bg-[#c31d24] hover:bg-[#b01a20] text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
                                        >
                                          {savingEnrollment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                          Save changes
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="text-white/40 text-xs">Progress</span>
                                          <span className="text-white text-xs font-medium">{enr.progress || 0}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                                          <div className="h-full bg-gradient-to-r from-[#c31d24] to-[#f5a623] rounded-full" style={{ width: `${enr.progress || 0}%` }} />
                                        </div>
                                        {enr.next_session && (
                                          <div className="flex items-center gap-2 text-white/40 text-xs pt-1">
                                            <Calendar className="w-3.5 h-3.5 text-[#ffbd59]" />
                                            Next: {new Date(enr.next_session).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* ── Notes section ── */}
                          <div className="mt-5 pt-4 border-t border-white/[0.06]">
                            <div className="flex items-center gap-2 mb-3">
                              <FileText className="w-3.5 h-3.5 text-[#ffbd59]" />
                              <span className="text-white/60 text-xs font-medium uppercase tracking-wider">Instructor Notes</span>
                            </div>

                            {/* Existing notes */}
                            {(notesByUser[learner.id] || []).length > 0 && (
                              <div className="space-y-2 mb-3">
                                {(notesByUser[learner.id] || []).map((note) => (
                                  <div key={note.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                                    {editingNoteId === note.id ? (
                                      <div className="space-y-2">
                                        <input
                                          type="text"
                                          value={editingNoteTitle}
                                          onChange={(e) => setEditingNoteTitle(e.target.value)}
                                          placeholder="Note title (optional)"
                                          className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#ffbd59]/50"
                                        />
                                        <textarea
                                          value={editingNoteBody}
                                          onChange={(e) => setEditingNoteBody(e.target.value)}
                                          rows={3}
                                          className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#ffbd59]/50 resize-none"
                                        />
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => saveNoteEdit(learner.id)}
                                            disabled={savingNote}
                                            className="flex items-center gap-1.5 bg-[#ffbd59]/20 hover:bg-[#ffbd59]/30 text-[#ffbd59] text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                                          >
                                            {savingNote ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                            Save
                                          </button>
                                          <button
                                            onClick={() => setEditingNoteId(null)}
                                            className="text-white/30 hover:text-white text-xs px-3 py-1.5 rounded-lg border border-white/10 transition-colors"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div>
                                        {note.title && <p className="text-white/70 text-xs font-medium mb-1">{note.title}</p>}
                                        <p className="text-white/50 text-xs leading-relaxed whitespace-pre-wrap">{note.body}</p>
                                        <div className="flex items-center justify-between mt-2">
                                          <span className="text-white/20 text-[10px]">
                                            {new Date(note.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                          </span>
                                          <div className="flex gap-1.5">
                                            <button
                                              onClick={() => { setEditingNoteId(note.id); setEditingNoteTitle(note.title || ""); setEditingNoteBody(note.body); }}
                                              className="p-1 rounded-lg text-white/30 hover:text-[#ffbd59] hover:bg-[#ffbd59]/10 transition-all"
                                              title="Edit note"
                                            >
                                              <Pencil className="w-3 h-3" />
                                            </button>
                                            <button
                                              onClick={() => deleteNote(learner.id, note.id)}
                                              className="p-1 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                              title="Delete note"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Add new note */}
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={newNoteTitle[learner.id] || ""}
                                onChange={(e) => setNewNoteTitle((p) => ({ ...p, [learner.id]: e.target.value }))}
                                placeholder="Title (optional)"
                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-white placeholder-white/20 text-xs focus:outline-none focus:border-[#ffbd59]/40 transition-all"
                              />
                              <textarea
                                value={newNoteBody[learner.id] || ""}
                                onChange={(e) => setNewNoteBody((p) => ({ ...p, [learner.id]: e.target.value }))}
                                rows={2}
                                placeholder="Write a note for this learner..."
                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-white placeholder-white/20 text-xs focus:outline-none focus:border-[#ffbd59]/40 transition-all resize-none"
                              />
                              <button
                                onClick={() => addNote(learner.id)}
                                disabled={savingNote || !newNoteBody[learner.id]?.trim()}
                                className="flex items-center gap-1.5 bg-[#ffbd59]/15 hover:bg-[#ffbd59]/25 text-[#ffbd59] text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                              >
                                {savingNote ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                Add note
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── ANNOUNCEMENTS TAB ─── */}
        {tab === "announcements" && (
          <div>
            {/* Post form */}
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 mb-6">
              <h2 className="text-white font-semibold mb-5 flex items-center gap-2">
                <Send className="w-4 h-4 text-[#ffbd59]" /> Post Announcement
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-white/50 text-xs mb-2 uppercase tracking-wider">Title</label>
                  <input
                    id="announcement-title"
                    type="text"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    placeholder="e.g. New resources added for Frontend learners"
                    className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-[#ffbd59]/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-white/50 text-xs mb-2 uppercase tracking-wider">Message</label>
                  <textarea
                    id="announcement-body"
                    value={annBody}
                    onChange={(e) => setAnnBody(e.target.value)}
                    rows={3}
                    placeholder="Write your announcement here..."
                    className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-[#ffbd59]/50 transition-all resize-none"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-white/50 text-xs mb-2 uppercase tracking-wider">Target audience</label>
                    <select
                      id="announcement-course"
                      value={annCourseId}
                      onChange={(e) => setAnnCourseId(e.target.value)}
                      className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#ffbd59]/50 transition-all"
                    >
                      <option value="" className="bg-[#0d0d14]">All learners (global)</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id} className="bg-[#0d0d14]">{c.title} only</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:self-end">
                    <button
                      id="post-announcement-btn"
                      onClick={postAnnouncement}
                      disabled={postingAnn || !annTitle || !annBody}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-[#ffbd59] to-[#f5a623] hover:from-[#f5a623] hover:to-[#d9890a] text-black font-semibold px-6 py-3 rounded-xl transition-all shadow-lg shadow-[#ffbd59]/20 disabled:opacity-60 whitespace-nowrap"
                    >
                      {postingAnn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Post
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {annError && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {annError}
              </div>
            )}

            {/* Announcements list */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold">Posted Announcements</h2>
              <button onClick={fetchAnnouncements} className="text-white/40 hover:text-white transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {loadingAnnouncements ? (
              <div className="flex items-center justify-center py-12 text-white/30">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-12 text-white/30 text-sm border border-white/[0.08] rounded-2xl">
                No announcements posted yet
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map((ann) => {
                  const course = courses.find((c) => c.id === ann.course_id);
                  return (
                    <div key={ann.id} className="flex items-start gap-4 p-5 bg-white/[0.04] border border-white/[0.08] rounded-2xl hover:border-white/[0.12] transition-all">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-white font-semibold text-sm">{ann.title}</h3>
                          <span className="text-[10px] bg-white/[0.06] text-white/40 px-2 py-0.5 rounded-full">
                            {course ? course.title : "All Learners"}
                          </span>
                        </div>
                        <p className="text-white/50 text-sm">{ann.body}</p>
                        <p className="text-white/25 text-xs mt-2">
                          {new Date(ann.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteAnnouncement(ann.id)}
                        className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400/50 hover:text-red-400 transition-all flex-shrink-0"
                        title="Delete announcement"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
