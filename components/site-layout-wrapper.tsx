"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import Footer from "@/components/site-footer";
import { ContactFormPopup } from "@/components/contact-form-popup";
import { ChatBot } from "@/components/chatbot/chat-bot";
import type { CourseLink } from "@/lib/course-types";
import { isAppChromeFree } from "@/lib/routes";

export function SiteLayoutWrapper({
  children,
  footerCourses,
}: {
  children: React.ReactNode;
  footerCourses: CourseLink[];
}) {
  const pathname = usePathname();
  // Signed-in areas and account pages have their own chrome.
  const isAppRoute = isAppChromeFree(pathname);

  if (isAppRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      {children}
      <Footer courses={footerCourses} />
      <ContactFormPopup courses={footerCourses} />
      <ChatBot />
    </>
  );
}
