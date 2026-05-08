"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import codeillIcon from "../public/code-ill.svg";
import { useCurrency } from "@/hooks/use-currency";

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { currency, setCurrency } = useCurrency();

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
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src={codeillIcon}
              alt="Code Illustrated Online School logo – beginner coding training"
              width={40}
              height={40}
              className="h-10 w-10"
              priority
            />
            <span className="hidden sm:block lg:text-xl font-bold bg-gradient-to-r from-primary-500 to-secondary-400 bg-clip-text text-transparent">
              Code Illustrated Online School
            </span>
            <span className="sm:hidden text-xl font-bold bg-gradient-to-r from-primary-500 to-secondary-400 bg-clip-text text-transparent">
              CodeIllustrated
            </span>
          </Link>

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
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-1 border border-slate-200">
              <button
                onClick={() => setCurrency("USD")}
                className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${
                  currency === "USD"
                    ? "bg-white text-primary shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                USD
              </button>
              <button
                onClick={() => setCurrency("NGN")}
                className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${
                  currency === "NGN"
                    ? "bg-white text-primary shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                NGN
              </button>
            </div>
            <Button
              asChild
              className="bg-gradient-to-r from-primary-500 to-secondary-400 hover:from-primary-700 hover:to-secondary-500"
            >
              <Link href="/contact-us">Get Started</Link>
            </Button>
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
              <Button
                asChild
                className="w-full bg-gradient-to-r from-primary-500 to-secondary-400 hover:from-primary-700 hover:to-secondary-500"
              >
                <Link href="/contact-us" onClick={() => setIsMenuOpen(false)}>
                  Get Started
                </Link>
              </Button>

              <div className="flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 mt-4">
                <button
                  onClick={() => setCurrency("USD")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    currency === "USD"
                      ? "bg-white text-primary shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  US Dollars ($)
                </button>
                <button
                  onClick={() => setCurrency("NGN")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    currency === "NGN"
                      ? "bg-white text-primary shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  Naira (₦)
                </button>
              </div>
            </nav>
          </motion.div>
        )}
      </div>
    </motion.header>
  );
}
