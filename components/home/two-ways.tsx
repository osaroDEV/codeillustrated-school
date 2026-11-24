import { MonitorPlay, Users } from "lucide-react";
import { CheckItem, SectionHeading } from "@/components/marketing/ui";

/** The two ways to take any course, explained without prices. */
export function TwoWays() {
  return (
    <section className="bg-surface-mist py-20 sm:py-[88px]" aria-labelledby="two-ways-title">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-4 sm:px-6">
        <SectionHeading id="two-ways-title" eyebrow="Two ways to learn" title="Learn live with a tutor, or at your own pace" />
        <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))]">
          <WayCard
            icon={<Users className="h-[26px] w-[26px] text-white" aria-hidden="true" />}
            iconBg="bg-accent-500"
            title="Live group classes"
            billing="Billed monthly"
            body="Small groups with a tutor, on a fixed weekly schedule. Ask questions as you go and get feedback on your projects."
            points={[
              "We place you in a class and email the schedule",
              "Class times shown in your own time zone",
              "An invite to our learner community on Slack",
              "Best for: younger learners and anyone who likes structure",
            ]}
            highlight
          />
          <WayCard
            icon={<MonitorPlay className="h-[26px] w-[26px] text-[#3a2a00]" aria-hidden="true" />}
            iconBg="bg-secondary-400"
            title="Self-paced"
            billing="Billed monthly or yearly"
            body="All the lessons plus selected class recordings. No live classes. Start straight away and learn whenever suits you."
            points={[
              "Start the moment you pay",
              "Pay monthly or yearly",
              "An invite to our learner community on Slack",
              "Best for: busy adults and confident self-starters",
            ]}
          />
        </div>
      </div>
    </section>
  );
}

function WayCard({
  icon,
  iconBg,
  title,
  billing,
  body,
  points,
  highlight = false,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  billing: string;
  body: string;
  points: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-[18px] rounded-3xl border-2 bg-white p-7 sm:p-9 ${highlight ? "border-accent-500" : "border-surface-line"}`}
    >
      <div className="flex items-center gap-3.5">
        <div className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[14px] ${iconBg}`}>{icon}</div>
        <div>
          <h3 className="font-heading text-[26px] font-bold leading-tight text-ink">{title}</h3>
          <p className="text-[15px] text-ink-muted">{billing}</p>
        </div>
      </div>
      <p className="text-[17px] leading-relaxed text-ink-muted">{body}</p>
      <ul className="flex flex-col gap-2.5 text-base text-ink">
        {points.map((p) => (
          <CheckItem key={p}>{p}</CheckItem>
        ))}
      </ul>
    </div>
  );
}
