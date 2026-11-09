import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase";
import { requireVerifiedUserApi } from "@/lib/supabase-server";
import { dbErrorResponse, parseBody } from "@/lib/cohorts";
import { canTrackProgress } from "@/lib/lesson-access";
import { loadLesson, removeCourseFile } from "@/lib/lessons";

type Params = { params: Promise<{ id: string }> };

const schema = z
  .object({
    body: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().trim().max(50_000).nullable()),
    file_path: z.string().trim().max(500).nullable(),
  })
  .refine((v) => v.body || v.file_path, { message: "Write an answer or attach a file." });

// POST — hand in an assignment, or hand it in again after feedback.
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

  // A learner can only attach what they uploaded to their own folder.
  const { file_path } = body.data;
  if (file_path && !file_path.startsWith(`submissions/${block.id}/${auth.user.id}/`)) {
    return NextResponse.json({ error: "That file can't be attached." }, { status: 400 });
  }

  const { data: existing } = await admin
    .from("assignment_submissions")
    .select("status, file_path")
    .eq("block_id", block.id)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (existing?.status === "passed") {
    return NextResponse.json({ error: "This assignment has already passed." }, { status: 409 });
  }

  const { error } = await admin.from("assignment_submissions").upsert(
    {
      block_id: block.id,
      user_id: auth.user.id,
      body: body.data.body,
      file_path,
      status: "submitted",
      score: null,
      feedback: null,
      graded_by: null,
      graded_at: null,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "block_id,user_id" }
  );
  if (error) return dbErrorResponse(error);
  if (existing?.file_path && existing.file_path !== file_path) await removeCourseFile(admin, existing.file_path);
  return NextResponse.json({ success: true });
}
