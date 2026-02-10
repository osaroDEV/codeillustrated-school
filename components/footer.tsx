"use client";

import { courses } from "@/lib/courses";
import { Code2, Facebook, Github, Linkedin, Mail, MapPin, Phone, Twitter } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import codeillIcon from "../public/code-ill.svg";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-border pt-24 pb-12 bg-gradient-to-br from-slate-900 via-accent-950 to-slate-900">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center space-x-2">
            <Image
              src={codeillIcon}
              alt="CodeIllustrated Online School"
              width={40}
              height={40}
              className="h-10 w-10"
            />
            <span className="hidden sm:block lg:text-xl font-bold bg-gradient-to-r from-primary-500 to-secondary-400 bg-clip-text text-transparent">
              Code Illustrated Online School
            </span>
            <span className="sm:hidden text-xl font-bold bg-gradient-to-r from-primary-500 to-secondary-400 bg-clip-text text-transparent">
              CodeIllustrated
            </span>
          </Link>
            <p className="text-sm sm:text-base text-white/75 leading-relaxed mb-8">
              Empowering the next generation of builders through visual
              illustration and interactive mentorship.
            </p>
            <div className="flex gap-4">
              {[Twitter, Github, Linkedin, Facebook].map((Icon, i) => (
                <button
                  key={i}
                  className="w-10 h-10 rounded-full border border-white flex items-center justify-center text-white hover:text-primary hover:border-primary transition-all"
                >
                  <Icon className="w-5 h-5" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-base text-white sm:text-lg mb-6">Learning</h4>
            <ul className="space-y-4">
              {[
                { name: "Free Intro Class", href: "/#contact" },
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
            <h4 className="font-bold text-base text-white sm:text-lg mb-6">Company</h4>
            <ul className="space-y-4">
             <li className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-red-400" />
                <a href="mailto:admin@codeillustrated.com" className="text-white/75 hover:text-red-400 transition-colors">admin@codeillustrated.com</a>
              </li>
              <li className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-red-400" />
                <a href="https://wa.me/447405786279" className="text-white/75 hover:text-red-400 transition-colors">+44 7405 786 279</a>
              </li>
              <li className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-red-400" />
                <span className="text-white/75">Online Worldwide</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-base text-white sm:text-lg mb-6">Newsletter</h4>
            <p className="text-white/75 mb-6">
              Get coding tips and school updates delivered to your inbox.
            </p>
            <form className="flex flex-col gap-3">
              <input
                type="email"
                placeholder="parents@email.com"
                className="border border-border px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <button className="bg-secondary-500 text-secondary-950 font-bold py-3 rounded-xl hover:bg-secondary-400 transition-all">
                Subscribe
              </button>
            </form>
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
