"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Loader2, Lock, RotateCcw } from "lucide-react";
import type { BillingInterval } from "@/lib/billing";
import type { Course, OfferingKind, PriceTier } from "@/lib/course-types";
import { useCurrency } from "@/hooks/use-currency";
import { PriceDisplay } from "./price-display";
import { buttonClass, WHATSAPP_URL } from "@/components/marketing/ui";
import { COURSE_FINDER_PATH, signupPath } from "@/lib/routes";
import { cn } from "@/lib/utils";

/**
 * The two ways to take a course, live group classes and self-paced, side by
 * side with one Enrol button each when it can be bought online (a card
 * subscription through Flutterwave). Courses served from the static fallback
 * catalogue have no offerings data and keep WhatsApp enrolment.
 */
export function EnrollOptions({
  course,
  forChild = false,
  ageLabel,
}: {
  course: Course;
  /** Word the copy for a parent choosing for their child. */
  forChild?: boolean;
  /** The course's ages, for the "Recommended for …" tag on kids' courses. */
  ageLabel?: string;
}) {
  const { currency } = useCurrency();
  const [busy, setBusy] = useState<OfferingKind | null>(null);
  const [error, setError] = useState("");
  const online = new Map((course.offerings ?? []).map((o) => [o.kind, o.price]));
  const selfPaced = (course.offerings ?? []).find((o) => o.kind === "self_paced" && o.price.usd > 0 && o.price.ngn > 0);
  const [selfPacedInterval, setSelfPacedInterval] = useState<BillingInterval>("monthly");

  async function subscribe(kind: OfferingKind, interval: BillingInterval = "monthly") {
    setBusy(kind);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: course.id, kind, currency, interval }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        // Most people buying are new here; the signup page links to Log in
        // and both bring them back to this course afterwards.
        window.location.href = `${signupPath(`/courses/${course.slug}#enroll`)}`;
        return;
      }
      if (!res.ok || !data.link) throw new Error(data.error || "Couldn't start the payment. Please try again.");
      window.location.href = data.link;
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  }

  const groupPrice = online.get("cohort_group") ?? course.price.group;
  const groupBuyable = online.has("cohort_group") && groupPrice.usd > 0 && groupPrice.ngn > 0;
  const sellsOnline = online.size > 0;
  const you = forChild ? "your child" : "you";

  return (
    <div className="flex flex-col gap-8">
      <div
        className={cn(
          "grid w-full items-stretch gap-6",
          selfPaced ? "md:grid-cols-2" : "mx-auto max-w-[560px]",
          forChild && ageLabel && "pt-4"
        )}
      >
        <PlanCard
          title="Live group classes"
          tagline={forChild ? "Learn live with a tutor and a small group of classmates." : "Best if you want structure and accountability."}
          badge={forChild && ageLabel ? `Recommended for ${ageLabel.toLowerCase()}` : undefined}
          highlight
          price={<PriceBlock price={groupPrice} />}
          rows={[
            ["Live classes", "Weekly, with a tutor"],
            ["Pace", "Set schedule, in your time zone"],
            ["Starts", "We place you in a class"],
            ["Lessons and projects", "All included"],
            ["Tutor feedback", "On your projects"],
            ["Certificate", "Yes"],
            ["Billing", "Monthly"],
          ]}
          action={
            groupBuyable ? (
              <button
                type="button"
                onClick={() => subscribe("cohort_group")}
                disabled={busy !== null}
                className={buttonClass("primary", false, "min-h-[56px] w-full")}
              >
                {busy === "cohort_group" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                Enrol in group classes
              </button>
            ) : (
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className={buttonClass("primary", false, "min-h-[56px] w-full")}>
                Enrol on WhatsApp
              </a>
            )
          }
          note={
            groupBuyable
              ? `After payment we place ${you} in a class and email the schedule.`
              : "Message us and we'll find a class for you."
          }
        />

        {selfPaced && (
          <PlanCard
            title="Self-paced"
            tagline={forChild ? "All the lessons, learned whenever suits you. No live classes." : "Best if you're fitting it around work."}
            price={
              <div className="flex flex-col gap-3">
                <PriceBlock
                  price={selfPacedInterval === "yearly" && selfPaced.yearlyPrice ? selfPaced.yearlyPrice : selfPaced.price}
                  period={selfPacedInterval === "yearly" ? "year" : "month"}
                />
                {selfPaced.yearlyPrice && (
                  <div className="grid max-w-[260px] grid-cols-2 gap-1 rounded-full bg-surface-mist p-1" role="group" aria-label="Billing period">
                    {(["monthly", "yearly"] as const).map((interval) => (
                      <button
                        key={interval}
                        type="button"
                        aria-pressed={selfPacedInterval === interval}
                        onClick={() => setSelfPacedInterval(interval)}
                        className={cn(
                          "min-h-[44px] rounded-full text-sm font-semibold capitalize transition-colors",
                          selfPacedInterval === interval ? "bg-white text-ink shadow-sm" : "text-ink-subtle hover:text-ink"
                        )}
                      >
                        {interval}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            }
            rows={[
              ["Live classes", "None"],
              ["Pace", "Your own pace"],
              ["Starts", "Straight away"],
              ["Lessons and projects", "All included"],
              ["Class recordings", "Selected recordings"],
              ["Certificate", "Yes"],
              ["Billing", selfPaced.yearlyPrice ? "Monthly or yearly" : "Monthly"],
            ]}
            action={
              <button
                type="button"
                onClick={() => subscribe("self_paced", selfPacedInterval)}
                disabled={busy !== null}
                className={buttonClass("teal", false, "min-h-[56px] w-full")}
              >
                {busy === "self_paced" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                Enrol self-paced
              </button>
            }
            note={`Lessons unlock on ${forChild ? "the" : "your"} dashboard as soon as you pay.`}
          />
        )}
      </div>

      {error && (
        <p className="text-center text-sm font-medium text-primary-600" role="alert">
          {error}
        </p>
      )}

      <ul className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-[15px] text-ink-muted">
        {sellsOnline && (
          <>
            <li className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-accent-500" aria-hidden="true" />
              Secure card payment by Flutterwave
            </li>
            <li className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-accent-500" aria-hidden="true" />
              Cancel any time from your dashboard
            </li>
          </>
        )}
        <li className="flex items-center gap-2">
          <Check className="h-5 w-5 text-accent-500" aria-hidden="true" />
          <span>
            Free first class, no card needed:{" "}
            <Link href={COURSE_FINDER_PATH} className="font-semibold text-accent-500 underline-offset-4 hover:underline">
              try it
            </Link>
          </span>
        </li>
      </ul>
    </div>
  );
}

function PriceBlock({ price, period = "month" }: { price: PriceTier; period?: "month" | "year" }) {
  return (
    <p className="text-lg text-ink-muted">
      <PriceDisplay price={price} showPeriod={false} className="font-heading text-[44px] font-extrabold leading-none text-ink sm:text-5xl" />{" "}
      / {period}
    </p>
  );
}

function PlanCard({
  title,
  tagline,
  badge,
  highlight = false,
  price,
  rows,
  action,
  note,
}: {
  title: string;
  tagline: string;
  badge?: string;
  highlight?: boolean;
  price: React.ReactNode;
  rows: [string, string][];
  action: React.ReactNode;
  note: string;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col gap-[22px] rounded-[28px] border-[3px] bg-white p-6 sm:p-9",
        highlight ? "border-primary-500" : "border-[#dde7ea]"
      )}
    >
      {badge && (
        <p className="absolute -top-4 left-6 rounded-full bg-primary-500 px-3.5 py-1.5 text-[13px] font-bold text-white sm:left-8">
          {badge}
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        <h3 className="font-heading text-[28px] font-bold leading-tight text-ink">{title}</h3>
        <p className="text-base text-ink-muted">{tagline}</p>
      </div>
      {price}
      <dl className="flex flex-col border-t border-[#e6ecee]">
        {rows.map(([term, value]) => (
          <div key={term} className="flex justify-between gap-4 border-b border-[#e6ecee] py-[13px]">
            <dt className="text-ink-subtle">{term}</dt>
            <dd className={cn("m-0 text-right font-semibold", value === "None" ? "text-ink-subtle" : "text-ink")}>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-auto flex flex-col gap-2.5">
        {action}
        <p className="text-center text-sm text-ink-subtle">{note}</p>
      </div>
    </div>
  );
}
