"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Rocket, Target, Users } from "lucide-react";

const features = [
  {
    title: "Student-Centered",
    description: "We tailor every session to the student's pace and interests.",
    icon: Users,
    color: "bg-accent-500",
  },
  {
    title: "Practical Projects",
    description: "Build apps, games, and websites from day one.",
    icon: Rocket,
    color: "bg-secondary-500",
  },
  {
    title: "Guided Mentorship",
    description: "Live interaction with industry experts who love teaching.",
    icon: Target,
    color: "bg-primary-500",
  },
];

export default function About() {
  return (
    <section id="about" className="py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-primary font-bold tracking-widest uppercase text-sm mb-4">
            About the School
          </h2>
          <h3 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-black mb-6 leading-tight">
            Learn Coding the Way It Should Be Taught
          </h3>
          <p className="text-base sm:text-lg text-muted-foreground">
            Code Illustrated isn't just another video course. We are a live,
            interactive online academy dedicated to making programming
            accessible, fun, and meaningful.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <div className="aspect-square bg-white rounded-3xl overflow-hidden shadow-2xl border border-border p-2">
              <div className="w-full h-full bg-slate-100 rounded-2xl flex items-center justify-center text-8xl">
                🎨
              </div>
            </div>
            {/* Overlay card */}
            <div className="absolute -bottom-10 -right-6 lg:-right-10 bg-white p-6 rounded-2xl shadow-xl border border-border max-w-[280px]">
              <div className="flex gap-4 items-start">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-foreground">Our Philosophy</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    "If you can't illustrate it, you don't understand it well
                    enough."
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-10">
            {features.map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="flex gap-6"
              >
                <div
                  className={`${feature.color} w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg`}
                >
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h4 className="text-lg sm:text-xl font-bold mb-2">
                    {feature.title}
                  </h4>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
