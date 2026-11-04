import type { Metadata } from "next";
import { requireAdmin } from "@/lib/supabase-server";
import { getCourses } from "@/lib/courses";
import { LearnersTab } from "@/components/admin/learners-tab";

export const metadata: Metadata = { title: "Learners | Admin" };

export default async function Page() {
  await requireAdmin();
  const courses = await getCourses();
  return <LearnersTab courses={courses.map(({ id, title }) => ({ id, title }))} />;
}
