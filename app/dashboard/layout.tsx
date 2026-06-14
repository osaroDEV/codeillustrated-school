import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { createAdminClient } from "@/lib/supabase";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Code Illustrated",
  robots: { index: false, follow: false },
};

async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const cookieHeader = allCookies.map((c) => `${c.name}=${c.value}`).join("; ");

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { cookie: cookieHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .single();

    return { user, profile };
  } catch {
    return null;
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const current = await getCurrentUser();

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white antialiased">
      <DashboardSidebar
        userName={current?.profile?.full_name || current?.user?.email?.split("@")[0]}
        userEmail={current?.user?.email}
        avatarUrl={current?.profile?.avatar_url}
      />
      <main className="lg:pl-64">
        <div className="pt-16 lg:pt-0 min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
