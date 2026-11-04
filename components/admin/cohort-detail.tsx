"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, CalendarPlus, Check, ClipboardCheck, ExternalLink, Loader2, Pencil,
  Plus, Trash2, UserMinus, Users, Video,
} from "lucide-react";
import { LocalTime } from "@/components/local-time";
import type { AttendanceStatus, ClassSession, Cohort } from "@/lib/cohorts";
import {
  fromDatetimeLocal,
  generateWeeklySessions,
  joinState,
  MAX_GENERATED_SESSIONS,
} from "@/lib/schedule";
import { STATUS_BADGE } from "./cohorts-list";
import {
  cardClass, dangerButtonClass, errorClass, inputClass, labelClass,
  primaryButtonClass, request, secondaryButtonClass, send,
} from "./ui";

export interface CohortMember {
  enrollment_id: string;
  user_id: string;
  name: string;
  email: string | null;
}

interface Props {
  cohort: Cohort;
  courseTitle: string;
  sessions: ClassSession[];
  members: CohortMember[];
  unassigned: CohortMember[];
  attendance: Record<string, Record<string, AttendanceStatus>>;
  lessons: { id: string; title: string }[];
  staff: { id: string; name: string }[];
  isAdmin: boolean;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CohortDetail(props: Props) {
  const { cohort, courseTitle, members, isAdmin } = props;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/cohorts" className="inline-flex items-center gap-1.5 text-white/40 hover:text-white text-xs mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> All cohorts
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold text-white">{cohort.name}</h1>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[cohort.status]}`}>
            {cohort.status}
          </span>
        </div>
        <p className="text-white/40 text-sm mt-1">
          {courseTitle} · {cohort.offering_kind === "cohort_1on1" ? "1-on-1" : "Group"} · {members.length}
          {cohort.capacity ? ` / ${cohort.capacity}` : ""} learners
        </p>
      </div>

      {isAdmin && <CohortSettings {...props} />}
      <Members {...props} />
      {isAdmin && <ScheduleSessions {...props} />}
      <SessionList {...props} />
    </div>
  );
}

// ─── Settings (admin) ───

