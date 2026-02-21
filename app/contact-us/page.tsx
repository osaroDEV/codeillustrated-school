import { ContactForm } from "@/components/contact-form";
import {
  getCanonicalUrl,
  getOpenGraphDefaults,
  getTwitterDefaults,
} from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us – Start Your Coding Journey",
  description:
    "Get in touch with Code Illustrated. Book a free 1-on-1 coding class for beginners. No experience needed – start your path to software engineer today.",
  alternates: {
    canonical: getCanonicalUrl("/contact-us"),
  },
  openGraph: getOpenGraphDefaults({
    title: "Contact Code Illustrated Online School",
    description:
      "Get in touch with Code Illustrated. Book a free 1-on-1 coding class for beginners. No experience needed – start your path to software engineer today.",
    url: getCanonicalUrl("/contact-us"),
  }),
  twitter: getTwitterDefaults({
    title: "Contact Code Illustrated Online School",
    description:
      "Get in touch with Code Illustrated. Book a free 1-on-1 coding class for beginners. No experience needed – start your path to software engineer today.",
  }),
};

export default function ContactPage() {
  return (
    <main className="min-h-screen">
      <ContactForm />
    </main>
  );
}
