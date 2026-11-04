import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/supabase-server";

export default async function AdminPage() {
  const { role } = await requireStaff();
  redirect(role === "admin" ? "/admin/learners" : "/admin/cohorts");
}
