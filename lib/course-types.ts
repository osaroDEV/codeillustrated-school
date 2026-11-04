// Serializable course shapes, safe to pass from server components to client
// components (no React components inside — see lib/course-icons.ts).

export interface PriceTier {
  usd: number;
  ngn: number;
}

export type OfferingKind = "cohort_group" | "cohort_1on1" | "self_paced";

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
  }[];
  duration: string;
  level: string;
  price: {
    group: PriceTier;
    oneOnOne: PriceTier;
  };
  /**
   * Active offerings from the database, used for online checkout. Absent on
   * the bundled STATIC_COURSES fallback, which only offers WhatsApp enrolment.
   */
  offerings?: { kind: OfferingKind; price: PriceTier }[];
}

/** Just enough of a course for admin dropdowns. */
export type CourseSummary = Pick<Course, "id" | "title">;

/** Just enough of a course to link to its page and name it in a form. */
export type CourseLink = Pick<Course, "id" | "slug" | "title">;
