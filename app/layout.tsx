import { ChatBot } from "@/components/chatbot/chat-bot";
import { ContactFormPopup } from "@/components/contact-form-popup";
import { CurrencyProvider } from "@/components/currency-provider";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// import codeillIcon from '../public/code-ill.svg';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Code Illustrated Online School - Learn Coding Online",
  description:
    "Master coding through our interactive online courses. From crash courses to comprehensive programs.",
  icons: {
    icon: "../public/code-ill.svg",
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
        <CurrencyProvider>
          <Header />
          {children}
          <Footer />
          <ContactFormPopup />
          <ChatBot />
          <Toaster />
          <Analytics />
          <SpeedInsights />
        </CurrencyProvider>
      </body>
    </html>
  );
}
