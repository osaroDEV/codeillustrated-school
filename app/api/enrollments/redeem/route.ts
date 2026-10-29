import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase";
import { requireVerifiedUserApi } from "@/lib/supabase-server";
import { redeemInvite } from "@/lib/invites";

const bodySchema = z.object({ code: z.string().trim().min(1).max(40) });

// POST — redeem an invite / scholarship code for the signed-in learner
export async function POST(req: NextRequest) {
  const { user, response } = await requireVerifiedUserApi();
  if (response) return response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invite code is required." }, { status: 400 });
  }

  const result = await redeemInvite(createAdminClient(), parsed.data.code, user.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({ course_id: result.courseId }, { status: 201 });
}
