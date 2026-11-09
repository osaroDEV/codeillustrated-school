"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ENROL_STEPS } from "@/components/enrol-steps";
import { COURSE_FINDER_PATH, SIGNUP_PATH } from "@/lib/routes";

const steps = ENROL_STEPS.map((s) => ({ title: s.title, desc: s.body, icon: s.icon }));

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="py-24 bg-zinc-950 text-white overflow-hidden relative"
    >
      {/* Decorative gradient */}
      <div className="absolute top-0 right-0 w-[50%] h-full bg-primary/10 blur-[150px] -z-1" />

      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="text-center mb-20">
          <p className="text-primary-400 font-bold tracking-widest uppercase text-sm mb-4">
            The Process
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-6xl font-heading font-black mb-6">
            How to get started
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto">
            Four steps from your first visit to your certificate. Not sure which
            course fits? The course finder suggests one in under a minute.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
          {steps.map((step, idx) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="relative group"
            >
              {/* Connector line for desktop */}
              {idx < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[80%] w-full h-[2px] bg-gradient-to-r from-primary/30 to-transparent" />
              )}

              <div className="bg-zinc-900 border border-white/5 p-8 rounded-[2.5rem] h-full transition-transform group-hover:-translate-y-2">
                <div className="text-zinc-700 font-black text-4xl mb-6">
                  0{idx + 1}
                </div>
                <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-primary/20">
                  <step.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold mb-4">
                  {step.title}
                </h3>
                <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href={COURSE_FINDER_PATH}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-500 to-secondary-400 px-8 py-4 font-bold text-white shadow-xl shadow-primary/20 transition-all hover:from-primary-700 hover:to-secondary-500"
          >
            Find your course <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={SIGNUP_PATH}
            className="inline-flex w-full sm:w-auto items-center justify-center rounded-2xl border border-white/15 px-8 py-4 font-bold text-white transition-colors hover:bg-white/10"
          >
            Create a free account
          </Link>
        </div>
      </div>
    </section>
  );
}
