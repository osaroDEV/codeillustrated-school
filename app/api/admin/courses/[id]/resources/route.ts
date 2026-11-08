import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { rejectNonAdmin } from "@/lib/supabase-server";
import { resourceCreateSchema } from "@/lib/admin-schemas";
import { dbErrorResponse, parseBody } from "@/lib/cohorts";

type Params = { params: Promise<{ id: string }> };

// POST — add a file or link to the end of a course's resources.
export async function POST(req: NextRequest, { params }: Params) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = await parseBody(req, resourceCreateSchema);
  if (body.response) return body.response;

  const admin = createAdminClient();
  const { data: last } = await admin
    .from("course_resources")
    .select("position")
    .eq("course_id", id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await admin
    .from("course_resources")
    .insert({ ...body.data, course_id: id, position: (last?.position ?? 0) + 1 })
    .select()
    .single();
  if (error) return dbErrorResponse(error);
  return NextResponse.json(data, { status: 201 });
}
