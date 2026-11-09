import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { rejectNonAdmin } from "@/lib/supabase-server";
import { listAllAuthUsers } from "@/lib/auth-admin";

// GET — list all learners with enrollments and email-verification status
export async function GET() {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const supabase = createAdminClient();
  const [{ data, error }, users] = await Promise.all([
    supabase
      .from("profiles")
      .select("*, enrollments(id, course_id, progress, status, next_session, enrolled_at, cohort_id, source, cohorts(name))")
      .order("created_at", { ascending: false }),
    listAllAuthUsers(supabase).catch(() => null),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Verification lives on auth.users, not profiles. null = couldn't check.
  const verified = new Map(users?.map((u) => [u.id, !!u.email_confirmed_at]));
  return NextResponse.json(
    (data ?? []).map((p) => ({ ...p, email_verified: users ? verified.get(p.id) ?? false : null }))
  );
}

// POST — manually enroll a learner in a course
export async function POST(req: NextRequest) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const { user_id, course_id } = await req.json();
  if (!user_id || !course_id) {
    return NextResponse.json({ error: "user_id and course_id are required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("enrollments")
    .insert({ user_id, course_id })
    .select()
    .single();

  // 23505 = unique_violation on enrollments_user_course_key
  if (error?.code === "23505") {
    return NextResponse.json({ error: "This learner is already enrolled in that course." }, { status: 409 });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// DELETE — remove an enrollment
export async function DELETE(req: NextRequest) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const { enrollment_id } = await req.json();
  if (!enrollment_id) {
    return NextResponse.json({ error: "enrollment_id is required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("enrollments").delete().eq("id", enrollment_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// PATCH — update a learner's enrollment (next_session, notes, status).
// Progress is calculated in the database from lessons and attendance.
export async function PATCH(req: NextRequest) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const { enrollment_id, next_session, notes, status } = await req.json();
  if (!enrollment_id) {
    return NextResponse.json({ error: "enrollment_id is required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const updates: Record<string, unknown> = {};
  if (next_session !== undefined) updates.next_session = next_session;
  if (notes !== undefined) updates.notes = notes;
  if (status !== undefined) {
    updates.status = status;
    updates.completed_at = status === "completed" ? new Date().toISOString() : null;
  }

  const { data, error } = await supabase
    .from("enrollments")
    .update(updates)
    .eq("id", enrollment_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
