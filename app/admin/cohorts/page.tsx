import type { Metadata } from "next";
import { requireStaff } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase";
import type { Cohort } from "@/lib/cohorts";
import { nextSession } from "@/lib/schedule";
import { CohortsList, type CohortListItem } from "@/components/admin/cohorts-list";

export const metadata: Metadata = { title: "Cohorts | Admin" };

export default async function CohortsPage() {
  const { user, role } = await requireStaff();
  const admin = createAdminClient();

  let query = admin
    .from("cohorts")
    .select("*, courses(title), enrollments(count)")
    .order("created_at", { ascending: false });
  if (role !== "admin") query = query.eq("instructor_id", user.id);
  const { data: rows, error } = await query;

  const cohorts = (rows ?? []) as (Cohort & {
    courses: { title: string } | null;
    enrollments: { count: number }[];
  })[];

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: sessions } = cohorts.length
    ? await admin
        .from("class_sessions")
        .select("cohort_id, starts_at, duration_min")
        .in("cohort_id", cohorts.map((c) => c.id))
        .gte("starts_at", since)
    : { data: [] };

  const items: CohortListItem[] = cohorts.map((c) => ({
    id: c.id,
    name: c.name,
    course_title: c.courses?.title ?? c.course_id,
    status: c.status,
    offering_kind: c.offering_kind,
    starts_on: c.starts_on,
    members: c.enrollments?.[0]?.count ?? 0,
    capacity: c.capacity,
    next_session: nextSession((sessions ?? []).filter((s) => s.cohort_id === c.id))?.starts_at ?? null,
  }));

  let courses: { id: string; title: string }[] = [];
  let staff: { id: string; name: string }[] = [];
  if (role === "admin") {
    const [{ data: courseRows }, { data: staffRows }] = await Promise.all([
      admin.from("courses").select("id, title").order("position"),
      admin.from("profiles").select("id, full_name, email").in("role", ["instructor", "admin"]).order("full_name"),
    ]);
    courses = courseRows ?? [];
    staff = (staffRows ?? []).map((p) => ({ id: p.id, name: p.full_name || p.email || p.id }));
  }

  return (
    <CohortsList
      cohorts={items}
      isAdmin={role === "admin"}
      courses={courses}
      staff={staff}
      loadError={error?.message ?? null}
    />
  );
}
