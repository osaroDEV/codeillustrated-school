// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  drainOutbox,
  enqueueAnnouncement,
  enqueueClassReminders,
  enqueueGradeEmail,
  formatClassTime,
  isCronAuthorized,
  reminderKind,
  type OutboxEmail,
} from "./notifications";

const { sendEmail } = vi.hoisted(() => ({ sendEmail: vi.fn() }));
vi.mock("./email", () => ({ sendEmail }));
vi.mock("./flutterwave", () => ({}));

type Call = { table: string; op: string; payload?: unknown };

function fakeAdmin(respond: (table: string, op: string, filters: unknown[][]) => { data?: unknown }) {
  const calls: Call[] = [];
  const queued: OutboxEmail[] = [];
  const admin = {
    from: (table: string) => {
      const call: Call = { table, op: "select" };
      calls.push(call);
      const filters: unknown[][] = [];
      const run = () => Promise.resolve({ data: null, error: null, ...respond(table, call.op, filters) });
      const chain: Record<string, unknown> = {};
      for (const m of ["select", "eq", "in", "is", "lt", "gt", "or", "order", "limit", "not"]) {
        chain[m] = (...args: unknown[]) => {
          if (m !== "select") filters.push([m, ...args]);
          return chain;
        };
      }
      chain.update = (payload: unknown) => ((call.op = "update"), (call.payload = payload), chain);
      chain.delete = () => ((call.op = "delete"), chain);
      chain.upsert = (rows: OutboxEmail[]) => {
        call.op = "upsert";
        queued.push(...rows);
        return Promise.resolve({ error: null });
      };
      chain.maybeSingle = run;
      chain.then = (ok: (v: unknown) => unknown) => run().then(ok);
      return chain;
    },
  };
  return { admin: admin as never, calls, queued };
}

const now = new Date("2026-11-10T12:00:00Z");
const inHours = (h: number) => new Date(now.getTime() + h * 3600_000).toISOString();
const learner = (over: object = {}) => ({
  user_id: "u1", source: "manual", cohort_id: "k1", subscriptions: null,
  profiles: { email: "ada@x.test", full_name: "Ada Obi", email_notifications: true }, ...over,
});

beforeEach(() => {
  sendEmail.mockReset().mockResolvedValue(true);
});

describe("reminderKind", () => {
  it.each([
    [0.5, "1h"], [1, "1h"], [3, "24h"], [24, "24h"],
    [1.5, null], [25, null], [-1, null],
  ])("%s hours ahead is %s", (h, kind) => {
    expect(reminderKind(inHours(h as number), now)).toBe(kind);
  });
});

describe("formatClassTime", () => {
  it("shows Nigerian time and UTC", () => {
    expect(formatClassTime("2026-11-10T16:00:00Z")).toMatch(/^Tue,? 10 Nov, 17:00 WAT \(16:00 UTC\)$/);
  });
});

describe("enqueueClassReminders", () => {
  const session = (id: string, h: number) => ({ id, title: "Week 1", starts_at: inHours(h), cohort_id: "k1", cohorts: { name: "Eve", courses: { title: "Web" } } });
  const db = (sessions: unknown[], learners: unknown[]) =>
    fakeAdmin((table) => (table === "class_sessions" ? { data: sessions } : table === "enrollments" ? { data: learners } : {}));

  it("queues one reminder per learner, keyed so it can only go once", async () => {
    const d = db([session("s1", 0.5), session("s2", 20)], [learner(), learner({ user_id: "u2" })]);
    expect(await enqueueClassReminders(d.admin, now)).toBe(4);
    expect(d.queued.map((e) => e.dedupe_key).sort()).toEqual([
      "reminder:1h:s1:u1", "reminder:1h:s1:u2", "reminder:24h:s2:u1", "reminder:24h:s2:u2",
    ]);
  });

  it("is worded for how soon it is, and stops being sendable once the class starts", async () => {
    const d = db([session("s1", 0.5)], [learner()]);
    await enqueueClassReminders(d.admin, now);
    expect(d.queued[0].subject).toMatch(/^Starting soon/);
    expect(d.queued[0].not_after).toBe(inHours(0.5));
  });

  it("never includes the meeting link", async () => {
    const d = db([{ ...session("s1", 0.5), meeting_url: "https://meet.test/secret" }], [learner()]);
    await enqueueClassReminders(d.admin, now);
    expect(JSON.stringify(d.queued[0])).not.toContain("meet.test");
  });

  it("skips learners who opted out or whose subscription has lapsed", async () => {
    const d = db([session("s1", 0.5)], [
      learner({ user_id: "off", profiles: { email: "x@x.test", full_name: null, email_notifications: false } }),
      learner({ user_id: "lapsed", source: "subscription", subscriptions: { status: "expired", current_period_end: "2026-01-01T00:00:00Z" } }),
      learner({ user_id: "ok" }),
    ]);
    await enqueueClassReminders(d.admin, now);
    expect(d.queued.map((e) => e.dedupe_key)).toEqual(["reminder:1h:s1:ok"]);
  });

  it("only reminds a class's own cohort", async () => {
    const d = db([session("s1", 0.5)], [learner({ cohort_id: "other" })]);
    expect(await enqueueClassReminders(d.admin, now)).toBe(0);
  });
});

