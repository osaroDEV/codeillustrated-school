import Link from "next/link";
import type { Course } from "@/lib/course-types";
import { ageGroup, displayAge, lowestMonthlyPrice } from "@/lib/course-groups";
import { GROUP_STYLES } from "@/components/course-card-styles";
import { SectionHeading } from "@/components/marketing/ui";
import { PriceDisplay } from "./price-display";
import { cn } from "@/lib/utils";

/** Home page course cards. The whole card links to the course. */
export default function Courses({ courses }: { courses: Course[] }) {
  return (
    <section id="courses" className="scroll-mt-20 py-20 sm:py-24">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <SectionHeading
            eyebrow="Our courses"
            title="A course for every age and stage"
            intro="Every course comes two ways: live group classes, or self-paced lessons on a monthly or yearly subscription."
          />
          <Link href="/courses" className="py-2 font-semibold text-accent-500 hover:underline">
            Compare all courses →
          </Link>
        </div>

        <ul className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))]">
          {courses.map((course) => {
            const style = GROUP_STYLES[ageGroup(course)];
            return (
              <li key={course.id} className="flex">
                <Link
                  href={`/courses/${course.slug}`}
                  className={cn(
                    "flex flex-1 flex-col gap-3.5 rounded-[22px] border-2 p-7 text-ink transition-colors hover:border-accent-500 focus-visible:border-accent-500 focus-visible:outline-none",
                    style.card
                  )}
                >
                  <span className={cn("self-start rounded-full px-3 py-1.5 text-[13px] font-bold", style.badge)}>
                    {displayAge(course.age)}
                  </span>
                  <h3 className="font-heading text-[26px] font-bold leading-tight">{course.title}</h3>
                  <p className="flex-grow text-base leading-relaxed text-ink-muted">{course.description}</p>
                  <span className={cn("flex items-center justify-between gap-3 border-t pt-3.5", style.line)}>
                    <span className="text-[15px] text-ink-muted">
                      from <PriceDisplay price={lowestMonthlyPrice(course)} showPeriod={false} className="text-lg font-bold text-ink" />
                      /month
                    </span>
                    <span className="font-semibold text-accent-500">View course →</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
