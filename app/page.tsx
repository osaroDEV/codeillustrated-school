import Benefits from "@/components/Benefits";
import Courses from "@/components/Courses";
import { getCourses } from "@/lib/courses";
import CTA from "@/components/CTA";
import { HeroSection } from "@/components/hero-section";
import HowItWorks from "@/components/HowItWorks";
import ReviewsSection from "@/components/ReviewsSection";
import {
  BASE_PATH,
  getCanonicalUrl,
  getOpenGraphDefaults,
  getTwitterDefaults,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "1-on-1 Coding Training for Beginners",
  description:
    "Learn to code with personalized 1-on-1 training. Code Illustrated helps complete beginners become software engineers through live mentorship.",
  alternates: {
    canonical: getCanonicalUrl(),
  },
  openGraph: getOpenGraphDefaults({
    title: "Code Illustrated | 1-on-1 Coding Training for Beginners",
    description:
      "Learn to code with personalized 1-on-1 training. Code Illustrated helps complete beginners become software engineers through live mentorship.",
    url: getCanonicalUrl(),
  }),
  twitter: getTwitterDefaults({
    title: "Code Illustrated | 1-on-1 Coding Training for Beginners",
    description:
      "Learn to code with personalized 1-on-1 training. Code Illustrated helps complete beginners become software engineers through live mentorship.",
  }),
};

// JSON-LD Organization schema for the homepage
function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: `${SITE_URL}${BASE_PATH}`,
    logo: `${SITE_URL}${BASE_PATH}/code-ill.svg`,
    description:
      "Code Illustrated Online School offers 1-on-1 coding training for complete beginners who want to become software engineers.",
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+44-7405-786-279",
      contactType: "customer service",
      email: "admin@codeillustrated.com",
      availableLanguage: "English",
    },
    sameAs: [],
    foundingDate: "2023",
    founders: [
      {
        "@type": "Person",
        name: "Osaro Onaiwu",
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default async function Home() {
  const courses = await getCourses();

  return (
    <main className="min-h-screen">
      <OrganizationSchema />
      <HeroSection />
      <Courses courses={courses} />
      <HowItWorks />
      <Benefits />
      <ReviewsSection />
      <CTA />
    </main>
  );
}
