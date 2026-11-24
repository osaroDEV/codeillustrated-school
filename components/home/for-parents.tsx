import { ShieldCheck } from "lucide-react";
import { Eyebrow } from "@/components/marketing/ui";

const LESSON_STEPS = [
  { lead: "Join from a link", rest: " on a laptop or desktop, from home." },
  { lead: "The tutor explains with pictures", rest: " first. That's our illustrated teaching method." },
  { lead: "Everyone codes along", rest: " in a small group." },
  { lead: "They finish with a project", rest: " to show you, and the tutor gives feedback." },
];

/** How a live lesson runs, and how parents follow progress. */
export function ForParents() {
  return (
    <section id="parents" className="scroll-mt-20 bg-accent-500 py-20 text-white sm:py-24" aria-labelledby="parents-title">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-12 px-4 sm:px-6">
        <div className="flex max-w-[720px] flex-col gap-3.5">
          <Eyebrow className="text-secondary-400">For parents</Eyebrow>
          <h2 id="parents-title" className="font-heading text-3xl font-extrabold leading-tight tracking-tight sm:text-[44px] sm:leading-[1.1]">
            You&apos;ll know how lessons work and how your child is doing
          </h2>
        </div>

        <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
          <div className="flex flex-col gap-5 rounded-3xl bg-white p-7 text-ink sm:p-8">
            <h3 className="font-heading text-2xl font-bold">How a live lesson runs</h3>
            <ol className="flex flex-col gap-4">
              {LESSON_STEPS.map((step, i) => (
                <li key={step.lead} className="flex gap-3.5">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fff1d6] font-bold text-[#8a5a00]"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <p className="text-base leading-normal">
                    <strong>{step.lead}</strong>
                    {step.rest}
                  </p>
                </li>
              ))}
            </ol>
            <p className="flex items-start gap-2.5 text-[15px] leading-normal text-ink-muted">
              <ShieldCheck className="h-[22px] w-[22px] shrink-0 text-accent-500" aria-hidden="true" />
              Our learner community on Slack is moderated by our team.
            </p>
          </div>

          <div className="flex flex-col gap-5 rounded-3xl bg-white p-7 text-ink sm:p-8">
            <h3 className="font-heading text-2xl font-bold">See their progress</h3>
            <DashboardExample />
            <p className="text-[15px] leading-normal text-ink-muted">
              Log in to the learner dashboard any time to see lessons completed, projects and tutor feedback. A certificate
              is awarded at the end.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/** An illustration of the learner dashboard. Every figure in it is made up, so it's labelled "Example". */
function DashboardExample() {
  return (
    <figure className="m-0 flex flex-col gap-3.5 rounded-2xl border border-surface-line bg-[#fbfdfd] p-[18px]">
      <figcaption className="flex items-center justify-between gap-3">
        <span className="text-[15px] font-bold">Junior Web Creator</span>
        <span className="rounded-full bg-surface-mist px-2.5 py-1 text-xs font-semibold text-ink-subtle">Example</span>
      </figcaption>
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-[13px] text-ink-muted">
          <span>Course progress</span>
          <span>Module 2 of 3</span>
        </div>
        <div className="h-2.5 rounded-full bg-[#e6ecee]">
          <div className="h-2.5 w-[58%] rounded-full bg-accent-500" />
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-2.5">
        <div className="flex flex-col-reverse rounded-[10px] bg-surface-amber px-3 py-2.5">
          <dt className="text-xs text-ink-subtle">Classes attended</dt>
          <dd className="text-lg font-bold">11 / 12</dd>
        </div>
        <div className="flex flex-col-reverse rounded-[10px] bg-surface-amber px-3 py-2.5">
          <dt className="text-xs text-ink-subtle">Projects built</dt>
          <dd className="text-lg font-bold">4</dd>
        </div>
      </dl>
      <p className="rounded-[10px] bg-surface-teal px-3 py-2.5 text-[13px] leading-normal">
        <strong>Tutor note:</strong> Great work on the CSS layout this week.
      </p>
    </figure>
  );
}
