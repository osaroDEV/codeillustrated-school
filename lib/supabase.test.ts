import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdminClient, supabase } from "./supabase";

describe("supabase browser client", () => {
  it("is exported and defined", () => {
    expect(supabase).toBeDefined();
  });
});

describe("createAdminClient", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws when SUPABASE_SERVICE_ROLE_KEY is not set", () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(() => createAdminClient()).toThrow(
      "SUPABASE_SERVICE_ROLE_KEY is not set"
    );
  });

  it("returns a client when SUPABASE_SERVICE_ROLE_KEY is set", () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
    const client = createAdminClient();
    expect(client).toBeDefined();
    expect(typeof client.from).toBe("function");
  });

  it("returns a new client instance on every call", () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
    const first = createAdminClient();
    const second = createAdminClient();
    expect(first).not.toBe(second);
  });
});
