import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { rejectNonAdmin, requireStaffApi } from "@/lib/supabase-server";
import { INSTRUCTOR_SESSION_FIELDS, sessionPatchSchema } from "@/lib/admin-schemas";
import { dbErrorResponse, loadSessionForStaff, parseBody } from "@/lib/cohorts";

type Params = { params: Promise<{ id: string }> };

// PATCH — admins can change anything; a cohort's instructor can set the
// meeting and recording links.
export async function PATCH(req: NextRequest, { params }: Params) {
  const staff = await requireStaffApi();
  if (staff.response) return staff.response;

  const { id } = await params;
  const body = await parseBody(req, sessionPatchSchema);
  if (body.response) return body.response;

  const supabase = createAdminClient();
  const found = await loadSessionForStaff(supabase, staff, id);
  if (!found) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const updates: Record<string, unknown> = { ...body.data };
  if (staff.role !== "admin") {
    const allowed = new Set<string>(INSTRUCTOR_SESSION_FIELDS);
    const blocked = Object.keys(updates).filter((k) => !allowed.has(k));
    if (blocked.length) {
      return NextResponse.json(
        { error: `Only an admin can change ${blocked.join(", ")}.` },
        { status: 403 }
      );
    }
    // A new video needs its own approval before self-paced subscribers see it.
    if ("recording_url" in updates && updates.recording_url !== found.session.recording_url) {
      updates.shared_with_self_paced = false;
    }
  }

  const { data, error } = await supabase.from("class_sessions").update(updates).eq("id", id).select().single();
  if (error) return dbErrorResponse(error);
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const { id } = await params;
  const { error } = await createAdminClient().from("class_sessions").delete().eq("id", id);
  if (error) return dbErrorResponse(error);
  return NextResponse.json({ success: true });
}
