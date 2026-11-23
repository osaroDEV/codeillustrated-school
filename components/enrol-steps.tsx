import { Award, Compass, MonitorPlay, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

export const ENROL_STEPS = [
  {
    icon: Compass,
    title: "Choose a course",
    body: "Answer three quick questions or browse the catalogue. Every course page lists its ages, level and prices.",
  },
  {
    icon: UserPlus,
    title: "Create your account",
    body: "Sign up for free, then choose live group classes or self-paced learning and pay by card.",
  },
  {
    icon: MonitorPlay,
    title: "Start learning",
    body: "We place you in a live class and email your schedule, or start self-paced lessons straight away from your dashboard.",
  },
  {
    icon: Award,
    title: "Track progress, earn a certificate",
    body: "Lessons, quizzes and projects show your progress. Finish the course to earn a certificate you can share.",
  },
] as const;

/** The four steps from first visit to certificate, used on the home page and /start. */
export function EnrolSteps({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <ol className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {ENROL_STEPS.map((step, i) => (
        <li
          key={step.title}
          className={cn(
            "relative rounded-2xl border border-slate-200 bg-white text-left",
            compact ? "p-5" : "p-6 sm:p-7"
          )}
        >
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <step.icon className="h-5 w-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Step {i + 1}</span>
          </div>
          <h3 className={cn("font-bold text-slate-900", compact ? "mb-1.5 text-base" : "mb-2 text-lg")}>{step.title}</h3>
          <p className="text-sm leading-relaxed text-slate-600">{step.body}</p>
        </li>
      ))}
    </ol>
  );
}
