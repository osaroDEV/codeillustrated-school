import type { createAdminClient } from "./supabase";

// Invite codes now serve as scholarship / comp codes: redeeming one enrolls
// the holder in the code's course without payment. Used at signup and from
// the dashboard's "Redeem code" card.

type AdminClient = ReturnType<typeof createAdminClient>;

export interface InviteRow {
  id: string;
  course_id: string;
  used_by: string | null;
  expires_at: string | null;
}

export type InviteResult =
  | { ok: true; courseId: string }
  | { ok: false; status: number; error: string };

export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}

// Pure check, separated out for testing. A null expires_at never expires.
export function checkInvite(
  invite: InviteRow | null,
  now: Date = new Date()
): { status: number; error: string } | null {
  if (!invite) return { status: 404, error: "This invite code does not exist." };
  if (invite.used_by) return { status: 409, error: "This invite code has already been used." };
  if (invite.expires_at && new Date(invite.expires_at) < now) {
    return { status: 410, error: "This invite code has expired." };
  }
  return null;
}

export async function findUsableInvite(
  admin: AdminClient,
  code: string
): Promise<{ ok: true; invite: InviteRow } | { ok: false; status: number; error: string }> {
  const { data } = await admin
    .from("invite_codes")
    .select("id, course_id, used_by, expires_at")
    .eq("code", normalizeInviteCode(code))
    .maybeSingle();

  const problem = checkInvite(data);
  if (problem) return { ok: false, ...problem };
  return { ok: true, invite: data as InviteRow };
}

// Claims the code for userId and enrolls them in its course. The claim is a
// conditional update (used_by is null), so two concurrent redemptions of the
// same code can't both succeed.
export async function redeemInvite(
  admin: AdminClient,
  code: string,
  userId: string
): Promise<InviteResult> {
  const found = await findUsableInvite(admin, code);
  if (!found.ok) return found;
  const { invite } = found;

  const { data: existing } = await admin
    .from("enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", invite.course_id)
    .limit(1);
  if (existing && existing.length > 0) {
    return { ok: false, status: 409, error: "You're already enrolled in this course." };
  }

  const { data: claimed, error: claimError } = await admin
    .from("invite_codes")
    .update({ used_by: userId, used_at: new Date().toISOString() })
    .eq("id", invite.id)
    .is("used_by", null)
    .select("id");
  if (claimError) {
    console.error("Invite claim error:", claimError);
    return { ok: false, status: 500, error: "Failed to redeem invite code." };
  }
  if (!claimed || claimed.length === 0) {
    return { ok: false, status: 409, error: "This invite code has already been used." };
  }

  const { error: enrollError } = await admin
    .from("enrollments")
    .insert({ user_id: userId, course_id: invite.course_id, source: "code" });
  if (enrollError) {
    // Release the code so it isn't burned by a failed enrollment.
    await admin
      .from("invite_codes")
      .update({ used_by: null, used_at: null })
      .eq("id", invite.id);
    // 23505 = unique_violation: a concurrent request enrolled them first.
    if (enrollError.code === "23505") {
      return { ok: false, status: 409, error: "You're already enrolled in this course." };
    }
    console.error("Enrollment error:", enrollError);
    return { ok: false, status: 500, error: "Failed to enroll you in the course." };
  }

  return { ok: true, courseId: invite.course_id };
}
