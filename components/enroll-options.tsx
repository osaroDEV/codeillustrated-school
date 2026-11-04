"use client";

import { useState } from "react";
import { Loader2, User, Users } from "lucide-react";
import type { Course, OfferingKind } from "@/lib/course-types";
import { useCurrency } from "@/hooks/use-currency";
import { PriceDisplay } from "./price-display";

const WHATSAPP = "https://wa.me/447405786279";

const OPTIONS: { kind: OfferingKind; label: string; blurb: string; Icon: typeof Users; featured?: boolean }[] = [
  { kind: "cohort_group", label: "Group Classes", blurb: "Collaborative learning with peers in small groups.", Icon: Users },
  {
    kind: "cohort_1on1",
    label: "1-on-1 Classes",
    blurb: "Dedicated mentorship and personalized learning pace.",
    Icon: User,
    featured: true,
  },
];

/**
 * Price cards with a Subscribe button per offering that can be bought online
 * (monthly card subscription through Flutterwave). Courses served from the
 * static fallback catalogue have no offerings data and keep WhatsApp enrolment.
 */
export function EnrollOptions({ course }: { course: Course }) {
  const { currency } = useCurrency();
  const [busy, setBusy] = useState<OfferingKind | null>(null);
  const [error, setError] = useState("");
  const online = new Map((course.offerings ?? []).map((o) => [o.kind, o.price]));

  async function subscribe(kind: OfferingKind) {
    setBusy(kind);
    setError("");
    try {
      const res = await fetch("/academy/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: course.id, kind, currency }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = `/academy/auth/login?redirectTo=${encodeURIComponent(`/courses/${course.id}#enroll`)}`;
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
      {OPTIONS.map(({ kind, label, blurb, Icon, featured }) => {
        const price = online.get(kind) ?? (kind === "cohort_group" ? course.price.group : course.price.oneOnOne);
        const buyable = online.has(kind) && price.usd > 0 && price.ngn > 0;
        return (
          <div
            key={kind}
            className={`p-4 rounded-2xl border transition-colors relative ${
              featured ? "bg-primary/5 border-primary/10 hover:border-primary/30" : "bg-slate-50 border-slate-100 hover:border-primary/30"
            }`}
          >
            {featured && (
              <div className="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Recommended
              </div>
            )}
            <div className="flex items-center justify-between mb-2">
              <span className={`flex items-center gap-2 text-sm font-bold ${featured ? "text-primary" : "text-slate-900"}`}>
                <Icon className="w-4 h-4 text-primary" />
                {label}
              </span>
              <PriceDisplay price={price} className={`text-xl ${featured ? "text-primary" : ""}`} />
            </div>
            <p className="text-xs text-slate-500">{blurb}</p>
            {buyable && (
              <button
                onClick={() => subscribe(kind)}
                disabled={busy !== null}
                className={`mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-60 ${
                  featured
                    ? "bg-gradient-to-r from-primary-500 to-secondary-400 hover:from-primary-700 hover:to-secondary-500 text-white"
                    : "bg-slate-900 hover:bg-slate-800 text-white"
                }`}
              >
                {busy === kind && <Loader2 className="w-4 h-4 animate-spin" />}
                Subscribe monthly
              </button>
            )}
          </div>
        );
      })}

      {error && <p className="text-sm text-red-600 text-center">{error}</p>}

      {online.size > 0 ? (
        <p className="text-xs text-slate-500 text-center">
          Billed monthly by card through Flutterwave. Cancel any time from your dashboard.{" "}
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
