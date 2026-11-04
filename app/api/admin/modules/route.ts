import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { rejectNonAdmin } from "@/lib/supabase-server";
import { moduleCreateSchema } from "@/lib/admin-schemas";
import { refreshCatalogue } from "@/lib/catalogue-admin";
import { dbErrorResponse, parseBody } from "@/lib/cohorts";

// POST — add a module at the end of a course
export async function POST(req: NextRequest) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const body = await parseBody(req, moduleCreateSchema);
  if (body.response) return body.response;

  const supabase = createAdminClient();
  const { data: last } = await supabase
    .from("course_modules")
    .select("position")
    .eq("course_id", body.data.course_id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("course_modules")
    .insert({ ...body.data, position: (last?.position ?? 0) + 1 })
    .select()
    .single();
  if (error) return dbErrorResponse(error);

  refreshCatalogue();
  return NextResponse.json({ ...data, lessons: [] }, { status: 201 });
}
