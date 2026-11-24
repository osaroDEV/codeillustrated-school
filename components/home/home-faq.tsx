import { CURRENCY_NOTE, Faq } from "@/components/marketing/ui";

const ITEMS = [
  {
    q: "Is the first class really free?",
    a: "Yes. Your first interactive class is free and you don't need a card. You only pay if you decide to enrol.",
  },
  {
    q: "What's the difference between group classes and self-paced?",
    a: "Group classes are live with a tutor and a small group, on a set weekly schedule, billed monthly. Self-paced gives you all the lessons and selected class recordings with no live classes, billed monthly or yearly.",
  },
  {
    q: "What time zone are classes in?",
    a: "We teach learners in many countries. Group class times are shown in your own time zone on your dashboard, and your schedule email confirms them.",
  },
  {
    q: "What currency will I pay in?",
    a: `${CURRENCY_NOTE} You pay securely by card.`,
  },
  {
    q: "Is there a learner community?",
    a: "Yes. Every enrolled learner gets an invite to our learner community on Slack, moderated by our team. We send the invite link after you enrol.",
  },
  {
    q: "Can we cancel?",
    a: "Yes, any time from your dashboard.",
  },
];

export function HomeFaq() {
  return (
    <section className="bg-surface-mist py-20 sm:py-[88px]" aria-labelledby="faq-title">
      <div className="mx-auto flex max-w-[860px] flex-col gap-7 px-4 sm:px-6">
        <h2 id="faq-title" className="font-heading text-3xl font-extrabold leading-tight text-ink sm:text-[40px]">
          Questions parents ask
        </h2>
        <Faq items={ITEMS} />
      </div>
    </section>
  );
}
