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
import Script from "next/script";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import { CurrencyProvider } from "@/components/currency-provider";
import { SiteLayoutWrapper } from "@/components/site-layout-wrapper";
import { getCourses } from "@/lib/courses";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-sans" });
// Headings (Tailwind's font-heading).
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], display: "swap", variable: "--font-heading" });

// Catalogue edits made in the admin panel show up on statically rendered
// marketing pages within five minutes.
export const revalidate = 300;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Code Illustrated | Live Coding Classes",
    template: "%s | Code Illustrated Online School",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "learn to code",
    "coding for beginners",
    "live coding classes",
    "online coding school",
    "beginner coding classes",
    "learn programming",
    "coding tutor",
    "personalized coding lessons",
    "become a software engineer",
    "code illustrated",
    "coding academy Nigeria",
    "coding training in dollars",
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
    title: "Code Illustrated | Live Coding Classes for Beginners",
    description: SITE_DESCRIPTION,
    url: getCanonicalUrl(),
  }),
  twitter: getTwitterDefaults({
    title: "Code Illustrated | Live Coding Classes for Beginners",
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const courses = await getCourses();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '2236097820472570');
            fbq('track', 'PageView');
          `}
        </Script>
        <Script id="clarity-script" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "xt5yhnz9gt");
          `}
        </Script>
      </head>
      <body className={`${inter.className} ${inter.variable} ${bricolage.variable}`}>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=2236097820472570&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        <CurrencyProvider>
          <SiteLayoutWrapper footerCourses={courses.map(({ id, slug, title }) => ({ id, slug, title }))}>
            {children}
          </SiteLayoutWrapper>
          <Toaster />
          <Analytics />
          <SpeedInsights />
        </CurrencyProvider>
      </body>
    </html>
  );
}
