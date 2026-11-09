import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { requireStaffApi } from "@/lib/supabase-server";
import { gradeSchema } from "@/lib/admin-schemas";
import { loadSubmissionForStaff } from "@/lib/assessments-server";
import { dbErrorResponse, parseBody } from "@/lib/cohorts";

type Params = { params: Promise<{ id: string }> };

// PATCH — grade a submission. Instructors are limited to learners they teach.
export async function PATCH(req: NextRequest, { params }: Params) {
  const staff = await requireStaffApi();
  if (staff.response) return staff.response;

  const { id } = await params;
  const body = await parseBody(req, gradeSchema);
  if (body.response) return body.response;

  const admin = createAdminClient();
  const submission = await loadSubmissionForStaff(admin, staff, id);
  if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

  const { error } = await admin
    .from("assignment_submissions")
    .update({ ...body.data, graded_by: staff.user.id, graded_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return dbErrorResponse(error);
  return NextResponse.json({ success: true });
}
