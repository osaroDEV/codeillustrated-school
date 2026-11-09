import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { getCurrentUser, isEmailVerified } from "@/lib/supabase-server";
import { canViewLesson } from "@/lib/lesson-access";
import { loadLesson, signedFileUrl } from "@/lib/lessons";
import { BASE_PATH } from "@/lib/seo";
import { loginPath } from "@/lib/routes";

type Params = { params: Promise<{ id: string }> };

// GET — a file block's Download button. Sends someone with access to a link that
// expires within a minute, so nothing long-lived ends up in the page.
// Internal redirects use a relative Location (see app/auth/confirm/route.ts).
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !isEmailVerified(user)) {
    return new NextResponse(null, {
      status: 303,
      headers: { Location: `${BASE_PATH}${loginPath("/dashboard/courses")}` },
    });
  }

  const admin = createAdminClient();
  const { data: block } = await admin
    .from("lesson_blocks")
    .select("lesson_id, file_path")
    .eq("id", id)
    .eq("kind", "file")
    .maybeSingle();
  if (!block?.file_path) return NextResponse.json({ error: "File not found" }, { status: 404 });

  const found = await loadLesson(admin, user, block.lesson_id);
  if (!found) return NextResponse.json({ error: "File not found" }, { status: 404 });
  if (!canViewLesson(found.seat.access)) {
    return NextResponse.json({ error: "You don't have access to this file." }, { status: 403 });
  }

  const url = await signedFileUrl(admin, block.file_path);
  if (!url) return NextResponse.json({ error: "The file isn't available right now." }, { status: 502 });
  return NextResponse.redirect(url, 303);
}
