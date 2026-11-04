import type { Metadata } from "next";
import { requireAdmin } from "@/lib/supabase-server";
import { getCourses } from "@/lib/courses";
import { CodesTab } from "@/components/admin/codes-tab";

export const metadata: Metadata = { title: "Invite Codes | Admin" };

export default async function Page() {
  await requireAdmin();
  const courses = await getCourses();
  return <CodesTab courses={courses.map(({ id, title }) => ({ id, title }))} />;
}
