"use client";

import { courses } from "@/lib/courses";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  GraduationCap,
  Send,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function CoursePage() {
  const params = useParams();
  const courseId = params.id as string;
  const course = courses.find((c) => c.id === courseId);

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Course Not Found</h1>
          <Link href="/" className="text-primary hover:underline">
            Go back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
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
                <course.icon className="w-8 h-8" />
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

            <div className="bg-white p-8 rounded-4xl border border-border shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full translate-x-1/2 -translate-y-1/2" />
              <h3 className="text-2xl font-bold mb-6">Course Quick Facts</h3>
              <ul className="space-y-4 mb-8 text-slate-600">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent-500 mt-0.5 shrink-0" />
                  <span>48 Live instructor-led sessions</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent-500 mt-0.5 shrink-0" />
                  <span>1-on-1 mentorship</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent-500 mt-0.5 shrink-0" />
                  <span>Personalized feedback & mentorship</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent-500 mt-0.5 shrink-0" />
                  <span>Lifetime access to course materials</span>
                </li>
              </ul>
              <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 mb-8">
                <div>
                  <span className="text-sm font-medium text-slate-500 block">
                    Total Investment
                  </span>
                  <span className="text-3xl font-black text-slate-900">
                    {course.price}
                  </span>
                </div>
                <Link
                  href="/contact-us"
                  className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center text-center"
                >
                  Enroll Now
                </Link>
              </div>
              <p className="text-center text-sm text-slate-500">
                Not ready yet?{" "}
                <Link
                  href="/contact-us"
                  className="text-primary font-bold hover:underline"
                >
                  Enroll Now
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Curriculum Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl lg:text-4xl font-heading font-black mb-12 text-center">
            What You'll Learn
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
                <h4 className="text-xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
                    {idx + 1}
                  </span>
                  {module.module}
                </h4>
                <ul className="grid sm:grid-cols-2 gap-4">
                  {module.lessons.map((lesson, lIdx) => (
                    <li
                      key={lIdx}
                      className="flex items-center gap-3 text-slate-600"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                      {lesson}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="pb-24 px-6 text-center">
        <div className="max-w-7xl mx-auto bg-slate-900 rounded-[3rem] p-12 lg:p-24 text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-primary/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
          <h2 className="text-3xl lg:text-5xl font-heading font-black mb-8 relative z-10">
            Start Your Journey with <br className="hidden sm:block" />{" "}
            {course.title}
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 relative z-10">
            <Link
              href="/contact-us"
              className="bg-primary text-primary-foreground px-12 py-5 rounded-2xl font-black text-xl hover:bg-white hover:text-primary transition-all shadow-xl shadow-black/20 active:scale-95 text-center flex items-center justify-center"
            >
              Enroll Now
            </Link>
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
    </main>
  );
}
