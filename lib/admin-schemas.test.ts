import { describe, expect, it } from "vitest";
import {
  attendancePutSchema,
  cohortCreateSchema,
  cohortPatchSchema,
  courseCreateSchema,
  coursePatchSchema,
  firstIssue,
  lessonPatchSchema,
  offeringUpsertSchema,
  newCourseId,
  reorderSchema,
  sessionPatchSchema,
  sessionsCreateSchema,
} from "./admin-schemas";

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("courseCreateSchema", () => {
  it("accepts and normalises a slug", () => {
    expect(courseCreateSchema.parse({ slug: " Junior-Web ", title: "Junior Web" }).slug).toBe("junior-web");
  });

  it("rejects slugs with spaces or trailing dashes", () => {
    expect(courseCreateSchema.safeParse({ slug: "junior web", title: "x" }).success).toBe(false);
    expect(courseCreateSchema.safeParse({ slug: "junior-", title: "x" }).success).toBe(false);
  });
});

describe("lessonPatchSchema blocks", () => {
  const video = { kind: "video", video_url: "https://youtu.be/abcdefg" };

  it("accepts any mix of block kinds, in order", () => {
    const blocks = [{ kind: "text", content: "Hi" }, video, { kind: "file", file_path: "lessons/a.pdf" }, video];
    expect(lessonPatchSchema.parse({ blocks }).blocks?.map((b) => b.kind)).toEqual(["text", "video", "file", "video"]);
  });

  it("accepts an empty list, which clears the lesson", () => {
    expect(lessonPatchSchema.parse({ blocks: [] }).blocks).toEqual([]);
  });

  it("rejects empty text, bad links and unknown kinds", () => {
    expect(lessonPatchSchema.safeParse({ blocks: [{ kind: "text", content: "  " }] }).success).toBe(false);
    expect(lessonPatchSchema.safeParse({ blocks: [{ kind: "video", video_url: "javascript:alert(1)" }] }).success).toBe(false);
    expect(lessonPatchSchema.safeParse({ blocks: [{ kind: "quiz" }] }).success).toBe(false);
  });

  it("no longer accepts the old single-format fields", () => {
    expect(lessonPatchSchema.parse({ title: "T", content: "x", video_url: "https://x.test" })).toEqual({ title: "T" });
  });
});

describe("offeringUpsertSchema yearly prices", () => {
  const base = { kind: "self_paced", price_usd: "10", price_ngn: "15000" };

  it("accepts both or neither", () => {
    expect(offeringUpsertSchema.parse({ ...base, yearly_price_usd: "100", yearly_price_ngn: "150000" }).yearly_price_usd).toBe(100);
    expect(offeringUpsertSchema.parse({ ...base, yearly_price_usd: "", yearly_price_ngn: "" }).yearly_price_usd).toBeNull();
    expect(offeringUpsertSchema.safeParse(base).success).toBe(true);
  });

  it("refuses only one of them, or zero", () => {
    expect(offeringUpsertSchema.safeParse({ ...base, yearly_price_usd: "100", yearly_price_ngn: "" }).success).toBe(false);
    expect(offeringUpsertSchema.safeParse({ ...base, yearly_price_usd: "0", yearly_price_ngn: "0" }).success).toBe(false);
  });
});

describe("newCourseId", () => {
  it("uses the address when no course has that ID yet", () => {
    expect(newCourseId("web-basics", ["junior-web-creator"])).toBe("web-basics");
  });

  it("adds a number when a renamed course still holds that ID", () => {
    expect(newCourseId("web-basics", ["web-basics"])).toBe("web-basics-2");
    expect(newCourseId("web-basics", ["web-basics", "web-basics-2"])).toBe("web-basics-3");
  });
});

describe("coursePatchSchema", () => {
  it("normalises a new address", () => {
    expect(coursePatchSchema.parse({ slug: " Web-Basics " }).slug).toBe("web-basics");
    expect(coursePatchSchema.safeParse({ slug: "web basics" }).success).toBe(false);
  });

  it("turns an empty certificate price into null (free)", () => {
    expect(coursePatchSchema.parse({ certificate_price_usd: "" }).certificate_price_usd).toBeNull();
    expect(coursePatchSchema.parse({ certificate_price_usd: "25" }).certificate_price_usd).toBe(25);
  });

  it("rejects negative prices", () => {
    expect(coursePatchSchema.safeParse({ certificate_price_ngn: "-1" }).success).toBe(false);
  });
});

describe("cohortCreateSchema", () => {
  const base = { course_id: "junior-web-creator", name: "Jan 2027" };

  it("maps empty form fields to null", () => {
    const parsed = cohortCreateSchema.parse({
      ...base,
      starts_on: "",
      capacity: "",
      meeting_url: "",
      instructor_id: "",
    });
    expect(parsed).toMatchObject({ starts_on: null, capacity: null, meeting_url: null, instructor_id: null });
  });

  it("only accepts http(s) meeting links", () => {
    expect(cohortCreateSchema.safeParse({ ...base, meeting_url: "https://meet.google.com/abc" }).success).toBe(true);
    expect(cohortCreateSchema.safeParse({ ...base, meeting_url: "javascript:alert(1)" }).success).toBe(false);
  });

  it("rejects an end date before the start date", () => {
    const result = cohortCreateSchema.safeParse({ ...base, starts_on: "2027-01-10", ends_on: "2027-01-09" });
    expect(result.success).toBe(false);
    if (!result.success) expect(firstIssue(result.error)).toMatch(/^ends_on:/);
  });

  it("rejects a zero capacity", () => {
    expect(cohortCreateSchema.safeParse({ ...base, capacity: "0" }).success).toBe(false);
  });
});

describe("cohortPatchSchema", () => {
  it("does not let the course change", () => {
    expect(cohortPatchSchema.parse({ course_id: "other", name: "x" })).not.toHaveProperty("course_id");
  });
});

describe("sessionsCreateSchema", () => {
  it("requires timestamps with an offset", () => {
    const ok = { starts_at: "2026-11-10T17:00:00.000Z", duration_min: 60 };
    expect(sessionsCreateSchema.safeParse({ sessions: [ok] }).success).toBe(true);
    expect(
      sessionsCreateSchema.safeParse({ sessions: [{ ...ok, starts_at: "2026-11-10T17:00" }] }).success
    ).toBe(false);
  });

  it("rejects an empty list", () => {
    expect(sessionsCreateSchema.safeParse({ sessions: [] }).success).toBe(false);
  });
});

describe("sessionPatchSchema", () => {
  it("clears a recording link with an empty string", () => {
    expect(sessionPatchSchema.parse({ recording_url: "" }).recording_url).toBeNull();
  });
});

describe("reorderSchema", () => {
  it("rejects duplicate ids", () => {
    expect(reorderSchema.safeParse({ kind: "lessons", parent_id: uuid(1), ids: [uuid(2), uuid(2)] }).success).toBe(false);
    expect(reorderSchema.safeParse({ kind: "lessons", parent_id: uuid(1), ids: [uuid(2), uuid(3)] }).success).toBe(true);
  });
});

describe("attendancePutSchema", () => {
  it("accepts a null status to clear a mark", () => {
    expect(attendancePutSchema.safeParse({ records: [{ user_id: uuid(1), status: null }] }).success).toBe(true);
    expect(attendancePutSchema.safeParse({ records: [{ user_id: uuid(1), status: "excused" }] }).success).toBe(false);
  });
});
