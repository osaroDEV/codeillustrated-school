"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import Footer from "@/components/site-footer";
import { ContactFormPopup } from "@/components/contact-form-popup";
import { ChatBot } from "@/components/chatbot/chat-bot";

export function SiteLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Check if we are inside auth, admin, or dashboard routes (accounting for possible sub-pages)
  // Note: base path "/academy" is handled by Next.js usePathname automatically (it strips basePath or includes it depending on config, but standard usePathname in app router excludes basePath)
  const isAppRoute =
    pathname?.startsWith("/auth") ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/dashboard");

  if (isAppRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      {children}
      <Footer />
      <ContactFormPopup />
      <ChatBot />
    </>
  );
}
