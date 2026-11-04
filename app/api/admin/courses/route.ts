import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { rejectNonAdmin } from "@/lib/supabase-server";
import { courseCreateSchema } from "@/lib/admin-schemas";
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

// POST — create an unpublished course at the end of the list
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

  const { data, error } = await supabase
    .from("courses")
    .insert({ ...body.data, position: (last?.position ?? 0) + 1, is_published: false })
    .select()
    .single();
  if (error?.code === "23505") {
    return NextResponse.json({ error: "A course with that ID already exists." }, { status: 409 });
  }
  if (error) return dbErrorResponse(error);

  refreshCatalogue();
  return NextResponse.json(data, { status: 201 });
}
