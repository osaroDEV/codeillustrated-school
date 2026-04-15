import ResourcesPageClient from "@/components/ResourcesPageClient";
import {
  getCanonicalUrl,
  getOpenGraphDefaults,
  getTwitterDefaults,
} from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Student Resource Hub – Guides, Tools & Downloads",
  description:
    "Access coding guides, cheat sheets, tools, project showcases, and study materials. Everything Code Illustrated students and parents need in one place.",
  alternates: {
    canonical: getCanonicalUrl("/resources"),
  },
  openGraph: getOpenGraphDefaults({
    title: "Student Resource Hub | Code Illustrated",
    description:
      "Access coding guides, cheat sheets, tools, project showcases, and study materials. Everything Code Illustrated students and parents need in one place.",
    url: getCanonicalUrl("/resources"),
  }),
  twitter: getTwitterDefaults({
    title: "Student Resource Hub | Code Illustrated",
    description:
      "Access coding guides, cheat sheets, tools, project showcases, and study materials. Everything Code Illustrated students and parents need in one place.",
  }),
};

export default function ResourcesPage() {
  return (
    <main className="min-h-screen">
      <ResourcesPageClient />
    </main>
  );
}