function CohortSettings({ cohort, staff }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: cohort.name,
    offering_kind: cohort.offering_kind,
    status: cohort.status,
    starts_on: cohort.starts_on ?? "",
    ends_on: cohort.ends_on ?? "",
    capacity: cohort.capacity?.toString() ?? "",
    meeting_url: cohort.meeting_url ?? "",
    instructor_id: cohort.instructor_id ?? "",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const instructorName = staff.find((s) => s.id === cohort.instructor_id)?.name;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const { error: err, data } = await request<{ warning?: string }>(`/cohorts/${cohort.id}`, "PATCH", form);
    setSaving(false);
    if (err) return setError(err);
    if (data?.warning) setError(data.warning);
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm(`Delete "${cohort.name}" and all its sessions? This can't be undone.`)) return;
    const err = await send(`/cohorts/${cohort.id}`, "DELETE");
    if (err) return setError(err);
    router.push("/admin/cohorts");
    router.refresh();
  }

  if (!editing) {
    return (
      <section className={`${cardClass} p-5`}>
        <div className="flex items-start justify-between gap-4">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm flex-1">
            <Detail label="Instructor" value={instructorName ?? "Not assigned"} />
            <Detail label="Dates" value={[cohort.starts_on, cohort.ends_on].filter(Boolean).join(" → ") || "Not set"} />
            <Detail label="Capacity" value={cohort.capacity ? String(cohort.capacity) : "No limit"} />
            <Detail
              label="Meeting link"
              value={
                cohort.meeting_url ? (
                  <a href={cohort.meeting_url} target="_blank" rel="noopener noreferrer" className="text-[#3da3bc] hover:text-white break-all">
                    {cohort.meeting_url}
                  </a>
                ) : (
                  "Not set"
                )
              }
            />
          </dl>
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)} className={secondaryButtonClass}>
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            <button onClick={remove} className={dangerButtonClass} title="Delete cohort">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        {error && <div className={`${errorClass} mt-4`}>{error}</div>}
      </section>
    );
  }

  return (
    <form onSubmit={save} className={`${cardClass} p-5 grid grid-cols-1 sm:grid-cols-2 gap-4`}>
      <Field label="Name" id="c-name">
        <input id="c-name" required value={form.name} onChange={set("name")} className={inputClass} />
      </Field>
      <Field label="Status" id="c-status">
        <select id="c-status" value={form.status} onChange={set("status")} className={inputClass}>
          <option value="planned" className="bg-[#0d0d14]">Planned</option>
          <option value="running" className="bg-[#0d0d14]">Running</option>
          <option value="finished" className="bg-[#0d0d14]">Finished</option>
        </select>
      </Field>
      <Field label="Format" id="c-kind">
        <select id="c-kind" value={form.offering_kind} onChange={set("offering_kind")} className={inputClass}>
          <option value="cohort_group" className="bg-[#0d0d14]">Group</option>
          <option value="cohort_1on1" className="bg-[#0d0d14]">1-on-1</option>
        </select>
      </Field>
      <Field label="Instructor" id="c-instructor">
        <select id="c-instructor" value={form.instructor_id} onChange={set("instructor_id")} className={inputClass}>
          <option value="" className="bg-[#0d0d14]">Not assigned</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id} className="bg-[#0d0d14]">{s.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Starts on" id="c-start">
        <input id="c-start" type="date" value={form.starts_on} onChange={set("starts_on")} className={inputClass} />
      </Field>
      <Field label="Ends on" id="c-end">
        <input id="c-end" type="date" value={form.ends_on} onChange={set("ends_on")} className={inputClass} />
      </Field>
      <Field label="Capacity" id="c-capacity">
        <input id="c-capacity" type="number" min="1" value={form.capacity} onChange={set("capacity")} placeholder="No limit" className={inputClass} />
      </Field>
      <Field label="Meeting link" id="c-meeting">
        <input id="c-meeting" type="url" value={form.meeting_url} onChange={set("meeting_url")} placeholder="https://…" className={inputClass} />
      </Field>
      {error && <div className={`${errorClass} sm:col-span-2`}>{error}</div>}
      <div className="sm:col-span-2 flex gap-2">
        <button type="submit" disabled={saving} className={primaryButtonClass}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
        </button>
        <button type="button" onClick={() => setEditing(false)} className="text-white/40 hover:text-white text-sm px-4">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Members ───

function Members({ cohort, members, unassigned, isAdmin }: Props) {
  const router = useRouter();
  const [adding, setAdding] = useState(unassigned[0]?.enrollment_id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const full = cohort.capacity !== null && members.length >= cohort.capacity;

  async function run(method: "POST" | "DELETE", enrollmentId: string) {
    setBusy(true);
    setError("");
    const err = await send(`/cohorts/${cohort.id}/members`, method, { enrollment_id: enrollmentId });
    setBusy(false);
    if (err) return setError(err);
    router.refresh();
  }

  return (
    <section>
      <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
        <Users className="w-4 h-4 text-[#3da3bc]" /> Learners
      </h2>

      {isAdmin && (
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          {unassigned.length > 0 ? (
            <>
              <select
                aria-label="Learner to add"
                value={adding}
                onChange={(e) => setAdding(e.target.value)}
                className={`${inputClass} sm:max-w-sm`}
              >
                {unassigned.map((m) => (
                  <option key={m.enrollment_id} value={m.enrollment_id} className="bg-[#0d0d14]">
                    {m.name}{m.email && m.email !== m.name ? ` (${m.email})` : ""}
                  </option>
                ))}
              </select>
              <button
                onClick={() => adding && run("POST", adding)}
                disabled={busy || full || !adding}
                className={primaryButtonClass}
                title={full ? "This cohort is full" : undefined}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {full ? "Cohort full" : "Add to cohort"}
              </button>
            </>
          ) : (
            <p className="text-white/30 text-xs">
              Everyone enrolled in this course is already in a cohort. Enrol learners from the Learners page first.
            </p>
          )}
        </div>
      )}

      {error && <div className={`${errorClass} mb-3`}>{error}</div>}

      {members.length === 0 ? (
        <div className="text-center py-8 text-white/30 text-sm border border-white/[0.08] rounded-2xl">
          No learners in this cohort yet.
        </div>
      ) : (
        <div className={`${cardClass} divide-y divide-white/[0.06]`}>
          {members.map((m) => (
            <div key={m.enrollment_id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm truncate">{m.name}</p>
                {m.email && m.email !== m.name && <p className="text-white/40 text-xs truncate">{m.email}</p>}
              </div>
              {isAdmin && (
                <button
                  onClick={() => run("DELETE", m.enrollment_id)}
                  disabled={busy}
                  className={dangerButtonClass}
                  title="Remove from cohort (stays enrolled in the course)"
                >
                  <UserMinus className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Scheduling (admin) ───

function ScheduleSessions({ cohort, lessons }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"weekly" | "single">("weekly");
  const [startDate, setStartDate] = useState(cohort.starts_on ?? "");
  const [time, setTime] = useState("17:00");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [count, setCount] = useState("12");
  const [single, setSingle] = useState("");
  const [duration, setDuration] = useState("60");
  const [title, setTitle] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const starts = useMemo(() => {
    if (mode === "single") {
      const iso = fromDatetimeLocal(single);
      return iso ? [new Date(iso)] : [];
    }
    return generateWeeklySessions({ startDate, time, weekdays, count: Number(count) || 0 });
  }, [mode, single, startDate, time, weekdays, count]);

  function toggleDay(d: number) {
    setWeekdays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d].sort()));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (starts.length === 0) return;
    setSaving(true);
    setError("");
    setDone("");
    const err = await send(`/cohorts/${cohort.id}/sessions`, "POST", {
      sessions: starts.map((d) => ({
        starts_at: d.toISOString(),
        duration_min: Number(duration),
        title: mode === "single" ? title : "",
        lesson_id: mode === "single" ? lessonId : "",
      })),
    });
    setSaving(false);
    if (err) return setError(err);
    setDone(`Added ${starts.length} session${starts.length === 1 ? "" : "s"}.`);
    setTitle("");
    setLessonId("");
    router.refresh();
  }

  return (
    <section>
      <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
        <CalendarPlus className="w-4 h-4 text-[#ffbd59]" /> Schedule classes
      </h2>
      <form onSubmit={create} className={`${cardClass} p-5 space-y-4`}>
        <div className="flex gap-1 bg-white/[0.04] border border-white/[0.08] rounded-xl p-1 w-fit">
          {(["weekly", "single"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium ${mode === m ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}
            >
              {m === "weekly" ? "Weekly schedule" : "One session"}
            </button>
          ))}
        </div>

        {mode === "weekly" ? (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Field label="First week from" id="s-start">
              <input id="s-start" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Time (your time zone)" id="s-time">
              <input id="s-time" type="time" required value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Number of classes" id="s-count">
              <input id="s-count" type="number" min="1" max={MAX_GENERATED_SESSIONS} required value={count} onChange={(e) => setCount(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Length (minutes)" id="s-duration">
              <input id="s-duration" type="number" min="5" max="600" required value={duration} onChange={(e) => setDuration(e.target.value)} className={inputClass} />
            </Field>
            <div className="sm:col-span-4">
              <span className={labelClass}>Days</span>
              <div className="flex gap-1.5 flex-wrap">
                {WEEKDAYS.map((label, d) => (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={weekdays.includes(d)}
                    onClick={() => toggleDay(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      weekdays.includes(d)
                        ? "bg-[#1a596c]/40 border-[#3da3bc]/50 text-white"
                        : "border-white/10 text-white/40 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Field label="Date & time (your time zone)" id="s-single">
              <input id="s-single" type="datetime-local" required value={single} onChange={(e) => setSingle(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Length (minutes)" id="s-duration1">
              <input id="s-duration1" type="number" min="5" max="600" required value={duration} onChange={(e) => setDuration(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Title (optional)" id="s-title">
              <input id="s-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Project demo day" className={inputClass} />
            </Field>
            <Field label="Lesson (optional)" id="s-lesson">
              <select id="s-lesson" value={lessonId} onChange={(e) => setLessonId(e.target.value)} className={inputClass}>
                <option value="" className="bg-[#0d0d14]">None</option>
                {lessons.map((l) => (
                  <option key={l.id} value={l.id} className="bg-[#0d0d14]">{l.title}</option>
                ))}
              </select>
            </Field>
          </div>
        )}

        {mode === "weekly" && starts.length > 0 && (
          <p className="text-white/40 text-xs">
            {starts.length} classes from <LocalTime iso={starts[0].toISOString()} /> to{" "}
            <LocalTime iso={starts[starts.length - 1].toISOString()} />.
          </p>
        )}
        {error && <div className={errorClass}>{error}</div>}
        {done && <p className="text-green-400 text-sm">{done}</p>}

        <button type="submit" disabled={saving || starts.length === 0} className={primaryButtonClass}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />}
          {mode === "weekly" ? `Add ${starts.length || ""} classes` : "Add class"}
        </button>
      </form>
    </section>
  );
}

// ─── Sessions, recordings and attendance ───

function SessionList(props: Props) {
  const { sessions } = props;
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section>
      <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
        <Video className="w-4 h-4 text-[#c31d24]" /> Classes ({sessions.length})
      </h2>
      {sessions.length === 0 ? (
        <div className="text-center py-8 text-white/30 text-sm border border-white/[0.08] rounded-2xl">
          No classes scheduled yet.
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <SessionRow
              key={s.id}
              session={s}
              open={openId === s.id}
              onToggle={() => setOpenId(openId === s.id ? null : s.id)}
              {...props}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function SessionRow({
  session,
  open,
  onToggle,
  members,
  attendance,
  lessons,
  isAdmin,
}: Props & { session: ClassSession; open: boolean; onToggle: () => void }) {
  const router = useRouter();
  const state = joinState(session);
  const marks = attendance[session.id] ?? {};
  const markedCount = Object.keys(marks).length;
  const lesson = lessons.find((l) => l.id === session.lesson_id);

  const [recording, setRecording] = useState(session.recording_url ?? "");
  const [meeting, setMeeting] = useState(session.meeting_url ?? "");
  const [draft, setDraft] = useState<Record<string, AttendanceStatus | null>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  async function saveLinks() {
    setSaving(true);
    setError("");
    setSaved("");
    const err = await send(`/sessions/${session.id}`, "PATCH", { recording_url: recording, meeting_url: meeting });
    setSaving(false);
    if (err) return setError(err);
    setSaved("Links saved.");
    router.refresh();
  }

  async function saveAttendance() {
    const records = Object.entries(draft).map(([user_id, status]) => ({ user_id, status }));
    if (records.length === 0) return;
    setSaving(true);
    setError("");
    setSaved("");
    const err = await send(`/sessions/${session.id}/attendance`, "PUT", { records });
    setSaving(false);
    if (err) return setError(err);
    setDraft({});
    setSaved("Attendance saved.");
    router.refresh();
  }

  function markAll(status: AttendanceStatus) {
    setDraft(Object.fromEntries(members.map((m) => [m.user_id, status])));
  }

  async function remove() {
    if (!confirm("Delete this class and its attendance?")) return;
    const err = await send(`/sessions/${session.id}`, "DELETE");
    if (err) return setError(err);
    router.refresh();
  }

  return (
    <div className={`${cardClass} overflow-hidden`}>
      <button onClick={onToggle} className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-white/[0.02]">
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm">
            <LocalTime iso={session.starts_at} /> <span className="text-white/30">· {session.duration_min} min</span>
          </p>
          <p className="text-white/40 text-xs truncate">
            {session.title || lesson?.title || "Live class"}
            {state === "open" && <span className="ml-2 text-green-400">● Live now</span>}
          </p>
        </div>
        <span className="hidden sm:flex items-center gap-3 text-xs text-white/40">
          {session.recording_url && <span className="text-[#3da3bc]">Recording</span>}
          {state !== "upcoming" && (
            <span>
              {markedCount}/{members.length} marked
            </span>
          )}
        </span>
      </button>

      {open && (
        <div className="border-t border-white/[0.06] p-4 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Recording link" id={`rec-${session.id}`}>
              <input id={`rec-${session.id}`} type="url" value={recording} onChange={(e) => setRecording(e.target.value)} placeholder="https://…" className={inputClass} />
            </Field>
            <Field label="Meeting link (overrides the cohort's)" id={`meet-${session.id}`}>
              <input id={`meet-${session.id}`} type="url" value={meeting} onChange={(e) => setMeeting(e.target.value)} placeholder="Uses the cohort's link" className={inputClass} />
            </Field>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={saveLinks} disabled={saving} className={secondaryButtonClass}>
              <Check className="w-3.5 h-3.5" /> Save links
            </button>
            <a href={`/academy/api/sessions/${session.id}/join`} target="_blank" rel="noopener" className={secondaryButtonClass}>
              <ExternalLink className="w-3.5 h-3.5" /> Open meeting
            </a>
            {isAdmin && (
              <button onClick={remove} className={`${secondaryButtonClass} hover:text-red-400`}>
                <Trash2 className="w-3.5 h-3.5" /> Delete class
              </button>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <span className="text-white/60 text-xs font-medium uppercase tracking-wider flex items-center gap-1.5">
                <ClipboardCheck className="w-3.5 h-3.5 text-[#ffbd59]" /> Attendance
              </span>
              {members.length > 0 && (
                <div className="flex gap-1.5">
                  <button onClick={() => markAll("present")} className="text-[11px] text-white/40 hover:text-green-400">All present</button>
                  <span className="text-white/20">·</span>
                  <button onClick={() => markAll("absent")} className="text-[11px] text-white/40 hover:text-red-400">All absent</button>
                </div>
              )}
            </div>
            {members.length === 0 ? (
              <p className="text-white/30 text-xs">No learners in this cohort.</p>
            ) : (
              <div className="space-y-1.5">
                {members.map((m) => {
                  const current = m.user_id in draft ? draft[m.user_id] : marks[m.user_id] ?? null;
                  return (
                    <div key={m.user_id} className="flex items-center justify-between gap-3">
                      <span className="text-white/70 text-sm truncate">{m.name}</span>
                      <div className="flex gap-1">
                        {(["present", "late", "absent"] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            aria-pressed={current === st}
                            onClick={() => setDraft((d) => ({ ...d, [m.user_id]: current === st ? null : st }))}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border capitalize transition-all ${
                              current === st
                                ? st === "present"
                                  ? "bg-green-500/20 border-green-500/40 text-green-400"
                                  : st === "late"
                                  ? "bg-[#ffbd59]/20 border-[#ffbd59]/40 text-[#ffbd59]"
                                  : "bg-red-500/20 border-red-500/40 text-red-400"
                                : "border-white/10 text-white/30 hover:text-white"
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <button
                  onClick={saveAttendance}
                  disabled={saving || Object.keys(draft).length === 0}
                  className={`${primaryButtonClass} mt-3`}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save attendance
                </button>
              </div>
            )}
          </div>

          {error && <div className={errorClass}>{error}</div>}
          {saved && <p className="text-green-400 text-sm">{saved}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Bits ───

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-white/40 text-xs">{label}</dt>
      <dd className="text-white/80">{value}</dd>
    </div>
  );
}
