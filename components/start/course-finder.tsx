"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Code2,
  HelpCircle,
  MessageCircle,
  MonitorPlay,
  Pencil,
  RotateCcw,
  Rocket,
  Smile,
  Sprout,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { CourseIcon } from "@/components/course-icon";
import { GROUP_STYLES } from "@/components/course-card-styles";
import { buttonClass, Eyebrow, WHATSAPP_URL } from "@/components/marketing/ui";
import { PriceDisplay } from "@/components/price-display";
import { ageGroup, displayAge, lowestMonthlyPrice, type AgeGroup } from "@/lib/course-groups";
import type { Course, OfferingKind } from "@/lib/course-types";
import {
  buyableKinds,
  freeClassMessage,
  recommendCourses,
  whatsAppLink,
  type Experience,
  type FinderAnswers,
  type Format,
  type Learner,
} from "@/lib/course-finder";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<OfferingKind, string> = {
  cohort_group: "Live group classes",
  self_paced: "Self-paced",
};

type Choice<T extends string> = {
  value: T;
  label: string;
  hint: string;
  icon: LucideIcon;
  /** Shorter text for the answer chips on the results. */
  chip?: string;
  /** Learner answers take their age group's colour, as on /courses. */
  group?: AgeGroup;
};

const QUESTIONS = [
  {
    key: "learner",
    title: "Who is learning?",
    choices: [
      { value: "child", label: "My child", hint: "Ages 8 to 12", icon: Smile, group: "kids" },
      { value: "teen", label: "A teenager", hint: "Ages 13 to 17", icon: Rocket, group: "teens" },
      { value: "adult", label: "Me", hint: "18 or older", icon: User, chip: "For me", group: "adults" },
    ] as Choice<Learner>[],
  },
  {
    key: "experience",
    title: "Any coding experience?",
    choices: [
      { value: "new", label: "Brand new", hint: "Never written code, or only a little", icon: Sprout },
      { value: "some", label: "Some experience", hint: "Has built a page, game or small project", icon: Code2 },
    ] as Choice<Experience>[],
  },
  {
    key: "format",
    title: "How would you like to learn?",
    choices: [
      { value: "cohort_group", label: "Live group classes", hint: "Small groups with a tutor, on a schedule", icon: Users },
      { value: "self_paced", label: "At my own pace", hint: "Lessons and recordings, no live classes", icon: MonitorPlay },
      { value: "any", label: "Not sure yet", hint: "Show me what fits", icon: HelpCircle },
    ] as Choice<Format>[],
  },
] as const;

type DraftAnswers = { [K in keyof FinderAnswers]?: FinderAnswers[K] };

export function CourseFinder({ courses }: { courses: Course[] }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<DraftAnswers>({});
  // Set when an answer chip on the results sends the visitor back to one question.
  const [editing, setEditing] = useState(false);
  const done = step >= QUESTIONS.length;

  // Move focus to the new heading after each step, so keyboard and screen
  // reader users don't lose their place when the answer they pressed disappears.
  const container = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    container.current?.querySelector<HTMLElement>("[data-step-heading]")?.focus();
  }, [step]);

  function choose(key: keyof FinderAnswers, value: string) {
    setAnswers((a) => ({ ...a, [key]: value }));
    setStep((s) => (editing ? QUESTIONS.length : s + 1));
    setEditing(false);
  }

  function edit(index: number) {
    setEditing(true);
    setStep(index);
  }

  function backToResults() {
    setEditing(false);
    setStep(QUESTIONS.length);
  }

  function restart() {
    setAnswers({});
    setEditing(false);
    setStep(0);
  }

  return (
    <div ref={container} className={cn("mx-auto w-full", done ? "max-w-5xl" : "max-w-3xl")}>
      {!done ? (
        <Question
          index={step}
          onChoose={(v) => choose(QUESTIONS[step].key, v)}
          onBack={editing ? backToResults : step > 0 ? () => setStep((s) => s - 1) : undefined}
          backLabel={editing ? "Back to results" : "Back"}
          selected={answers[QUESTIONS[step].key]}
        />
      ) : (
        <Results courses={courses} answers={answers as FinderAnswers} onEdit={edit} onRestart={restart} />
      )}
    </div>
  );
}

