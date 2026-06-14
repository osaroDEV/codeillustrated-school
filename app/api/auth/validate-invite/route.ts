import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Invite code is required." }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("invite_codes")
      .select("id, code, course_id, used_by, expires_at")
      .eq("code", code.trim().toUpperCase())
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "This invite code does not exist." }, { status: 404 });
    }

    if (data.used_by) {
      return NextResponse.json({ error: "This invite code has already been used." }, { status: 409 });
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return NextResponse.json({ error: "This invite code has expired." }, { status: 410 });
    }

    return NextResponse.json({ id: data.id, course_id: data.course_id }, { status: 200 });
  } catch (err) {
    console.error("validate-invite error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
