import {
  getCanonicalUrl,
  getOpenGraphDefaults,
  getTwitterDefaults,
} from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Read the Code Illustrated Online School terms of service. Understand the terms governing use of our 1-on-1 coding training platform.",
  alternates: {
    canonical: getCanonicalUrl("/terms-of-service"),
  },
  openGraph: getOpenGraphDefaults({
    title: "Terms of Service | Code Illustrated Online School",
    description:
      "Read the Code Illustrated Online School terms of service. Understand the terms governing use of our 1-on-1 coding training platform.",
    url: getCanonicalUrl("/terms-of-service"),
  }),
  twitter: getTwitterDefaults({
    title: "Terms of Service | Code Illustrated Online School",
    description:
      "Read the Code Illustrated Online School terms of service. Understand the terms governing use of our 1-on-1 coding training platform.",
  }),
};

export default function TermsOfService() {
  return (
    <main className="min-h-screen bg-background">
      <article className="max-w-4xl mx-auto px-6 py-32">
        <h1 className="text-4xl font-heading font-black mb-8">
          Terms of Service
        </h1>
        <div className="prose prose-blue max-w-none text-muted-foreground">
          <p className="mb-4">Last updated: February 21, 2026</p>
          <p className="mb-6">
            Please read these Terms of Service (&quot;Terms&quot;, &quot;Terms
            of Service&quot;) carefully before using the Code Illustrated Online
            School website operated by Code Illustrated (&quot;us&quot;,
            &quot;we&quot;, or &quot;our&quot;).
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
            1. Acceptance of Terms
          </h2>
          <p className="mb-4">
            By accessing or using the Service you agree to be bound by these
            Terms. If you disagree with any part of the terms then you may not
            access the Service.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
            2. Purchases
          </h2>
          <p className="mb-4">
            If you wish to purchase any product or service made available
            through the Service (&quot;Purchase&quot;), you may be asked to
            supply certain information relevant to your Purchase including,
            without limitation, your credit card number, the expiration date of
            your credit card, your billing address, and your shipping
            information.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
            3. Content and Conduct
          </h2>
          <p className="mb-4">
            Our Service allows students to learn coding in a safe, moderated
            environment. We reserve the right to remove any user who violates
            our code of conduct, which includes bullying, harassment, or sharing
            inappropriate content.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
            4. Intellectual Property
          </h2>
          <p className="mb-4">
            The Service and its original content (excluding Content provided by
            users), features and functionality are and will remain the exclusive
            property of Code Illustrated and its licensors.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
            5. Contact Us
          </h2>
          <p>
            If you have any questions about these Terms, please contact us at
            admin@codeillustrated.com.
          </p>
        </div>
      </article>
    </main>
  );
}
