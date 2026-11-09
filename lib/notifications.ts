import { timingSafeEqual } from "crypto";
import type { createAdminClient } from "./supabase";
import { hasSeatAccess, type SubscriptionState } from "./billing";
import { appUrl } from "./billing-server";
import { sendEmail } from "./email";

// Queued email: class reminders, announcements, grades and note replies.
// Everything goes through email_outbox and is sent by /api/cron/notifications.

type AdminClient = ReturnType<typeof createAdminClient>;

const HOUR_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const CLAIM_MS = 10 * 60 * 1000;
const KEEP_SENT_MS = 90 * 24 * HOUR_MS;

export type ReminderKind = "1h" | "24h";

/**
 * Which reminder a class is due. Classes added less than two hours ahead skip
 * the "tomorrow" email and only get the 1-hour one.
 */
export function reminderKind(startsAt: string | Date, now: Date): ReminderKind | null {
  const ms = new Date(startsAt).getTime() - now.getTime();
  if (ms <= 0) return null;
  if (ms <= HOUR_MS) return "1h";
  if (ms > 2 * HOUR_MS && ms <= 24 * HOUR_MS) return "24h";
  return null;
}

/** Emails can't know the reader's time zone, so show Nigerian time and UTC. */
export function formatClassTime(iso: string): string {
  const date = new Date(iso);
  const part = (timeZone: string, options: Intl.DateTimeFormatOptions) =>
    date.toLocaleString("en-GB", { timeZone, ...options });
  const clock: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hour12: false };
  return `${part("Africa/Lagos", { weekday: "short", day: "numeric", month: "short" })}, ${part("Africa/Lagos", clock)} WAT (${part("UTC", clock)} UTC)`;
}

export interface OutboxEmail {
  dedupe_key: string;
  to_email: string;
  to_name?: string | null;
  subject: string;
  paragraphs: string[];
  not_after?: string | null;
}

export async function enqueueEmails(admin: AdminClient, emails: OutboxEmail[]): Promise<void> {
  if (emails.length === 0) return;
  const { error } = await admin.from("email_outbox").upsert(emails, { onConflict: "dedupe_key", ignoreDuplicates: true });
  if (error) console.error("Emails not queued:", error.message);
}

interface Recipient {
  user_id: string;
  email: string;
  name: string | null;
}

type EnrollmentRow = {
  user_id: string;
  source: string | null;
  cohort_id?: string | null;
  subscriptions: SubscriptionState | null;
  profiles: { email: string | null; full_name: string | null; email_notifications: boolean } | null;
};

const greeting = (name: string | null | undefined) => `Hi${name ? ` ${name.split(" ")[0]}` : ""},`;
const SIGN_OFF = "Code Illustrated";
const PREFERENCE = "You can turn these emails off in your dashboard under Profile.";

/** Whether this enrolment should receive course emails right now. */
function reachable(row: EnrollmentRow): boolean {
  return !!row.profiles?.email && row.profiles.email_notifications !== false && hasSeatAccess(row, row.subscriptions);
}

const toRecipient = (row: EnrollmentRow): Recipient => ({
  user_id: row.user_id,
  email: row.profiles!.email!,
  name: row.profiles!.full_name,
});

const ENROLLMENT_FIELDS = "user_id, source, cohort_id, subscriptions(status, current_period_end), profiles(email, full_name, email_notifications)";

export async function enqueueAnnouncement(
  admin: AdminClient,
  announcement: { id: string; title: string; body: string; course_id: string | null }
): Promise<number> {
  let query = admin.from("enrollments").select(ENROLLMENT_FIELDS).eq("status", "active");
  if (announcement.course_id) query = query.eq("course_id", announcement.course_id);
  const { data, error } = await query;
  if (error) {
    console.error("Announcement recipients failed:", error.message);
    return 0;
  }
  const recipients = new Map<string, Recipient>();
  for (const row of (data ?? []) as unknown as EnrollmentRow[]) {
    if (reachable(row)) recipients.set(row.user_id, toRecipient(row));
  }
  await enqueueEmails(
    admin,
    Array.from(recipients.values()).map((r) => ({
      dedupe_key: `announcement:${announcement.id}:${r.user_id}`,
      to_email: r.email,
      to_name: r.name,
      subject: announcement.title,
      paragraphs: [
        greeting(r.name),
        ...announcement.body.split(/\n+/),
        `Dashboard: ${appUrl()}/dashboard`,
        SIGN_OFF,
        PREFERENCE,
      ],
    }))
  );
  return recipients.size;
}

export async function enqueueGradeEmail(
  admin: AdminClient,
  submission: { id: string; user_id: string; assignment: string; lesson: string; course: string },
  status: "passed" | "needs_work",
  gradedAt: string
): Promise<void> {
  const { data: profile } = await admin
    .from("profiles")
    .select("email, full_name, email_notifications")
    .eq("id", submission.user_id)
    .maybeSingle();
  if (!profile?.email || profile.email_notifications === false) return;
  const passed = status === "passed";
  await enqueueEmails(admin, [
    {
      dedupe_key: `grade:${submission.id}:${gradedAt}`,
      to_email: profile.email,
      to_name: profile.full_name,
      subject: passed ? `You passed: ${submission.assignment}` : `Feedback on ${submission.assignment}`,
      paragraphs: [
        greeting(profile.full_name),
        passed
          ? `Well done! Your work on "${submission.assignment}" in ${submission.course} has passed.`
          : `Your work on "${submission.assignment}" in ${submission.course} has been reviewed and needs a little more work.`,
        `Open the lesson "${submission.lesson}" from My Courses to see the feedback: ${appUrl()}/dashboard/courses`,
        SIGN_OFF,
        PREFERENCE,
      ],
    },
  ]);
}

