"use client";

import { useState, useEffect, useCallback } from "react";
import type { CourseSummary } from "@/lib/courses";
import { fromDatetimeLocal, toDatetimeLocal } from "@/lib/schedule";
import Link from "next/link";
import {
  Check, Trash2, Plus, Loader2, RefreshCw, BookOpen, Calendar,
  ChevronDown, ChevronUp, FileText, Pencil, MailWarning,
} from "lucide-react";

type Role = "student" | "instructor" | "admin";

const ROLE_BADGE: Record<Role, string> = {
  student: "",
  instructor: "bg-[#3da3bc]/15 text-[#3da3bc]",
  admin: "bg-[#c31d24]/15 text-[#e53535]",
};

interface Enrollment {
  id: string;
  course_id: string;
  progress: number;
  status: string;
  next_session: string | null;
  enrolled_at: string;
  cohort_id: string | null;
  cohorts: { name: string } | null;
}

interface Learner {
  id: string;
  full_name: string | null;
  email: string | null;
  role: Role;
  /** null when verification status couldn't be loaded */
  email_verified: boolean | null;
  created_at: string;
  enrollments: Enrollment[];
}

interface LearnerNote {
  id: string;
  user_id: string;
  title: string | null;
  body: string;
  created_at: string;
  updated_at: string;
}

export function LearnersTab({ courses }: { courses: CourseSummary[] }) {
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
  const [learnersError, setLearnersError] = useState("");
  const [sendingVerification, setSendingVerification] = useState(false);
  const [verificationResult, setVerificationResult] = useState("");
  const [notesByUser, setNotesByUser] = useState<Record<string, LearnerNote[]>>({});
  const [newNoteTitle, setNewNoteTitle] = useState<Record<string, string>>({});
  const [newNoteBody, setNewNoteBody] = useState<Record<string, string>>({});
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteTitle, setEditingNoteTitle] = useState("");
  const [editingNoteBody, setEditingNoteBody] = useState("");
  const [savingNote, setSavingNote] = useState(false);

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

  useEffect(() => {
    fetchLearners();
  }, [fetchLearners]);

  async function saveEnrollment(enrollment: Enrollment) {
    setSavingEnrollment(true);
    await fetch("/academy/api/admin/learners", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enrollment_id: enrollment.id,
        progress: progressEdit,
        // Learners in a cohort get their next session from its schedule.
        ...(enrollment.cohort_id ? {} : { next_session: fromDatetimeLocal(nextSessionEdit) }),
        notes: notesEdit || null,
      }),
    });
    setSavingEnrollment(false);
    setEditingEnrollment(null);
    fetchLearners();
  }

  async function changeRole(userId: string, role: Role) {
    setLearnersError("");
    const res = await fetch("/academy/api/admin/roles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, role }),
    });
    if (res.ok) {
      setLearners((prev) => prev.map((l) => (l.id === userId ? { ...l, role } : l)));
    } else {
      const d = await res.json().catch(() => ({}));
      setLearnersError(d.error || "Failed to change role.");
    }
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

  return (
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
                      {learner.role !== "student" && (
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${ROLE_BADGE[learner.role]}`}>
                          {learner.role}
                        </span>
                      )}
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
                    {/* Role */}
                    <div className="pt-4 flex items-center gap-2">
                      <label htmlFor={`role-${learner.id}`} className="text-white/40 text-xs">Role</label>
                      <select
                        id={`role-${learner.id}`}
                        value={learner.role}
                        onChange={(e) => changeRole(learner.id, e.target.value as Role)}
                        className="bg-white/[0.06] border border-white/10 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-[#1a596c]/60"
                      >
                        <option value="student" className="bg-[#0d0d14]">Student</option>
                        <option value="instructor" className="bg-[#0d0d14]">Instructor</option>
                        <option value="admin" className="bg-[#0d0d14]">Admin</option>
                      </select>
                    </div>

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
                                  {enr.cohort_id ? (
                                    <Link
                                      href={`/admin/cohorts/${enr.cohort_id}`}
                                      className="text-[10px] px-2 py-0.5 rounded-full bg-[#3da3bc]/15 text-[#3da3bc] hover:text-white"
                                    >
                                      {enr.cohorts?.name ?? "Cohort"}
                                    </Link>
                                  ) : (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-white/40">
                                      No cohort
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => {
                                    if (isEditing) {
                                      setEditingEnrollment(null);
                                    } else {
                                      setEditingEnrollment(enr.id);
                                      setProgressEdit(enr.progress || 0);
                                      setNextSessionEdit(toDatetimeLocal(enr.next_session));
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
                                  {enr.cohort_id ? (
                                    <p className="text-white/40 text-xs">
                                      Next session comes from the cohort&apos;s schedule.
                                    </p>
                                  ) : (
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
                                  )}
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
                                    onClick={() => saveEnrollment(enr)}
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
                                  {!enr.cohort_id && enr.next_session && (
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
  );
}
