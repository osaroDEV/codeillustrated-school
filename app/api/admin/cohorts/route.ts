import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { rejectNonAdmin } from "@/lib/supabase-server";
import { cohortCreateSchema } from "@/lib/admin-schemas";
import { checkInstructor, dbErrorResponse, parseBody } from "@/lib/cohorts";

// POST — create a cohort (admins only; instructors are assigned to one)
export async function POST(req: NextRequest) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const body = await parseBody(req, cohortCreateSchema);
  if (body.response) return body.response;

  const supabase = createAdminClient();
  const instructorError = await checkInstructor(supabase, body.data.instructor_id);
  if (instructorError) return instructorError;

  const { data, error } = await supabase.from("cohorts").insert(body.data).select().single();
  if (error) return dbErrorResponse(error);
  return NextResponse.json(data, { status: 201 });
}
