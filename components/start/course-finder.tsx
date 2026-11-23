"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Check, RotateCcw, Sparkles, Users } from "lucide-react";
import { CourseIcon } from "@/components/course-icon";
import { PriceDisplay } from "@/components/price-display";
import type { Course, OfferingKind } from "@/lib/course-types";
import {
  buyableKinds,
  recommendCourses,
  type Experience,
  type FinderAnswers,
  type Format,
  type Learner,
} from "@/lib/course-finder";
import { cn } from "@/lib/utils";

const WHATSAPP = "https://wa.me/447405786279";

const KIND_LABEL: Record<OfferingKind, string> = {
  cohort_group: "Group classes",
  self_paced: "Self-paced",
};

type Choice<T extends string> = { value: T; label: string; hint: string };

const QUESTIONS = [
  {
    key: "learner",
    title: "Who is learning?",
    choices: [
      { value: "child", label: "My child", hint: "Ages 8 to 12" },
      { value: "teen", label: "A teenager", hint: "Ages 13 to 17" },
      { value: "adult", label: "Me", hint: "18 or older" },
    ] as Choice<Learner>[],
  },
  {
    key: "experience",
    title: "Any coding experience?",
    choices: [
      { value: "new", label: "Brand new", hint: "Never written code, or only a little" },
      { value: "some", label: "Some experience", hint: "Has built a page, game or small project" },
    ] as Choice<Experience>[],
  },
  {
    key: "format",
    title: "How would you like to learn?",
    choices: [
      { value: "cohort_group", label: "Live group classes", hint: "Small groups with a tutor, on a schedule" },
      { value: "self_paced", label: "At my own pace", hint: "Lessons and recordings, no live classes" },
      { value: "any", label: "Not sure yet", hint: "Show me what fits" },
    ] as Choice<Format>[],
  },
] as const;

type DraftAnswers = { [K in keyof FinderAnswers]?: FinderAnswers[K] };

export function CourseFinder({ courses }: { courses: Course[] }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<DraftAnswers>({});
  const done = step >= QUESTIONS.length;

  function choose(key: keyof FinderAnswers, value: string) {
    setAnswers((a) => ({ ...a, [key]: value }));
    setStep((s) => s + 1);
  }

  function restart() {
    setAnswers({});
    setStep(0);
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* Progress */}
      <div className="mb-8 flex items-center justify-center gap-2" aria-hidden>
        {QUESTIONS.map((q, i) => (
          <span
            key={q.key}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              i < step ? "w-8 bg-primary" : i === step ? "w-8 bg-primary/40" : "w-2 bg-slate-200"
            )}
          />
        ))}
        <span className={cn("h-2 rounded-full transition-all duration-300", done ? "w-8 bg-secondary-400" : "w-2 bg-slate-200")} />
      </div>

      {!done ? (
        <Question
          index={step}
          onChoose={(v) => choose(QUESTIONS[step].key, v)}
          onBack={step > 0 ? () => setStep((s) => s - 1) : undefined}
          selected={answers[QUESTIONS[step].key]}
        />
      ) : (
        <Results courses={courses} answers={answers as FinderAnswers} onRestart={restart} />
      )}
    </div>
  );
}

