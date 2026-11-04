import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { requireStaffApi } from "@/lib/supabase-server";
import { attendancePutSchema } from "@/lib/admin-schemas";
import { dbErrorResponse, loadSessionForStaff, parseBody } from "@/lib/cohorts";

type Params = { params: Promise<{ id: string }> };

// PUT — mark attendance for learners in the session's cohort. A null status
// clears the mark.
export async function PUT(req: NextRequest, { params }: Params) {
  const staff = await requireStaffApi();
  if (staff.response) return staff.response;

  const { id } = await params;
  const body = await parseBody(req, attendancePutSchema);
  if (body.response) return body.response;

  const supabase = createAdminClient();
  const found = await loadSessionForStaff(supabase, staff, id);
  if (!found) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  // Only learners currently in this cohort can be marked.
  const { data: members } = await supabase
    .from("enrollments")
    .select("user_id")
    .eq("cohort_id", found.cohort.id);
  const memberIds = new Set((members ?? []).map((m) => m.user_id as string));
  const strangers = body.data.records.filter((r) => !memberIds.has(r.user_id));
  if (strangers.length) {
    return NextResponse.json({ error: "Some of those learners aren't in this cohort." }, { status: 400 });
  }

  const marks = body.data.records.filter((r) => r.status !== null);
  const clears = body.data.records.filter((r) => r.status === null).map((r) => r.user_id);
  const now = new Date().toISOString();

  if (marks.length) {
    const { error } = await supabase.from("attendance").upsert(
      marks.map((r) => ({ session_id: id, user_id: r.user_id, status: r.status, marked_by: staff.user.id, marked_at: now })),
      { onConflict: "session_id,user_id" }
    );
    if (error) return dbErrorResponse(error);
  }
  if (clears.length) {
    const { error } = await supabase.from("attendance").delete().eq("session_id", id).in("user_id", clears);
    if (error) return dbErrorResponse(error);
  }

  return NextResponse.json({ success: true });
}
