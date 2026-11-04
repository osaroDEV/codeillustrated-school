"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown, ArrowLeft, ArrowUp, Check, ExternalLink, Eye, EyeOff, Loader2, Pencil, Plus, Trash2,
} from "lucide-react";
import type { AdminCourse, AdminLesson, AdminModule, AdminOffering } from "@/lib/catalogue-admin";
import { COURSE_ICONS } from "@/lib/course-icons";
import {
  cardClass, dangerButtonClass, errorClass, inputClass, labelClass,
  primaryButtonClass, secondaryButtonClass, send,
} from "./ui";

const OFFERING_LABELS: Record<AdminOffering["kind"], string> = {
  cohort_group: "Group cohort",
  cohort_1on1: "1-on-1",
  self_paced: "Self-paced",
};

const LESSON_TYPES: AdminLesson["type"][] = ["live", "video", "text", "file"];

export function CourseEditor({ course }: { course: AdminCourse }) {
  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/courses" className="inline-flex items-center gap-1.5 text-white/40 hover:text-white text-xs mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> All courses
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-white">{course.title}</h1>
          {course.is_published && (
            <a
              href={`/academy/courses/${course.id}`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1 text-[#3da3bc] hover:text-white text-xs"
            >
              View page <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
        <p className="text-white/40 text-sm mt-1">{course.id}</p>
      </div>
      <CourseDetails course={course} />
      <Offerings course={course} />
      <Curriculum course={course} />
    </div>
  );
}

// ─── Details ───

function CourseDetails({ course }: { course: AdminCourse }) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: course.title,
    description: course.description,
    full_description: course.full_description,
    age: course.age,
    level: course.level,
    duration: course.duration,
    icon: course.icon,
    color: course.color,
    bg: course.bg,
    certificate_price_usd: course.certificate_price_usd?.toString() ?? "",
    certificate_price_ngn: course.certificate_price_ngn?.toString() ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setSaved(false);
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const err = await send(`/courses/${course.id}`, "PATCH", form);
    setSaving(false);
    if (err) return setError(err);
    setSaved(true);
    router.refresh();
  }

  async function togglePublished() {
    setError("");
    const err = await send(`/courses/${course.id}`, "PATCH", { is_published: !course.is_published });
    if (err) return setError(err);
    router.refresh();
  }

  async function remove() {
    if (!confirm(`Delete "${course.title}" and its whole curriculum? This can't be undone.`)) return;
    const err = await send(`/courses/${course.id}`, "DELETE");
    if (err) return setError(err);
    router.push("/admin/courses");
    router.refresh();
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h2 className="text-white font-semibold">Details</h2>
        <div className="flex gap-2">
          <button onClick={togglePublished} className={secondaryButtonClass}>
            {course.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {course.is_published ? "Unpublish" : "Publish"}
          </button>
          <button onClick={remove} className={dangerButtonClass} title="Delete course">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <form onSubmit={save} className={`${cardClass} p-5 grid grid-cols-1 sm:grid-cols-3 gap-4`}>
        <Field label="Title" id="d-title" className="sm:col-span-3">
          <input id="d-title" required value={form.title} onChange={set("title")} className={inputClass} />
        </Field>
        <Field label="Short description (cards)" id="d-desc" className="sm:col-span-3">
          <textarea id="d-desc" rows={2} value={form.description} onChange={set("description")} className={`${inputClass} resize-none`} />
        </Field>
        <Field label="Full description (course page)" id="d-full" className="sm:col-span-3">
          <textarea id="d-full" rows={5} value={form.full_description} onChange={set("full_description")} className={`${inputClass} resize-y`} />
        </Field>
        <Field label="Age" id="d-age">
          <input id="d-age" value={form.age} onChange={set("age")} placeholder="e.g. 8–12 years" className={inputClass} />
        </Field>
        <Field label="Level" id="d-level">
          <input id="d-level" value={form.level} onChange={set("level")} placeholder="e.g. Beginner" className={inputClass} />
        </Field>
        <Field label="Duration" id="d-duration">
          <input id="d-duration" value={form.duration} onChange={set("duration")} placeholder="e.g. 12 weeks" className={inputClass} />
        </Field>
        <Field label="Icon" id="d-icon">
          <select id="d-icon" value={form.icon} onChange={set("icon")} className={inputClass}>
            {Object.keys(COURSE_ICONS).map((k) => (
              <option key={k} value={k} className="bg-[#0d0d14]">{k}</option>
            ))}
          </select>
        </Field>
        <Field label="Icon colour class" id="d-color">
          <input id="d-color" value={form.color} onChange={set("color")} className={inputClass} />
        </Field>
        <Field label="Icon background class" id="d-bg">
          <input id="d-bg" value={form.bg} onChange={set("bg")} className={inputClass} />
        </Field>
        <Field label="Certificate price (USD)" id="d-cert-usd">
          <input id="d-cert-usd" type="number" min="0" step="0.01" value={form.certificate_price_usd} onChange={set("certificate_price_usd")} placeholder="Free" className={inputClass} />
        </Field>
        <Field label="Certificate price (NGN)" id="d-cert-ngn">
          <input id="d-cert-ngn" type="number" min="0" step="0.01" value={form.certificate_price_ngn} onChange={set("certificate_price_ngn")} placeholder="Free" className={inputClass} />
        </Field>
        <div className="sm:col-span-3 flex items-center gap-3">
          <button type="submit" disabled={saving} className={primaryButtonClass}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save details
          </button>
          {saved && <span className="text-green-400 text-sm">Saved.</span>}
        </div>
        {error && <div className={`${errorClass} sm:col-span-3`}>{error}</div>}
      </form>
    </section>
  );
}

// ─── Offerings ───

function Offerings({ course }: { course: AdminCourse }) {
  return (
    <section>
      <h2 className="text-white font-semibold mb-3">Prices</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(Object.keys(OFFERING_LABELS) as AdminOffering["kind"][]).map((kind) => (
          <OfferingCard key={kind} courseId={course.id} kind={kind} offering={course.offerings.find((o) => o.kind === kind)} />
        ))}
      </div>
    </section>
  );
}

function OfferingCard({
  courseId,
  kind,
  offering,
}: {
  courseId: string;
  kind: AdminOffering["kind"];
  offering?: AdminOffering;
}) {
  const router = useRouter();
  const [usd, setUsd] = useState(offering?.price_usd.toString() ?? "");
  const [ngn, setNgn] = useState(offering?.price_ngn.toString() ?? "");
  const [active, setActive] = useState(offering?.is_active ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    const err = await send(`/courses/${courseId}/offerings`, "PUT", {
      kind,
      price_usd: usd,
      price_ngn: ngn,
      is_active: active,
    });
    setSaving(false);
    if (err) return setError(err);
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={save} className={`${cardClass} p-4 space-y-3`}>
      <div className="flex items-center justify-between">
        <span className="text-white text-sm font-medium">{OFFERING_LABELS[kind]}</span>
        <label className="flex items-center gap-1.5 text-xs text-white/50">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="accent-[#3da3bc]" />
          On sale
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="USD" id={`o-usd-${kind}`}>
          <input id={`o-usd-${kind}`} type="number" min="0" step="0.01" required value={usd} onChange={(e) => setUsd(e.target.value)} className={inputClass} />
        </Field>
        <Field label="NGN" id={`o-ngn-${kind}`}>
          <input id={`o-ngn-${kind}`} type="number" min="0" step="0.01" required value={ngn} onChange={(e) => setNgn(e.target.value)} className={inputClass} />
        </Field>
      </div>
      <div className="flex items-center gap-2">
        <button type="submit" disabled={saving} className={secondaryButtonClass}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
        </button>
        {saved && <span className="text-green-400 text-xs">Saved.</span>}
      </div>
      {error && <div className={errorClass}>{error}</div>}
    </form>
  );
}

// ─── Curriculum ───

function moveId(ids: string[], index: number, delta: number): string[] {
  const next = [...ids];
  const [item] = next.splice(index, 1);
  next.splice(index + delta, 0, item);
  return next;
}

function Curriculum({ course }: { course: AdminCourse }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const modules = course.course_modules;

  async function addModule(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError("");
    const err = await send("/modules", "POST", { course_id: course.id, title });
    setBusy(false);
    if (err) return setError(err);
    setTitle("");
    router.refresh();
  }

  async function move(index: number, delta: number) {
    setBusy(true);
    setError("");
    const err = await send("/reorder", "POST", {
      kind: "modules",
      parent_id: course.id,
      ids: moveId(modules.map((m) => m.id), index, delta),
    });
    setBusy(false);
    if (err) return setError(err);
    router.refresh();
  }

  return (
    <section>
      <h2 className="text-white font-semibold mb-3">Curriculum</h2>
      {error && <div className={`${errorClass} mb-3`}>{error}</div>}
      <div className="space-y-4">
        {modules.map((m, i) => (
          <ModuleCard
            key={m.id}
            module={m}
            index={i}
            first={i === 0}
            last={i === modules.length - 1}
            busy={busy}
            onMove={(delta) => move(i, delta)}
          />
        ))}
      </div>
      <form onSubmit={addModule} className="flex gap-2 mt-4">
        <input
          aria-label="New module title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New module title"
          className={`${inputClass} sm:max-w-sm`}
        />
        <button type="submit" disabled={busy || !title.trim()} className={primaryButtonClass}>
          <Plus className="w-4 h-4" /> Add module
        </button>
      </form>
    </section>
  );
}

function ModuleCard({
  module,
  index,
  first,
  last,
  busy,
  onMove,
}: {
  module: AdminModule;
  index: number;
  first: boolean;
  last: boolean;
  busy: boolean;
  onMove: (delta: number) => void;
}) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(module.title);
  const [lessonTitle, setLessonTitle] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function run(fn: () => Promise<string | null>) {
    setWorking(true);
    setError("");
    const err = await fn();
    setWorking(false);
    if (err) {
      setError(err);
      return false;
    }
    router.refresh();
    return true;
  }

  const lessonIds = module.lessons.map((l) => l.id);

  return (
    <div className={`${cardClass} p-4`}>
      <div className="flex items-center gap-2">
        <span className="text-white/30 text-xs w-6">{index + 1}.</span>
        {renaming ? (
          <form
            className="flex-1 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await run(() => send(`/modules/${module.id}`, "PATCH", { title: name }))) setRenaming(false);
            }}
          >
            <input aria-label="Module title" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            <button type="submit" className={secondaryButtonClass}><Check className="w-3.5 h-3.5" /></button>
          </form>
        ) : (
          <p className="flex-1 text-white font-medium">{module.title}</p>
        )}
        <IconButton label="Move module up" disabled={first || busy} onClick={() => onMove(-1)}><ArrowUp className="w-3.5 h-3.5" /></IconButton>
        <IconButton label="Move module down" disabled={last || busy} onClick={() => onMove(1)}><ArrowDown className="w-3.5 h-3.5" /></IconButton>
        <IconButton label="Rename module" onClick={() => setRenaming(!renaming)}><Pencil className="w-3.5 h-3.5" /></IconButton>
        <IconButton
          label="Delete module"
          danger
          onClick={() => {
            if (confirm(`Delete module "${module.title}" and its ${module.lessons.length} lessons?`)) {
              run(() => send(`/modules/${module.id}`, "DELETE"));
            }
          }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </IconButton>
      </div>

      <div className="mt-3 ml-8 space-y-1.5">
        {module.lessons.map((l, i) => (
          <LessonRow
            key={l.id}
            lesson={l}
            first={i === 0}
            last={i === module.lessons.length - 1}
            busy={working}
            onMove={(delta) =>
              run(() =>
                send("/reorder", "POST", { kind: "lessons", parent_id: module.id, ids: moveId(lessonIds, i, delta) })
              )
            }
          />
        ))}
        <form
          className="flex gap-2 pt-1"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!lessonTitle.trim()) return;
            if (await run(() => send("/lessons", "POST", { module_id: module.id, title: lessonTitle }))) setLessonTitle("");
          }}
        >
          <input
            aria-label={`New lesson in ${module.title}`}
            value={lessonTitle}
            onChange={(e) => setLessonTitle(e.target.value)}
            placeholder="New lesson title"
            className={`${inputClass} py-1.5 text-xs sm:max-w-xs`}
          />
          <button type="submit" disabled={working || !lessonTitle.trim()} className={secondaryButtonClass}>
            <Plus className="w-3.5 h-3.5" /> Add lesson
          </button>
        </form>
        {error && <div className={errorClass}>{error}</div>}
      </div>
    </div>
  );
}

