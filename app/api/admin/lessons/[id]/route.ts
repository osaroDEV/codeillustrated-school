import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { rejectNonAdmin } from "@/lib/supabase-server";
import { lessonPatchSchema } from "@/lib/admin-schemas";
import { refreshCatalogue } from "@/lib/catalogue-admin";
import { dbErrorResponse, parseBody } from "@/lib/cohorts";
import { removeCourseFile } from "@/lib/lessons";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = await parseBody(req, lessonPatchSchema);
  if (body.response) return body.response;

  const admin = createAdminClient();
  const { data: before } = await admin.from("lessons").select("file_path").eq("id", id).maybeSingle();
  const { data, error } = await admin
    .from("lessons")
    .update(body.data)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) return dbErrorResponse(error);
  if (!data) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  if (before?.file_path && before.file_path !== data.file_path) await removeCourseFile(admin, before.file_path);

  refreshCatalogue();
  return NextResponse.json(data);
}

// DELETE — sessions that taught this lesson keep their slot (lesson_id is set to null)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const { id } = await params;
  const admin = createAdminClient();
  const { data, error } = await admin.from("lessons").delete().eq("id", id).select("file_path").maybeSingle();
  if (error) return dbErrorResponse(error);
  await removeCourseFile(admin, data?.file_path);

  refreshCatalogue();
  return NextResponse.json({ success: true });
}
