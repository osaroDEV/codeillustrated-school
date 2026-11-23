import { z } from "zod";
import { MAX_GENERATED_SESSIONS } from "./schedule";

// Request-body schemas for the /api/admin routes added in Phase 2 (course
// editor, cohorts, sessions, attendance). Form inputs send "" for an empty
// field; these schemas turn that into null.

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

const text = z.string().trim();
const nullableText = z.preprocess(emptyToNull, z.string().trim().nullable());
const httpUrl = z
  .string()
  .trim()
  .url()
  .refine((u) => /^https?:\/\//i.test(u), "Must be an http(s) link");
const nullableUrl = z.preprocess(emptyToNull, httpUrl.nullable());
const nullableMoney = z.preprocess(emptyToNull, z.coerce.number().min(0).nullable());
const money = z.coerce.number().min(0);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const nullableDate = z.preprocess(emptyToNull, date.nullable());
const nullableUuid = z.preprocess(emptyToNull, z.string().uuid().nullable());

// 1-on-1 classes are no longer sold: admins can't create offerings or
// cohorts of that kind.
export const OFFERING_KINDS = ["cohort_group", "self_paced"] as const;
export const COHORT_KINDS = ["cohort_group"] as const;
export const LESSON_TYPES = ["live", "video", "text", "file"] as const;
export const COHORT_STATUSES = ["planned", "running", "finished"] as const;
export const ATTENDANCE_STATUSES = ["present", "late", "absent"] as const;
export const ROLES = ["student", "instructor", "admin"] as const;

// ─── Contact messages ───

export const contactMessagePatchSchema = z.object({ status: z.enum(["new", "handled"]) });

// ─── Course files and resources ───

export const uploadRequestSchema = z.object({
  scope: z.enum(["lessons", "resources"]),
  file_name: text.min(1).max(255),
});

const resourceFields = { title: text.min(1).max(200), description: text.max(1000).default("") };

export const resourceCreateSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("file"), file_path: text.min(1).max(500), ...resourceFields }),
  z.object({ kind: z.literal("link"), url: httpUrl, ...resourceFields }),
]);

// ─── Course editor ───

/** A course's web address, /courses/<slug>. Matches courses_slug_format. */
export const courseSlug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes, e.g. junior-web-creator")
  .max(80);

/**
 * The permanent internal ID for a new course: its first address, or that with
 * -2, -3… when a course created earlier (and since renamed) already has it.
 */
export function newCourseId(slug: string, takenIds: Iterable<string>): string {
  const taken = new Set(takenIds);
  if (!taken.has(slug)) return slug;
  let n = 2;
  while (taken.has(`${slug}-${n}`)) n++;
  return `${slug}-${n}`;
}

export const courseCreateSchema = z.object({
  slug: courseSlug,
  title: text.min(1).max(200),
});

export const coursePatchSchema = z
  .object({
    slug: courseSlug,
    title: text.min(1).max(200),
    description: text.max(1000),
    full_description: text.max(10_000),
    age: text.max(100),
    level: text.max(100),
    duration: text.max(100),
    icon: text.max(40),
    color: text.max(100),
    bg: text.max(100),
    certificate_price_usd: nullableMoney,
    certificate_price_ngn: nullableMoney,
    completion_min_attendance: z.preprocess(emptyToNull, z.coerce.number().int().min(1).max(100).nullable()),
    position: z.coerce.number().int(),
    is_published: z.boolean(),
  })
  .partial();

export const offeringUpsertSchema = z
  .object({
    kind: z.enum(OFFERING_KINDS),
    price_usd: money,
    price_ngn: money,
    is_active: z.boolean().default(true),
    // Optional, and only sold on self-paced offerings.
    yearly_price_usd: z.preprocess(emptyToNull, z.coerce.number().positive().nullable()).optional(),
    yearly_price_ngn: z.preprocess(emptyToNull, z.coerce.number().positive().nullable()).optional(),
  })
  .refine((o) => (o.yearly_price_usd == null) === (o.yearly_price_ngn == null), {
    message: "Set the yearly price in both USD and NGN, or leave both empty.",
    path: ["yearly_price_usd"],
  });

export const moduleCreateSchema = z.object({
  course_id: text.min(1),
  title: text.min(1).max(200),
});

export const modulePatchSchema = z.object({ title: text.min(1).max(200) });

const lessonFields = {
  title: text.min(1).max(200),
  type: z.enum(LESSON_TYPES),
  is_preview: z.boolean(),
  duration_min: z.preprocess(emptyToNull, z.coerce.number().int().positive().nullable()),
  is_published: z.boolean(),
};

export const lessonCreateSchema = z
  .object({ module_id: z.string().uuid(), ...lessonFields })
  .partial({ type: true, is_preview: true, duration_min: true, is_published: true });

