"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronRight, Loader2, Plus, Users } from "lucide-react";
import { LocalTime } from "@/components/local-time";
import { cardClass, errorClass, inputClass, labelClass, primaryButtonClass, send } from "./ui";

export interface CohortListItem {
  id: string;
  name: string;
  course_title: string;
  status: "planned" | "running" | "finished";
  offering_kind: "cohort_group" | "cohort_1on1";
  starts_on: string | null;
  members: number;
  capacity: number | null;
  next_session: string | null;
}

export const STATUS_BADGE: Record<CohortListItem["status"], string> = {
  planned: "bg-[#ffbd59]/15 text-[#ffbd59]",
  running: "bg-green-500/15 text-green-400",
  finished: "bg-white/10 text-white/40",
};

export function CohortsList({
  cohorts,
  isAdmin,
  courses,
  staff,
  loadError,
}: {
  cohorts: CohortListItem[];
  isAdmin: boolean;
  courses: { id: string; title: string }[];
  staff: { id: string; name: string }[];
  loadError: string | null;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    course_id: courses[0]?.id ?? "",
    name: "",
    offering_kind: "cohort_group",
    starts_on: "",
    ends_on: "",
    capacity: "",
    meeting_url: "",
    instructor_id: "",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const err = await send("/cohorts", "POST", form);
    setSaving(false);
    if (err) return setError(err);
    setCreating(false);
    setForm((f) => ({ ...f, name: "", starts_on: "", ends_on: "", capacity: "", meeting_url: "" }));
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold">{isAdmin ? "All cohorts" : "Your cohorts"}</h2>
        {isAdmin && !creating && (
          <button onClick={() => setCreating(true)} className={primaryButtonClass} disabled={courses.length === 0}>
            <Plus className="w-4 h-4" /> New cohort
          </button>
        )}
      </div>

      {loadError && <div className={`${errorClass} mb-4`}>{loadError}</div>}

      {creating && (
        <form onSubmit={create} className={`${cardClass} p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4`}>
          <div>
            <label className={labelClass} htmlFor="cohort-course">Course</label>
            <select id="cohort-course" value={form.course_id} onChange={set("course_id")} className={inputClass}>
              {courses.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#0d0d14]">{c.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="cohort-name">Name</label>
            <input id="cohort-name" required value={form.name} onChange={set("name")} placeholder="e.g. January 2027 – Evenings" className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="cohort-kind">Format</label>
            <select id="cohort-kind" value={form.offering_kind} onChange={set("offering_kind")} className={inputClass}>
              <option value="cohort_group" className="bg-[#0d0d14]">Group</option>
              <option value="cohort_1on1" className="bg-[#0d0d14]">1-on-1</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="cohort-instructor">Instructor</label>
            <select id="cohort-instructor" value={form.instructor_id} onChange={set("instructor_id")} className={inputClass}>
              <option value="" className="bg-[#0d0d14]">Not assigned</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#0d0d14]">{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="cohort-start">Starts on</label>
            <input id="cohort-start" type="date" value={form.starts_on} onChange={set("starts_on")} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="cohort-end">Ends on</label>
            <input id="cohort-end" type="date" value={form.ends_on} onChange={set("ends_on")} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="cohort-capacity">Capacity</label>
            <input id="cohort-capacity" type="number" min="1" value={form.capacity} onChange={set("capacity")} placeholder={form.offering_kind === "cohort_1on1" ? "1" : "No limit"} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="cohort-meeting">Meeting link</label>
            <input id="cohort-meeting" type="url" value={form.meeting_url} onChange={set("meeting_url")} placeholder="https://meet.google.com/…" className={inputClass} />
          </div>
          {error && <div className={`${errorClass} sm:col-span-2`}>{error}</div>}
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" disabled={saving} className={primaryButtonClass}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create cohort
            </button>
            <button type="button" onClick={() => setCreating(false)} className="text-white/40 hover:text-white text-sm px-4">
              Cancel
            </button>
          </div>
        </form>
      )}

      {cohorts.length === 0 ? (
        <div className="text-center py-12 text-white/30 text-sm border border-white/[0.08] rounded-2xl">
          {isAdmin ? "No cohorts yet. Create one to start scheduling classes." : "You haven't been assigned a cohort yet."}
        </div>
      ) : (
        <div className="space-y-3">
          {cohorts.map((c) => (
            <Link
              key={c.id}
              href={`/admin/cohorts/${c.id}`}
              className={`${cardClass} flex items-center gap-4 p-5 hover:border-white/[0.15] transition-all`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-semibold">{c.name}</p>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[c.status]}`}>
                    {c.status}
                  </span>
                  {c.offering_kind === "cohort_1on1" && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.06] text-white/50">1-on-1</span>
                  )}
                </div>
                <p className="text-white/40 text-xs mt-0.5">{c.course_title}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-white/40 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> {c.members}
                    {c.capacity ? ` / ${c.capacity}` : ""} learners
                  </span>
                  {c.next_session && (
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-[#ffbd59]" /> Next: <LocalTime iso={c.next_session} />
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/30" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
