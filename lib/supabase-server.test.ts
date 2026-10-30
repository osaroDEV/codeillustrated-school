import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], set: () => {} }) }));

import { isEmailVerified } from "./supabase-server";

describe("isEmailVerified", () => {
  it("is true once the email has been confirmed by link", () => {
    expect(isEmailVerified({ email_confirmed_at: "2026-10-29T00:00:00Z" })).toBe(true);
  });

  it("is false for accounts that never clicked a verification link", () => {
    expect(isEmailVerified({ email_confirmed_at: undefined })).toBe(false);
  });
});
