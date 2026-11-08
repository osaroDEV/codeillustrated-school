import { describe, expect, it } from "vitest";
import { canTrackProgress, canViewLesson, lessonAccess, storagePath, storedFileName, videoEmbedUrl } from "./lesson-access";

const now = new Date("2026-11-10T12:00:00Z");
const base = { isStaff: false, enrollment: null, subscription: null, isPreview: false, now };
const seat = { status: "active", source: "manual" };
const paidSeat = { status: "active", source: "subscription" };

describe("lessonAccess", () => {
  it("lets staff in regardless of enrolment", () => {
    expect(lessonAccess({ ...base, isStaff: true })).toBe("staff");
  });

  it("gives a current seat full access", () => {
    expect(lessonAccess({ ...base, enrollment: seat })).toBe("enrolled");
    expect(lessonAccess({ ...base, enrollment: { status: "completed", source: "code" } })).toBe("enrolled");
    expect(
      lessonAccess({ ...base, enrollment: paidSeat, subscription: { status: "active", current_period_end: "2026-12-01T00:00:00Z" } })
    ).toBe("enrolled");
  });

  it("locks a paused seat or a lapsed subscription", () => {
    expect(lessonAccess({ ...base, enrollment: { status: "paused", source: "manual" } })).toBe("lapsed");
    expect(
      lessonAccess({ ...base, enrollment: paidSeat, subscription: { status: "expired", current_period_end: "2026-12-01T00:00:00Z" } })
    ).toBe("lapsed");
    expect(
      lessonAccess({ ...base, enrollment: paidSeat, subscription: { status: "past_due", current_period_end: "2026-11-01T00:00:00Z" } })
    ).toBe("lapsed");
  });

  it("keeps the 3-day grace period after a missed payment", () => {
    expect(
      lessonAccess({ ...base, enrollment: paidSeat, subscription: { status: "past_due", current_period_end: "2026-11-09T00:00:00Z" } })
    ).toBe("enrolled");
  });

  it("opens previews to anyone signed in, without tracking progress", () => {
    expect(lessonAccess({ ...base, isPreview: true })).toBe("preview");
    expect(lessonAccess({ ...base, enrollment: { status: "paused" }, isPreview: true })).toBe("preview");
    expect(canViewLesson("preview")).toBe(true);
    expect(canTrackProgress("preview")).toBe(false);
  });

  it("refuses everyone else", () => {
    expect(lessonAccess(base)).toBe("none");
    expect(canViewLesson("none")).toBe(false);
    expect(canViewLesson("lapsed")).toBe(false);
  });

  it("only tracks learners with a seat", () => {
    expect(canTrackProgress("enrolled")).toBe(true);
    expect(canTrackProgress("staff")).toBe(false);
  });
});

describe("videoEmbedUrl", () => {
  const yt = "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ";
  it.each([
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30",
    "https://youtu.be/dQw4w9WgXcQ",
    "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
  ])("embeds %s", (link) => {
    expect(videoEmbedUrl(link)).toBe(yt);
  });

  it("embeds Vimeo, keeping an unlisted video's hash", () => {
    expect(videoEmbedUrl("https://vimeo.com/123456")).toBe("https://player.vimeo.com/video/123456");
    expect(videoEmbedUrl("https://vimeo.com/123456/abc123")).toBe("https://player.vimeo.com/video/123456?h=abc123");
    expect(videoEmbedUrl("https://player.vimeo.com/video/123456?h=abc123")).toBe("https://player.vimeo.com/video/123456?h=abc123");
  });

  it.each([
    "https://example.com/video.mp4",
    "https://evil.test/youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=<script>",
    "javascript:alert(1)",
    "not a url",
  ])("won't embed %s", (link) => {
    expect(videoEmbedUrl(link)).toBeNull();
  });
});

describe("storage paths", () => {
  it("tidies names and can show them again", () => {
    const path = storagePath("lessons", "Week 1 / Notes (final).pdf", "a1b2c3d4e5f6");
    expect(path).toBe("lessons/a1b2c3d4e5f6-Week-1-Notes-final-.pdf");
    expect(storedFileName(path)).toBe("Week-1-Notes-final-.pdf");
  });

  it("can't escape its folder", () => {
    const path = storagePath("resources", "../../secret.txt", "a1b2c3d4e5f6");
    expect(path.split("/")).toHaveLength(2);
    expect(path).not.toContain("..");
  });

  it("survives a name with nothing usable", () => {
    expect(storagePath("lessons", "///", "a1b2c3d4e5f6")).toBe("lessons/a1b2c3d4e5f6-file");
  });
});
