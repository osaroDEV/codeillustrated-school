import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { rejectNonAdmin } from "@/lib/supabase-server";
import { memberSchema } from "@/lib/admin-schemas";
import { dbErrorResponse, parseBody } from "@/lib/cohorts";

type Params = { params: Promise<{ id: string }> };

// POST — place an enrolled learner in this cohort. The database checks that
// the cohort is for the same course and has a free seat.
export async function POST(req: NextRequest, { params }: Params) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = await parseBody(req, memberSchema);
  if (body.response) return body.response;

  const { data, error } = await createAdminClient()
    .from("enrollments")
    .update({ cohort_id: id })
    .eq("id", body.data.enrollment_id)
    .select()
    .maybeSingle();
  if (error) return dbErrorResponse(error);
  if (!data) return NextResponse.json({ error: "Enrolment not found" }, { status: 404 });
  return NextResponse.json(data);
}

// DELETE — take a learner out of this cohort; they stay enrolled in the course
export async function DELETE(req: NextRequest, { params }: Params) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = await parseBody(req, memberSchema);
  if (body.response) return body.response;

  const { error } = await createAdminClient()
    .from("enrollments")
    .update({ cohort_id: null })
    .eq("id", body.data.enrollment_id)
    .eq("cohort_id", id);
  if (error) return dbErrorResponse(error);
  return NextResponse.json({ success: true });
}
