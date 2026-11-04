import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { getCurrentUser, getRole, isEmailVerified } from "@/lib/supabase-server";
import { canManageCohort, type ClassSession, type Cohort } from "@/lib/cohorts";
import { joinState } from "@/lib/schedule";
import { BASE_PATH } from "@/lib/seo";

type Params = { params: Promise<{ id: string }> };

// GET — the "Join" button. Sends a learner in the session's cohort to the
// meeting link, but only from 15 minutes before the start until it ends, so
// links never sit in the page source. Staff can join any time. A learner's
// first join marks them present; staff can change that afterwards.
//
// Internal redirects use a relative Location (see app/auth/confirm/route.ts).
export async function GET(_req: NextRequest, { params }: Params) {
  const back = (reason: string) =>
    new NextResponse(null, {
      status: 303,
      headers: { Location: `${BASE_PATH}/dashboard/schedule?join=${reason}` },
    });

  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !isEmailVerified(user)) {
    return new NextResponse(null, {
      status: 303,
      headers: { Location: `${BASE_PATH}/auth/login?redirectTo=/dashboard/schedule` },
    });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("class_sessions")
    .select("*, cohorts(*)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return back("not_found");
  const { cohorts: cohort, ...session } = data as ClassSession & { cohorts: Cohort };

  const role = await getRole(user.id);
  const isStaff = role !== "student" && canManageCohort({ user, role }, cohort);

  if (!isStaff) {
    const { data: enrollment } = await admin
      .from("enrollments")
      .select("id")
      .eq("user_id", user.id)
      .eq("cohort_id", cohort.id)
      .maybeSingle();
    if (!enrollment) return back("not_found");

    const state = joinState(session);
    if (state === "upcoming") return back("early");
    if (state === "ended") return back("ended");
  }

  const link = session.meeting_url || cohort.meeting_url;
  if (!link || !/^https?:\/\//i.test(link)) return back("no_link");

  if (!isStaff) {
    const { error } = await admin
      .from("attendance")
      .upsert(
        { session_id: session.id, user_id: user.id, status: "present" },
        { onConflict: "session_id,user_id", ignoreDuplicates: true }
      );
    if (error) console.error("Attendance on join failed:", error.message);
  }

  return NextResponse.redirect(link, 303);
}
