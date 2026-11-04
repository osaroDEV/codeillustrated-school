import type { Metadata } from "next";
import { requireAdmin } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase";
import { listAdminCourses, type AdminCourse } from "@/lib/catalogue-admin";
import { CoursesAdminList } from "@/components/admin/courses-admin-list";

export const metadata: Metadata = { title: "Courses | Admin" };

export default async function AdminCoursesPage() {
  await requireAdmin();
  let courses: AdminCourse[] = [];
  let loadError: string | null = null;
  try {
    courses = await listAdminCourses(createAdminClient());
  } catch (err) {
    loadError = (err as Error).message ?? "Failed to load courses.";
  }
  return (
    <CoursesAdminList
      loadError={loadError}
      courses={courses.map((c) => ({
        id: c.id,
        title: c.title,
        is_published: c.is_published,
        modules: c.course_modules.length,
        lessons: c.course_modules.reduce((n, m) => n + m.lessons.length, 0),
      }))}
    />
  );
}
