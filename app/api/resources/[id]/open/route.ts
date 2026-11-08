import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { getCurrentUser, isEmailVerified } from "@/lib/supabase-server";
import { courseSeat, signedFileUrl } from "@/lib/lessons";
import { BASE_PATH } from "@/lib/seo";

type Params = { params: Promise<{ id: string }> };

// GET — open a course resource for someone with a current place on the course.
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !isEmailVerified(user)) {
    return new NextResponse(null, {
      status: 303,
      headers: { Location: `${BASE_PATH}/auth/login?redirectTo=/dashboard/courses` },
    });
  }

  const admin = createAdminClient();
  const { data: resource } = await admin
    .from("course_resources")
    .select("course_id, kind, file_path, url")
    .eq("id", id)
    .maybeSingle();
  if (!resource) return NextResponse.json({ error: "Resource not found" }, { status: 404 });

  const { access } = await courseSeat(admin, user, resource.course_id, false);
  if (access !== "enrolled" && access !== "staff") {
    return NextResponse.json({ error: "You don't have access to this resource." }, { status: 403 });
  }

  const target = resource.kind === "file" ? await signedFileUrl(admin, resource.file_path as string) : resource.url;
  if (!target || !/^https?:\/\//i.test(target)) {
    return NextResponse.json({ error: "The resource isn't available right now." }, { status: 502 });
  }
  return NextResponse.redirect(target, 303);
}
