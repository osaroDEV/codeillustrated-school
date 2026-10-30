import CoursesPageClient from "@/components/CoursesPageClient";
import { getCourses, type Course } from "@/lib/courses";
import {
  BASE_PATH,
  getCanonicalUrl,
  getOpenGraphDefaults,
  getTwitterDefaults,
  SITE_URL,
} from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Coding Courses for Beginners",
  description:
    "Browse all 1-on-1 coding courses at Code Illustrated. From web development to data science – beginner-friendly training with live mentors.",
  alternates: {
    canonical: getCanonicalUrl("/courses"),
  },
  openGraph: getOpenGraphDefaults({
    title: "Coding Courses for Beginners | Code Illustrated",
    description:
      "Browse all 1-on-1 coding courses at Code Illustrated. From web development to data science – beginner-friendly training with live mentors.",
    url: getCanonicalUrl("/courses"),
  }),
  twitter: getTwitterDefaults({
    title: "Coding Courses for Beginners | Code Illustrated",
    description:
      "Browse all 1-on-1 coding courses at Code Illustrated. From web development to data science – beginner-friendly training with live mentors.",
  }),
};

// JSON-LD ItemList schema for courses listing
function CoursesListSchema({ courses }: { courses: Course[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Coding Courses for Beginners",
    description:
      "All available 1-on-1 coding courses at Code Illustrated Online School.",
    numberOfItems: courses.length,
    itemListElement: courses.map((course, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${SITE_URL}${BASE_PATH}/courses/${course.id}`,
      name: course.title,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default async function CoursesPage() {
  const courses = await getCourses();

  return (
    <main className="min-h-screen bg-background pt-32 pb-24">
      <CoursesListSchema courses={courses} />
      <CoursesPageClient courses={courses} />
    </main>
  );
}
