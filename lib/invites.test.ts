import { describe, expect, it } from "vitest";
import { checkInvite, normalizeInviteCode, type InviteRow } from "./invites";

const invite = (overrides: Partial<InviteRow> = {}): InviteRow => ({
  id: "inv-1",
  course_id: "junior-web-creator",
  used_by: null,
  expires_at: null,
  ...overrides,
});

describe("normalizeInviteCode", () => {
  it("trims and upper-cases", () => {
    expect(normalizeInviteCode("  cilearn-ab12cd ")).toBe("CILEARN-AB12CD");
  });
});

describe("checkInvite", () => {
  const now = new Date("2026-10-29T12:00:00Z");

  it("rejects a missing code with 404", () => {
    expect(checkInvite(null, now)?.status).toBe(404);
  });

  it("rejects a used code with 409", () => {
    expect(checkInvite(invite({ used_by: "user-1" }), now)?.status).toBe(409);
  });

  it("rejects an expired code with 410", () => {
    expect(checkInvite(invite({ expires_at: "2026-10-28T00:00:00Z" }), now)?.status).toBe(410);
  });

  it("accepts a code with a future expiry", () => {
    expect(checkInvite(invite({ expires_at: "2026-11-30T00:00:00Z" }), now)).toBeNull();
  });

  it("treats a null expiry as never expiring", () => {
    expect(checkInvite(invite({ expires_at: null }), new Date("2099-01-01"))).toBeNull();
  });
});

// Minimal stand-in for the Supabase query builder: every chain method returns
// the builder, and awaiting it resolves to the result configured per call.
function fakeAdmin(results: {
  invite: { data: InviteRow | null };
  existing?: { data: { id: string }[] };
  claim?: { data: { id: string }[] | null; error: null | { message: string } };
  insert?: { error: null | { code: string; message: string } };
}) {
  const calls: string[] = [];
  const from = (table: string) => {
    let op = "select";
    const result = () => {
      if (table === "enrollments") return op === "insert" ? results.insert : results.existing ?? { data: [] };
      if (op === "claim") return results.claim;
      return { data: null, error: null };
    };
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: () => builder,
      is: () => builder,
      limit: () => builder,
      update: (values: { used_by: string | null }) => {
        op = values.used_by === null ? "release" : "claim";
        calls.push(`${table}:${op}`);
        return builder;
      },
      insert: () => {
        op = "insert";
        calls.push(`${table}:insert`);
        return builder;
      },
      maybeSingle: async () => results.invite,
      then: (resolve: (value: unknown) => unknown) => resolve(result()),
    };
    return builder;
  };
  return { admin: { from } as never, calls };
}

describe("redeemInvite", () => {
  it("enrolls the learner and claims the code", async () => {
    const { redeemInvite } = await import("./invites");
    const { admin, calls } = fakeAdmin({
      invite: { data: invite() },
      claim: { data: [{ id: "inv-1" }], error: null },
      insert: { error: null },
    });
    expect(await redeemInvite(admin, "cilearn-x", "user-1")).toEqual({
      ok: true,
      courseId: "junior-web-creator",
    });
    expect(calls).toEqual(["invite_codes:claim", "enrollments:insert"]);
  });

  it("refuses without claiming when the learner is already enrolled", async () => {
    const { redeemInvite } = await import("./invites");
    const { admin, calls } = fakeAdmin({
      invite: { data: invite() },
      existing: { data: [{ id: "enr-1" }] },
    });
    const result = await redeemInvite(admin, "cilearn-x", "user-1");
    expect(result).toMatchObject({ ok: false, status: 409 });
    expect(calls).toEqual([]);
  });

  it("releases the code and reports 409 when the unique constraint fires", async () => {
    const { redeemInvite } = await import("./invites");
    const { admin, calls } = fakeAdmin({
      invite: { data: invite() },
      claim: { data: [{ id: "inv-1" }], error: null },
      insert: { error: { code: "23505", message: "duplicate key value" } },
    });
    const result = await redeemInvite(admin, "cilearn-x", "user-1");
    expect(result).toMatchObject({ ok: false, status: 409 });
    expect(calls).toEqual(["invite_codes:claim", "enrollments:insert", "invite_codes:release"]);
  });

  it("reports 409 when another request claimed the code first", async () => {
    const { redeemInvite } = await import("./invites");
    const { admin, calls } = fakeAdmin({
      invite: { data: invite() },
      claim: { data: [], error: null },
    });
    const result = await redeemInvite(admin, "cilearn-x", "user-1");
    expect(result).toMatchObject({ ok: false, status: 409, error: "This invite code has already been used." });
    expect(calls).toEqual(["invite_codes:claim"]);
  });
});
