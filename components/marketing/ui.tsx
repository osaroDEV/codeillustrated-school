import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Small pieces shared by the public marketing pages (home, /courses, course pages).

export const WHATSAPP_URL = "https://wa.me/447405786279";

/** Solid pill buttons. Apply to a Link, <a> or <button>. */
export const buttonStyles = {
  base: "inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-full px-7 text-[17px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60",
  primary: "bg-primary-500 text-white hover:bg-primary-700 hover:text-white focus-visible:ring-primary-500",
  teal: "bg-accent-500 text-white hover:bg-accent-700 hover:text-white focus-visible:ring-accent-500",
  white: "bg-white text-primary-500 hover:bg-primary-50 focus-visible:ring-white",
  large: "min-h-[58px] px-9 text-lg",
} as const;

export function buttonClass(tone: "primary" | "teal" | "white" = "primary", large = false, className?: string) {
  return cn(buttonStyles.base, buttonStyles[tone], large && buttonStyles.large, className);
}

/** The small uppercase line above a section heading. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-sm font-bold uppercase tracking-[0.08em] text-primary-500", className)}>{children}</p>;
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  className,
  center = false,
  id,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  className?: string;
  center?: boolean;
  id?: string;
}) {
  return (
    <div className={cn("flex max-w-2xl flex-col gap-3", center && "mx-auto items-center text-center", className)}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 id={id} className="font-heading text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-[44px] sm:leading-[1.1]">
        {title}
      </h2>
      {intro && <p className="text-lg leading-relaxed text-ink-muted">{intro}</p>}
    </div>
  );
}

export function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <Check className="mt-0.5 h-5 w-5 shrink-0 text-accent-500" strokeWidth={2.5} aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}

export interface FaqItem {
  q: string;
  a: React.ReactNode;
}

/** Native details/summary, so it works without JavaScript and with the keyboard. */
export function Faq({ items, className }: { items: FaqItem[]; className?: string }) {
  return (
    <div className={cn("rounded-2xl bg-white px-5 sm:px-7", className)}>
      {items.map((item, i) => (
        <details key={item.q} className="group border-b border-surface-line last:border-b-0" open={i === 0}>
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-4 py-5 text-[17px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
            {item.q}
            <ChevronDown className="h-5 w-5 shrink-0 text-ink-subtle transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="pb-5 text-base leading-relaxed text-ink-muted">{item.a}</div>
        </details>
      ))}
    </div>
  );
}

