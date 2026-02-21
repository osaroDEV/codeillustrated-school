import { ChatBot } from "@/components/chatbot/chat-bot";
import { ContactFormPopup } from "@/components/contact-form-popup";
import { Navbar } from "@/components/Navbar";
import Footer from "@/components/site-footer";
import { Toaster } from "@/components/ui/sonner";
import {
  BASE_PATH,
  getCanonicalUrl,
  getOpenGraphDefaults,
  getTwitterDefaults,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Code Illustrated | 1-on-1 Coding Training",
    template: "%s | Code Illustrated Online School",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "learn to code",
    "coding for beginners",
    "1-on-1 coding training",
    "online coding school",
    "beginner coding classes",
    "learn programming",
    "coding tutor",
    "personalized coding lessons",
    "become a software engineer",
    "code illustrated",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  icons: {
    icon: `${BASE_PATH}/code-ill.svg`,
  },
  alternates: {
    canonical: getCanonicalUrl(),
  },
  openGraph: getOpenGraphDefaults({
    title: "Code Illustrated | 1-on-1 Coding Training for Beginners",
    description: SITE_DESCRIPTION,
    url: getCanonicalUrl(),
  }),
  twitter: getTwitterDefaults({
    title: "Code Illustrated | 1-on-1 Coding Training for Beginners",
    description: SITE_DESCRIPTION,
  }),
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Navbar />
        {children}
        <Footer />
        <ContactFormPopup />
        <ChatBot />
        <Toaster />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
