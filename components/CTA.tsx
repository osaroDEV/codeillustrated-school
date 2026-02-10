"use client";

import { Send } from "lucide-react";
import Link from "next/link";

export default function CTA() {
  return (
    <section id="contact" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-br from-primary-600 via-primary-800 to-accent-900 rounded-[3rem] p-12 lg:p-24 text-center text-white relative overflow-hidden shadow-2xl shadow-primary/30">
          {/* Decorative circles */}
          <div className="absolute top-0 left-0 w-96 h-96 bg-secondary-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary-500/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />

          {/* Grid pattern overlay */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto">
            <h2 className="text-4xl sm:text-5xl lg:text-7xl font-heading font-black mb-8 leading-tight drop-shadow-sm">
              Ready to Code Your Future?
            </h2>
            <p className="text-lg sm:text-xl lg:text-2xl text-primary-50 mb-12 leading-relaxed font-medium max-w-2xl mx-auto">
              Book your first free interactive class today. No credit card
              required. Experience the "Illustrated" difference for yourself.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link
                href="/contact-us"
                className="group relative overflow-hidden bg-secondary-500 text-secondary-950 w-full sm:w-auto px-10 py-5 rounded-2xl font-black text-xl hover:bg-secondary-400 transition-all shadow-xl shadow-black/20 hover:shadow-secondary-500/20 active:scale-95 flex items-center justify-center"
              >
                <span className="relative z-10">Enroll Now</span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </Link>
              <Link
                href="mailto:support@codeillustrated.com"
                className="group bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 hover:border-white/40 w-full sm:w-auto px-10 py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all text-white"
              >
                Contact Support
                <Send className="hidden sm:block w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <p className="mt-12 text-primary-200 text-sm font-medium flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-secondary-500 animate-pulse" />
              Limited spots available for this month's cohort
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
