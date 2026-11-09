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

  const { blocks, ...fields } = body.data;
  const admin = createAdminClient();
  const query = admin.from("lessons");
  const { data, error } = await (Object.keys(fields).length > 0 ? query.update(fields) : query.select())
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) return dbErrorResponse(error);
  if (!data) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  if (blocks) {
    const { data: unused, error: blocksError } = await admin.rpc("replace_lesson_blocks", {
      p_lesson_id: id,
      p_blocks: blocks,
    });
    if (blocksError) return dbErrorResponse(blocksError);
    await removeCourseFile(admin, unused as string[] | null);
  }

  refreshCatalogue();
  return NextResponse.json(data);
}

// DELETE — sessions that taught this lesson keep their slot (lesson_id is set to null)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const { id } = await params;
  const admin = createAdminClient();
  const { data: files } = await admin.from("lesson_blocks").select("file_path").eq("lesson_id", id).not("file_path", "is", null);
  const { error } = await admin.from("lessons").delete().eq("id", id);
  if (error) return dbErrorResponse(error);
  await removeCourseFile(admin, (files ?? []).map((f) => f.file_path as string));

  refreshCatalogue();
  return NextResponse.json({ success: true });
}
