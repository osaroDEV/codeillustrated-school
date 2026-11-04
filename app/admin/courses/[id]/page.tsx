import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase";
import { getAdminCourse } from "@/lib/catalogue-admin";
import { CourseEditor } from "@/components/admin/course-editor";

export const metadata: Metadata = { title: "Edit course | Admin" };

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const course = await getAdminCourse(createAdminClient(), id);
  if (!course) notFound();
  return <CourseEditor course={course} />;
}
