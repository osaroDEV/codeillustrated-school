"use client";

import { motion } from "framer-motion";
import { Quote, Star } from "lucide-react";
import Image from "next/image";

const testimonials = [
  {
    name: "Sarah Jenkins",
    role: "Parent of 12yo",
    content:
      "My son used to struggle with math, but since joining Code Illustrated, his logic skills have skyrocketed. He's now building his own space shooter game!",
    avatar: "https://i.pravatar.cc/150?u=sarah",
  },
  {
    name: "David Chen",
    role: "Beginner Adult",
    content:
      "I've tried many platforms, but the visual approach here finally made 'classes' and 'objects' click for me. It's truly a game-changer for beginners.",
    avatar: "https://i.pravatar.cc/150?u=david",
  },
  {
    name: "Alex Rivera",
    role: "Student, 15",
    content:
      "The mentors are so cool! They don't just lecture; they actually help you fix bugs and talk about how they build things in their real jobs.",
    avatar: "https://i.pravatar.cc/150?u=alex",
  },
];

export default function Testimonials() {
  return (
    <section className="py-24 bg-muted/50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-primary font-bold tracking-widest uppercase text-sm mb-4">
            Reviews
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-black mb-0">
            Loved by Students
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, idx) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-slate-200 border border-slate-100 flex flex-col relative"
            >
              <div className="absolute top-10 right-10 text-primary-100">
                <Quote className="w-12 h-12 rotate-180" />
              </div>
              <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 text-secondary-500 fill-secondary-500"
                  />
                ))}
              </div>
              <p className="text-base sm:text-lg text-slate-600 italic leading-relaxed mb-8 flex-1">
                &ldquo;{t.content}&rdquo;
              </p>
              <div className="flex items-center gap-4">
                <div className="relative w-14 h-14 shrink-0">
                  <Image
                    src={t.avatar}
                    alt={`Photo of ${t.name}, ${t.role} – Code Illustrated student testimonial`}
                    fill
                    sizes="56px"
                    className="rounded-full border-4 border-slate-50 object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{t.name}</h3>
                  <p className="text-sm text-slate-500 uppercase tracking-wider">
                    {t.role}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
