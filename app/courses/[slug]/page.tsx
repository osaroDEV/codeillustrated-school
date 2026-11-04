import CourseDetailClient from "@/components/CourseDetailClient";
import { findCourseRedirect, getCourseBySlug, getCourses, type Course } from "@/lib/courses";
import {
  BASE_PATH,
  getCanonicalUrl,
  getOpenGraphDefaults,
  getTwitterDefaults,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

interface CoursePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: CoursePageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

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
      canonical: getCanonicalUrl(`/courses/${course.slug}`),
    },
    openGraph: getOpenGraphDefaults({
      title: `${course.title} | ${SITE_NAME}`,
      description,
      url: getCanonicalUrl(`/courses/${course.slug}`),
    }),
    twitter: getTwitterDefaults({
      title: `${course.title} | ${SITE_NAME}`,
      description,
    }),
  };
}

// Generate static params for all known courses
export async function generateStaticParams() {
  const courses = await getCourses();
  return courses.map((course) => ({
    slug: course.slug,
  }));
}

// JSON-LD Course schema
function CourseSchema({ course }: { course: Course }) {
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
    url: `${SITE_URL}${BASE_PATH}/courses/${course.slug}`,
    coursePrerequisites: "No prior coding experience required",
    educationalLevel: course.level,
    timeRequired: course.duration,
    offers: {
      "@type": "Offer",
      price: course.price.group.usd.toString(),
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
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  if (!course) {
    // An old address, or a course's internal ID: send it to the live page.
    const current = await findCourseRedirect(slug);
    if (current) permanentRedirect(`/courses/${current}`);
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <CourseSchema course={course} />
      <CourseDetailClient course={course} />
    </main>
  );
}
