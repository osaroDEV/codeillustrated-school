import Link from "next/link";
import { ArrowRight, Check, Compass, Hourglass } from "lucide-react";
import { COURSE_FINDER_PATH } from "@/lib/routes";

type Step = { title: string; body: string; done: boolean };

/**
 * Shown on the dashboard overview to a learner with no active course: what
 * they've done so far and what comes next, so a new account never lands on a
 * page of empty cards.
 */
export function GettingStarted() {
  const steps: Step[] = [
    { title: "Create your account", body: "Done. Welcome to Code Illustrated.", done: true },
    { title: "Verify your email", body: "Done. Your account is active.", done: true },
    {
      title: "Choose a course",
      body: "Answer three quick questions, or browse every course with its ages, level and prices.",
      done: false,
    },
    {
      title: "Enrol",
      body: "Pick group classes, 1-on-1 classes or self-paced learning on the course page and pay monthly by card.",
      done: false,
    },
    {
      title: "Start learning",
      body: "Self-paced lessons open straight away. For live classes we place you in a class and email your schedule.",
      done: false,
    },
  ];
  const next = steps.findIndex((s) => !s.done);

  return (
    <section
      aria-labelledby="getting-started-title"
      className="relative overflow-hidden rounded-2xl border border-[#ffbd59]/20 bg-gradient-to-br from-[#ffbd59]/[0.07] via-white/[0.03] to-[#1a596c]/[0.12] p-6 sm:p-7"
    >
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#c31d24]/15 blur-3xl" />
      <div className="relative">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#ffbd59]">Getting started</p>
        <h2 id="getting-started-title" className="text-xl font-bold text-white">
          Let&apos;s find your first course
        </h2>
        <p className="mt-1 text-sm text-white/50">
          {steps.filter((s) => s.done).length} of {steps.length} steps done
        </p>

        <ol className="mt-6 space-y-4">
          {steps.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  step.done
                    ? "bg-green-500/20 text-green-400"
                    : i === next
                      ? "bg-[#ffbd59] text-[#0a0a0f]"
                      : "border border-white/15 text-white/40"
                }`}
              >
                {step.done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${step.done ? "text-white/45 line-through decoration-white/20" : "text-white"}`}>
                  {step.title}
                </p>
                {!step.done && <p className="mt-0.5 text-sm text-white/50">{step.body}</p>}
                {i === next && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={COURSE_FINDER_PATH}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#c31d24] to-[#e53535] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#c31d24]/25 transition-all hover:from-[#b01a20] hover:to-[#c31d24]"
                    >
                      <Compass className="h-4 w-4" /> Find your course
                    </Link>
                    <Link
                      href="/courses"
                      className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
                    >
                      Browse all courses <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** For a learner with a live seat who hasn't been placed in a class yet. */
export function AwaitingPlacement({ courseTitles }: { courseTitles: string[] }) {
  if (!courseTitles.length) return null;
  return (
    <div className="flex gap-4 rounded-2xl border border-[#3da3bc]/25 bg-[#1a596c]/15 p-5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1a596c]/30 text-[#7fd0e3]">
        <Hourglass className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">You&apos;re in. We&apos;re placing you in a class.</p>
        <p className="mt-0.5 text-sm text-white/55">
          We&apos;ll email your class schedule for {courseTitles.join(" and ")} once you&apos;re placed. Your classes
          then appear under Schedule. Lessons you can open already are under My Courses.
        </p>
      </div>
    </div>
  );
}
