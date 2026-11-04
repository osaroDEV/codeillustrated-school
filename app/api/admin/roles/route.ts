import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { getCurrentUser, rejectNonAdmin } from "@/lib/supabase-server";
import { roleChangeSchema } from "@/lib/admin-schemas";
import { dbErrorResponse, parseBody } from "@/lib/cohorts";

// PATCH — make someone a student, instructor or admin
export async function PATCH(req: NextRequest) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const body = await parseBody(req, roleChangeSchema);
  if (body.response) return body.response;

  const me = await getCurrentUser();
  if (me?.id === body.data.user_id) {
    return NextResponse.json({ error: "You can't change your own role." }, { status: 400 });
  }

  const supabase = createAdminClient();
  if (body.data.role === "student") {
    const { count } = await supabase
      .from("cohorts")
      .select("id", { count: "exact", head: true })
      .eq("instructor_id", body.data.user_id)
      .neq("status", "finished");
    if (count) {
      return NextResponse.json(
        { error: "This person still teaches a cohort. Assign it a different instructor first." },
        { status: 409 }
      );
    }
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ role: body.data.role })
    .eq("id", body.data.user_id)
    .select("id, role")
    .maybeSingle();
  if (error) return dbErrorResponse(error);
  if (!data) return NextResponse.json({ error: "Learner not found" }, { status: 404 });
  return NextResponse.json(data);
}
