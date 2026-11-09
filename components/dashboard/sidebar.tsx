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
  Menu,
  X,
  ShieldCheck,
  CalendarDays,
  Presentation,
  CreditCard,
  Compass,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { COURSE_FINDER_PATH, LOGIN_PATH } from "@/lib/routes";

type NavItem = { href: string; label: string; icon: LucideIcon };

const learnItems: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/courses", label: "My Courses", icon: BookOpen },
  { href: "/dashboard/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/dashboard/announcements", label: "Announcements", icon: Megaphone },
];

const accountItems: NavItem[] = [
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/profile", label: "Profile", icon: User },
];

interface SidebarProps {
  userName?: string;
  userEmail?: string;
  avatarUrl?: string | null;
  role?: "student" | "instructor" | "admin";
}

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  return href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardSidebar({ userName, userEmail, avatarUrl, role }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    router.push(LOGIN_PATH);
    router.refresh();
  }

  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const staffItems: NavItem[] =
    role === "admin"
      ? [{ href: "/admin", label: "Admin panel", icon: ShieldCheck }]
      : role === "instructor"
        ? [{ href: "/admin/cohorts", label: "Teaching", icon: Presentation }]
        : [];

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(pathname, item.href);
    return (
      <Link
        href={item.href}
        onClick={() => setMobileOpen(false)}
        aria-current={active ? "page" : undefined}
        className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          active
            ? "bg-[#c31d24]/[0.14] text-white"
            : "text-white/55 hover:bg-white/[0.05] hover:text-white"
        }`}
      >
        {active && <span aria-hidden className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[#c31d24]" />}
        <item.icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-[#ff5a5f]" : ""}`} />
        {item.label}
      </Link>
    );
  };

  const Group = ({ title, items }: { title: string; items: NavItem[] }) =>
    items.length ? (
      <div>
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">{title}</p>
        <div className="space-y-0.5">
          {items.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>
      </div>
    ) : null;

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="relative overflow-hidden border-b border-white/[0.08] px-5 pb-5 pt-6">
        <div aria-hidden className="pointer-events-none absolute -left-16 -top-20 h-44 w-44 rounded-full bg-[#1a596c]/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-10 h-36 w-36 rounded-full bg-[#c31d24]/20 blur-3xl" />
        <BrandLogo href="/dashboard" size={52} subtitle="Learner dashboard" className="relative" priority />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-6" aria-label="Dashboard">
        <Group title="Learn" items={learnItems} />
        <Group title="Account" items={accountItems} />
        <Group title="Staff" items={staffItems} />
      </nav>

      {/* Discover + user */}
      <div className="space-y-3 border-t border-white/[0.08] px-3 py-4">
        <div className="space-y-0.5">
          <Link
            href={COURSE_FINDER_PATH}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#ffbd59] transition-colors hover:bg-[#ffbd59]/10"
          >
            <Compass className="h-[18px] w-[18px] shrink-0" />
            Find a course
          </Link>
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/45 transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            <ArrowUpRight className="h-[18px] w-[18px] shrink-0" />
            Back to website
          </Link>
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#1a596c] to-[#0f2e38] text-xs font-bold text-white ring-2 ring-white/10">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{userName || "Learner"}</p>
            <p className="truncate text-xs text-white/40">{userEmail}</p>
          </div>
          <button
            id="dashboard-signout-btn"
            onClick={handleSignOut}
            title="Sign out"
            aria-label="Sign out"
            className="rounded-lg p-2 text-white/45 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 flex-col border-r border-white/[0.08] bg-[#0d0d14] lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile top bar (64px; the layout pads for it) */}
      <div className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-white/[0.08] bg-[#0d0d14]/95 px-4 backdrop-blur lg:hidden">
        <BrandLogo href="/dashboard" size={40} subtitle="Learner dashboard" />
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed bottom-0 left-0 top-0 z-50 w-72 border-r border-white/[0.08] bg-[#0d0d14] shadow-2xl lg:hidden">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-4 top-4 z-10 text-white/40 transition-colors hover:text-white"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
}
