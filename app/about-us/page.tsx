import AboutUsClient from "@/components/AboutUsClient";
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
  title: "About Us – Our Mission & Team",
  description:
    "Meet the Code Illustrated team. We teach beginners to code in live online group classes and self-paced courses, and have since 2023.",
  alternates: {
    canonical: getCanonicalUrl("/about-us"),
  },
  openGraph: getOpenGraphDefaults({
    title: "About Code Illustrated Online School",
    description:
      "Meet the Code Illustrated team. We teach beginners to code in live online group classes and self-paced courses, and have since 2023.",
    url: getCanonicalUrl("/about-us"),
  }),
  twitter: getTwitterDefaults({
    title: "About Code Illustrated Online School",
    description:
      "Meet the Code Illustrated team. We teach beginners to code in live online group classes and self-paced courses, and have since 2023.",
  }),
};

// JSON-LD EducationalOrganization schema
function EducationalOrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: SITE_NAME,
    url: `${SITE_URL}${BASE_PATH}`,
    logo: `${SITE_URL}${BASE_PATH}/code-ill.svg`,
    description:
      "Code Illustrated Online School offers live online coding classes and self-paced courses for complete beginners.",
    foundingDate: "2023",
    founder: {
      "@type": "Person",
      name: "Osaro Onaiwu",
    },
    address: {
      "@type": "PostalAddress",
      addressCountry: "GB",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+44-7405-786-279",
      contactType: "customer service",
      email: "admin@codeillustrated.com",
      availableLanguage: "English",
    },
    numberOfEmployees: {
      "@type": "QuantitativeValue",
      minValue: 10,
    },
    areaServed: "Worldwide",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default function AboutUs() {
  return (
    <main>
      <EducationalOrganizationSchema />
      <AboutUsClient />
    </main>
  );
}
