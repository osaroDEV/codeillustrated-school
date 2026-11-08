"use client";

import { CourseIcon } from "@/components/course-icon";
import type { Course } from "@/lib/course-types";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  GraduationCap,
  Send,
} from "lucide-react";
import Link from "next/link";
import { EnrollOptions } from "./enroll-options";

interface CourseDetailClientProps {
  course: Course;
}

export default function CourseDetailClient({
  course,
}: CourseDetailClientProps) {
  return (
    <>
      {/* Hero Section */}
      <div className="pt-32 pb-16 bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-6">
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Courses
          </Link>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div
                className={`${course.bg} ${course.color} w-16 h-16 rounded-2xl flex items-center justify-center mb-6`}
              >
                <CourseIcon icon={course.icon} className="w-8 h-8" />
              </div>
              <h1 className="text-4xl lg:text-6xl font-heading font-black mb-6">
                {course.title}
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed mb-8">
                {course.fullDescription}
              </p>

              <div className="flex flex-wrap gap-4 mb-8">
                <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full text-sm font-semibold text-slate-600">
                  <Clock className="w-4 h-4" />
                  {course.duration}
                </div>
                <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full text-sm font-semibold text-slate-600">
                  <GraduationCap className="w-4 h-4" />
                  {course.level}
                </div>
                <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full text-sm font-semibold text-primary-600">
                  {course.age}
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-4xl border border-border shadow-xl relative overflow-hidden flex flex-col h-full">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full translate-x-1/2 -translate-y-1/2" />
              <h2 className="text-2xl font-bold mb-6">Course Benefits</h2>
              <ul className="space-y-4 mb-8 text-slate-600 flex-1">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent-500 mt-0.5 shrink-0" />
                  <span>Live instructor-led sessions</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent-500 mt-0.5 shrink-0" />
                  <span>Hands-on project-based learning</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent-500 mt-0.5 shrink-0" />
                  <span>Lifetime access to course materials</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent-500 mt-0.5 shrink-0" />
                  <span>Certificate of Completion</span>
                </li>
              </ul>

              <EnrollOptions course={course} />

              <p className="text-center text-sm text-slate-500 mt-6">
                Not ready yet?{" "}
                <Link
                  href="/resources"
                  className="text-primary font-bold hover:underline"
                >
                  Check our free resources
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Curriculum Section */}
      <section className="py-24 px-6" aria-label="Course curriculum">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl lg:text-4xl font-heading font-black mb-12 text-center">
            What You&apos;ll Learn
          </h2>

          <div className="space-y-8">
            {course.curriculum.map((module, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="bg-white p-8 rounded-3xl border border-border hover:shadow-lg transition-all"
              >
                <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
                    {idx + 1}
                  </span>
                  {module.module}
                </h3>
                <ul className="grid sm:grid-cols-2 gap-4">
                  {module.lessons.map((lesson, lIdx) => (
                    <li
                      key={lIdx}
                      className="flex items-center gap-3 text-slate-600"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                      {module.previewIds?.[lIdx] ? (
                        <Link
                          href={`/dashboard/courses/${course.id}/lessons/${module.previewIds[lIdx]}`}
                          className="text-primary font-medium hover:underline"
                        >
                          {lesson} <span className="text-xs font-bold uppercase tracking-wide">· Free preview</span>
                        </Link>
                      ) : (
                        lesson
                      )}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        className="pb-24 px-6 text-center"
        aria-label="Enroll call to action"
      >
        <div className="max-w-7xl mx-auto bg-slate-900 rounded-[3rem] p-12 lg:p-24 text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-primary/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
          <h2 className="text-3xl lg:text-5xl font-heading font-black mb-8 relative z-10">
            Start Your Journey with <br className="hidden sm:block" />{" "}
            {course.title}
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 relative z-10">
            <a
              href={course.offerings?.length ? "#enroll" : "https://wa.me/447405786279"}
              {...(course.offerings?.length ? {} : { target: "_blank", rel: "noreferrer" })}
              className="bg-gradient-to-r from-primary-500 to-secondary-400 hover:from-primary-700 hover:to-secondary-500 px-12 py-5 rounded-2xl font-black text-xl hover:bg-white hover:text-primary transition-all shadow-xl shadow-black/20 active:scale-95 text-center flex items-center justify-center"
            >
              Enroll Now
            </a>
            <Link
              href="mailto:info@codeillustrated.com"
              className="bg-transparent border border-white/30 hover:bg-white/10 px-12 py-5 rounded-2xl font-bold transition-all text-center flex items-center justify-center text-white gap-3"
            >
              Ask a Question
              <Send className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
