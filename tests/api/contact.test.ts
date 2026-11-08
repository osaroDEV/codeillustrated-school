// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/contact/route";

const { sendEmail } = vi.hoisted(() => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendEmail }));
vi.mock("@/lib/courses", () => ({
  getCourses: async () => [{ id: "game-dev-pro", slug: "game-dev", title: "Game Dev Pro" }],
}));

const valid = {
  name: "Ada Obi",
  email: "ada@example.test",
  phone: "08012345678",
  course: "game-dev-pro",
  message: "Does my son need any experience?\nHe is 14.",
};

const post = (body: unknown) =>
  POST(
    new Request("https://x.test/academy/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  );

beforeEach(() => {
  sendEmail.mockReset().mockResolvedValue(true);
});

describe("POST /api/contact", () => {
  it("emails the school, named by course title, with replies going to the visitor", async () => {
    const res = await post(valid);
    expect(res.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const email = sendEmail.mock.calls[0][0];
    expect(email.to).toBe("admin@codeillustrated.com");
    expect(email.replyTo).toEqual({ email: "ada@example.test", name: "Ada Obi" });
    expect(email.subject).toBe("New enquiry from Ada Obi: Game Dev Pro");
    expect(email.paragraphs).toEqual(
      expect.arrayContaining(["Phone: 08012345678", "Does my son need any experience?", "He is 14."])
    );
  });

  it("labels general enquiries", async () => {
    await post({ ...valid, course: "other" });
    expect(sendEmail.mock.calls[0][0].subject).toContain("General inquiry");
  });

  it("rejects an invalid form without sending", async () => {
    const res = await post({ ...valid, email: "not-an-email" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/valid email/);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("pretends to succeed for bots that fill the hidden field", async () => {
    const res = await post({ ...valid, website: "https://spam.test" });
    expect(res.status).toBe(200);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("reports a failure when the email can't be sent", async () => {
    sendEmail.mockResolvedValue(false);
    const res = await post(valid);
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/couldn't send/);
  });
});
