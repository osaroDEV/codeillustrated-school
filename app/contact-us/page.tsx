import { ContactForm } from "@/components/contact-form";
import { getCourses } from "@/lib/courses";
import {
  getCanonicalUrl,
  getOpenGraphDefaults,
  getTwitterDefaults,
} from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us – Start Your Coding Journey",
  description:
    "Get in touch with Code Illustrated. Book a free coding class for beginners. No experience needed – start your path to software engineer today.",
  alternates: {
    canonical: getCanonicalUrl("/contact-us"),
  },
  openGraph: getOpenGraphDefaults({
    title: "Contact Code Illustrated Online School",
    description:
      "Get in touch with Code Illustrated. Book a free coding class for beginners. No experience needed – start your path to software engineer today.",
    url: getCanonicalUrl("/contact-us"),
  }),
  twitter: getTwitterDefaults({
    title: "Contact Code Illustrated Online School",
    description:
      "Get in touch with Code Illustrated. Book a free coding class for beginners. No experience needed – start your path to software engineer today.",
  }),
};

export default async function ContactPage() {
  const courses = await getCourses();
  return (
    <main className="min-h-screen">
      <ContactForm courses={courses.map(({ id, slug, title }) => ({ id, slug, title }))} />
    </main>
  );
}
