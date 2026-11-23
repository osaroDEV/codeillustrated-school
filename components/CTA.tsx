import Link from "next/link";
import { buttonClass, WHATSAPP_URL } from "@/components/marketing/ui";
import { COURSE_FINDER_PATH } from "@/lib/routes";

export default function CTA() {
  return (
    <section id="contact" className="py-20 sm:py-24">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="relative flex flex-wrap items-center justify-between gap-8 overflow-hidden rounded-[32px] bg-primary-500 px-6 py-12 sm:px-12 sm:py-16">
          <div aria-hidden="true" className="absolute -right-16 -top-28 h-[260px] w-[260px] rounded-full bg-secondary-400/90" />
          <div className="relative flex flex-[1_1_480px] flex-col gap-3.5">
            <h2 className="font-heading text-3xl font-extrabold leading-tight text-white sm:text-[44px] sm:leading-[1.1]">
              Start with a free interactive class
            </h2>
            <p className="text-lg leading-relaxed text-[#ffe9ea] sm:text-[19px]">
              No credit card required. Answer three quick questions and we&apos;ll match you to the right course.
            </p>
          </div>
          <div className="relative flex flex-col items-start gap-3.5">
            <Link href={COURSE_FINDER_PATH} className={buttonClass("white", true)}>
              Find your course
            </Link>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[44px] items-center text-[15px] font-medium text-white underline underline-offset-4 hover:text-[#ffe9ea]"
            >
              Questions? Chat with us on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
