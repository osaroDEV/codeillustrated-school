import CourseDetailClient from "@/components/CourseDetailClient";
import { courses } from "@/lib/courses";
import {
  BASE_PATH,
  getCanonicalUrl,
  getOpenGraphDefaults,
  getTwitterDefaults,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface CoursePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: CoursePageProps): Promise<Metadata> {
  const { id } = await params;
  const course = courses.find((c) => c.id === id);

  if (!course) {
    return {
      title: "Course Not Found",
    };
  }

  const title = `${course.title} – Beginner Coding Course`;
  const description = `${course.fullDescription.slice(0, 140)}…`;

  return {
    title,
    description,
    alternates: {
      canonical: getCanonicalUrl(`/courses/${course.id}`),
    },
    openGraph: getOpenGraphDefaults({
      title: `${course.title} | ${SITE_NAME}`,
      description,
      url: getCanonicalUrl(`/courses/${course.id}`),
    }),
    twitter: getTwitterDefaults({
      title: `${course.title} | ${SITE_NAME}`,
      description,
    }),
  };
}

// Generate static params for all known courses
export async function generateStaticParams() {
  return courses.map((course) => ({
    id: course.id,
  }));
}

// JSON-LD Course schema
function CourseSchema({ course }: { course: (typeof courses)[number] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.fullDescription,
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: `${SITE_URL}${BASE_PATH}`,
    },
    url: `${SITE_URL}${BASE_PATH}/courses/${course.id}`,
    coursePrerequisites: "No prior coding experience required",
    educationalLevel: course.level,
    timeRequired: course.duration,
    offers: {
      "@type": "Offer",
      price: course.price.replace("$", ""),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}${BASE_PATH}/contact-us`,
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: course.duration,
      instructor: {
        "@type": "Organization",
        name: SITE_NAME,
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { id } = await params;
  const course = courses.find((c) => c.id === id);

  if (!course) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <CourseSchema course={course} />
      <CourseDetailClient courseId={course.id} />
    </main>
  );
}
