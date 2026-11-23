"use client";

import { useState } from "react";
import { BookOpen, Loader2, Users } from "lucide-react";
import type { BillingInterval } from "@/lib/billing";
import type { Course, OfferingKind } from "@/lib/course-types";
import { useCurrency } from "@/hooks/use-currency";
import { PriceDisplay } from "./price-display";
import { signupPath } from "@/lib/routes";

const WHATSAPP = "https://wa.me/447405786279";

/**
 * Price cards for the two ways to take a course, live group classes and
 * self-paced, each with a Subscribe button when it can be bought online (a card
 * subscription through Flutterwave). Courses served from the static fallback
 * catalogue have no offerings data and keep WhatsApp enrolment.
 */
export function EnrollOptions({ course }: { course: Course }) {
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

  return (
    <div id="enroll" className="space-y-4 scroll-mt-32">
      {online.size > 0 && (
        <ol className="grid grid-cols-3 gap-2 text-center" aria-label="How enrolling works">
          {["Create your free account", "Pay monthly by card", "We place you in a class and email your schedule"].map((step, i) => (
            <li key={step} className="rounded-xl bg-white px-2 py-2.5 border border-slate-100">
              <span className="mx-auto mb-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                {i + 1}
              </span>
              <span className="block text-[11px] leading-snug text-slate-600">{step}</span>
            </li>
          ))}
        </ol>
      )}
      {(() => {
        const price = online.get("cohort_group") ?? course.price.group;
        const buyable = online.has("cohort_group") && price.usd > 0 && price.ngn > 0;
        return (
          <div className="p-4 rounded-2xl border transition-colors bg-primary/5 border-primary/10 hover:border-primary/30">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 text-sm font-bold text-primary">
                <Users className="w-4 h-4 text-primary" />
                Group Classes
              </span>
              <PriceDisplay price={price} className="text-xl text-primary" />
            </div>
            <p className="text-xs text-slate-500">Live classes with a tutor and a small group of peers, on a set schedule.</p>
            {buyable && (
              <button
                onClick={() => subscribe("cohort_group")}
                disabled={busy !== null}
                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-60 bg-gradient-to-r from-primary-500 to-secondary-400 hover:from-primary-700 hover:to-secondary-500 text-white"
              >
                {busy === "cohort_group" && <Loader2 className="w-4 h-4 animate-spin" />}
                Subscribe monthly
              </button>
            )}
          </div>
        );
      })()}

      {selfPaced && (
        <div className="p-4 rounded-2xl border transition-colors bg-slate-50 border-slate-100 hover:border-primary/30">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <BookOpen className="w-4 h-4 text-primary" />
              Self-paced
            </span>
            <PriceDisplay
              price={selfPacedInterval === "yearly" && selfPaced.yearlyPrice ? selfPaced.yearlyPrice : selfPaced.price}
              period={selfPacedInterval === "yearly" ? "yr" : "mo"}
              className="text-xl"
            />
          </div>
          <p className="text-xs text-slate-500">Lessons at your own pace, plus selected class recordings. No live classes. Starts as soon as you pay.</p>
          {selfPaced.yearlyPrice && (
            <div className="mt-3 grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-200/60" role="group" aria-label="Billing period">
              {(["monthly", "yearly"] as const).map((interval) => (
                <button
                  key={interval}
                  type="button"
                  aria-pressed={selfPacedInterval === interval}
                  onClick={() => setSelfPacedInterval(interval)}
                  className={`py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
                    selfPacedInterval === interval ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                  }`}
                >
                  {interval}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => subscribe("self_paced", selfPacedInterval)}
            disabled={busy !== null}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-60 bg-slate-900 hover:bg-slate-800 text-white"
          >
            {busy === "self_paced" && <Loader2 className="w-4 h-4 animate-spin" />}
            Subscribe {selfPacedInterval}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600 text-center">{error}</p>}

      {online.size > 0 ? (
        <p className="text-xs text-slate-500 text-center">
          Billed by card through Flutterwave. Cancel any time from your dashboard.{" "}
          <a href={WHATSAPP} target="_blank" rel="noreferrer" className="text-primary font-semibold hover:underline">
            Questions? Talk to us
          </a>
        </p>
      ) : (
        <a
          href={WHATSAPP}
          target="_blank"
          rel="noreferrer"
          className="w-full bg-gradient-to-r from-primary-500 to-secondary-400 hover:from-primary-700 hover:to-secondary-500 px-8 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center text-center text-white border-none mt-4"
        >
          Enroll Now
        </a>
      )}
    </div>
  );
}
