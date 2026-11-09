import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase";
import { loadCohortForStaff, type AttendanceStatus, type ClassSession } from "@/lib/cohorts";
import { CohortDetail, type CohortMember } from "@/components/admin/cohort-detail";

export const metadata: Metadata = { title: "Cohort | Admin" };

export default async function CohortPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staff = await requireStaff();
  const admin = createAdminClient();

  const cohort = await loadCohortForStaff(admin, staff, id);
  if (!cohort) notFound();
  const isAdmin = staff.role === "admin";

  const [{ data: course }, { data: sessionRows }, { data: memberRows }, { data: modules }] = await Promise.all([
    admin.from("courses").select("id, title").eq("id", cohort.course_id).maybeSingle(),
    admin.from("class_sessions").select("*").eq("cohort_id", id).order("starts_at"),
    admin
      .from("enrollments")
      .select("id, user_id, profiles(full_name, email)")
      .eq("cohort_id", id),
    admin
      .from("course_modules")
      .select("title, position, lessons(id, title, position)")
      .eq("course_id", cohort.course_id)
      .order("position"),
  ]);

  const sessions = (sessionRows ?? []) as ClassSession[];
  const toMember = (row: { id: string; user_id: string; profiles: unknown }): CohortMember => {
    const p = row.profiles as { full_name: string | null; email: string | null } | null;
    return { enrollment_id: row.id, user_id: row.user_id, name: p?.full_name || p?.email || "Learner", email: p?.email ?? null };
  };
  const members = (memberRows ?? []).map(toMember).sort((a, b) => a.name.localeCompare(b.name));

  const { data: marks } = sessions.length
    ? await admin
        .from("attendance")
        .select("session_id, user_id, status")
        .in("session_id", sessions.map((s) => s.id))
    : { data: [] };
  const attendance: Record<string, Record<string, AttendanceStatus>> = {};
  for (const m of marks ?? []) {
    (attendance[m.session_id] ??= {})[m.user_id] = m.status as AttendanceStatus;
  }

  // Lessons, in curriculum order, for tagging what a session teaches.
  const lessons = (modules ?? []).flatMap((m) =>
    [...((m.lessons ?? []) as { id: string; title: string; position: number }[])]
      .sort((a, b) => a.position - b.position)
      .map((l) => ({ id: l.id, title: `${m.title} · ${l.title}` }))
  );

  let unassigned: CohortMember[] = [];
  let staffOptions: { id: string; name: string }[] = [];
  if (isAdmin) {
    const [{ data: openRows }, { data: staffRows }] = await Promise.all([
      admin
        .from("enrollments")
        .select("id, user_id, profiles(full_name, email), subscriptions(offerings(kind))")
        .eq("course_id", cohort.course_id)
        .is("cohort_id", null),
      admin.from("profiles").select("id, full_name, email").in("role", ["instructor", "admin"]).order("full_name"),
    ]);
    // Self-paced subscriptions don't include live classes.
    unassigned = (openRows ?? [])
      .filter((r) => (r.subscriptions as unknown as { offerings: { kind: string } | null } | null)?.offerings?.kind !== "self_paced")
      .map(toMember)
      .sort((a, b) => a.name.localeCompare(b.name));
    staffOptions = (staffRows ?? []).map((p) => ({ id: p.id, name: p.full_name || p.email || p.id }));
  }

  return (
    <CohortDetail
      cohort={cohort}
      courseTitle={course?.title ?? cohort.course_id}
      sessions={sessions}
      members={members}
      unassigned={unassigned}
      attendance={attendance}
      lessons={lessons}
      staff={staffOptions}
      isAdmin={isAdmin}
    />
  );
}
