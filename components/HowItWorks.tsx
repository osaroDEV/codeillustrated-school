import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ENROL_STEPS } from "@/components/enrol-steps";
import { buttonClass, SectionHeading } from "@/components/marketing/ui";
import { COURSE_FINDER_PATH } from "@/lib/routes";

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 py-20 sm:py-24" aria-labelledby="how-title">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-11 px-4 sm:px-6">
        <SectionHeading id="how-title" eyebrow="How it works" title="From first click to certificate in four steps" />
        <ol className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))]">
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
        <div>
          <Link href={COURSE_FINDER_PATH} className={buttonClass()}>
            Find your course <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
