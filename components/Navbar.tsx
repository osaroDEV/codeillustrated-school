"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { BrandLogo } from "@/components/brand-logo";
import { buttonClass } from "@/components/marketing/ui";
import { COURSE_FINDER_PATH, LOGIN_PATH } from "@/lib/routes";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/courses", label: "Courses" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#parents", label: "For parents" },
  { href: "/#reviews", label: "Reviews" },
  { href: "/about-us", label: "About" },
];

/** A single course page, /courses/<slug>, where the main action is enrolling. */
const isCoursePage = (pathname: string | null) => !!pathname && /^\/courses\/[^/]+\/?$/.test(pathname);

export function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // Public pages are cached, so this is only known in the browser. Until then
  // show the signed-out links, which are also what search engines should see.
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;
    getSession().then((session) => {
      if (active) setSignedIn(!!session);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const action = signedIn
    ? { href: "/dashboard", label: "My Dashboard" }
    : isCoursePage(pathname)
      ? { href: "#enroll", label: "Enrol" }
      : { href: COURSE_FINDER_PATH, label: "Find your course" };

  const linkClass = "text-[15px] font-medium text-ink transition-colors hover:text-primary-500";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-surface-line bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between gap-6 px-4 sm:px-6">
        <BrandLogo href="/" size={44} tone="light" priority className="min-w-0" />

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className={cn(linkClass, "py-3")}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-5 lg:flex" data-testid="nav-actions">
          {!signedIn && (
            <Link href={LOGIN_PATH} className={cn(linkClass, "py-3")}>
              Log in
            </Link>
          )}
          <Link href={action.href} className={buttonClass("primary", false, "min-h-[46px] px-[22px] text-[15px]")}>
            {action.label}
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-surface-mist lg:hidden"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {isMenuOpen && (
        <div id="mobile-menu" className="border-t border-surface-line bg-white lg:hidden">
          <nav className="mx-auto flex max-w-[1200px] flex-col px-4 py-3 sm:px-6" aria-label="Mobile navigation">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(linkClass, "flex min-h-[48px] items-center border-b border-surface-mist")}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            {!signedIn && (
              <Link
                href={LOGIN_PATH}
                className={cn(linkClass, "flex min-h-[48px] items-center")}
                onClick={() => setIsMenuOpen(false)}
              >
                Log in
              </Link>
            )}
            <Link href={action.href} className={buttonClass("primary", false, "mt-3 w-full")} onClick={() => setIsMenuOpen(false)}>
              {action.label}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
