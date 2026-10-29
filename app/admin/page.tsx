import { AdminPanel } from "@/components/admin/admin-panel";
import { getCourses } from "@/lib/courses";

export default async function AdminPage() {
  const courses = await getCourses();
  return <AdminPanel courses={courses.map(({ id, title }) => ({ id, title }))} />;
}
