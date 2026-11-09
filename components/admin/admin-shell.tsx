"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen, ClipboardList, CreditCard, GraduationCap, Inbox, Key, LayoutDashboard, LogOut, Megaphone,
  Presentation, ShieldCheck, Users,
} from "lucide-react";
import { signOut } from "@/lib/auth";

const ADMIN_NAV = [
  { href: "/admin/learners", label: "Learners", icon: Users },
  { href: "/admin/cohorts", label: "Cohorts", icon: Presentation },
  { href: "/admin/courses", label: "Courses", icon: BookOpen },
  { href: "/admin/grading", label: "Grading", icon: ClipboardList },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/messages", label: "Messages", icon: Inbox },
  { href: "/admin/codes", label: "Invite Codes", icon: Key },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
];

const INSTRUCTOR_NAV = [
  { href: "/admin/cohorts", label: "My Cohorts", icon: Presentation },
  { href: "/admin/grading", label: "Grading", icon: ClipboardList },
];

export function AdminShell({
  role,
  children,
}: {
  role: "admin" | "instructor";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = role === "admin" ? ADMIN_NAV : INSTRUCTOR_NAV;

  async function handleSignOut() {
    await signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/[0.08] bg-[#0d0d14]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-[#1a596c] to-[#0f2e38] rounded-xl flex items-center justify-center shadow-md shadow-[#1a596c]/30">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">
                {role === "admin" ? "Admin Panel" : "Teaching"}
              </p>
              <div className="flex items-center gap-1.5">
                <GraduationCap className="w-3 h-3 text-white/30" />
                <p className="text-white/30 text-[10px]">Code Illustrated</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" /> <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <button
              id="admin-signout-btn"
              onClick={handleSignOut}
              className="flex items-center gap-2 text-white/40 hover:text-red-400 text-sm transition-colors"
            >
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <nav className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] rounded-2xl p-1 mb-8 w-fit max-w-full overflow-x-auto">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  active ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        {children}
      </div>
    </div>
  );
}
