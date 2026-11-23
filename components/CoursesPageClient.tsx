import Link from "next/link";
import type { Course } from "@/lib/course-types";
import { AGE_GROUPS, ageGroup, displayAge, monthlyPrice, type AgeGroup } from "@/lib/course-groups";
import { parseAgeRange } from "@/lib/course-finder";
import { GROUP_STYLES } from "@/components/course-card-styles";
import { CURRENCY_NOTE, WHATSAPP_URL } from "@/components/marketing/ui";
import { COURSE_FINDER_PATH } from "@/lib/routes";
import { PriceDisplay } from "./price-display";
import { cn } from "@/lib/utils";

/** /courses: every course, grouped by age, with both ways to take it. */
export default function CoursesPageClient({ courses }: { courses: Course[] }) {
  const groups = AGE_GROUPS.map((group) => ({
    ...group,
    courses: courses.filter((c) => ageGroup(c) === group.id),
    // Kids' courses that run into the teens (e.g. ages 8–20) are worth a mention there too.
    alsoFits: group.id === "teens" ? courses.filter((c) => ageGroup(c) === "kids" && parseAgeRange(c.age)[1] >= 13) : [],
  })).filter((g) => g.courses.length || g.alsoFits.length);

  return (
    <>
      <section className="bg-surface-mist pb-12 pt-12 sm:pt-16">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-[22px] px-4 sm:px-6">
          <h1 className="font-heading text-[40px] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-[56px]">
            All courses
          </h1>
          <p className="max-w-[680px] text-lg leading-relaxed text-ink-muted sm:text-[19px]">
            Each course comes in two formats: <strong className="text-ink">live group classes</strong> with a tutor, or{" "}
            <strong className="text-ink">self-paced</strong> lessons. {CURRENCY_NOTE}
          </p>
          <nav aria-label="Jump to an age group" className="flex flex-wrap gap-2.5">
            {groups.map((g) => (
              <a
                key={g.id}
                href={`#${g.id}`}
                className="inline-flex min-h-[44px] items-center rounded-full border-2 border-[#d3e0e4] bg-white px-[18px] text-[15px] font-semibold text-ink transition-colors hover:border-accent-500 hover:text-accent-500"
              >
                {g.label}
              </a>
            ))}
          </nav>
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-[18px] border border-[#dde7ea] bg-white px-6 py-5">
            <p className="text-base leading-normal text-ink">
              <strong>Not sure which course fits?</strong> Answer 3 quick questions and try a free first class. No card
              needed.
            </p>
            <Link href={COURSE_FINDER_PATH} className="py-2 text-base font-bold text-accent-500 hover:underline">
              Find your course →
            </Link>
          </div>
        </div>
      </section>

      {groups.map((group, i) => (
        <section
          key={group.id}
          id={group.id}
          aria-labelledby={`${group.id}-title`}
          className={cn("scroll-mt-20", i === 0 ? "pt-16" : "pt-10", i === groups.length - 1 ? "pb-20" : "pb-6")}
        >
          <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 sm:px-6">
            <div className="flex flex-wrap items-center gap-3.5">
              <span className={cn("rounded-full px-3.5 py-2 text-sm font-bold", GROUP_STYLES[group.id].badge)}>{group.label}</span>
              <h2 id={`${group.id}-title`} className="font-heading text-[26px] font-extrabold text-ink sm:text-[30px]">
                {group.heading}
              </h2>
            </div>
            <ul
              className={cn(
                "grid gap-6",
                group.id === "adults"
                  ? "[grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))]"
                  : "[grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr))]"
              )}
            >
              {group.courses.map((course) => (
                <li key={course.id} className="flex">
                  <CourseCard course={course} group={group.id} />
                </li>
              ))}
              {group.alsoFits.map((course) => (
                <li
                  key={course.id}
                  className="flex flex-1 flex-col justify-center gap-3 rounded-3xl border-2 border-dashed border-surface-line p-7 sm:p-[30px]"
                >
                  <p className="text-base leading-relaxed text-ink-muted">
                    <strong className="text-ink">{course.title}</strong> ({displayAge(course.age).toLowerCase()}) is also a
                    great fit for teens.
                  </p>
                  <Link href={`/courses/${course.slug}`} className="font-semibold text-accent-500 hover:underline">
                    View {course.title} →
                  </Link>
                </li>
              ))}
            </ul>
            {i === groups.length - 1 && (
              <p className="pt-3 text-[15px] text-ink-muted">
                Self-paced can be paid monthly or yearly. Questions?{" "}
                <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="font-semibold text-accent-500 underline-offset-4 hover:underline">
                  Chat with us on WhatsApp
                </a>
                .
              </p>
            )}
          </div>
        </section>
      ))}
    </>
  );
}

function CourseCard({ course, group }: { course: Course; group: AgeGroup }) {
  const style = GROUP_STYLES[group];
  const groupPrice = monthlyPrice(course, "cohort_group") ?? course.price.group;
  const selfPaced = monthlyPrice(course, "self_paced");
  const meta = [displayAge(course.age), course.level, course.duration].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/courses/${course.slug}`}
      className={cn(
        "flex flex-1 flex-col gap-4 rounded-3xl border-2 p-7 text-ink transition-colors hover:border-accent-500 focus-visible:border-accent-500 focus-visible:outline-none sm:p-[30px]",
        style.card
      )}
    >
      <span className="flex flex-col gap-1.5">
        <h3 className="font-heading text-[26px] font-bold leading-tight sm:text-[28px]">{course.title}</h3>
        <span className="text-sm text-ink-muted">{meta}</span>
      </span>
      <p className="flex-grow text-base leading-relaxed text-ink-muted">{course.description}</p>
      <span className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr))]">
        <PricePill label="Live group classes" labelClass="text-accent-500" price={groupPrice} />
        {selfPaced && <PricePill label="Self-paced" labelClass="text-[#8a5a00]" price={selfPaced} />}
      </span>
      <span className="font-semibold text-accent-500">View course →</span>
    </Link>
  );
}

function PricePill({ label, labelClass, price }: { label: string; labelClass: string; price: Course["price"]["group"] }) {
  return (
    <span className="flex flex-col rounded-[14px] bg-white px-4 py-3.5">
      <span className={cn("text-[13px] font-semibold", labelClass)}>{label}</span>
      <span className="text-[15px] text-ink-muted">
        from <PriceDisplay price={price} showPeriod={false} className="text-xl font-bold text-ink" />
        /mo
      </span>
    </span>
  );
}
