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
  title: "Live Coding Classes for Beginners",
  description:
    "Learn to code in live online group classes, or at your own pace. Code Illustrated takes complete beginners, from age 8 to adults, from first lines of code to real projects.",
  alternates: {
    canonical: getCanonicalUrl(),
  },
  openGraph: getOpenGraphDefaults({
    title: "Code Illustrated | Live Coding Classes for Beginners",
    description:
      "Learn to code in live online group classes, or at your own pace. Code Illustrated takes complete beginners, from age 8 to adults, from first lines of code to real projects.",
    url: getCanonicalUrl(),
  }),
  twitter: getTwitterDefaults({
    title: "Code Illustrated | Live Coding Classes for Beginners",
    description:
      "Learn to code in live online group classes, or at your own pace. Code Illustrated takes complete beginners, from age 8 to adults, from first lines of code to real projects.",
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
      "Code Illustrated Online School offers live online coding classes and self-paced courses for complete beginners.",
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
