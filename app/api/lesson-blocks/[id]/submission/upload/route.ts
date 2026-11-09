import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase";
import { requireVerifiedUserApi } from "@/lib/supabase-server";
import { parseBody } from "@/lib/cohorts";
import { canTrackProgress, COURSE_FILES_BUCKET, storagePath } from "@/lib/lesson-access";
import { loadLesson } from "@/lib/lessons";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({ file_name: z.string().trim().min(1).max(255) });

// POST — a one-time link for a learner to upload their work to their own
// private folder.
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireVerifiedUserApi();
  if (auth.response) return auth.response;
  const body = await parseBody(req, schema);
  if (body.response) return body.response;

  const { id } = await params;
  const admin = createAdminClient();
  const { data: block } = await admin.from("lesson_blocks").select("id, lesson_id").eq("id", id).eq("kind", "assignment").maybeSingle();
  if (!block) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  const found = await loadLesson(admin, auth.user, block.lesson_id);
  if (!found) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  if (!canTrackProgress(found.seat.access)) {
    return NextResponse.json({ error: "You need a current place on this course." }, { status: 403 });
  }

  const path = storagePath(`submissions/${block.id}/${auth.user.id}`, body.data.file_name, randomBytes(6).toString("hex"));
  const { data, error } = await admin.storage.from(COURSE_FILES_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("Upload link failed:", error?.message);
    return NextResponse.json({ error: "Couldn't start the upload." }, { status: 502 });
  }
  return NextResponse.json({ path: data.path, token: data.token });
}