function Question({
  index,
  onChoose,
  onBack,
  selected,
}: {
  index: number;
  onChoose: (value: string) => void;
  onBack?: () => void;
  selected?: string;
}) {
  const q = QUESTIONS[index];
  return (
    <section aria-labelledby={`q-${q.key}`} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-10">
      <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-primary">
        Question {index + 1} of {QUESTIONS.length}
      </p>
      <h2 id={`q-${q.key}`} className="mb-8 text-center text-2xl font-black text-slate-900 sm:text-3xl">
        {q.title}
      </h2>
      <div className={cn("grid gap-3", q.choices.length === 4 ? "sm:grid-cols-2" : q.choices.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        {q.choices.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => onChoose(c.value)}
            aria-pressed={selected === c.value}
            className={cn(
              "group rounded-2xl border-2 px-5 py-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              selected === c.value ? "border-primary bg-primary/5" : "border-slate-200 bg-white"
            )}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="font-bold text-slate-900">{c.label}</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-primary" />
            </span>
            <span className="mt-1 block text-sm text-slate-500">{c.hint}</span>
          </button>
        ))}
      </div>
      {onBack && (
        <button type="button" onClick={onBack} className="mx-auto mt-6 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      )}
    </section>
  );
}

function Results({ courses, answers, onRestart }: { courses: Course[]; answers: FinderAnswers; onRestart: () => void }) {
  const picks = recommendCourses(courses, answers);
  const formatLabel = answers.format === "any" ? null : KIND_LABEL[answers.format];

  return (
    <section aria-labelledby="results-title">
      <div className="mb-8 text-center">
        <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-secondary-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-secondary-800">
          <Sparkles className="h-3.5 w-3.5" /> Your match
        </p>
        <h2 id="results-title" className="text-2xl font-black text-slate-900 sm:text-3xl">
          {picks.length > 1 ? "We'd start with one of these" : "We'd start here"}
        </h2>
        <p className="mt-2 text-slate-600">
          Open a course to see what it covers, then create your account and enrol from that page.
        </p>
      </div>

      {picks.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600">
          No courses are open right now.{" "}
          <a href={WHATSAPP} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">
            Talk to us on WhatsApp
          </a>{" "}
          and we&apos;ll help.
        </p>
      ) : (
        <div className={cn("grid gap-5", picks.length > 1 && "md:grid-cols-2")}>
          {picks.map(({ course, formatAvailable }, i) => {
            const kinds = buyableKinds(course);
            return (
              <article
                key={course.id}
                className={cn(
                  "relative flex flex-col rounded-[2rem] border bg-white p-6 sm:p-8",
                  i === 0 ? "border-primary/30 shadow-xl shadow-primary/10" : "border-slate-200"
                )}
              >
                {i === 0 && (
                  <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                    Best match
                  </span>
                )}
                <div className="mb-5 flex items-center gap-4">
                  <div className={`${course.bg} ${course.color} flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl`}>
                    <CourseIcon icon={course.icon} className="h-7 w-7" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl font-bold text-slate-900">{course.title}</h3>
                    <p className="text-sm text-slate-500">
                      {[course.age, course.level, course.duration].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
                <p className="mb-5 line-clamp-3 text-sm leading-relaxed text-slate-600">{course.description}</p>

                {kinds.length > 0 && (
                  <ul className="mb-5 flex flex-wrap gap-2">
                    {kinds.map((k) => (
                      <li
                        key={k}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                          answers.format === k ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-600"
                        )}
                      >
                        {k === "cohort_group" ? <Users className="h-3 w-3" /> : <BookOpen className="h-3 w-3" />}
                        {KIND_LABEL[k]}
                      </li>
                    ))}
                  </ul>
                )}
                {formatLabel && !formatAvailable && (
                  <p className="mb-5 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {formatLabel} aren&apos;t open for this course yet. Ask us about it, or choose another option.
                  </p>
                )}

                <div className="mt-auto flex items-end justify-between gap-4 border-t border-slate-100 pt-5">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Starts from</span>
                    <PriceDisplay price={course.price.group} className="text-lg text-slate-900" />
                  </div>
                  <Link
                    href={`/courses/${course.slug}#enroll`}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-secondary-400 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:from-primary-700 hover:to-secondary-500"
                  >
                    View course &amp; enrol <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm">
        <Link href="/courses" className="font-semibold text-slate-900 hover:text-primary">
          See all courses
        </Link>
        <button type="button" onClick={onRestart} className="inline-flex items-center gap-1.5 font-medium text-slate-500 hover:text-slate-900">
          <RotateCcw className="h-4 w-4" /> Start again
        </button>
        <a href={WHATSAPP} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-slate-500 hover:text-slate-900">
          <Check className="h-4 w-4" /> Talk to an advisor
        </a>
      </div>
    </section>
  );
}
