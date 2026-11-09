import type { User } from "@supabase/supabase-js";
import type { createAdminClient } from "./supabase";
import type { SubscriptionState } from "./billing";
import { getRole } from "./supabase-server";
import { COURSE_FILES_BUCKET, lessonAccess, storedFileName, type LessonAccess } from "./lesson-access";

// Server-side data for the lesson player. Lesson content, video links and file
// paths are read here with the service role, and only returned after the
// access check: anon and signed-in clients can't select those columns at all.

type AdminClient = ReturnType<typeof createAdminClient>;

const SIGNED_URL_SECONDS = 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type LessonType = "live" | "video" | "text" | "file";

export interface OutlineLesson {
  id: string;
  title: string;
  type: LessonType;
  is_preview: boolean;
  done: boolean;
}

export interface OutlineModule {
  id: string;
  title: string;
  lessons: OutlineLesson[];
}

export interface CourseSeat {
  access: LessonAccess;
  source: string | null;
  cohortId: string | null;
}

/** The user's standing in a course, for a lesson that is or isn't a preview. */
export async function courseSeat(
  admin: AdminClient,
  user: Pick<User, "id">,
  courseId: string,
  isPreview: boolean
): Promise<CourseSeat> {
  const [role, { data: enrollment }, { data: teaching }] = await Promise.all([
    getRole(user.id),
    admin
      .from("enrollments")
      .select("status, source, cohort_id, subscriptions(status, current_period_end)")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .maybeSingle(),
    admin.from("cohorts").select("id").eq("course_id", courseId).eq("instructor_id", user.id).limit(1),
  ]);
  const access = lessonAccess({
    isStaff: role === "admin" || (role === "instructor" && (teaching?.length ?? 0) > 0),
    enrollment,
    subscription: enrollment?.subscriptions as unknown as SubscriptionState | null,
    isPreview,
  });
  return { access, source: enrollment?.source ?? null, cohortId: enrollment?.cohort_id ?? null };
}

interface LessonRow {
  id: string;
  title: string;
  type: LessonType;
  is_preview: boolean;
  is_published: boolean;
  duration_min: number | null;
  course_modules: { course_id: string };
}

/** A lesson and this user's access to it. Null when it doesn't exist for them. */
export async function loadLesson(
  admin: AdminClient,
  user: Pick<User, "id">,
  lessonId: string
): Promise<{ lesson: LessonRow; courseId: string; seat: CourseSeat } | null> {
  if (!UUID.test(lessonId)) return null;
  const { data } = await admin
    .from("lessons")
    .select(
      "id, title, type, is_preview, is_published, duration_min, course_modules!inner(course_id)"
    )
    .eq("id", lessonId)
    .maybeSingle();
  if (!data) return null;
  const lesson = data as unknown as LessonRow;
  const courseId = lesson.course_modules.course_id;
  const seat = await courseSeat(admin, user, courseId, lesson.is_preview);
  if (!lesson.is_published && seat.access !== "staff") return null;
  return { lesson, courseId, seat };
}

export interface LessonBlock {
  id: string;
  kind: "text" | "video" | "file";
  title: string | null;
  content: string | null;
  video_url: string | null;
  file_path: string | null;
}

/** A lesson's material, in order. Only call this after the access check. */
export async function getLessonBlocks(admin: AdminClient, lessonId: string): Promise<LessonBlock[]> {
  const { data } = await admin
    .from("lesson_blocks")
    .select("id, kind, title, content, video_url, file_path")
    .eq("lesson_id", lessonId)
    .order("position");
  return (data ?? []) as LessonBlock[];
}

/** Published outlines with this learner's ticks, keyed by course. */
export async function getCourseOutlines(
  admin: AdminClient,
  userId: string,
  courseIds: string[]
): Promise<Map<string, OutlineModule[]>> {
  const outlines = new Map<string, OutlineModule[]>();
  if (courseIds.length === 0) return outlines;

  const [{ data: modules }, { data: completed }, { data: attended }] = await Promise.all([
    admin
      .from("course_modules")
      .select("id, course_id, title, position, lessons(id, title, type, position, is_preview, is_published)")
      .in("course_id", courseIds)
      .order("position"),
    admin.from("lesson_progress").select("lesson_id").eq("user_id", userId),
    admin
      .from("attendance")
      .select("status, class_sessions(lesson_id)")
      .eq("user_id", userId)
      .in("status", ["present", "late"]),
  ]);

  const done = new Set<string>((completed ?? []).map((r) => r.lesson_id as string));
  for (const row of attended ?? []) {
    const lessonId = (row.class_sessions as unknown as { lesson_id: string | null } | null)?.lesson_id;
    if (lessonId) done.add(lessonId);
  }

  type Row = {
    id: string;
    course_id: string;
    title: string;
    lessons: (Omit<OutlineLesson, "done"> & { position: number; is_published: boolean })[] | null;
  };
  for (const m of (modules ?? []) as unknown as Row[]) {
    const lessons = (m.lessons ?? [])
      .filter((l) => l.is_published)
      .sort((a, b) => a.position - b.position)
      .map(({ id, title, type, is_preview }) => ({ id, title, type, is_preview, done: done.has(id) }));
    if (lessons.length === 0) continue;
    outlines.set(m.course_id, [...(outlines.get(m.course_id) ?? []), { id: m.id, title: m.title, lessons }]);
  }
  return outlines;
}

export interface LessonClass {
  id: string;
  title: string | null;
  starts_at: string;
  duration_min: number;
  recording_url: string | null;
}

/** Classes in the learner's cohort that teach this lesson. */
export async function getLessonClasses(
  admin: AdminClient,
  lessonId: string,
  cohortId: string | null
): Promise<LessonClass[]> {
  if (!cohortId) return [];
  const { data } = await admin
    .from("class_sessions")
    .select("id, title, starts_at, duration_min, recording_url")
    .eq("lesson_id", lessonId)
    .eq("cohort_id", cohortId)
    .order("starts_at");
  return (data ?? []) as LessonClass[];
}

export interface CourseResource {
  id: string;
  course_id: string;
  title: string;
  description: string;
  kind: "file" | "link";
}

export async function getCourseResources(admin: AdminClient, courseIds: string[]): Promise<CourseResource[]> {
  if (courseIds.length === 0) return [];
  const { data } = await admin
    .from("course_resources")
    .select("id, course_id, title, description, kind")
    .in("course_id", courseIds)
    .order("position");
  return (data ?? []) as CourseResource[];
}

/** A link that opens a private file for about a minute. */
export async function signedFileUrl(admin: AdminClient, path: string): Promise<string | null> {
  const { data, error } = await admin.storage
    .from(COURSE_FILES_BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS, { download: storedFileName(path) });
  if (error) console.error("Signed file link failed:", error.message);
  return data?.signedUrl ?? null;
}

/** Remove a replaced or deleted file. Best effort: a leftover file is harmless. */
export async function removeCourseFile(admin: AdminClient, paths: string | string[] | null | undefined) {
  const list = (Array.isArray(paths) ? paths : [paths]).filter((p): p is string => !!p);
  if (list.length === 0) return;
  const { error } = await admin.storage.from(COURSE_FILES_BUCKET).remove(list);
  if (error) console.error("Course file not removed:", error.message);
}
