import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { rejectNonAdmin } from "@/lib/supabase-server";
import { modulePatchSchema } from "@/lib/admin-schemas";
import { refreshCatalogue } from "@/lib/catalogue-admin";
import { dbErrorResponse, parseBody } from "@/lib/cohorts";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = await parseBody(req, modulePatchSchema);
  if (body.response) return body.response;

  const { data, error } = await createAdminClient()
    .from("course_modules")
    .update(body.data)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) return dbErrorResponse(error);
  if (!data) return NextResponse.json({ error: "Module not found" }, { status: 404 });

  refreshCatalogue();
  return NextResponse.json(data);
}

// DELETE — removes the module and its lessons
export async function DELETE(_req: NextRequest, { params }: Params) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const { id } = await params;
  const { error } = await createAdminClient().from("course_modules").delete().eq("id", id);
  if (error) return dbErrorResponse(error);

  refreshCatalogue();
  return NextResponse.json({ success: true });
}
