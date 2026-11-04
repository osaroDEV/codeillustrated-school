import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { rejectNonAdmin } from "@/lib/supabase-server";
import { courseCreateSchema, newCourseId } from "@/lib/admin-schemas";
import { listAdminCourses, refreshCatalogue } from "@/lib/catalogue-admin";
import { dbErrorResponse, parseBody } from "@/lib/cohorts";

// GET — every course, published or not, with modules, lessons and offerings
export async function GET() {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  try {
    return NextResponse.json(await listAdminCourses(createAdminClient()));
  } catch (error) {
    return dbErrorResponse(error as { code?: string; message: string });
  }
}

// POST — create an unpublished course at the end of the list. Its internal ID
// is fixed now; the address (slug) can be changed later in the editor.
export async function POST(req: NextRequest) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const body = await parseBody(req, courseCreateSchema);
  if (body.response) return body.response;

  const supabase = createAdminClient();
  const { data: last } = await supabase
    .from("courses")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { slug, title } = body.data;
  const { data: similar } = await supabase.from("courses").select("id").like("id", `${slug}%`);
  const id = newCourseId(slug, (similar ?? []).map((c) => c.id as string));

  const { data, error } = await supabase
    .from("courses")
    .insert({ id, slug, title, position: (last?.position ?? 0) + 1, is_published: false })
    .select()
    .single();
  if (error?.code === "23505") {
    return NextResponse.json({ error: "Another course already uses that address." }, { status: 409 });
  }
  if (error) return dbErrorResponse(error);

  refreshCatalogue();
  return NextResponse.json(data, { status: 201 });
}
