"use client";

import type { CourseSummary } from "@/lib/course-types";
import { Instagram, Mail, MapPin, Phone, Twitter } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import codeillIcon from "../public/code-ill.svg";

export default function Footer({ courses }: { courses: CourseSummary[] }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-border pt-24 pb-12 bg-gradient-to-br from-slate-900 via-accent-950 to-slate-900">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center space-x-2">
              <Image
                src={codeillIcon}
                alt="Code Illustrated Online School logo – 1-on-1 beginner coding training"
                width={40}
                height={40}
                className="h-10 w-10"
              />
              <span className="hidden sm:block lg:text-xl font-bold bg-gradient-to-r from-primary-500 to-secondary-400 bg-clip-text text-transparent">
                Code Illustrated Online School
              </span>
              <span className="sm:hidden text-xl font-bold bg-gradient-to-r from-primary-500 to-secondary-400 bg-clip-text text-transparent">
                Code Illustrated
              </span>
            </Link>
            <p className="text-sm sm:text-base text-white/75 leading-relaxed mb-8">
              Empowering the next generation of builders through visual
              illustration and interactive mentorship.
            </p>
            <div className="flex gap-4">
              {[
                {
                  href: "https://x.com/codeillustrated",
                  label: "X @codeillustrated",
                  Icon: Twitter,
                },
                {
                  href: "https://www.instagram.com/code_illustrated_online_school",
                  label: "Instagram @code_illustrated_online_school",
                  Icon: Instagram,
                },
              ].map(({ href, label, Icon }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="w-10 h-10 rounded-full border border-white flex items-center justify-center text-white hover:text-primary hover:border-primary transition-all"
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-base text-white sm:text-lg mb-6">
              Learning
            </h4>
            <ul className="space-y-4">
              {[
                ...courses.map((c) => ({
                  name: c.title,
                  href: `/courses/${c.id}`,
                })),
              ].map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-white/75 round hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-base text-white sm:text-lg mb-6">
              Company
            </h4>
            <ul className="space-y-4">
              <li className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-red-400" />
                <a
                  href="mailto:admin@codeillustrated.com"
                  className="text-white/75 hover:text-red-400 transition-colors"
                >
                  admin@codeillustrated.com
                </a>
              </li>
              <li className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-red-400" />
                <a
                  href="https://wa.me/447405786279"
                  className="text-white/75 hover:text-red-400 transition-colors"
                >
                  +44 7405 786 279
                </a>
              </li>
              <li className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-red-400" />
                <span className="text-white/75">Online Worldwide</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-base text-white sm:text-lg mb-6">
              Newsletter
            </h4>
            <p className="text-white/75 mb-6">
              Get coding tips and school updates delivered to your inbox.
            </p>
            <NewsletterForm />
          </div>
        </div>

        <div className="pt-12 border-t border-border flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-white">
          <p>
            © {currentYear} Code Illustrated Online School. All rights reserved.
          </p>
          <div className="flex gap-8">
            <Link href="/terms-of-service" className="hover:text-white/60">
              Terms of Service
            </Link>
            <Link href="/privacy-policy" className="hover:text-white/60">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/academy/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setStatus("success");
        setMessage("Awesome! You're subscribed.");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(
          data.error || data.message || "Something went wrong. Try again.",
        );
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
      setMessage("Failed to subscribe. Check your connection.");
    }
  };

  return (
    <form className="flex flex-col gap-3 group" onSubmit={handleSubmit}>
      <div className="relative">
        <input
          type="email"
          placeholder="subscriber@email.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-white/5 border border-white/10 px-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all text-white placeholder:text-white/30 disabled:opacity-50"
          disabled={status === "loading" || status === "success"}
        />
        {status === "loading" && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      <button
        type="submit"
        disabled={status === "loading" || status === "success"}
        className="relative overflow-hidden bg-gradient-to-r from-primary-500 to-secondary-400 text-white font-bold py-3.5 rounded-xl hover:shadow-lg hover:shadow-primary-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        <span className="relative z-10">
          {status === "success"
            ? "Subscribed!"
            : status === "loading"
              ? "Joining..."
              : "Subscribe"}
        </span>
      </button>
      {message && (
        <p
          className={`text-sm font-medium mt-1 animate-in fade-in slide-in-from-top-1 ${status === "success" ? "text-secondary-400" : "text-red-400"}`}
        >
          {message}
        </p>
      )}
    </form>
  );
}
