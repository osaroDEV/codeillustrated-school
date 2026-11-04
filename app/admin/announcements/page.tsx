import type { Metadata } from "next";
import { requireAdmin } from "@/lib/supabase-server";
import { getCourses } from "@/lib/courses";
import { AnnouncementsTab } from "@/components/admin/announcements-tab";

export const metadata: Metadata = { title: "Announcements | Admin" };

export default async function Page() {
  await requireAdmin();
  const courses = await getCourses();
  return <AnnouncementsTab courses={courses.map(({ id, title }) => ({ id, title }))} />;
}
