// Pure scheduling helpers for class sessions. No server imports: the session
// generator runs in the admin's browser so recurring times follow the admin's
// local clock across daylight-saving changes.

export interface SessionTiming {
  starts_at: string;
  duration_min: number;
}

/** Learners can open the meeting link this long before a session starts. */
export const JOIN_OPENS_BEFORE_MIN = 15;

export type JoinState = "upcoming" | "open" | "ended";

export function sessionEnd(session: SessionTiming): Date {
  return new Date(new Date(session.starts_at).getTime() + session.duration_min * 60_000);
}

export function joinState(session: SessionTiming, now: Date = new Date()): JoinState {
  const start = new Date(session.starts_at).getTime();
  if (now.getTime() < start - JOIN_OPENS_BEFORE_MIN * 60_000) return "upcoming";
  if (now.getTime() < sessionEnd(session).getTime()) return "open";
  return "ended";
}

/** The earliest session that hasn't ended yet, or null. */
export function nextSession<T extends SessionTiming>(sessions: T[], now: Date = new Date()): T | null {
  return (
    [...sessions]
      .filter((s) => sessionEnd(s).getTime() > now.getTime())
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0] ?? null
  );
}

export interface RecurrenceInput {
  /** First day to consider, local time (YYYY-MM-DD). */
  startDate: string;
  /** Local time of day (HH:MM). */
  time: string;
  /** 0 = Sunday … 6 = Saturday. */
  weekdays: number[];
  /** Total number of sessions to create. */
  count: number;
}

export const MAX_GENERATED_SESSIONS = 200;

/**
 * Session start times for a weekly schedule, e.g. every Tuesday and Thursday
 * at 17:00 for 16 sessions. Dates are built from local calendar fields, so a
 * 17:00 class stays at 17:00 local time across a DST change.
 */
export function generateWeeklySessions({ startDate, time, weekdays, count }: RecurrenceInput): Date[] {
  const days = Array.from(new Set(weekdays)).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dateMatch || !timeMatch || days.length === 0 || count < 1) return [];

  const [, y, m, d] = dateMatch.map(Number);
  const [, hh, mm] = timeMatch.map(Number);
  const total = Math.min(Math.floor(count), MAX_GENERATED_SESSIONS);

  const result: Date[] = [];
  for (let offset = 0; result.length < total; offset++) {
    const day = new Date(y, m - 1, d + offset, hh, mm);
    if (days.includes(day.getDay())) result.push(day);
  }
  return result;
}

/**
 * When an enrolment's next class is. Learners in a cohort get it from the
 * cohort's sessions; learners not yet placed in one fall back to the
 * deprecated, hand-set enrollments.next_session.
 */
export function nextSessionAt(
  enrollment: { cohort_id?: string | null; next_session?: string | null },
  sessions: (SessionTiming & { cohort_id: string })[],
  now: Date = new Date()
): string | null {
  if (!enrollment.cohort_id) return enrollment.next_session ?? null;
  const cohortId = enrollment.cohort_id;
  return nextSession(sessions.filter((s) => s.cohort_id === cohortId), now)?.starts_at ?? null;
}

/** An ISO timestamp as the value of an <input type="datetime-local">, in local time. */
export function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** The value of an <input type="datetime-local"> (local time) as an ISO timestamp. */
export function fromDatetimeLocal(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
