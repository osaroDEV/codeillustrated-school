"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2, Plus } from "lucide-react";
import { cardClass, errorClass, inputClass, labelClass, primaryButtonClass, send } from "./ui";

interface Row {
  id: string;
  title: string;
  is_published: boolean;
  modules: number;
  lessons: number;
}

export function CoursesAdminList({ courses, loadError }: { courses: Row[]; loadError: string | null }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function onTitle(value: string) {
    setTitle(value);
    // Suggest a slug from the title until the admin edits it themselves.
    if (!id || id === slugify(title)) setId(slugify(value));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const err = await send("/courses", "POST", { id, title });
    setSaving(false);
    if (err) return setError(err);
    router.push(`/admin/courses/${id}`);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold">Course catalogue</h2>
        {!creating && (
          <button onClick={() => setCreating(true)} className={primaryButtonClass}>
            <Plus className="w-4 h-4" /> New course
          </button>
        )}
      </div>

      {loadError && <div className={`${errorClass} mb-4`}>{loadError}</div>}

      {creating && (
        <form onSubmit={create} className={`${cardClass} p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4`}>
          <div>
            <label className={labelClass} htmlFor="course-title">Title</label>
            <input id="course-title" required value={title} onChange={(e) => onTitle(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="course-id">URL slug</label>
            <input id="course-id" required value={id} onChange={(e) => setId(e.target.value)} placeholder="junior-web-creator" className={inputClass} />
            <p className="text-white/30 text-[11px] mt-1">Appears in the course page address. It can&apos;t be changed later.</p>
          </div>
          {error && <div className={`${errorClass} sm:col-span-2`}>{error}</div>}
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" disabled={saving} className={primaryButtonClass}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create draft
            </button>
            <button type="button" onClick={() => setCreating(false)} className="text-white/40 hover:text-white text-sm px-4">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {courses.map((c) => (
          <Link
            key={c.id}
            href={`/admin/courses/${c.id}`}
            className={`${cardClass} flex items-center gap-4 p-5 hover:border-white/[0.15] transition-all`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-white font-semibold">{c.title}</p>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    c.is_published ? "bg-green-500/15 text-green-400" : "bg-white/10 text-white/40"
                  }`}
                >
                  {c.is_published ? "Published" : "Draft"}
                </span>
              </div>
              <p className="text-white/40 text-xs mt-0.5">
                {c.id} · {c.modules} modules · {c.lessons} lessons
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30" />
          </Link>
        ))}
        {courses.length === 0 && !loadError && (
          <div className="text-center py-12 text-white/30 text-sm border border-white/[0.08] rounded-2xl">No courses yet.</div>
        )}
      </div>
    </div>
  );
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
