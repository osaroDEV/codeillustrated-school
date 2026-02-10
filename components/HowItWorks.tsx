"use client";

import { motion } from "framer-motion";
import { Calendar, MessageSquare, Trophy, Video } from "lucide-react";

const steps = [
  {
    title: "Enroll Now",
    desc: "Meet your guide and discover which path is right for your goals.",
    icon: Calendar,
  },
  {
    title: "Live Virtual Sessions",
    desc: "Join high-energy, live classes with professional instructors.",
    icon: Video,
  },
  {
    title: "Build & Collaborate",
    desc: "Work on real projects and get instant help through our discord.",
    icon: MessageSquare,
  },
  {
    title: "Earn Certifications",
    desc: "Complete challenges and earn recognized proof of your skills.",
    icon: Trophy,
  },
];

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
          <h2 className="text-primary-400 font-bold tracking-widest uppercase text-sm mb-4">
            The Process
          </h2>
          <h3 className="text-3xl sm:text-4xl lg:text-6xl font-heading font-black mb-6">
            Simple 4-Step Journey
          </h3>
          <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto">
            We've streamlined the learning experience to make it as engaging as
            a game but as effective as a university degree.
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
                <div className="hidden lg:block absolute top-10 left-[80%] w-full h-[2px] bg-linear-to-r from-primary/30 to-transparent" />
              )}

              <div className="bg-zinc-900 border border-white/5 p-8 rounded-[2.5rem] h-full transition-transform group-hover:-translate-y-2">
                <div className="text-zinc-700 font-black text-4xl mb-6">
                  0{idx + 1}
                </div>
                <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-primary/20">
                  <step.icon className="w-7 h-7 text-white" />
                </div>
                <h4 className="text-xl sm:text-2xl font-bold mb-4">
                  {step.title}
                </h4>
                <p className="text-sm sm:text-base text-zinc-400 leading-relaxed italic">
                  "{step.desc}"
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
