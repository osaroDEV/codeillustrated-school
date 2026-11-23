import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonClass } from "@/components/marketing/ui";
import { COURSE_FINDER_PATH } from "@/lib/routes";

// Figures used across the site (the About page has the same ones).
const PROOF = [
  { value: "300+", label: "students taught" },
  { value: "97%", label: "course completion" },
  { value: "10+", label: "expert tutors" },
  { value: "Since 2023", label: "teaching learners in many countries" },
];

export function HeroSection() {
  return (
    <section className="overflow-hidden bg-surface-amber">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-14 px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-[72px]">
        <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-6">
          <p className="inline-flex self-start rounded-full border border-surface-amber-line bg-white px-4 py-2 text-sm font-semibold text-accent-500">
            Live online coding classes · ages 8 to adult
          </p>
          <h1 className="font-heading text-[40px] font-extrabold leading-[1.04] tracking-tight text-ink sm:text-6xl lg:text-[64px]">
            Learn to code with a real tutor, in a small group.
          </h1>
          <p className="max-w-[560px] text-lg leading-relaxed text-ink-muted sm:text-xl">
            Live group classes or self-paced lessons, from a child&apos;s first website to an adult&apos;s first developer
            job. Start with a free interactive class. No card needed.
          </p>
          <div className="flex flex-wrap items-center gap-x-7 gap-y-4 pt-2">
            <Link href={COURSE_FINDER_PATH} className={buttonClass("primary", true)}>
              Find your course
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
            <p className="text-[15px] text-ink-muted">3 quick questions · then a free first class</p>
          </div>
          <p className="text-[15px] text-ink-muted">
            or{" "}
            <Link href="/courses" className="font-semibold text-accent-500 underline-offset-4 hover:underline">
              browse all courses
            </Link>
          </p>
        </div>

        <HeroVisual />
      </div>

      <div className="mx-auto max-w-[1200px] px-4 pb-14 sm:px-6">
        <dl className="grid grid-cols-2 gap-x-8 gap-y-5 rounded-[20px] border border-surface-amber-line bg-white px-6 py-6 sm:px-8 lg:grid-cols-4">
          {PROOF.map((item) => (
            <div key={item.label} className="flex flex-col-reverse">
              <dt className="text-[15px] text-ink-muted">{item.label}</dt>
              <dd className="font-heading text-2xl font-extrabold text-primary-500 sm:text-[32px]">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/** A beginner's first game in a code editor, with what it draws. Decorative. */
function HeroVisual() {
  return (
    <div aria-hidden="true" className="relative min-h-[400px] min-w-0 flex-[1_1_440px] sm:min-h-[440px]">
      <div className="absolute -right-10 -top-8 h-[300px] w-[300px] rounded-full bg-secondary-400" />
      <div className="absolute bottom-0 left-2.5 h-[120px] w-[120px] rounded-full bg-accent-500/10" />

      <div className="relative mt-8 max-w-[480px] overflow-hidden rounded-[20px] bg-surface-night shadow-[0_24px_60px_rgba(18,51,61,0.25)]">
        <div className="flex items-center gap-2 bg-[#0d2830] px-[18px] py-3.5">
          <span className="h-3 w-3 rounded-full bg-primary-500" />
          <span className="h-3 w-3 rounded-full bg-secondary-400" />
          <span className="h-3 w-3 rounded-full bg-[#5fb3c6]" />
          <span className="ml-3 font-mono text-[13px] text-[#9fc3cd]">my-first-game.js</span>
        </div>
        <pre className="m-0 whitespace-pre-wrap px-6 pb-7 pt-5 font-mono text-[14px] leading-[1.9] text-[#e8f1f3] sm:text-[15px]">
          <span className="text-secondary-400">let</span> score = <span className="text-[#ff9b9f]">0</span>;{"\n"}
          <span className="text-secondary-400">function</span> <span className="text-[#7fd3e6]">catchStar</span>() {"{"}
          {"\n"}
          {"  "}score = score + <span className="text-[#ff9b9f]">1</span>;{"\n"}
          {"  "}
          <span className="text-[#7fd3e6]">show</span>(<span className="text-[#b8e986]">&quot;You got it!&quot;</span>);{"\n"}
          {"}"}
        </pre>
      </div>

      <div className="relative -mt-10 ml-auto flex w-[240px] flex-col gap-3 rounded-[18px] bg-white p-[18px] shadow-[0_18px_40px_rgba(18,51,61,0.18)]">
        <div className="relative h-[110px] overflow-hidden rounded-xl bg-[#e9f3f5]">
          <div className="absolute bottom-[18px] left-6 h-[38px] w-[38px] rounded-[10px] bg-primary-500" />
          <div className="absolute right-10 top-[22px] h-5 w-5 rotate-45 bg-secondary-400" />
          <div className="absolute right-[90px] top-[50px] h-3.5 w-3.5 rotate-45 bg-secondary-400" />
        </div>
        <div className="flex justify-between text-sm font-semibold text-ink">
          <span>Score</span>
          <span className="text-primary-500">3</span>
        </div>
      </div>

      <div className="absolute -left-2 top-0 flex items-center gap-2 rounded-[14px] bg-white px-4 py-3 text-sm font-semibold text-accent-500 shadow-[0_12px_30px_rgba(18,51,61,0.15)]">
        <span className="h-2.5 w-2.5 rounded-full bg-[#2fa36b]" />
        Free first class · no card
      </div>
    </div>
  );
}
