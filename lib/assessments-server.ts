import type { createAdminClient } from "./supabase";
import type { Staff } from "./cohorts";

type AdminClient = ReturnType<typeof createAdminClient>;

export interface BlockState {
  bestScore: number | null;
  passed: boolean;
  submission: {
    id: string;
    status: "submitted" | "passed" | "needs_work";
    score: number | null;
    feedback: string | null;
    body: string | null;
    file_path: string | null;
  } | null;
}

/** This learner's quiz results and submissions, keyed by block. */
export async function getBlockStates(admin: AdminClient, userId: string, blockIds: string[]): Promise<Map<string, BlockState>> {
  const states = new Map<string, BlockState>();
  if (blockIds.length === 0) return states;
  const [{ data: attempts }, { data: submissions }] = await Promise.all([
    admin.from("quiz_attempts").select("block_id, score, passed").eq("user_id", userId).in("block_id", blockIds),
    admin
      .from("assignment_submissions")
      .select("id, block_id, status, score, feedback, body, file_path")
      .eq("user_id", userId)
      .in("block_id", blockIds),
  ]);
  const state = (id: string) => {
    if (!states.has(id)) states.set(id, { bestScore: null, passed: false, submission: null });
    return states.get(id)!;
  };
  for (const a of attempts ?? []) {
    const s = state(a.block_id as string);
    s.bestScore = Math.max(s.bestScore ?? 0, a.score as number);
    s.passed = s.passed || (a.passed as boolean);
  }
  for (const { block_id, ...submission } of submissions ?? []) {
    state(block_id as string).submission = submission as BlockState["submission"];
  }
  return states;
}

export interface SubmissionRow {
  id: string;
  user_id: string;
  body: string | null;
  file_path: string | null;
  status: "submitted" | "passed" | "needs_work";
  score: number | null;
  feedback: string | null;
  submitted_at: string;
  learner: string;
  assignment: string;
  lesson: string;
  course: string;
  course_id: string;
}

const SUBMISSION_SELECT =
  "id, user_id, body, file_path, status, score, feedback, submitted_at, profiles!assignment_submissions_user_id_fkey(full_name, email), lesson_blocks(title, lessons(title, course_modules(course_id, courses(title))))";

type RawSubmission = Omit<SubmissionRow, "learner" | "assignment" | "lesson" | "course" | "course_id"> & {
  profiles: { full_name: string | null; email: string | null } | null;
  lesson_blocks: {
    title: string | null;
    lessons: { title: string; course_modules: { course_id: string; courses: { title: string } | null } };
  };
};

function toRow({ profiles, lesson_blocks, ...rest }: RawSubmission): SubmissionRow {
  const lesson = lesson_blocks.lessons;
  return {
    ...rest,
    learner: profiles?.full_name || profiles?.email || "Learner",
    assignment: lesson_blocks.title || "Assignment",
    lesson: lesson.title,
    course: lesson.course_modules.courses?.title ?? lesson.course_modules.course_id,
    course_id: lesson.course_modules.course_id,
  };
}

/** The learner+course pairs an instructor teaches. */
async function taughtLearners(admin: AdminClient, instructorId: string): Promise<Set<string>> {
  const { data } = await admin
    .from("enrollments")
    .select("user_id, course_id, cohorts!inner(instructor_id)")
    .eq("cohorts.instructor_id", instructorId);
  return new Set((data ?? []).map((e) => `${e.user_id}:${e.course_id}`));
}

/** Submissions this staff member may grade, oldest waiting first. */
export async function listSubmissions(admin: AdminClient, staff: Staff): Promise<SubmissionRow[]> {
  const { data, error } = await admin
    .from("assignment_submissions")
    .select(SUBMISSION_SELECT)
    .order("submitted_at")
    .limit(500);
  if (error) throw error;
  const rows = ((data ?? []) as unknown as RawSubmission[]).map(toRow);
  if (staff.role === "admin") return rows;
  const taught = await taughtLearners(admin, staff.user.id);
  return rows.filter((r) => taught.has(`${r.user_id}:${r.course_id}`));
}

/** One submission, if this staff member may grade it. */
export async function loadSubmissionForStaff(admin: AdminClient, staff: Staff, id: string): Promise<SubmissionRow | null> {
  const { data } = await admin.from("assignment_submissions").select(SUBMISSION_SELECT).eq("id", id).maybeSingle();
  if (!data) return null;
  const row = toRow(data as unknown as RawSubmission);
  if (staff.role === "admin") return row;
  return (await taughtLearners(admin, staff.user.id)).has(`${row.user_id}:${row.course_id}`) ? row : null;
}
