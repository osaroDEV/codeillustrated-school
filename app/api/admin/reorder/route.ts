import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { rejectNonAdmin } from "@/lib/supabase-server";
import { reorderSchema } from "@/lib/admin-schemas";
import { refreshCatalogue } from "@/lib/catalogue-admin";
import { dbErrorResponse, parseBody } from "@/lib/cohorts";

// POST — set the order of a course's modules or a module's lessons.
// `ids` must list every child exactly once, in the new order.
export async function POST(req: NextRequest) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const body = await parseBody(req, reorderSchema);
  if (body.response) return body.response;
  const { kind, parent_id, ids } = body.data;

  const supabase = createAdminClient();
  const { error } =
    kind === "modules"
      ? await supabase.rpc("reorder_course_modules", { p_course_id: parent_id, p_ids: ids })
      : await supabase.rpc("reorder_lessons", { p_module_id: parent_id, p_ids: ids });
  if (error) return dbErrorResponse(error);

  refreshCatalogue();
  return NextResponse.json({ success: true });
}
