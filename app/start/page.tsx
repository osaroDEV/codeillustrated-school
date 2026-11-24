import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { CourseFinder } from "@/components/start/course-finder";
import { EnrolSteps } from "@/components/enrol-steps";
import { Eyebrow, SectionHeading } from "@/components/marketing/ui";
import { getCourses } from "@/lib/courses";
import { getCanonicalUrl, getOpenGraphDefaults, getTwitterDefaults } from "@/lib/seo";
import { LOGIN_PATH } from "@/lib/routes";

const title = "Find your course";
const description =
  "Answer three quick questions and we'll suggest the right Code Illustrated course for you or your child. Then try your first class free, no card needed.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: getCanonicalUrl("/start") },
  openGraph: getOpenGraphDefaults({ title: `${title} | Code Illustrated`, description, url: getCanonicalUrl("/start") }),
  twitter: getTwitterDefaults({ title: `${title} | Code Illustrated`, description }),
};

export default async function StartPage() {
  const courses = await getCourses();

  return (
    <main className="min-h-screen bg-surface-mist pb-24 pt-28 sm:pt-32">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <header className="mx-auto mb-10 flex max-w-2xl flex-col items-center gap-4 text-center">
          <Eyebrow>Start here</Eyebrow>
          <h1 className="font-heading text-[40px] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-[56px]">
            Find the right course
          </h1>
          <p className="text-lg leading-relaxed text-ink-muted sm:text-xl">
            Three quick questions, then try your first class free.
          </p>
          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-[15px] font-medium text-ink">
            {["Under a minute", "Free first class", "No card needed"].map((point) => (
              <li key={point} className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-accent-500" strokeWidth={2.5} aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>
        </header>

        <CourseFinder courses={courses} />

        <section aria-labelledby="how-title" className="mt-20 flex flex-col gap-10 sm:mt-24">
          <SectionHeading
            id="how-title"
            center
            title="What happens next"
            intro="From choosing a course to your certificate, in four steps."
          />
          <EnrolSteps />
          <p className="text-center text-[15px] text-ink-muted">
            Already a learner?{" "}
            <Link href={LOGIN_PATH} className="font-semibold text-accent-500 underline-offset-4 hover:underline">
              Log in to your dashboard
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
