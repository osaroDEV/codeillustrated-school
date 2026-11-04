import { revalidatePath } from "next/cache";
import type { createAdminClient } from "./supabase";

// Admin-side reads of the course catalogue: every course, published or not,
// with full lesson rows. Public pages read through lib/courses.ts instead.

type AdminClient = ReturnType<typeof createAdminClient>;

export interface AdminLesson {
  id: string;
  module_id: string;
  title: string;
  position: number;
  type: "live" | "video" | "text" | "file";
  content: string | null;
  video_url: string | null;
  file_path: string | null;
  is_preview: boolean;
  duration_min: number | null;
  is_published: boolean;
}

export interface AdminModule {
  id: string;
  course_id: string;
  title: string;
  position: number;
  lessons: AdminLesson[];
}

export interface AdminOffering {
  id: string;
  course_id: string;
  kind: "cohort_group" | "cohort_1on1" | "self_paced";
  price_usd: number;
  price_ngn: number;
  is_active: boolean;
}

export interface AdminCourse {
  id: string;
  title: string;
  description: string;
  full_description: string;
  age: string;
  level: string;
  duration: string;
  icon: string;
  color: string;
  bg: string;
  certificate_price_usd: number | null;
  certificate_price_ngn: number | null;
  position: number;
  is_published: boolean;
  course_modules: AdminModule[];
  offerings: AdminOffering[];
}

const SELECT = "*, course_modules(*, lessons(*)), offerings(*)";

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;

function normalize(row: AdminCourse): AdminCourse {
  return {
    ...row,
    certificate_price_usd: row.certificate_price_usd === null ? null : Number(row.certificate_price_usd),
    certificate_price_ngn: row.certificate_price_ngn === null ? null : Number(row.certificate_price_ngn),
    course_modules: [...(row.course_modules ?? [])]
      .sort(byPosition)
      .map((m) => ({ ...m, lessons: [...(m.lessons ?? [])].sort(byPosition) })),
    offerings: (row.offerings ?? []).map((o) => ({
      ...o,
      price_usd: Number(o.price_usd),
      price_ngn: Number(o.price_ngn),
    })),
  };
}

export async function listAdminCourses(admin: AdminClient): Promise<AdminCourse[]> {
  const { data, error } = await admin.from("courses").select(SELECT).order("position");
  if (error) throw error;
  return ((data ?? []) as AdminCourse[]).map(normalize);
}

export async function getAdminCourse(admin: AdminClient, id: string): Promise<AdminCourse | null> {
  const { data, error } = await admin.from("courses").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? normalize(data as AdminCourse) : null;
}

/** Marketing pages cache the catalogue for 5 minutes; show edits right away. */
export function refreshCatalogue() {
  revalidatePath("/", "layout");
}