/** Queue any reminders now due. Safe to run as often as you like. */
export async function enqueueClassReminders(admin: AdminClient, now: Date): Promise<number> {
  const { data: sessions } = await admin
    .from("class_sessions")
    .select("id, title, starts_at, cohort_id, cohorts(name, courses(title))")
    .gt("starts_at", now.toISOString())
    .lt("starts_at", new Date(now.getTime() + 24 * HOUR_MS).toISOString());

  type SessionRow = {
    id: string;
    title: string | null;
    starts_at: string;
    cohort_id: string;
    cohorts: { name: string; courses: { title: string } | null } | null;
  };
  const due = ((sessions ?? []) as unknown as SessionRow[])
    .map((s) => ({ session: s, kind: reminderKind(s.starts_at, now) }))
    .filter((d): d is { session: SessionRow; kind: ReminderKind } => d.kind !== null);
  if (due.length === 0) return 0;

  const { data: enrollments } = await admin
    .from("enrollments")
    .select(ENROLLMENT_FIELDS)
    .eq("status", "active")
    .in("cohort_id", Array.from(new Set(due.map((d) => d.session.cohort_id))));
  const learners = ((enrollments ?? []) as unknown as EnrollmentRow[]).filter(reachable);

  const emails: OutboxEmail[] = due.flatMap(({ session, kind }) =>
    learners
      .filter((l) => l.cohort_id === session.cohort_id)
      .map(toRecipientWithRow)
      .map((r) => {
        const course = session.cohorts?.courses?.title ?? "your course";
        const name = session.title || "Live class";
        return {
          dedupe_key: `reminder:${kind}:${session.id}:${r.user_id}`,
          to_email: r.email,
          to_name: r.name,
          subject: kind === "1h" ? `Starting soon: ${name} (${course})` : `Coming up: ${name} (${course})`,
          paragraphs: [
            greeting(r.name),
            kind === "1h" ? `Your ${course} class starts in about an hour.` : `You have a ${course} class coming up.`,
            `${name}: ${formatClassTime(session.starts_at)}`,
            `Join from your schedule, up to 15 minutes before it starts: ${appUrl()}/dashboard/schedule`,
            SIGN_OFF,
            PREFERENCE,
          ],
          not_after: session.starts_at,
        };
      })
  );
  await enqueueEmails(admin, emails);
  return emails.length;
}

function toRecipientWithRow(row: EnrollmentRow): Recipient {
  return toRecipient(row);
}

/** Send what's waiting. A failed email is retried on later runs, up to five times. */
export async function drainOutbox(admin: AdminClient, now: Date, limit = 100): Promise<{ sent: number; failed: number }> {
  const { data } = await admin
    .from("email_outbox")
    .select("id, to_email, to_name, subject, paragraphs, not_after, attempts")
    .is("sent_at", null)
    .lt("attempts", MAX_ATTEMPTS)
    .order("created_at")
    .limit(limit);

  type Row = {
    id: string;
    to_email: string;
    to_name: string | null;
    subject: string;
    paragraphs: string[];
    not_after: string | null;
    attempts: number;
  };

  let sent = 0;
  let failed = 0;
  const staleClaim = new Date(now.getTime() - CLAIM_MS).toISOString();
  for (const row of (data ?? []) as unknown as Row[]) {
    if (row.not_after && new Date(row.not_after) <= now) {
      await admin.from("email_outbox").update({ attempts: MAX_ATTEMPTS, last_error: "Too late to send" }).eq("id", row.id);
      continue;
    }
    // Claim it first, so two overlapping runs can't both send it.
    const { data: claimed } = await admin
      .from("email_outbox")
      .update({ claimed_at: now.toISOString() })
      .eq("id", row.id)
      .is("sent_at", null)
      .or(`claimed_at.is.null,claimed_at.lt.${staleClaim}`)
      .select("id");
    if (!claimed?.length) continue;

    const ok = await sendEmail({ to: row.to_email, toName: row.to_name, subject: row.subject, paragraphs: row.paragraphs });
    await admin
      .from("email_outbox")
      .update(
        ok
          ? { sent_at: new Date().toISOString(), last_error: null }
          : { attempts: row.attempts + 1, claimed_at: null, last_error: "Send failed" }
      )
      .eq("id", row.id);
    if (ok) sent++;
    else failed++;
  }
  return { sent, failed };
}

/** The whole job behind /api/cron/notifications. */
export async function runNotifications(admin: AdminClient, now = new Date()) {
  const queued = await enqueueClassReminders(admin, now);
  const result = await drainOutbox(admin, now);
  await admin.from("email_outbox").delete().lt("sent_at", new Date(now.getTime() - KEEP_SENT_MS).toISOString());
  return { queued, ...result };
}

function sameSecret(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Vercel Cron sends CRON_SECRET; Supabase's scheduler sends the token it stores. */
export async function isCronAuthorized(admin: AdminClient, authorization: string | null): Promise<boolean> {
  const presented = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!presented) return false;
  const secret = process.env.CRON_SECRET;
  if (secret && sameSecret(presented, secret)) return true;
  const { data } = await admin.from("internal_settings").select("value").eq("key", "cron_token").maybeSingle();
  return !!data?.value && sameSecret(presented, data.value as string);
}
