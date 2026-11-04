import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { rejectNonAdmin } from "@/lib/supabase-server";
import { sessionsCreateSchema } from "@/lib/admin-schemas";
import { dbErrorResponse, parseBody } from "@/lib/cohorts";

type Params = { params: Promise<{ id: string }> };

// POST — add one or more sessions. The admin UI expands a weekly schedule
// into explicit start times in the browser (lib/schedule.ts), so this route
// only ever stores concrete timestamps.
export async function POST(req: NextRequest, { params }: Params) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = await parseBody(req, sessionsCreateSchema);
  if (body.response) return body.response;

  const supabase = createAdminClient();
  const { data: cohort } = await supabase.from("cohorts").select("id").eq("id", id).maybeSingle();
  if (!cohort) return NextResponse.json({ error: "Cohort not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("class_sessions")
    .insert(body.data.sessions.map((s) => ({ ...s, cohort_id: id })))
    .select();
  if (error) return dbErrorResponse(error);
  return NextResponse.json(data, { status: 201 });
}
