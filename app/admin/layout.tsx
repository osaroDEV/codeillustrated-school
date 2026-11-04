import type { Metadata } from "next";
import { requireStaff } from "@/lib/supabase-server";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: "Admin | Code Illustrated",
  robots: { index: false, follow: false },
};

// Admins and instructors. Admin-only pages call requireAdmin() themselves;
// instructors are confined to their own cohorts.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role } = await requireStaff();

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white antialiased">
      <AdminShell role={role}>{children}</AdminShell>
    </div>
  );
}
