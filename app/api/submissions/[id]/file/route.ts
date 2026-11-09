import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { getCurrentUser, getRole, isEmailVerified } from "@/lib/supabase-server";
import { loadSubmissionForStaff } from "@/lib/assessments-server";
import { signedFileUrl } from "@/lib/lessons";
import { BASE_PATH } from "@/lib/seo";

type Params = { params: Promise<{ id: string }> };

// GET — a submission's attached file, for the learner who sent it or staff who
// can grade it. The link expires within a minute.
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !isEmailVerified(user)) {
    return new NextResponse(null, { status: 303, headers: { Location: `${BASE_PATH}/auth/login?redirectTo=/dashboard/courses` } });
  }

  const admin = createAdminClient();
  const { data: own } = await admin.from("assignment_submissions").select("user_id, file_path").eq("id", id).maybeSingle();
  if (!own?.file_path) return NextResponse.json({ error: "File not found" }, { status: 404 });

  if (own.user_id !== user.id) {
    const role = await getRole(user.id);
    const allowed = role !== "student" && (await loadSubmissionForStaff(admin, { user, role }, id));
    if (!allowed) return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const url = await signedFileUrl(admin, own.file_path);
  if (!url) return NextResponse.json({ error: "The file isn't available right now." }, { status: 502 });
  return NextResponse.redirect(url, 303);
}
