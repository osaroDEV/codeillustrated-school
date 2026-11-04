import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { rejectNonAdmin } from "@/lib/supabase-server";
import { lessonCreateSchema } from "@/lib/admin-schemas";
import { refreshCatalogue } from "@/lib/catalogue-admin";
import { dbErrorResponse, parseBody } from "@/lib/cohorts";

// POST — add a lesson at the end of a module
export async function POST(req: NextRequest) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const body = await parseBody(req, lessonCreateSchema);
  if (body.response) return body.response;

  const supabase = createAdminClient();
  const { data: last } = await supabase
    .from("lessons")
    .select("position")
    .eq("module_id", body.data.module_id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("lessons")
    .insert({ ...body.data, position: (last?.position ?? 0) + 1 })
    .select()
    .single();
  if (error) return dbErrorResponse(error);

  refreshCatalogue();
  return NextResponse.json(data, { status: 201 });
}