function LessonRow({
  lesson,
  first,
  last,
  busy,
  onMove,
}: {
  lesson: AdminLesson;
  first: boolean;
  last: boolean;
  busy: boolean;
  onMove: (delta: number) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: lesson.title,
    type: lesson.type,
    duration_min: lesson.duration_min?.toString() ?? "",
    video_url: lesson.video_url ?? "",
    content: lesson.content ?? "",
    is_preview: lesson.is_preview,
    is_published: lesson.is_published,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const err = await send(`/lessons/${lesson.id}`, "PATCH", form);
    setSaving(false);
    if (err) return setError(err);
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm(`Delete lesson "${lesson.title}"?`)) return;
    const err = await send(`/lessons/${lesson.id}`, "DELETE");
    if (err) return setError(err);
    router.refresh();
  }

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl">
      <div className="flex items-center gap-2 px-3 py-2">
        <p className={`flex-1 text-sm truncate ${lesson.is_published ? "text-white/80" : "text-white/30 line-through"}`}>
          {lesson.title}
        </p>
        <span className="text-[10px] text-white/30 uppercase">{lesson.type}</span>
        {lesson.is_preview && <span className="text-[10px] text-[#3da3bc]">preview</span>}
        <IconButton label="Move lesson up" disabled={first || busy} onClick={() => onMove(-1)}><ArrowUp className="w-3 h-3" /></IconButton>
        <IconButton label="Move lesson down" disabled={last || busy} onClick={() => onMove(1)}><ArrowDown className="w-3 h-3" /></IconButton>
        <IconButton label="Edit lesson" onClick={() => setEditing(!editing)}><Pencil className="w-3 h-3" /></IconButton>
        <IconButton label="Delete lesson" danger onClick={remove}><Trash2 className="w-3 h-3" /></IconButton>
      </div>
      {editing && (
        <form onSubmit={save} className="border-t border-white/[0.06] p-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Title" id={`l-title-${lesson.id}`} className="sm:col-span-3">
            <input id={`l-title-${lesson.id}`} required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Type" id={`l-type-${lesson.id}`}>
            <select id={`l-type-${lesson.id}`} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AdminLesson["type"] })} className={inputClass}>
              {LESSON_TYPES.map((t) => (
                <option key={t} value={t} className="bg-[#0d0d14]">{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Length (minutes)" id={`l-dur-${lesson.id}`}>
            <input id={`l-dur-${lesson.id}`} type="number" min="1" value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Video link" id={`l-video-${lesson.id}`}>
            <input id={`l-video-${lesson.id}`} type="url" value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://…" className={inputClass} />
          </Field>
          <Field label="Content (private; shown to enrolled learners once the lesson player ships)" id={`l-content-${lesson.id}`} className="sm:col-span-3">
            <textarea id={`l-content-${lesson.id}`} rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className={`${inputClass} resize-y`} />
          </Field>
          <div className="sm:col-span-3 flex items-center gap-5 text-xs text-white/60">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} className="accent-[#3da3bc]" />
              Shown in curriculum
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={form.is_preview} onChange={(e) => setForm({ ...form, is_preview: e.target.checked })} className="accent-[#3da3bc]" />
              Free preview
            </label>
          </div>
          <div className="sm:col-span-3 flex gap-2">
            <button type="submit" disabled={saving} className={secondaryButtonClass}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save lesson
            </button>
            <button type="button" onClick={() => setEditing(false)} className="text-white/40 hover:text-white text-xs px-3">
              Cancel
            </button>
          </div>
          {error && <div className={`${errorClass} sm:col-span-3`}>{error}</div>}
        </form>
      )}
      {!editing && error && <div className={`${errorClass} m-2`}>{error}</div>}
    </div>
  );
}

// ─── Bits ───

function Field({
  label,
  id,
  className,
  children,
}: {
  label: string;
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 rounded-lg text-white/30 transition-all disabled:opacity-30 disabled:pointer-events-none ${
        danger ? "hover:text-red-400 hover:bg-red-500/10" : "hover:text-white hover:bg-white/[0.06]"
      }`}
    >
      {children}
    </button>
  );
}
