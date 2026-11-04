import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { rejectNonAdmin } from "@/lib/supabase-server";
import { coursePatchSchema } from "@/lib/admin-schemas";
import { getAdminCourse, refreshCatalogue } from "@/lib/catalogue-admin";
import { dbErrorResponse, parseBody } from "@/lib/cohorts";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const { id } = await params;
  try {
    const course = await getAdminCourse(createAdminClient(), id);
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
    return NextResponse.json(course);
  } catch (error) {
    return dbErrorResponse(error as { code?: string; message: string });
  }
}

// PATCH — edit details. Changing the slug moves the public page; the old
// address keeps redirecting to it (see the course_slugs migration).
export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = await parseBody(req, coursePatchSchema);
  if (body.response) return body.response;

  const { data, error } = await createAdminClient()
    .from("courses")
    .update({ ...body.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error?.code === "23505") {
    return NextResponse.json({ error: "Another course already uses that address." }, { status: 409 });
  }
  if (error) return dbErrorResponse(error);
  if (!data) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  refreshCatalogue();
  return NextResponse.json(data);
}

// DELETE — only courses nobody is enrolled in and with no cohorts; the
// foreign keys refuse the rest (unpublish those instead).
export async function DELETE(_req: NextRequest, { params }: Params) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const { id } = await params;
  const { error } = await createAdminClient().from("courses").delete().eq("id", id);
  if (error?.code === "23503") {
    return NextResponse.json(
      { error: "This course has enrolments or cohorts, so it can't be deleted. Unpublish it instead." },
      { status: 409 }
    );
  }
  if (error) return dbErrorResponse(error);

  refreshCatalogue();
  return NextResponse.json({ success: true });
}
