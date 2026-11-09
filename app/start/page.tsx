import type { Metadata } from "next";
import Link from "next/link";
import { CourseFinder } from "@/components/start/course-finder";
import { EnrolSteps } from "@/components/enrol-steps";
import { getCourses } from "@/lib/courses";
import { getCanonicalUrl, getOpenGraphDefaults, getTwitterDefaults } from "@/lib/seo";
import { LOGIN_PATH } from "@/lib/routes";

const title = "Find your course";
const description =
  "Answer three quick questions and we'll suggest the right Code Illustrated course for you or your child, then show you how to enrol.";

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
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24 pt-28 sm:pt-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="mx-auto mb-10 max-w-2xl text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">Start here</p>
          <h1 className="mb-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">Find the right course</h1>
          <p className="text-lg text-slate-600">
            Three quick questions, then we&apos;ll point you to the course that fits. It takes under a minute.
          </p>
        </header>

        <CourseFinder courses={courses} />

        <section aria-labelledby="how-title" className="mt-20">
          <div className="mb-8 text-center">
            <h2 id="how-title" className="text-2xl font-black text-slate-900 sm:text-3xl">
              What happens next
            </h2>
            <p className="mt-2 text-slate-600">From choosing a course to your certificate, in four steps.</p>
          </div>
          <EnrolSteps compact />
          <p className="mt-8 text-center text-sm text-slate-500">
            Already a learner?{" "}
            <Link href={LOGIN_PATH} className="font-semibold text-primary hover:underline">
              Log in to your dashboard
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
