import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { rejectNonAdmin } from "@/lib/supabase-server";
import { lessonPatchSchema } from "@/lib/admin-schemas";
import { refreshCatalogue } from "@/lib/catalogue-admin";
import { dbErrorResponse, parseBody } from "@/lib/cohorts";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = await parseBody(req, lessonPatchSchema);
  if (body.response) return body.response;

  const { data, error } = await createAdminClient()
    .from("lessons")
    .update(body.data)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) return dbErrorResponse(error);
  if (!data) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  refreshCatalogue();
  return NextResponse.json(data);
}

// DELETE — sessions that taught this lesson keep their slot (lesson_id is set to null)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const { id } = await params;
  const { error } = await createAdminClient().from("lessons").delete().eq("id", id);
  if (error) return dbErrorResponse(error);

  refreshCatalogue();
  return NextResponse.json({ success: true });
}
