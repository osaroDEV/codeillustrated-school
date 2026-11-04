import { NextResponse } from "next/server";
import type { z } from "zod";
import type { User } from "@supabase/supabase-js";
import type { createAdminClient } from "./supabase";
import type { StaffRole } from "./supabase-server";
import { firstIssue } from "./admin-schemas";

// Server-side data access for cohorts and class sessions. Callers pass the
// service-role client and are responsible for checking who is asking: admin
// routes call rejectNonAdmin(), staff routes call requireStaffApi() and then
// loadCohortForStaff() to confine instructors to their own cohorts.

type AdminClient = ReturnType<typeof createAdminClient>;

export interface Cohort {
  id: string;
  course_id: string;
  offering_kind: "cohort_group" | "cohort_1on1";
  name: string;
  starts_on: string | null;
  ends_on: string | null;
  capacity: number | null;
  meeting_url: string | null;
  instructor_id: string | null;
  status: "planned" | "running" | "finished";
  created_at: string;
}

export interface ClassSession {
  id: string;
  cohort_id: string;
  lesson_id: string | null;
  title: string | null;
  starts_at: string;
  duration_min: number;
  meeting_url: string | null;
  recording_url: string | null;
}

export type AttendanceStatus = "present" | "late" | "absent";

export interface Staff {
  user: User;
  role: StaffRole;
}

/** The cohort, if it exists and this admin or instructor may manage it. */
export async function loadCohortForStaff(
  admin: AdminClient,
  staff: Staff,
  cohortId: string
): Promise<Cohort | null> {
  const { data } = await admin.from("cohorts").select("*").eq("id", cohortId).maybeSingle();
  if (!data) return null;
  if (!canManageCohort(staff, data as Cohort)) return null;
  return data as Cohort;
}

export function canManageCohort(staff: Staff, cohort: Pick<Cohort, "instructor_id">): boolean {
  return staff.role === "admin" || cohort.instructor_id === staff.user.id;
}

/** The session and its cohort, if this admin or instructor may manage it. */
export async function loadSessionForStaff(
  admin: AdminClient,
  staff: Staff,
  sessionId: string
): Promise<{ session: ClassSession; cohort: Cohort } | null> {
  const { data } = await admin
    .from("class_sessions")
    .select("*, cohorts(*)")
    .eq("id", sessionId)
    .maybeSingle();
  if (!data) return null;
  const { cohorts: cohort, ...session } = data as ClassSession & { cohorts: Cohort };
  if (!cohort || !canManageCohort(staff, cohort)) return null;
  return { session, cohort };
}

// ─── Learner view ───

export interface LearnerSession {
  id: string;
  cohort_id: string;
  cohort_name: string;
  course_id: string;
  title: string | null;
  starts_at: string;
  duration_min: number;
  /** Whether /api/sessions/[id]/join has a link to send the learner to. */
  has_meeting_link: boolean;
  recording_url: string | null;
  attendance: AttendanceStatus | null;
}

/**
 * Every class session in the learner's cohorts, oldest first. Meeting links
 * are reduced to a flag: learners only receive the link itself from the join
 * route, inside the join window.
 */
export async function getLearnerSessions(admin: AdminClient, userId: string): Promise<LearnerSession[]> {
  const { data: enrollments, error } = await admin
    .from("enrollments")
    .select("cohort_id")
    .eq("user_id", userId)
    .not("cohort_id", "is", null);
  if (error) throw error;

  const cohortIds = Array.from(new Set((enrollments ?? []).map((e) => e.cohort_id as string)));
  if (cohortIds.length === 0) return [];

  const { data: sessions, error: sessionsError } = await admin
    .from("class_sessions")
    .select("id, cohort_id, title, starts_at, duration_min, meeting_url, recording_url, cohorts(name, course_id, meeting_url)")
    .in("cohort_id", cohortIds)
    .order("starts_at");
  if (sessionsError) throw sessionsError;

  const rows = (sessions ?? []) as unknown as (Omit<ClassSession, "lesson_id"> & {
    cohorts: { name: string; course_id: string; meeting_url: string | null } | null;
  })[];
  if (rows.length === 0) return [];

  const { data: marks } = await admin
    .from("attendance")
    .select("session_id, status")
    .eq("user_id", userId)
    .in("session_id", rows.map((s) => s.id));
  const attendance = new Map((marks ?? []).map((m) => [m.session_id as string, m.status as AttendanceStatus]));

  return rows.map((s) => ({
    id: s.id,
    cohort_id: s.cohort_id,
    cohort_name: s.cohorts?.name ?? "",
    course_id: s.cohorts?.course_id ?? "",
    title: s.title,
    starts_at: s.starts_at,
    duration_min: s.duration_min,
    has_meeting_link: !!(s.meeting_url || s.cohorts?.meeting_url),
    recording_url: s.recording_url,
    attendance: attendance.get(s.id) ?? null,
  }));
}

// ─── Route helpers ───

/** An instructor must be a staff account; returns a 400 response otherwise. */
export async function checkInstructor(
  admin: AdminClient,
  instructorId: string | null | undefined
): Promise<NextResponse | null> {
  if (!instructorId) return null;
  const { data } = await admin.from("profiles").select("role").eq("id", instructorId).maybeSingle();
  if (data?.role !== "instructor" && data?.role !== "admin") {
    return NextResponse.json(
      { error: "The instructor must have the instructor or admin role." },
      { status: 400 }
    );
  }
  return null;
}

/** Parse a JSON body with a zod schema, or produce a 400 response. */
export async function parseBody<S extends z.ZodTypeAny>(
  req: Request,
  schema: S
): Promise<{ data: z.output<S>; response?: never } | { data?: never; response: NextResponse }> {
  const json = await req.json().catch(() => undefined);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return { response: NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 }) };
  }
  return { data: parsed.data };
}

/** Map Postgres errors raised by the Phase 2 schema to readable responses. */
export function dbErrorResponse(error: { code?: string; message: string }): NextResponse {
  switch (error.code) {
    case "CI001":
      return NextResponse.json({ error: "That cohort belongs to a different course." }, { status: 409 });
    case "CI002":
      return NextResponse.json({ error: "That cohort is full." }, { status: 409 });
    case "CI003":
      return NextResponse.json({ error: "The list doesn't match what's saved. Reload and try again." }, { status: 409 });
    case "23505":
      return NextResponse.json({ error: "That already exists." }, { status: 409 });
    case "22P02":
      return NextResponse.json({ error: "Invalid ID." }, { status: 400 });
    case "23503":
      return NextResponse.json(
        { error: "It's still in use (for example by enrolments or cohorts), so it can't be removed." },
        { status: 409 }
      );
    default:
      console.error("Database error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
