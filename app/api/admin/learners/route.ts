import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

// GET — list all learners with enrollments
export async function GET(req: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;
  const authHeader = req.headers.get("x-admin-secret");
  if (authHeader !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*, enrollments(course_id, progress, status, next_session, enrolled_at)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH — update a learner's enrollment (progress, next_session, notes, status)
export async function PATCH(req: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;
  const authHeader = req.headers.get("x-admin-secret");
  if (authHeader !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { enrollment_id, progress, next_session, notes, status } = await req.json();
  if (!enrollment_id) {
    return NextResponse.json({ error: "enrollment_id is required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const updates: Record<string, unknown> = {};
  if (progress !== undefined) updates.progress = progress;
  if (next_session !== undefined) updates.next_session = next_session;
  if (notes !== undefined) updates.notes = notes;
  if (status !== undefined) updates.status = status;

  const { data, error } = await supabase
    .from("enrollments")
    .update(updates)
    .eq("id", enrollment_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
