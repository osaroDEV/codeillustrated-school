"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { BrandLogo } from "@/components/brand-logo";
import { COURSE_FINDER_PATH, LOGIN_PATH } from "@/lib/routes";

export function Navbar() {
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

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/courses", label: "Courses" },
    { href: "/resources", label: "Resources" },
    { href: "/about-us", label: "About" },
    { href: "/contact-us", label: "Contact" },
  ];

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <BrandLogo href="/" size={44} tone="light" priority className="min-w-0" />

          {/* Desktop Navigation */}
          <nav
            className="hidden md:flex items-center space-x-8"
            aria-label="Main navigation"
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium transition-colors hover:text-primary-500 dark:hover:text-primary-400"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {signedIn ? (
              <Button
                asChild
                className="bg-gradient-to-r from-primary-500 to-secondary-400 hover:from-primary-700 hover:to-secondary-500"
              >
                <Link href="/dashboard">My Dashboard</Link>
              </Button>
            ) : (
              <>
                <Link
                  href={LOGIN_PATH}
                  className="text-sm font-medium transition-colors hover:text-primary-500 dark:hover:text-primary-400"
                >
                  Log in
                </Link>
                <Button
                  asChild
                  className="bg-gradient-to-r from-primary-500 to-secondary-400 hover:from-primary-700 hover:to-secondary-500"
                >
                  <Link href={COURSE_FINDER_PATH}>Get Started</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center space-x-2 md:hidden">
            {/* <ThemeToggle /> */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="h-9 w-9 px-0"
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t"
          >
            <nav className="py-4 space-y-4" aria-label="Mobile navigation">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block text-sm font-medium transition-colors hover:text-primary-500 dark:hover:text-primary-400"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              {!signedIn && (
                <Link
                  href={LOGIN_PATH}
                  className="block text-sm font-medium transition-colors hover:text-primary-500 dark:hover:text-primary-400"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Log in
                </Link>
              )}
              <Button
                asChild
                className="w-full bg-gradient-to-r from-primary-500 to-secondary-400 hover:from-primary-700 hover:to-secondary-500"
              >
                <Link
                  href={signedIn ? "/dashboard" : COURSE_FINDER_PATH}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {signedIn ? "My Dashboard" : "Get Started"}
                </Link>
              </Button>
            </nav>
          </motion.div>
        )}
      </div>
    </motion.header>
  );
}
