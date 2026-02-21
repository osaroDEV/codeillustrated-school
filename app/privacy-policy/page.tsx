import {
  getCanonicalUrl,
  getOpenGraphDefaults,
  getTwitterDefaults,
} from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Read the Code Illustrated Online School privacy policy. Learn how we collect, use, and protect your personal information.",
  alternates: {
    canonical: getCanonicalUrl("/privacy-policy"),
  },
  openGraph: getOpenGraphDefaults({
    title: "Privacy Policy | Code Illustrated Online School",
    description:
      "Read the Code Illustrated Online School privacy policy. Learn how we collect, use, and protect your personal information.",
    url: getCanonicalUrl("/privacy-policy"),
  }),
  twitter: getTwitterDefaults({
    title: "Privacy Policy | Code Illustrated Online School",
    description:
      "Read the Code Illustrated Online School privacy policy. Learn how we collect, use, and protect your personal information.",
  }),
};

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-background">
      <article className="max-w-4xl mx-auto px-6 py-32">
        <h1 className="text-4xl font-heading font-black mb-8">
          Privacy Policy
        </h1>
        <div className="prose prose-blue max-w-none text-muted-foreground">
          <p className="mb-4">Last updated: February 21, 2026</p>
          <p className="mb-6">
            At Code Illustrated Online School, accessible from
            codeillustrated.com, one of our main priorities is the privacy of
            our visitors. This Privacy Policy document contains types of
            information that is collected and recorded by Code Illustrated and
            how we use it.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
            Information We Collect
          </h2>
          <p className="mb-4">
            The personal information that you are asked to provide, and the
            reasons why you are asked to provide it, will be made clear to you
            at the point we ask you to provide your personal information.
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Name and contact information (email, phone number)</li>
            <li>Student information (age, learning preferences)</li>
            <li>
              Payment information (processed securely by our payment providers)
            </li>
          </ul>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
            How We Use Your Information
          </h2>
          <p className="mb-4">
            We use the information we collect in various ways, including to:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Provide, operate, and maintain our website</li>
            <li>Improve, personalize, and expand our website</li>
            <li>Understand and analyze how you use our website</li>
            <li>Develop new products, services, features, and functionality</li>
            <li>
              Communicate with you, either directly or through one of our
              partners
            </li>
            <li>Send you emails</li>
            <li>Find and prevent fraud</li>
          </ul>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
            Children&apos;s Information
          </h2>
          <p className="mb-4">
            Another part of our priority is adding protection for children while
            using the internet. We encourage parents and guardians to observe,
            participate in, and/or monitor and guide their online activity.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
            Contact Us
          </h2>
          <p>
            If you have any questions or suggestions about our Privacy Policy,
            do not hesitate to contact us at admin@codeillustrated.com.
          </p>
        </div>
      </article>
    </main>
  );
}