function Question({
  index,
  onChoose,
  onBack,
  backLabel,
  selected,
}: {
  index: number;
  onChoose: (value: string) => void;
  onBack?: () => void;
  backLabel: string;
  selected?: string;
}) {
  const q = QUESTIONS[index];
  const choices = q.choices as readonly Choice<string>[];
  return (
    <section
      aria-labelledby={`q-${q.key}`}
      className="rounded-3xl border border-surface-line bg-white p-6 shadow-[0_24px_60px_-36px_rgba(18,51,61,0.45)] sm:p-10"
    >
      <div className="flex min-h-[44px] items-center justify-between gap-4">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="-ml-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-2 text-[15px] font-semibold text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {backLabel}
          </button>
        ) : (
          <span />
        )}
        <p className="text-[15px] font-semibold text-ink-muted">
          Question {index + 1} of {QUESTIONS.length}
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-line" aria-hidden="true">
        <div
          className="h-full rounded-full bg-primary-500 transition-[width] duration-300"
          style={{ width: `${((index + 1) / QUESTIONS.length) * 100}%` }}
        />
      </div>

      <h2
        id={`q-${q.key}`}
        data-step-heading
        tabIndex={-1}
        className="mt-8 font-heading text-[28px] font-bold leading-tight text-ink focus:outline-none sm:text-4xl"
      >
        {q.title}
      </h2>

      <div className={cn("mt-6 grid gap-3", choices.length === 3 ? "md:grid-cols-3" : "sm:grid-cols-2")}>
        {choices.map((c) => {
          const isSelected = selected === c.value;
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => onChoose(c.value)}
              aria-pressed={isSelected}
              className={cn(
                "group flex min-h-[64px] items-start gap-4 rounded-2xl border-2 p-5 text-left transition-colors hover:border-accent-500 focus-visible:border-accent-500 focus-visible:outline-none md:flex-col md:items-stretch md:gap-3",
                isSelected ? "border-accent-500 bg-surface-teal" : c.group ? GROUP_STYLES[c.group].card : "border-surface-line bg-white"
              )}
            >
              <span
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                  c.group ? GROUP_STYLES[c.group].badge : "bg-surface-teal text-accent-500"
                )}
              >
                <c.icon className="h-[22px] w-[22px]" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-center justify-between gap-2 text-[17px] font-semibold text-ink">
                  {c.label}
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent-500"
                    aria-hidden="true"
                  />
                </span>
                <span className="text-[15px] leading-snug text-ink-muted">{c.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Results({
  courses,
  answers,
  onEdit,
  onRestart,
}: {
  courses: Course[];
  answers: FinderAnswers;
  onEdit: (questionIndex: number) => void;
  onRestart: () => void;
}) {
  const picks = recommendCourses(courses, answers);
  const formatLabel = answers.format === "any" ? null : KIND_LABEL[answers.format];
  const bookingLink = whatsAppLink(WHATSAPP_URL, freeClassMessage(answers, picks[0]?.course.title));

  return (
    <section aria-labelledby="results-title">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
        <Eyebrow>Your match</Eyebrow>
        <h2
          id="results-title"
          data-step-heading
          tabIndex={-1}
          className="font-heading text-3xl font-extrabold leading-tight tracking-tight text-ink focus:outline-none sm:text-[44px] sm:leading-[1.1]"
        >
          {picks.length > 1 ? "We'd start with one of these" : "We'd start here"}
        </h2>
        <p className="text-lg leading-relaxed text-ink-muted">
          Open a course to see what it covers, then create your account and enrol from that page.
        </p>
        <ul className="mt-2 flex flex-wrap justify-center gap-2" aria-label="Your answers">
          {QUESTIONS.map((q, i) => {
            const choice = (q.choices as readonly Choice<string>[]).find((c) => c.value === answers[q.key]);
            if (!choice) return null;
            const text = choice.chip ?? choice.label;
            return (
              <li key={q.key}>
                <button
                  type="button"
                  onClick={() => onEdit(i)}
                  aria-label={`${text}. Change your answer to "${q.title}"`}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-surface-line bg-white px-4 text-[15px] font-semibold text-ink transition-colors hover:border-accent-500 focus-visible:border-accent-500 focus-visible:outline-none"
                >
                  {text}
                  <Pencil className="h-3.5 w-3.5 text-ink-subtle" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {picks.length === 0 ? (
        <p className="mx-auto mt-10 max-w-xl rounded-2xl bg-white p-6 text-center text-ink-muted">
          No courses are open right now. Message us on WhatsApp below and we&apos;ll help.
        </p>
      ) : (
        <div className={cn("mt-10 grid gap-6", picks.length > 1 && "md:grid-cols-2")}>
          {picks.map(({ course, formatAvailable }, i) => (
            <ResultCard
              key={course.id}
              course={course}
              best={i === 0}
              chosenFormat={answers.format}
              formatNote={formatLabel && !formatAvailable ? formatLabel : null}
            />
          ))}
        </div>
      )}

      <div className="mt-10 flex flex-wrap items-center justify-between gap-6 rounded-[28px] bg-primary-500 px-5 py-8 sm:px-10 sm:py-9">
        <div className="flex flex-[1_1_320px] flex-col gap-2">
          <h3 className="font-heading text-2xl font-extrabold leading-tight text-white sm:text-[32px]">
            Try your first class free
          </h3>
          <p className="text-[17px] leading-relaxed text-[#ffe9ea]">No card needed. Message us on WhatsApp to book it.</p>
        </div>
        <a href={bookingLink} target="_blank" rel="noreferrer" className={buttonClass("white", false, "w-full px-5 text-base sm:w-auto sm:px-7 sm:text-[17px]")}>
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          Book a free class on WhatsApp
        </a>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[15px]">
        <Link href="/courses" className="inline-flex min-h-[44px] items-center font-semibold text-accent-500 underline-offset-4 hover:underline">
          See all courses
        </Link>
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex min-h-[44px] items-center gap-1.5 font-medium text-ink-muted hover:text-ink"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Start again
        </button>
      </div>
    </section>
  );
}

function ResultCard({
  course,
  best,
  chosenFormat,
  formatNote,
}: {
  course: Course;
  best: boolean;
  chosenFormat: Format;
  formatNote: string | null;
}) {
  const style = GROUP_STYLES[ageGroup(course)];
  const kinds = buyableKinds(course);
  const meta = [displayAge(course.age), course.level, course.duration].filter(Boolean).join(" · ");

  return (
    <article
      className={cn(
        "relative flex flex-col gap-5 rounded-3xl border-2 p-7 text-ink sm:p-8",
        style.card,
        best && "border-accent-500"
      )}
    >
      {best && (
        <span className="absolute -top-3.5 left-7 rounded-full bg-accent-500 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-white">
          Best match
        </span>
      )}
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-accent-500">
          <CourseIcon icon={course.icon} className="h-7 w-7" />
        </span>
        <div className="min-w-0">
          <h3 className="font-heading text-[24px] font-bold leading-tight sm:text-[26px]">{course.title}</h3>
          <p className="mt-1 text-sm text-ink-muted">{meta}</p>
        </div>
      </div>

      <p className="line-clamp-3 text-base leading-relaxed text-ink-muted">{course.description}</p>

      {kinds.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Ways to take this course">
          {kinds.map((k) => (
            <li
              key={k}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-semibold",
                chosenFormat === k ? "text-accent-500 ring-2 ring-accent-500" : "text-ink-muted"
              )}
            >
              {k === "cohort_group" ? <Users className="h-4 w-4" aria-hidden="true" /> : <MonitorPlay className="h-4 w-4" aria-hidden="true" />}
              {KIND_LABEL[k]}
            </li>
          ))}
        </ul>
      )}
      {formatNote && (
        <p className="rounded-xl bg-white px-4 py-3 text-sm leading-relaxed text-ink-muted">
          {formatNote} aren&apos;t open for this course yet. Ask us about it on WhatsApp, or choose another option.
        </p>
      )}

      <div className={cn("mt-auto flex flex-wrap items-center justify-between gap-4 border-t pt-5", style.line)}>
        <p className="text-[15px] text-ink-muted">
          from <PriceDisplay price={lowestMonthlyPrice(course)} showPeriod={false} className="text-xl font-bold text-ink" />
          /mo
        </p>
        <Link href={`/courses/${course.slug}#enroll`} className={buttonClass("primary", false, "whitespace-nowrap")}>
          View course &amp; enrol
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
