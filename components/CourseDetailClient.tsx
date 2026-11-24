import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import type { Course } from "@/lib/course-types";
import { ageGroup, displayAge, moduleName } from "@/lib/course-groups";
import { reviewForCourse } from "@/lib/reviews";
import { CourseIcon } from "@/components/course-icon";
import { buttonClass, CheckItem, CURRENCY_NOTE, Eyebrow, Faq, SectionHeading, WHATSAPP_URL } from "@/components/marketing/ui";
import { COURSE_FINDER_PATH } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { EnrollOptions } from "./enroll-options";

/**
 * A course page. Courses whose youngest learners are under 13 use the playful
 * style (amber hero, rounded shapes); everything else uses the calm one (dark
 * teal hero with a code panel). Content comes from the course data either way.
 */
export default function CourseDetailClient({ course }: { course: Course }) {
  const group = ageGroup(course);
  const playful = group === "kids";
  // Under-18 courses speak to parents; teens & adults courses get career support.
  const forParents = group !== "adults";
  const review = reviewForCourse(course.id);
  const age = displayAge(course.age);

  return (
    <>
      {playful ? <PlayfulHero course={course} age={age} /> : <CalmHero course={course} age={age} />}

      <Curriculum course={course} playful={playful} forChild={forParents} />

      <section id="enroll" className="scroll-mt-16 bg-surface-mist py-20 sm:py-24" aria-labelledby="enroll-title">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-9 px-4 sm:px-6">
          <SectionHeading
            id="enroll-title"
            center
            eyebrow="Enrol"
            title={forParents ? "Choose how your child learns" : "Choose how you learn"}
            intro={CURRENCY_NOTE}
          />
          <EnrollOptions course={course} forChild={forParents} ageLabel={playful ? age : undefined} />
          <p className="mx-auto max-w-[640px] rounded-2xl border border-surface-line bg-white px-6 py-4 text-center text-[15px] leading-relaxed text-ink-muted">
            <strong className="text-ink">Group class times</strong> are shown in your time zone. Reminder emails show WAT and UTC.
          </p>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-8 px-4 sm:px-6">
          {forParents ? <ParentsBlock course={course} /> : <CareerSupport />}
          {review && (
            <blockquote
              className={cn(
                "m-0 flex flex-col gap-5 rounded-[28px] p-8 sm:p-11",
                playful ? "bg-surface-amber text-ink" : "bg-surface-night text-white"
              )}
            >
              <p className="font-heading text-[22px] font-medium leading-snug sm:text-[28px]">&ldquo;{review.quote}&rdquo;</p>
              <footer className={cn("text-base", playful ? "text-ink-muted" : "text-[#cfe1e6]")}>
                <strong className={playful ? "text-ink" : "text-white"}>{review.name}</strong> · {review.role}
              </footer>
            </blockquote>
          )}
        </div>
      </section>

      <section className="bg-surface-mist py-20 sm:py-[88px]" aria-labelledby="course-faq-title">
        <div className="mx-auto flex max-w-[860px] flex-col gap-7 px-4 sm:px-6">
          <h2 id="course-faq-title" className="font-heading text-3xl font-extrabold leading-tight text-ink sm:text-[40px]">
            Questions about {course.title}
          </h2>
          <Faq items={courseFaq(course, forParents)} />
        </div>
      </section>

      <section className="py-20 sm:py-[88px]">
        <div className="mx-auto max-w-[1100px] px-4 sm:px-6">
          <div
            className={cn(
              "relative flex flex-wrap items-center justify-between gap-7 overflow-hidden bg-accent-500 px-6 py-12 sm:px-12 sm:py-14",
              playful ? "rounded-[32px]" : "rounded-3xl"
            )}
          >
            {playful && <div aria-hidden="true" className="absolute -right-14 -top-28 h-[200px] w-[200px] rounded-full bg-secondary-400" />}
            <div className="relative flex flex-[1_1_460px] flex-col gap-3">
              <h2 className="font-heading text-3xl font-extrabold leading-tight text-white sm:text-[40px]">
                {forParents ? "Ready for their first class?" : `Ready to start ${course.title}?`}
              </h2>
              <p className="text-lg text-[#d6eef3]">Pick live group classes or self-paced. Cancel any time.</p>
            </div>
            <div className="relative flex flex-col items-start gap-3">
              <a href="#enroll" className={buttonClass("primary", true)}>
                Enrol
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[44px] items-center text-[15px] text-white underline underline-offset-4 hover:text-[#d6eef3]"
              >
                Questions? Chat on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Breadcrumb({ title, className }: { title: string; className: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm", className)}>
      <Link href="/courses" className="underline-offset-4 hover:underline">
        Courses
      </Link>{" "}
      <span aria-hidden="true">/</span> <span aria-current="page">{title}</span>
    </nav>
  );
}

function HeroActions({ light }: { light: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-7 gap-y-4 pt-1.5">
      <a href="#enroll" className={buttonClass("primary", true, "px-10")}>
        Enrol
      </a>
      <Link
        href={COURSE_FINDER_PATH}
        className={cn(
          "inline-flex min-h-[44px] items-center text-base font-bold underline-offset-4 hover:underline",
          light ? "text-ink" : "text-white"
        )}
      >
        Try a free class first (no card) →
      </Link>
    </div>
  );
}

function badges(course: Course, age: string) {
  return [age, course.level, course.duration, "Certificate"].filter(Boolean);
}

function PlayfulHero({ course, age }: { course: Course; age: string }) {
  return (
    <section className="relative overflow-hidden bg-secondary-400">
      <div aria-hidden="true" className="absolute -bottom-28 -left-20 h-[280px] w-[280px] rounded-full bg-[#ffcf80]" />
      <div aria-hidden="true" className="absolute right-[38%] top-10 hidden h-[26px] w-[26px] rotate-45 rounded bg-primary-500 lg:block" />
      <div aria-hidden="true" className="absolute right-[44%] top-[120px] hidden h-3.5 w-3.5 rounded-full bg-accent-500 lg:block" />
      <div className="relative mx-auto flex max-w-[1200px] flex-col gap-10 px-4 pb-16 pt-7 sm:px-6 sm:pb-20">
        <Breadcrumb title={course.title} className="text-[#3a2a00]" />
        <div className="flex flex-wrap items-center gap-12">
          <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-[22px]">
            <ul className="flex flex-wrap gap-2.5" aria-label="Course details">
              {badges(course, age).map((b) => (
                <li key={b} className="rounded-full bg-white px-3.5 py-2 text-sm font-bold text-ink">
                  {b}
                </li>
              ))}
            </ul>
            <h1 className="font-heading text-[44px] font-extrabold leading-none tracking-tight text-ink sm:text-[68px]">
              {course.title}
            </h1>
            <p className="max-w-[560px] text-lg leading-normal text-[#3a2a00] sm:text-[21px]">{course.fullDescription}</p>
            <HeroActions light />
          </div>

          <div aria-hidden="true" className="flex min-w-0 flex-[1_1_400px] justify-center">
            <div className="w-full max-w-[440px] rotate-2 overflow-hidden rounded-[28px] bg-white shadow-[0_24px_60px_rgba(90,60,0,0.25)]">
              <div className="flex items-center gap-2 bg-accent-500 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-secondary-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-white" />
                <span className="ml-2.5 flex h-5 flex-1 items-center rounded-full bg-[#2b6e81] pl-3 text-[11px] text-[#d6eef3]">
                  my-project
                </span>
              </div>
              <div className="flex flex-col gap-4 p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-teal text-accent-500">
                    <CourseIcon icon={course.icon} className="h-6 w-6" />
                  </span>
                  <p className="font-heading text-2xl font-extrabold text-primary-500">{course.title}</p>
                </div>
                <ol className="flex flex-col gap-2.5">
                  {course.curriculum.slice(0, 3).map((m, i) => (
                    <li
                      key={m.module}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold",
                        i === 0 ? "bg-primary-500 text-white" : i === 1 ? "bg-surface-teal text-ink" : "bg-[#fff1d6] text-ink"
                      )}
                    >
                      <span>{i + 1}</span>
                      {moduleName(m.module)}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CalmHero({ course, age }: { course: Course; age: string }) {
  const modules = course.curriculum.slice(0, 4).map((m) => moduleName(m.module));
  return (
    <section className="bg-surface-night text-white">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-11 px-4 pb-20 pt-7 sm:px-6 sm:pb-[88px]">
        <Breadcrumb title={course.title} className="text-[#b9d3da]" />
        <div className="flex flex-wrap items-center gap-14">
          <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-[22px]">
            <ul className="flex flex-wrap gap-2.5 text-sm font-semibold" aria-label="Course details">
              {badges(course, age).map((b) => (
                <li key={b} className="rounded-lg border border-[#3f6b78] px-3.5 py-[7px] text-[#e3eff2]">
                  {b}
                </li>
              ))}
            </ul>
            <h1 className="font-heading text-[44px] font-extrabold leading-[1.02] tracking-tight sm:text-[64px]">{course.title}</h1>
            <p className="max-w-[580px] text-lg leading-normal text-[#cfe1e6] sm:text-[21px]">{course.fullDescription}</p>
            <HeroActions light={false} />
          </div>

          <div aria-hidden="true" className="min-w-0 flex-[1_1_420px]">
            <div className="overflow-hidden rounded-2xl bg-[#0b2128] shadow-[0_30px_70px_rgba(0,0,0,0.35)]">
              <div className="flex border-b border-[#1f3f48] font-mono text-[13px]">
                <span className="border-r border-[#1f3f48] bg-surface-night px-[18px] py-3 text-white">course.ts</span>
                <span className="px-[18px] py-3 text-[#7d9aa2]">progress.ts</span>
              </div>
              <pre className="m-0 overflow-x-auto px-6 pb-6 pt-5 font-mono text-[14px] leading-[1.85] text-[#e3eff2]">
                <span className="text-secondary-400">const</span> <span className="text-[#7fd3e6]">course</span> = {"{\n"}
                {"  "}title: <span className="text-[#b8e986]">&quot;{course.title}&quot;</span>,{"\n"}
                {"  "}level: <span className="text-[#b8e986]">&quot;{course.level}&quot;</span>,{"\n"}
                {"  "}modules: [{"\n"}
                {modules.map((m) => (
                  <span key={m}>
                    {"    "}
                    <span className="text-[#b8e986]">&quot;{m}&quot;</span>,{"\n"}
                  </span>
                ))}
                {"  "}],{"\n"}
                {"};"}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const MODULE_TINTS = ["bg-surface-amber", "bg-surface-teal", "bg-surface-crimson"];
const NUMBER_TILES = [
  "bg-primary-500 text-white -rotate-6",
  "bg-accent-500 text-white rotate-[5deg]",
  "bg-secondary-400 text-[#3a2a00] -rotate-[4deg]",
];

function Curriculum({ course, playful, forChild }: { course: Course; playful: boolean; forChild: boolean }) {
  if (!course.curriculum.length) return null;
  return (
    <section className="py-20 sm:py-24" aria-labelledby="curriculum-title">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-4 sm:px-6">
        <SectionHeading
          id="curriculum-title"
          eyebrow={forChild ? "What they'll learn" : "What you'll learn"}
          title={playful ? "Build it yourself, one module at a time" : "Real tools, real projects"}
          intro={`${course.curriculum.length} ${course.curriculum.length === 1 ? "module" : "modules"}${course.duration ? ` over ${course.duration.toLowerCase()}` : ""}.`}
        />
        <ol className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
          {course.curriculum.map((module, idx) => (
            <li
              key={module.module}
              className={cn(
                "flex flex-col gap-4",
                playful ? cn("rounded-[28px] p-7 sm:p-8", MODULE_TINTS[idx % 3]) : "rounded-2xl border border-[#dde7ea] p-6 sm:p-7"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex items-center justify-center font-heading font-extrabold",
                  playful
                    ? cn("h-14 w-14 rounded-[18px] text-2xl", NUMBER_TILES[idx % 3])
                    : "h-10 w-10 rounded-lg bg-surface-teal text-lg text-accent-500"
                )}
              >
                {idx + 1}
              </span>
              <h3 className="font-heading text-2xl font-bold leading-tight text-ink sm:text-[26px]">
                <span className="sr-only">Module {idx + 1}: </span>
                {moduleName(module.module)}
              </h3>
              <ul className="flex list-disc flex-col gap-2 pl-5 text-base leading-normal text-ink-muted marker:text-ink-subtle">
                {module.lessons.map((lesson, lIdx) => (
                  <li key={`${lesson}-${lIdx}`}>
                    {module.previewIds?.[lIdx] ? (
                      <Link
                        href={`/dashboard/courses/${course.id}/lessons/${module.previewIds[lIdx]}`}
                        className="font-medium text-accent-500 underline-offset-4 hover:underline"
                      >
                        {lesson} <span className="text-sm font-semibold">(free preview)</span>
                      </Link>
                    ) : (
                      lesson
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ParentsBlock({ course }: { course: Course }) {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-heading text-3xl font-extrabold leading-tight text-ink sm:text-[40px]">For parents</h2>
      <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]">
        <div className="flex flex-col gap-3.5 rounded-3xl bg-surface-teal p-7">
          <h3 className="font-heading text-[22px] font-bold text-ink">How lessons run online</h3>
          <p className="text-[15px] leading-relaxed text-ink-muted">
            Your child joins from home on a laptop or desktop. The tutor explains each idea with pictures, then the small
            group codes along together.
          </p>
          <p className="flex items-start gap-2 text-[15px] leading-relaxed text-ink-muted">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent-500" aria-hidden="true" />
            Our learner community on Slack is moderated by our team.
          </p>
        </div>
        <div className="flex flex-col gap-3.5 rounded-3xl bg-surface-teal p-7">
          <h3 className="font-heading text-[22px] font-bold text-ink">Following their progress</h3>
          <p className="text-[15px] leading-relaxed text-ink-muted">
            Log in to the learner dashboard to see lessons completed, projects built and tutor feedback. When they finish
            the course, your child earns a certificate.
          </p>
          <Link href="/#parents" className="font-semibold text-accent-500 underline-offset-4 hover:underline">
            See an example dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}

function CareerSupport() {
  return (
    <div className="flex flex-col gap-4 rounded-[20px] border border-[#dde7ea] p-7 sm:p-[30px]">
      <Eyebrow>Included</Eyebrow>
      <h2 className="font-heading text-[26px] font-bold text-ink">Career support</h2>
      <ul className="grid gap-3 text-base text-ink sm:grid-cols-2">
        <CheckItem>CV and portfolio reviews</CheckItem>
        <CheckItem>Mock interviews</CheckItem>
        <CheckItem>Guidance on finding your first role</CheckItem>
        <CheckItem>A certificate of completion</CheckItem>
        <CheckItem>Our learner community on Slack</CheckItem>
      </ul>
    </div>
  );
}

function courseFaq(course: Course, forChild: boolean) {
  const beginner = /beginner|intro/i.test(course.level);
  const who = forChild ? "my child" : "I";
  return [
    {
      q: forChild ? "Does my child need any coding experience?" : "Do I need any experience?",
      a: beginner
        ? "No. This course is for complete beginners."
        : `This is ${/^[aeiou]/i.test(course.level) ? "an" : "a"} ${course.level.toLowerCase()} course, so some basics help. If you're not sure it's the right level, the course finder suggests a starting point in under a minute.`,
    },
    {
      q: forChild ? "What do they need at home?" : "What do I need?",
      a: "A laptop or desktop computer with an internet connection.",
    },
    {
      q: forChild ? "Group or self-paced: which is better for my child?" : "Can I fit it around a full-time job?",
      a: forChild
        ? "Most children do best in live group classes, where a tutor keeps them on track. Self-paced suits confident learners with a parent nearby to help."
        : "Yes. Choose self-paced to learn whenever suits you, or group classes at times shown in your own time zone.",
    },
    {
      q: `Can ${who} try it before paying?`,
      a: "Yes. The first interactive class is free and you don't need a card.",
    },
    {
      q: "Is there a learner community?",
      a: "Yes. Every enrolled learner gets an invite to our learner community on Slack, moderated by our team. We send the invite link after you enrol.",
    },
    {
      q: "Can we cancel?",
      a: "Yes, any time from your dashboard. You keep access until the end of the period you've already paid for, but cancelling doesn't refund payments already made.",
    },
  ];
}
