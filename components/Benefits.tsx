"use client";

import { motion } from "framer-motion";
import { Clock, Cpu, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";

const benefits = [
  {
    title: "Flexible Schedule",
    desc: "Choose from crash courses or extended programs that fit your timeline.",
    icon: Clock,
  },
  {
    title: "Industry Standard",
    desc: "Learn tools used by Google, Meta, and Netflix. Stay ahead of the technology curve.",
    icon: Cpu,
  },
  {
    title: "Safe Environment",
    desc: "A strictly moderated, safe community where everyone is encouraged to grow.",
    icon: ShieldCheck,
  },
  {
    title: "Fast Results",
    desc: "Our visual illustration method helps students grasp logic 3x faster than traditional styles.",
    icon: Zap,
  },
];

export default function Benefits() {
  return (
    <section
      id="benefits"
      className="py-24 bg-primary text-primary-foreground relative overflow-hidden"
    >
      {/* Texture/Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#fff_1px,transparent_1px)] bg-size-[20px_20px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <div>
            <p className="text-white/70 font-bold tracking-widest uppercase text-sm mb-4">
              Why Choose Us?
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-6xl font-heading font-black mb-8 leading-tight">
              Clear Tutoring, <br />
              Real Progress.
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-primary-100 mb-10 leading-relaxed max-w-lg">
              We bridge the gap between "hard science" and "playful discovery".
              Our students don't just "learn" – they thrive in a digital
              playground.
            </p>
            <a
              href="/academy/files/Code_Illustrated_Prospectus_2026.pdf"
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-white text-primary px-8 py-4 rounded-2xl font-bold hover:bg-zinc-100 transition-all shadow-xl shadow-black/20 active:scale-95 text-center"
            >
              Download Prospectus
            </a>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {benefits.map((benefit, idx) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl"
              >
                <div className="bg-white text-primary w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                  <benefit.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-4">
                  {benefit.title}
                </h3>
                <p className="text-sm sm:text-base text-primary-100 leading-relaxed">
                  {benefit.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