const blockTitle = text.max(200).optional();

// Existing blocks send their id, so saving keeps the learner work attached.
const blockId = z.string().uuid().optional();

const quizQuestion = z
  .object({
    question: text.min(1).max(1000),
    options: z.array(text.min(1).max(500)).min(2).max(8),
    correct: z.number().int().min(0),
  })
  .refine((q) => q.correct < q.options.length, { message: "Choose the correct answer for every question." });

export const lessonBlockSchema = z.discriminatedUnion("kind", [
  z.object({ id: blockId, kind: z.literal("text"), content: text.min(1).max(100_000) }),
  z.object({ id: blockId, kind: z.literal("video"), video_url: httpUrl, title: blockTitle }),
  z.object({ id: blockId, kind: z.literal("file"), file_path: text.min(1).max(500), title: blockTitle }),
  z.object({
    id: blockId,
    kind: z.literal("quiz"),
    title: blockTitle,
    quiz: z.array(quizQuestion).min(1).max(50),
    pass_mark: z.coerce.number().int().min(1).max(100).default(70),
    is_required: z.boolean().default(true),
  }),
  z.object({
    id: blockId,
    kind: z.literal("assignment"),
    title: blockTitle,
    content: text.min(1).max(20_000),
    is_required: z.boolean().default(true),
  }),
]);

export const gradeSchema = z.object({
  status: z.enum(["passed", "needs_work"]),
  score: z.preprocess(emptyToNull, z.coerce.number().int().min(0).max(100).nullable()).optional(),
  feedback: nullableText.optional(),
});

export const MAX_LESSON_BLOCKS = 50;

export const lessonPatchSchema = z
  .object({ ...lessonFields, blocks: z.array(lessonBlockSchema).max(MAX_LESSON_BLOCKS) })
  .partial();

export const reorderSchema = z.object({
  kind: z.enum(["modules", "lessons"]),
  parent_id: text.min(1),
  ids: z
    .array(z.string().uuid())
    .min(1)
    .max(500)
    .refine((ids) => new Set(ids).size === ids.length, "Each item can only appear once"),
});

// ─── Cohorts and sessions ───

const cohortFields = {
  course_id: text.min(1),
  name: text.min(1).max(200),
  offering_kind: z.enum(COHORT_KINDS),
  starts_on: nullableDate,
  ends_on: nullableDate,
  capacity: z.preprocess(emptyToNull, z.coerce.number().int().positive().nullable()),
  meeting_url: nullableUrl,
  instructor_id: nullableUuid,
  status: z.enum(COHORT_STATUSES),
};

const datesInOrder = (c: { starts_on?: string | null; ends_on?: string | null }) =>
  !c.starts_on || !c.ends_on || c.ends_on >= c.starts_on;
const datesMessage = { message: "End date can't be before the start date", path: ["ends_on"] };

export const cohortCreateSchema = z
  .object(cohortFields)
  .partial({ offering_kind: true, starts_on: true, ends_on: true, capacity: true, meeting_url: true, instructor_id: true, status: true })
  .refine(datesInOrder, datesMessage);

// course_id is fixed once a cohort exists: its learners are enrolled in it.
export const cohortPatchSchema = z
  .object(cohortFields)
  .omit({ course_id: true })
  .partial()
  .refine(datesInOrder, datesMessage);

const sessionFields = {
  starts_at: z.string().datetime({ offset: true }),
  duration_min: z.coerce.number().int().min(5).max(600),
  title: nullableText,
  lesson_id: nullableUuid,
  meeting_url: nullableUrl,
  recording_url: nullableUrl,
  shared_with_self_paced: z.boolean(),
};

export const sessionsCreateSchema = z.object({
  sessions: z
    .array(
      z.object(sessionFields).partial({ title: true, lesson_id: true, meeting_url: true, recording_url: true, shared_with_self_paced: true })
    )
    .min(1)
    .max(MAX_GENERATED_SESSIONS),
});

export const sessionPatchSchema = z.object(sessionFields).partial();

/** The session fields an instructor may change; the rest are admin-only. */
export const INSTRUCTOR_SESSION_FIELDS = ["meeting_url", "recording_url"] as const;

export const attendancePutSchema = z.object({
  records: z
    .array(z.object({ user_id: z.string().uuid(), status: z.enum(ATTENDANCE_STATUSES).nullable() }))
    .min(1)
    .max(500),
});

export const memberSchema = z.object({ enrollment_id: z.string().uuid() });

export const roleChangeSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(ROLES),
});

/** The first validation message, for showing in the admin UI. */
export function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid request";
  const field = issue.path.join(".");
  return field ? `${field}: ${issue.message}` : issue.message;
}
