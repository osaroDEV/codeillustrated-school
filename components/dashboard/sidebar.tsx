"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/auth";
import {
  LayoutDashboard,
  BookOpen,
  User,
  Megaphone,
  LogOut,
  GraduationCap,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/courses", label: "My Courses", icon: BookOpen },
  { href: "/dashboard/announcements", label: "Announcements", icon: Megaphone },
  { href: "/dashboard/profile", label: "Profile", icon: User },
];

interface SidebarProps {
  userName?: string;
  userEmail?: string;
  avatarUrl?: string | null;
}

export function DashboardSidebar({ userName, userEmail, avatarUrl }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    router.push("/auth/login");
    router.refresh();
  }

  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 bg-gradient-to-br from-[#c31d24] to-[#9b161c] rounded-xl flex items-center justify-center shadow-md shadow-[#c31d24]/30 group-hover:scale-105 transition-transform flex-shrink-0">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight truncate">Code Illustrated</p>
            <p className="text-white/40 text-[10px]">Online School</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? "bg-gradient-to-r from-[#c31d24]/20 to-[#c31d24]/10 text-white border border-[#c31d24]/30"
                  : "text-white/50 hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              <item.icon className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? "text-[#c31d24]" : "group-hover:text-white"}`} />
              {item.label}
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#c31d24]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] mb-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a596c] to-[#0f2e38] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm font-medium truncate">{userName || "Learner"}</p>
            <p className="text-white/40 text-xs truncate">{userEmail}</p>
          </div>
        </div>
        <button
          id="dashboard-signout-btn"
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-white/50 hover:text-red-400 hover:bg-red-500/10 text-sm font-medium transition-all duration-200 group"
        >
          <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 h-screen bg-[#0d0d14] border-r border-white/[0.08] fixed left-0 top-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile topbar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[#0d0d14]/95 backdrop-blur border-b border-white/[0.08] px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-[#c31d24] to-[#9b161c] rounded-lg flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-sm">Code Illustrated</span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="text-white/60 hover:text-white transition-colors p-1"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-[#0d0d14] border-r border-white/[0.08] z-50 shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
}
