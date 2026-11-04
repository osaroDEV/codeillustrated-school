"use client";

import { CourseIcon } from "@/components/course-icon";
import type { Course } from "@/lib/course-types";
import { motion } from "framer-motion";
import { PriceDisplay } from "./price-display";
import Link from "next/link";

export default function CoursesPageClient({ courses }: { courses: Course[] }) {
  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="text-center mb-16">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-black mb-6">
          Beginner Coding Courses & Training
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Discover the perfect learning path for you. From beginner basics to
          advanced development, we have everything you need to start your tech
          journey.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {courses.map((course, idx) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="group relative p-8 rounded-[2rem] bg-white border border-border hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 flex flex-col items-start h-full"
          >
            <div
              className={`${course.bg} ${course.color} w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}
            >
              <CourseIcon icon={course.icon} className="w-8 h-8" />
            </div>
            <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-xs font-bold text-slate-600 mb-4 tracking-wider uppercase">
              {course.age}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold mb-4">
              {course.title}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-6 flex-1 line-clamp-3">
              {course.description}
            </p>
            <div className="mt-auto w-full pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Starts from</span>
                <PriceDisplay price={course.price.group} className="text-lg text-slate-900" />
              </div>
              <Link
                href={`/courses/${course.slug}`}
                className="text-primary font-bold inline-flex items-center gap-2 group/btn hover:underline after:absolute after:inset-0"
              >
                Details
                <span className="block w-2 h-2 bg-primary rounded-full group-hover/btn:w-6 transition-all" />
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
