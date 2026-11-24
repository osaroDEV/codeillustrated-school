import { cn } from "@/lib/utils";

export const ENROL_STEPS = [
  {
    title: "Choose a course",
    body: "Answer three quick questions or browse the catalogue. Every course page lists its ages, level and prices.",
  },
  {
    title: "Create your account",
    body: "Sign up for free, then choose live group classes or self-paced learning and pay by card.",
  },
  {
    title: "Start learning",
    body: "We place you in a live class and email your schedule, or start self-paced lessons straight away from your dashboard.",
  },
  {
    title: "Track progress, earn a certificate",
    body: "Lessons, quizzes and projects show your progress. Finish the course to earn a certificate you can share.",
  },
] as const;

/** The four steps from first visit to certificate, used on the home page and /start. */
export function EnrolSteps({ className }: { className?: string }) {
  return (
    <ol className={cn("grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))]", className)}>
      {ENROL_STEPS.map((step, i) => (
        <li key={step.title} className="flex flex-col gap-3 rounded-[22px] bg-surface-amber p-7">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-500 font-heading text-xl font-extrabold text-white"
            aria-hidden="true"
          >
            {i + 1}
          </span>
          <h3 className="font-heading text-[21px] font-bold leading-snug text-ink">
            <span className="sr-only">Step {i + 1}: </span>
            {step.title}
          </h3>
          <p className="text-base leading-relaxed text-ink-muted">{step.body}</p>
        </li>
      ))}
    </ol>
  );
}
