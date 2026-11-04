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

export const OFFERING_KINDS = ["cohort_group", "cohort_1on1", "self_paced"] as const;
export const COHORT_KINDS = ["cohort_group", "cohort_1on1"] as const;
export const LESSON_TYPES = ["live", "video", "text", "file"] as const;
export const COHORT_STATUSES = ["planned", "running", "finished"] as const;
export const ATTENDANCE_STATUSES = ["present", "late", "absent"] as const;
export const ROLES = ["student", "instructor", "admin"] as const;

// ─── Course editor ───

export const courseCreateSchema = z.object({
  id: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes, e.g. junior-web-creator")
    .max(80),
  title: text.min(1).max(200),
});

export const coursePatchSchema = z
  .object({
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
    position: z.coerce.number().int(),
    is_published: z.boolean(),
  })
  .partial();

export const offeringUpsertSchema = z.object({
  kind: z.enum(OFFERING_KINDS),
  price_usd: money,
  price_ngn: money,
  is_active: z.boolean().default(true),
});

export const moduleCreateSchema = z.object({
  course_id: text.min(1),
  title: text.min(1).max(200),
});

export const modulePatchSchema = z.object({ title: text.min(1).max(200) });

const lessonFields = {
  title: text.min(1).max(200),
  type: z.enum(LESSON_TYPES),
  content: nullableText,
  video_url: nullableUrl,
  file_path: nullableText,
  is_preview: z.boolean(),
  duration_min: z.preprocess(emptyToNull, z.coerce.number().int().positive().nullable()),
  is_published: z.boolean(),
};

export const lessonCreateSchema = z
  .object({ module_id: z.string().uuid(), ...lessonFields })
  .partial({ type: true, content: true, video_url: true, file_path: true, is_preview: true, duration_min: true, is_published: true });

export const lessonPatchSchema = z.object(lessonFields).partial();

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
};

export const sessionsCreateSchema = z.object({
  sessions: z
    .array(
      z.object(sessionFields).partial({ title: true, lesson_id: true, meeting_url: true, recording_url: true })
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
