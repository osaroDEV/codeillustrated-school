import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { rejectNonAdmin } from "@/lib/supabase-server";
import { uploadRequestSchema } from "@/lib/admin-schemas";
import { parseBody } from "@/lib/cohorts";
import { COURSE_FILES_BUCKET, storagePath } from "@/lib/lesson-access";

// POST — a one-time link for the browser to upload a course file straight to
// private storage, because files this size can't pass through a Vercel function.
export async function POST(req: NextRequest) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const body = await parseBody(req, uploadRequestSchema);
  if (body.response) return body.response;

  const path = storagePath(body.data.scope, body.data.file_name, randomBytes(6).toString("hex"));
  const { data, error } = await createAdminClient().storage.from(COURSE_FILES_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("Upload link failed:", error?.message);
    return NextResponse.json({ error: "Couldn't start the upload." }, { status: 502 });
  }
  return NextResponse.json({ path: data.path, token: data.token });
}
