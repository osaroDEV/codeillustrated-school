import type { Metadata } from "next";
import { requireAdmin } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Admin | Code Illustrated",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white antialiased">
      {children}
    </div>
  );
}
