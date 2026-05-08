"use client";

import { courses } from "@/lib/courses";
import { motion } from "framer-motion";
import { PriceDisplay } from "./price-display";
import Link from "next/link";

export default function Courses() {
  return (
    <section id="courses" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="max-w-2xl">
            <p className="text-secondary-600 font-bold tracking-widest uppercase text-sm mb-4">
              Our Learning Paths
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-black mb-0">
              Curated Courses for Every Level
            </h2>
          </div>
          <p className="text-base sm:text-lg text-muted-foreground flex-1 max-w-sm">
            We follow a structured curriculum that grows with you, from basic
            logic to advanced engineering.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {courses.map((course, idx) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="group p-8 rounded-[2rem] bg-white border border-border hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 flex flex-col items-start h-full"
            >
              <div
                className={`${course.bg} ${course.color} w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}
              >
                <course.icon className="w-8 h-8" />
              </div>
              <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-xs font-bold text-slate-600 mb-4 tracking-wider uppercase">
                {course.age}
              </span>
              <h3 className="text-xl sm:text-2xl font-bold mb-4">
                {course.title}
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-6 flex-1">
                {course.description}
              </p>
              
              <div className="w-full pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Starts from</span>
                  <PriceDisplay price={course.price.group} className="text-lg text-slate-900" />
                </div>
                <Link
                  href={`/courses/${course.id}`}
                  className="text-primary font-bold inline-flex items-center gap-2 group/btn"
                >
                  Details
                  <span className="block w-2 h-2 bg-primary rounded-full group-hover/btn:w-8 transition-all" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
