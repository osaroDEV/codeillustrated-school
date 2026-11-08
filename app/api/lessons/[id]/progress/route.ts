import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { requireVerifiedUserApi } from "@/lib/supabase-server";
import { canTrackProgress } from "@/lib/lesson-access";
import { loadLesson } from "@/lib/lessons";
import { dbErrorResponse } from "@/lib/cohorts";

type Params = { params: Promise<{ id: string }> };

// Shared gate: only a learner with a current seat records progress. A database
// trigger then recalculates enrollments.progress.
async function gate(id: string) {
  const auth = await requireVerifiedUserApi();
  if (auth.response) return { response: auth.response };
  const admin = createAdminClient();
  const found = await loadLesson(admin, auth.user, id);
  if (!found) return { response: NextResponse.json({ error: "Lesson not found" }, { status: 404 }) };
  if (!canTrackProgress(found.seat.access)) {
    return { response: NextResponse.json({ error: "You need a current place on this course." }, { status: 403 }) };
  }
  return { admin, userId: auth.user.id, lessonId: found.lesson.id };
}

// POST — mark the lesson complete. Marking it twice changes nothing.
export async function POST(_req: NextRequest, { params }: Params) {
  const g = await gate((await params).id);
  if (g.response) return g.response;
  const { error } = await g.admin
    .from("lesson_progress")
    .upsert({ user_id: g.userId, lesson_id: g.lessonId }, { onConflict: "user_id,lesson_id", ignoreDuplicates: true });
  if (error) return dbErrorResponse(error);
  return NextResponse.json({ success: true });
}

// DELETE — undo it.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const g = await gate((await params).id);
  if (g.response) return g.response;
  const { error } = await g.admin
    .from("lesson_progress")
    .delete()
    .eq("user_id", g.userId)
    .eq("lesson_id", g.lessonId);
  if (error) return dbErrorResponse(error);
  return NextResponse.json({ success: true });
}
