// Serializable course shapes, safe to pass from server components to client
// components (no React components inside — see lib/course-icons.ts).

export interface PriceTier {
  usd: number;
  ngn: number;
}

/** How a course is sold: live group classes, or self-paced access. */
export type OfferingKind = "cohort_group" | "self_paced";
export const OFFERING_KINDS: readonly OfferingKind[] = ["cohort_group", "self_paced"];

/**
 * Kinds the database can hold. "cohort_1on1" is no longer sold or shown
 * anywhere; old rows of that kind are ignored.
 */
export type StoredOfferingKind = OfferingKind | "cohort_1on1";

export function isOfferingKind(kind: string): kind is OfferingKind {
  return (OFFERING_KINDS as readonly string[]).includes(kind);
}

export interface Course {
  /** Permanent internal ID; enrolments, cohorts and orders refer to it. */
  id: string;
  /** The public address, /courses/<slug>. Admins can change it; old ones redirect. */
  slug: string;
  title: string;
  age: string;
  description: string;
  /** Key into COURSE_ICONS. */
  icon: string;
  color: string;
  bg: string;
  fullDescription: string;
  curriculum: {
    module: string;
    lessons: string[];
    /** Same order as lessons: a lesson's ID if it's a free preview, else null. */
    previewIds?: (string | null)[];
  }[];
  duration: string;
  level: string;
  price: {
    group: PriceTier;
  };
  /**
   * Active offerings from the database, used for online checkout. Absent on
   * the bundled STATIC_COURSES fallback, which only offers WhatsApp enrolment.
   */
  offerings?: { kind: OfferingKind; price: PriceTier; yearlyPrice?: PriceTier }[];
}

/** Just enough of a course for admin dropdowns. */
export type CourseSummary = Pick<Course, "id" | "title">;

/** Just enough of a course to link to its page and name it in a form. */
export type CourseLink = Pick<Course, "id" | "slug" | "title">;