describe("enqueueAnnouncement", () => {
  it("reaches each learner once, however many courses they take", async () => {
    const d = fakeAdmin(() => ({ data: [learner(), learner(), learner({ user_id: "u2" })] }));
    const n = await enqueueAnnouncement(d.admin, { id: "a1", title: "News", body: "Line one\nLine two", course_id: null });
    expect(n).toBe(2);
    expect(d.queued[0]).toMatchObject({ dedupe_key: "announcement:a1:u1", subject: "News" });
    expect(d.queued[0].paragraphs).toEqual(expect.arrayContaining(["Line one", "Line two"]));
  });
});

describe("enqueueGradeEmail", () => {
  const submission = { id: "s1", user_id: "u1", assignment: "Build", lesson: "L", course: "Web" };

  it("tells the learner the result", async () => {
    const d = fakeAdmin(() => ({ data: { email: "ada@x.test", full_name: "Ada", email_notifications: true } }));
    await enqueueGradeEmail(d.admin, submission, "passed", "2026-11-10T00:00:00Z");
    expect(d.queued[0].subject).toBe("You passed: Build");
  });

  it("respects the opt-out", async () => {
    const d = fakeAdmin(() => ({ data: { email: "ada@x.test", full_name: "Ada", email_notifications: false } }));
    await enqueueGradeEmail(d.admin, submission, "needs_work", "2026-11-10T00:00:00Z");
    expect(d.queued).toHaveLength(0);
  });
});

describe("drainOutbox", () => {
  const row = (over: object = {}) => ({ id: "e1", to_email: "a@x.test", to_name: null, subject: "S", paragraphs: ["p"], not_after: null, attempts: 0, ...over });
  const db = (rows: unknown[], claimed: unknown[] = [{ id: "e1" }]) =>
    fakeAdmin((_t, op) => (op === "select" ? { data: rows } : op === "update" ? { data: claimed } : {}));

  it("sends and marks as sent", async () => {
    const d = db([row()]);
    expect(await drainOutbox(d.admin, now)).toEqual({ sent: 1, failed: 0 });
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "a@x.test", subject: "S" }));
    expect(d.calls.at(-1)?.payload).toMatchObject({ last_error: null });
  });

  it("keeps a failed email for another try", async () => {
    sendEmail.mockResolvedValue(false);
    const d = db([row({ attempts: 2 })]);
    expect(await drainOutbox(d.admin, now)).toEqual({ sent: 0, failed: 1 });
    expect(d.calls.at(-1)?.payload).toEqual({ attempts: 3, claimed_at: null, last_error: "Send failed" });
  });

  it("doesn't send a reminder for a class that has started", async () => {
    const d = db([row({ not_after: inHours(-1) })]);
    await drainOutbox(d.admin, now);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(d.calls.at(-1)?.payload).toMatchObject({ attempts: 5 });
  });

  it("leaves an email another run has claimed", async () => {
    const d = db([row()], []);
    expect(await drainOutbox(d.admin, now)).toEqual({ sent: 0, failed: 0 });
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe("isCronAuthorized", () => {
  const db = () => fakeAdmin(() => ({ data: { value: "db-token" } }));

  beforeEach(() => {
    process.env.CRON_SECRET = "vercel-secret";
  });

  it("accepts Vercel's secret or the scheduler's token", async () => {
    expect(await isCronAuthorized(db().admin, "Bearer vercel-secret")).toBe(true);
    expect(await isCronAuthorized(db().admin, "Bearer db-token")).toBe(true);
  });

  it.each([null, "", "Bearer ", "Bearer wrong", "db-token"])("refuses %s", async (header) => {
    expect(await isCronAuthorized(db().admin, header)).toBe(false);
  });

  it("refuses everything if nothing is configured", async () => {
    delete process.env.CRON_SECRET;
    expect(await isCronAuthorized(fakeAdmin(() => ({ data: null })).admin, "Bearer anything")).toBe(false);
  });
});
