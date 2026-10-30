import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { createAdminClient } from "@/lib/supabase";
import { requireUser } from "@/lib/supabase-server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Code Illustrated",
  robots: { index: false, follow: false },
};

async function getProfile(userId: string) {
  try {
    const { data } = await createAdminClient()
      .from("profiles")
      .select("full_name, avatar_url, role")
      .eq("id", userId)
      .single();
    return data;
  } catch {
    return null;
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Signed-in and email-verified, or redirected to login / verify-email.
  const user = await requireUser();
  const profile = await getProfile(user.id);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white antialiased">
      <DashboardSidebar
        userName={profile?.full_name || user.email?.split("@")[0]}
        userEmail={user.email}
        avatarUrl={profile?.avatar_url}
        isAdmin={profile?.role === "admin"}
      />
      <main className="lg:pl-64">
        <div className="pt-16 lg:pt-0 min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
