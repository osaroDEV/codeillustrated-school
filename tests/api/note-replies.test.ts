// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

import { POST } from "@/app/api/notes/[id]/replies/route";

const { state, insert, enqueueEmails } = vi.hoisted(() => ({
  state: { user: { id: "learner" } as object | null, role: "student", note: null as unknown },
  insert: vi.fn(),
  enqueueEmails: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.note }) }) }),
      insert: (row: unknown) => {
        insert(row);
        return { select: () => ({ single: async () => ({ data: { id: "r1" }, error: null }) }) };
      },
    }),
  }),
}));
vi.mock("@/lib/supabase-server", () => ({
  requireVerifiedUserApi: async () =>
    state.user ? { user: state.user } : { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) },
  getRole: async () => state.role,
}));
vi.mock("@/lib/notifications", () => ({ enqueueEmails }));
vi.mock("@/lib/billing-server", () => ({ appUrl: () => "https://x.test/academy" }));

const reply = (body: unknown = { body: "Thank you" }) =>
  POST(new NextRequest("https://x.test/x", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "n1" }) });

const learner = { email: "ada@x.test", full_name: "Ada Obi", email_notifications: true };

beforeEach(() => {
  state.user = { id: "learner" };
  state.role = "student";
  state.note = { id: "n1", user_id: "learner", title: "Week 1", profiles: learner };
  insert.mockClear();
  enqueueEmails.mockClear();
});

describe("replying to a learner note", () => {
  it("lets the learner reply and tells the school", async () => {
    expect((await reply()).status).toBe(201);
    expect(insert).toHaveBeenCalledWith({ note_id: "n1", author_id: "learner", body: "Thank you" });
    expect(enqueueEmails.mock.calls[0][1][0]).toMatchObject({ to_email: "admin@codeillustrated.com", subject: 'Ada Obi replied to "Week 1"' });
  });

  it("lets an admin reply and tells the learner", async () => {
    state.user = { id: "boss" };
    state.role = "admin";
    expect((await reply()).status).toBe(201);
    expect(enqueueEmails.mock.calls[0][1][0]).toMatchObject({ to_email: "ada@x.test" });
  });

  it("doesn't email a learner who opted out", async () => {
    state.user = { id: "boss" };
    state.role = "admin";
    state.note = { id: "n1", user_id: "learner", title: null, profiles: { ...learner, email_notifications: false } };
    await reply();
    expect(enqueueEmails).not.toHaveBeenCalled();
  });

  it.each(["student", "instructor"])("hides someone else's note from a %s", async (role) => {
    state.user = { id: "other" };
    state.role = role;
    expect((await reply()).status).toBe(404);
    expect(insert).not.toHaveBeenCalled();
  });

  it("needs some text and a signed-in user", async () => {
    expect((await reply({ body: "   " })).status).toBe(400);
    state.user = null;
    expect((await reply()).status).toBe(401);
  });
});
