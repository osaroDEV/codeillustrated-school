import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { rejectNonAdmin } from "@/lib/supabase-server";
import { cohortPatchSchema } from "@/lib/admin-schemas";
import { checkInstructor, dbErrorResponse, parseBody } from "@/lib/cohorts";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = await parseBody(req, cohortPatchSchema);
  if (body.response) return body.response;

  const supabase = createAdminClient();
  const instructorError = await checkInstructor(supabase, body.data.instructor_id);
  if (instructorError) return instructorError;

  // Lowering capacity below the current headcount is allowed (nobody is
  // removed); the trigger only stops new placements.
  const { data, error } = await supabase.from("cohorts").update(body.data).eq("id", id).select().maybeSingle();
  if (error) return dbErrorResponse(error);
  if (!data) return NextResponse.json({ error: "Cohort not found" }, { status: 404 });
  return NextResponse.json(data);
}

// DELETE — only empty cohorts. Deleting removes its sessions and attendance,
// so a cohort that has run should be marked finished instead.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const { id } = await params;
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("cohort_id", id);
  if (count) {
    return NextResponse.json(
      { error: "This cohort still has learners. Remove them first, or mark the cohort finished." },
      { status: 409 }
    );
  }

  const { error } = await supabase.from("cohorts").delete().eq("id", id);
  if (error) return dbErrorResponse(error);
  return NextResponse.json({ success: true });
}
