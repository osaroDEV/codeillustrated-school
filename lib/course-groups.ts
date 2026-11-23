import { parseAgeRange } from "@/lib/course-finder";
import type { Course, OfferingKind, PriceTier } from "@/lib/course-types";

// How the marketing pages group and colour courses, and which prices they quote.

/** kids: youngest age under 13. teens: 13–17 only. adults: everything else. */
export type AgeGroup = "kids" | "teens" | "adults";

export const AGE_GROUPS: readonly {
  id: AgeGroup;
  /** Chip and badge text. */
  label: string;
  /** Heading for the group's section on /courses. */
  heading: string;
}[] = [
  { id: "kids", label: "Ages 8–12", heading: "First steps, big imagination" },
  { id: "teens", label: "Ages 13–17", heading: "Make things that really work" },
  { id: "adults", label: "Teens & adults", heading: "Skills for a tech career" },
];

export function ageGroup(course: Pick<Course, "age">): AgeGroup {
  const [min, max] = parseAgeRange(course.age);
  if (min < 13) return "kids";
  if (max <= 17) return "teens";
  return "adults";
}

/** Course pages for younger children use the playful style; everyone else gets the calm one. */
export function isPlayful(course: Pick<Course, "age">): boolean {
  return ageGroup(course) === "kids";
}

/** "Age 8-12" → "Ages 8–12"; other text is left alone. */
export function displayAge(age: string): string {
  return age
    .replace(/^age\s+(?=\d)/i, "Ages ")
    .replace(/(\d)\s*-\s*(\d)/g, "$1–$2");
}

/** "Module 1: Web Foundation" → "Web Foundation", for cards that number modules themselves. */
export function moduleName(title: string): string {
  return title.replace(/^module\s*\d+\s*[:.\-–]\s*/i, "").trim() || title;
}

const isPriced = (p: PriceTier | undefined): p is PriceTier => !!p && p.usd > 0 && p.ngn > 0;

/** The monthly price of one way of taking the course, if it's on sale online. */
export function monthlyPrice(course: Pick<Course, "offerings">, kind: OfferingKind): PriceTier | undefined {
  const price = course.offerings?.find((o) => o.kind === kind)?.price;
  return isPriced(price) ? price : undefined;
}

/**
 * The "from" price on course cards: the lowest monthly price across the
 * course's offerings, per currency, or the catalogue group price when nothing
 * is on sale online (the static fallback courses).
 */
export function lowestMonthlyPrice(course: Pick<Course, "offerings" | "price">): PriceTier {
  const prices = (course.offerings ?? []).map((o) => o.price).filter(isPriced);
  if (!prices.length) return course.price.group;
  return {
    usd: Math.min(...prices.map((p) => p.usd)),
    ngn: Math.min(...prices.map((p) => p.ngn)),
  };
}
