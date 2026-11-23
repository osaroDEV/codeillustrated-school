import type { AgeGroup } from "@/lib/course-groups";

/** Colours for each age group: amber for kids, crimson for teens, teal for teens & adults. */
export const GROUP_STYLES: Record<AgeGroup, { card: string; line: string; badge: string }> = {
  kids: {
    card: "bg-surface-amber border-surface-amber-line",
    line: "border-surface-amber-line",
    badge: "bg-secondary-400 text-[#3a2a00]",
  },
  teens: {
    card: "bg-surface-crimson border-surface-crimson-line",
    line: "border-surface-crimson-line",
    badge: "bg-primary-500 text-white",
  },
  adults: {
    card: "bg-surface-teal border-surface-teal-line",
    line: "border-surface-teal-line",
    badge: "bg-accent-500 text-white",
  },
};
