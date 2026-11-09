import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase";
import { requireVerifiedUserApi } from "@/lib/supabase-server";
import { gradeQuiz, type QuizQuestion } from "@/lib/assessments";
import { dbErrorResponse, parseBody } from "@/lib/cohorts";
import { canTrackProgress } from "@/lib/lesson-access";
import { loadLesson } from "@/lib/lessons";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({ answers: z.array(z.number().int().min(-1)).max(50) });

// POST — mark a quiz attempt on the server, where the answers stay.
// Learners can retake a quiz; their best result counts.
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireVerifiedUserApi();
  if (auth.response) return auth.response;
  const body = await parseBody(req, schema);
  if (body.response) return body.response;

  const { id } = await params;
  const admin = createAdminClient();
  const { data: block } = await admin
    .from("lesson_blocks")
    .select("id, lesson_id, quiz, pass_mark")
    .eq("id", id)
    .eq("kind", "quiz")
    .maybeSingle();
  if (!block) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  const found = await loadLesson(admin, auth.user, block.lesson_id);
  if (!found) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  if (!canTrackProgress(found.seat.access)) {
    return NextResponse.json({ error: "You need a current place on this course." }, { status: 403 });
  }

  const questions = block.quiz as QuizQuestion[];
  if (body.data.answers.length !== questions.length) {
    return NextResponse.json({ error: "Please answer every question." }, { status: 400 });
  }
  const { score, results } = gradeQuiz(questions, body.data.answers);
  const passed = score >= block.pass_mark;

  const { error } = await admin
    .from("quiz_attempts")
    .insert({ block_id: block.id, user_id: auth.user.id, answers: body.data.answers, score, passed });
  if (error) return dbErrorResponse(error);
  return NextResponse.json({ score, passed, results });
}
