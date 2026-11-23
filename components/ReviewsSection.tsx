"use client";

import { useMemo, useState } from "react";
import { REVIEWS, type Review } from "@/lib/reviews";
import { SectionHeading } from "@/components/marketing/ui";
import { cn } from "@/lib/utils";

const FILTERS = ["All", ...Array.from(new Set(REVIEWS.map((r) => r.course)))];
const SHOWN = 3;

export default function ReviewsSection() {
  const [filter, setFilter] = useState("All");
  const [expanded, setExpanded] = useState(false);

  const matching = useMemo(() => (filter === "All" ? REVIEWS : REVIEWS.filter((r) => r.course === filter)), [filter]);
  const visible = expanded ? matching : matching.slice(0, SHOWN);

  return (
    <section id="reviews" className="scroll-mt-20 py-20 sm:py-24" aria-labelledby="reviews-title">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-4 sm:px-6">
        <SectionHeading id="reviews-title" eyebrow="Real students, real results" title="What learners and parents say" />

        <div className="flex flex-wrap gap-2.5" role="group" aria-label="Show reviews for">
          {FILTERS.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={filter === name}
              onClick={() => {
                setFilter(name);
                setExpanded(false);
              }}
              className={cn(
                "inline-flex min-h-[44px] items-center rounded-full border-2 px-[18px] text-[15px] font-semibold transition-colors",
                filter === name
                  ? "border-accent-500 bg-accent-500 text-white"
                  : "border-[#d3e0e4] bg-white text-ink hover:border-accent-500 hover:text-accent-500"
              )}
            >
              {name}
            </button>
          ))}
        </div>

        <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]">
          {visible.map((review, i) => (
            <ReviewCard key={review.id} review={review} tint={i % 3 === 0 ? "amber" : "teal"} />
          ))}
        </div>

        {matching.length > SHOWN && (
          <div>
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              aria-expanded={expanded}
              className="inline-flex min-h-[44px] items-center rounded-full border-2 border-accent-500 px-6 font-semibold text-accent-500 transition-colors hover:bg-accent-500 hover:text-white"
            >
              {expanded ? "Show fewer reviews" : `Show all ${matching.length} reviews`}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export function ReviewCard({ review, tint = "amber" }: { review: Review; tint?: "amber" | "teal" }) {
  return (
    <blockquote
      className={cn(
        "m-0 flex flex-col gap-[18px] rounded-[22px] p-7",
        tint === "amber" ? "bg-surface-amber" : "bg-surface-teal"
      )}
    >
      <p className="flex-1 text-[17px] leading-relaxed text-ink">&ldquo;{review.quote}&rdquo;</p>
      <footer className="text-[15px] text-ink">
        <strong>{review.name}</strong>
        <br />
        <span className="text-ink-muted">
          {review.role} · {review.course}
        </span>
      </footer>
    </blockquote>
  );
}
