import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EnrolSteps } from "@/components/enrol-steps";
import { buttonClass, SectionHeading } from "@/components/marketing/ui";
import { COURSE_FINDER_PATH } from "@/lib/routes";

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 py-20 sm:py-24" aria-labelledby="how-title">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-11 px-4 sm:px-6">
        <SectionHeading id="how-title" eyebrow="How it works" title="From first click to certificate in four steps" />
        <EnrolSteps />
        <div>
          <Link href={COURSE_FINDER_PATH} className={buttonClass()}>
            Find your course <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
