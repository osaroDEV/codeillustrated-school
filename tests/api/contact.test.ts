// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/contact/route";

const { sendEmail, db } = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  db: {
    insertError: null as { message: string } | null,
    earlierMessages: 0,
    inserted: [] as Record<string, unknown>[],
    updated: [] as Record<string, unknown>[],
  },
}));
vi.mock("@/lib/email", () => ({ sendEmail }));
vi.mock("@/lib/courses", () => ({
  getCourses: async () => [{ id: "game-dev-pro", slug: "game-dev", title: "Game Dev Pro" }],
}));
vi.mock("@/lib/supabase", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: (row: Record<string, unknown>) => {
        db.inserted.push(row);
        return {
          select: () => ({
            single: async () => (db.insertError ? { data: null, error: db.insertError } : { data: { id: "m1" }, error: null }),
          }),
        };
      },
      update: (row: Record<string, unknown>) => {
        db.updated.push(row);
        return { eq: async () => ({ error: null }) };
      },
      select: () => ({
        eq: () => ({ neq: () => ({ gte: async () => ({ count: db.earlierMessages, error: null }) }) }),
      }),
    }),
  }),
}));

const valid = {
  name: "Ada Obi",
  email: "Ada@Example.test",
  phone: "08012345678",
  course: "game-dev-pro",
  message: "Does my son need any experience?\nHe is 14.",
};

const post = (body: unknown) =>
  POST(
    new Request("https://x.test/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  );

const emailTo = (to: string) => sendEmail.mock.calls.map((c) => c[0]).find((e) => e.to === to);
const SCHOOL = "admin@codeillustrated.com";
const VISITOR = "ada@example.test";

beforeEach(() => {
  sendEmail.mockReset().mockResolvedValue(true);
  db.insertError = null;
  db.earlierMessages = 0;
  db.inserted.length = 0;
  db.updated.length = 0;
});

describe("POST /api/contact", () => {
  it("saves the message and emails the school, with replies going to the visitor", async () => {
    const res = await post(valid);
    expect(res.status).toBe(200);
    expect(db.inserted[0]).toEqual({
      name: "Ada Obi",
      email: VISITOR,
      phone: "08012345678",
      course: "Game Dev Pro",
      message: valid.message,
    });
    expect(db.updated).toEqual([{ email_sent: true }]);
    const email = emailTo(SCHOOL);
    expect(email.replyTo).toEqual({ email: VISITOR, name: "Ada Obi" });
    expect(email.subject).toBe("New enquiry from Ada Obi: Game Dev Pro");
    expect(email.paragraphs).toEqual(
      expect.arrayContaining(["Phone: 08012345678", "Does my son need any experience?", "He is 14."])
    );
  });

  it("acknowledges the visitor without repeating anything they typed", async () => {
    await post({ ...valid, name: "Buy cheap pills", message: "Visit https://spam.test right now" });
    const ack = emailTo(VISITOR);
    expect(ack.subject).toBe("We've received your message");
    expect(JSON.stringify(ack)).not.toMatch(/pills|spam\.test/);
  });

  it("acknowledges an address at most once a day", async () => {
    db.earlierMessages = 1;
    await post(valid);
    expect(emailTo(SCHOOL)).toBeDefined();
    expect(emailTo(VISITOR)).toBeUndefined();
  });

  it("labels general enquiries", async () => {
    await post({ ...valid, course: "other" });
    expect(emailTo(SCHOOL).subject).toContain("General inquiry");
  });

  it("rejects an invalid form without saving or sending", async () => {
    const res = await post({ ...valid, email: "not-an-email" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/valid email/);
    expect(db.inserted).toHaveLength(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("pretends to succeed for bots that fill the hidden field", async () => {
    const res = await post({ ...valid, website: "https://spam.test" });
    expect(res.status).toBe(200);
    expect(db.inserted).toHaveLength(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("keeps the message and still succeeds when the school's email fails", async () => {
    sendEmail.mockResolvedValue(false);
    const res = await post(valid);
    expect(res.status).toBe(200);
    expect(db.inserted).toHaveLength(1);
    expect(db.updated).toHaveLength(0);
  });

  it("still emails the school when the database is unavailable, without an acknowledgement", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    db.insertError = { message: 'relation "contact_messages" does not exist' };
    const res = await post(valid);
    expect(res.status).toBe(200);
    expect(emailTo(SCHOOL)).toBeDefined();
    expect(emailTo(VISITOR)).toBeUndefined();
  });

  it("reports a failure only when both copies are lost", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    db.insertError = { message: "down" };
    sendEmail.mockResolvedValue(false);
    const res = await post(valid);
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/couldn't send/);
  });
});
