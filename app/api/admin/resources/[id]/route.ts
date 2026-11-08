import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { rejectNonAdmin } from "@/lib/supabase-server";
import { dbErrorResponse } from "@/lib/cohorts";
import { removeCourseFile } from "@/lib/lessons";

type Params = { params: Promise<{ id: string }> };

// DELETE — remove a resource and its stored file.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const { id } = await params;
  const admin = createAdminClient();
  const { data, error } = await admin.from("course_resources").delete().eq("id", id).select("file_path").maybeSingle();
  if (error) return dbErrorResponse(error);
  if (!data) return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  await removeCourseFile(admin, data.file_path);
  return NextResponse.json({ success: true });
}
