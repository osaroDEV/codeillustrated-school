import { describe, expect, it } from "vitest";
import {
  fromDatetimeLocal,
  generateWeeklySessions,
  joinState,
  MAX_GENERATED_SESSIONS,
  nextSession,
  nextSessionAt,
  sessionEnd,
  toDatetimeLocal,
} from "./schedule";

const session = (starts_at: string, duration_min = 60) => ({ starts_at, duration_min });

describe("joinState", () => {
  const s = session("2026-11-10T17:00:00Z");

  it("is upcoming until 15 minutes before the start", () => {
    expect(joinState(s, new Date("2026-11-10T16:44:59Z"))).toBe("upcoming");
  });

  it("opens 15 minutes before the start", () => {
    expect(joinState(s, new Date("2026-11-10T16:45:00Z"))).toBe("open");
  });

  it("stays open until the session ends", () => {
    expect(joinState(s, new Date("2026-11-10T17:59:59Z"))).toBe("open");
    expect(joinState(s, new Date("2026-11-10T18:00:00Z"))).toBe("ended");
  });
});

describe("sessionEnd", () => {
  it("adds the duration", () => {
    expect(sessionEnd(session("2026-11-10T17:00:00Z", 90)).toISOString()).toBe("2026-11-10T18:30:00.000Z");
  });
});

describe("nextSession", () => {
  const sessions = [
    session("2026-11-12T17:00:00Z"),
    session("2026-11-05T17:00:00Z"),
    session("2026-11-10T17:00:00Z"),
  ];

  it("returns the earliest session that hasn't ended", () => {
    expect(nextSession(sessions, new Date("2026-11-06T00:00:00Z"))?.starts_at).toBe("2026-11-10T17:00:00Z");
  });

  it("includes a session that is in progress", () => {
    expect(nextSession(sessions, new Date("2026-11-10T17:30:00Z"))?.starts_at).toBe("2026-11-10T17:00:00Z");
  });

  it("returns null when every session is over", () => {
    expect(nextSession(sessions, new Date("2026-12-01T00:00:00Z"))).toBeNull();
  });
});

describe("generateWeeklySessions", () => {
  it("creates sessions on the chosen weekdays at the local time", () => {
    // 2026-11-03 is a Tuesday. Tuesdays and Thursdays at 17:30.
    const dates = generateWeeklySessions({ startDate: "2026-11-03", time: "17:30", weekdays: [2, 4], count: 4 });
    expect(dates.map((d) => [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getDay()])).toEqual([
      [2026, 11, 3, 2],
      [2026, 11, 5, 4],
      [2026, 11, 10, 2],
      [2026, 11, 12, 4],
    ]);
    expect(dates.every((d) => d.getHours() === 17 && d.getMinutes() === 30)).toBe(true);
  });

  it("skips to the first matching weekday after the start date", () => {
    const [first] = generateWeeklySessions({ startDate: "2026-11-03", time: "09:00", weekdays: [6], count: 1 });
    expect(first.getDate()).toBe(7);
  });

  it("keeps the local time of day across a DST change", () => {
    // Spans the end of DST in Europe (25 Oct) and the US (1 Nov) in 2026.
    const dates = generateWeeklySessions({ startDate: "2026-10-20", time: "17:00", weekdays: [2], count: 3 });
    expect(dates.map((d) => d.getHours())).toEqual([17, 17, 17]);
  });

  it("caps the number of sessions", () => {
    const dates = generateWeeklySessions({ startDate: "2026-11-03", time: "09:00", weekdays: [1], count: 10_000 });
    expect(dates).toHaveLength(MAX_GENERATED_SESSIONS);
  });

  it("returns nothing for invalid input", () => {
    expect(generateWeeklySessions({ startDate: "03/11/2026", time: "09:00", weekdays: [1], count: 3 })).toEqual([]);
    expect(generateWeeklySessions({ startDate: "2026-11-03", time: "9am", weekdays: [1], count: 3 })).toEqual([]);
    expect(generateWeeklySessions({ startDate: "2026-11-03", time: "09:00", weekdays: [], count: 3 })).toEqual([]);
    expect(generateWeeklySessions({ startDate: "2026-11-03", time: "09:00", weekdays: [9], count: 3 })).toEqual([]);
    expect(generateWeeklySessions({ startDate: "2026-11-03", time: "09:00", weekdays: [1], count: 0 })).toEqual([]);
  });
});

describe("nextSessionAt", () => {
  const now = new Date("2026-11-06T00:00:00Z");
  const sessions = [
    { cohort_id: "a", starts_at: "2026-11-10T17:00:00Z", duration_min: 60 },
    { cohort_id: "b", starts_at: "2026-11-08T17:00:00Z", duration_min: 60 },
    { cohort_id: "a", starts_at: "2026-11-05T17:00:00Z", duration_min: 60 },
  ];

  it("uses the enrolment's own cohort", () => {
    expect(nextSessionAt({ cohort_id: "a", next_session: "2026-12-01T00:00:00Z" }, sessions, now)).toBe(
      "2026-11-10T17:00:00Z"
    );
  });

  it("is null for a cohort with nothing scheduled, ignoring the legacy field", () => {
    expect(nextSessionAt({ cohort_id: "c", next_session: "2026-12-01T00:00:00Z" }, sessions, now)).toBeNull();
  });

  it("falls back to the legacy field without a cohort", () => {
    expect(nextSessionAt({ cohort_id: null, next_session: "2026-12-01T00:00:00Z" }, sessions, now)).toBe(
      "2026-12-01T00:00:00Z"
    );
  });
});

describe("datetime-local conversion", () => {
  it("round-trips through local time", () => {
    const iso = "2026-11-10T17:30:00.000Z";
    expect(fromDatetimeLocal(toDatetimeLocal(iso))).toBe(iso);
  });

  it("formats with the local calendar fields", () => {
    const d = new Date(2026, 10, 3, 9, 5);
    expect(toDatetimeLocal(d.toISOString())).toBe("2026-11-03T09:05");
  });

  it("maps empty and invalid values to empty/null", () => {
    expect(toDatetimeLocal(null)).toBe("");
    expect(toDatetimeLocal("not a date")).toBe("");
    expect(fromDatetimeLocal("")).toBeNull();
    expect(fromDatetimeLocal("garbage")).toBeNull();
  });
});
