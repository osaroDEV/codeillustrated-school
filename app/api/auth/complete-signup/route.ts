import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName, inviteId, courseId } = await req.json();

    if (!email || !password || !inviteId || !courseId) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Create auth user (auto-confirmed — no email verification needed)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName || null },
    });

    if (authError || !authData.user) {
      console.error("Auth user creation error:", authError);
      return NextResponse.json({ error: authError?.message || "Failed to create account." }, { status: 500 });
    }

    const userId = authData.user.id;

    // 2. Create profile
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      full_name: fullName || null,
    });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "Failed to create profile." }, { status: 500 });
    }

    // 3. Mark invite code as used
    const { error: inviteError } = await supabase
      .from("invite_codes")
      .update({ used_by: userId, used_at: new Date().toISOString() })
      .eq("id", inviteId);

    if (inviteError) {
      console.error("Invite update error:", inviteError);
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "Failed to mark invite as used." }, { status: 500 });
    }

    // 4. Create enrollment
    const { error: enrollError } = await supabase.from("enrollments").insert({
      user_id: userId,
      course_id: courseId,
    });

    if (enrollError) {
      console.error("Enrollment error:", enrollError);
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: enrollError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("complete-signup error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
