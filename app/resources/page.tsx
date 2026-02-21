import ResourcesPageClient from "@/components/ResourcesPageClient";
import {
  getCanonicalUrl,
  getOpenGraphDefaults,
  getTwitterDefaults,
} from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Coding Resources & Study Materials",
  description:
    "Download coding resources, guides, and study materials. Perfect for beginners learning to code with Code Illustrated Online School.",
  alternates: {
    canonical: getCanonicalUrl("/resources"),
  },
  openGraph: getOpenGraphDefaults({
    title: "Coding Resources | Code Illustrated",
    description:
      "Download coding resources, guides, and study materials. Perfect for beginners learning to code with Code Illustrated Online School.",
    url: getCanonicalUrl("/resources"),
  }),
  twitter: getTwitterDefaults({
    title: "Coding Resources | Code Illustrated",
    description:
      "Download coding resources, guides, and study materials. Perfect for beginners learning to code with Code Illustrated Online School.",
  }),
};

export default function ResourcesPage() {
  return (
    <main className="min-h-screen">
      <ResourcesPageClient />
    </main>
  );
}
