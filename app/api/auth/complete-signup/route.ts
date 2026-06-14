import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { userId, fullName, inviteId, courseId } = await req.json();

    if (!userId || !inviteId || !courseId) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Create profile record
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      full_name: fullName || null,
    });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      return NextResponse.json({ error: "Failed to create profile." }, { status: 500 });
    }

    // 2. Mark invite code as used
    const { error: inviteError } = await supabase
      .from("invite_codes")
      .update({ used_by: userId, used_at: new Date().toISOString() })
      .eq("id", inviteId);

    if (inviteError) {
      console.error("Invite update error:", inviteError);
      return NextResponse.json({ error: "Failed to mark invite as used." }, { status: 500 });
    }

    // 3. Create enrollment
    const { error: enrollError } = await supabase.from("enrollments").insert({
      user_id: userId,
      course_id: courseId,
      progress: 0,
      status: "active",
    });

    if (enrollError) {
      console.error("Enrollment error:", enrollError);
      return NextResponse.json({ error: "Failed to create enrollment." }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("complete-signup error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
