import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";
import { canManageCohort, dbErrorResponse } from "./cohorts";

const user = (id: string) => ({ id }) as User;

describe("canManageCohort", () => {
  it("lets admins manage any cohort", () => {
    expect(canManageCohort({ user: user("a"), role: "admin" }, { instructor_id: "someone-else" })).toBe(true);
  });

  it("lets instructors manage only their own cohorts", () => {
    expect(canManageCohort({ user: user("i"), role: "instructor" }, { instructor_id: "i" })).toBe(true);
    expect(canManageCohort({ user: user("i"), role: "instructor" }, { instructor_id: "j" })).toBe(false);
    expect(canManageCohort({ user: user("i"), role: "instructor" }, { instructor_id: null })).toBe(false);
  });
});

describe("dbErrorResponse", () => {
  it.each([
    ["CI001", 409, /different course/],
    ["CI002", 409, /full/],
    ["CI003", 409, /Reload/],
    ["23503", 409, /in use/],
    ["22P02", 400, /Invalid ID/],
  ])("maps %s to %i", async (code, status, message) => {
    const res = dbErrorResponse({ code, message: "raw" });
    expect(res.status).toBe(status);
    expect((await res.json()).error).toMatch(message);
  });
});
