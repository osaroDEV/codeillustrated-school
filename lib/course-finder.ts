import type { Course, OfferingKind } from "@/lib/course-types";

// The course finder on /start: three questions, then the courses that fit.
// Courses only have a free-text age ("Age 8-12", "Teens & Adults") and level,
// so both are read loosely and anything unreadable counts as a match.

export type Learner = "child" | "teen" | "adult";
export type Experience = "new" | "some";
export type Format = OfferingKind | "any";

export interface FinderAnswers {
  learner: Learner;
  experience: Experience;
  format: Format;
}

/** A representative age for each answer. */
const AGE: Record<Learner, number> = { child: 10, teen: 15, adult: 25 };

/** The age range a course is for, from its free-text `age`. */
export function parseAgeRange(text: string | null | undefined): [number, number] {
  const t = (text ?? "").toLowerCase();
  const range = t.match(/(\d{1,2})\s*(?:-|–|to)\s*(\d{1,2})/);
  if (range) return [Number(range[1]), Number(range[2])];
  const plus = t.match(/(\d{1,2})\s*\+/);
  if (plus) return [Number(plus[1]), 99];
  const teens = t.includes("teen");
  const adults = t.includes("adult");
  if (teens && adults) return [13, 99];
  if (teens) return [13, 19];
  if (adults) return [18, 99];
  if (t.includes("kid") || t.includes("child")) return [6, 12];
  return [0, 99];
}

export function fitsAge(course: Pick<Course, "age">, learner: Learner): boolean {
  const [min, max] = parseAgeRange(course.age);
  const age = AGE[learner];
  return age >= min && age <= max;
}

/** Offerings that can be bought online right now (priced in both currencies). */
export function buyableKinds(course: Pick<Course, "offerings">): OfferingKind[] {
  return (course.offerings ?? []).filter((o) => o.price.usd > 0 && o.price.ngn > 0).map((o) => o.kind);
}

function levelScore(level: string, experience: Experience): number {
  const l = level.toLowerCase();
  const beginner = l.includes("beginner") || l.includes("intro");
  const advanced = l.includes("advanced");
  if (experience === "new") return beginner ? 3 : advanced ? -3 : 0;
  return advanced ? 2 : beginner ? 0 : 2;
}

export interface Recommendation {
  course: Course;
  /** The chosen format is on sale for this course. */
  formatAvailable: boolean;
}

/**
 * The best one or two courses for the answers. Only courses whose age range
 * fits are considered; if none fit, every course is (so the visitor is never
 * left with nothing).
 */
export function recommendCourses(courses: Course[], answers: FinderAnswers, limit = 2): Recommendation[] {
  const fitting = courses.filter((c) => fitsAge(c, answers.learner));
  const pool = fitting.length ? fitting : courses;

  return pool
    .map((course, index) => {
      const kinds = buyableKinds(course);
      const formatAvailable = answers.format === "any" ? kinds.length > 0 : kinds.includes(answers.format);
      const [min, max] = parseAgeRange(course.age);
      // Prefer courses made for this age group over very broad ranges.
      const focus = max - min <= 10 ? 1 : 0;
      const score =
        levelScore(course.level, answers.experience) + (formatAvailable ? 2 : 0) + (kinds.length ? 1 : 0) + focus;
      return { course, formatAvailable, score, index };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ course, formatAvailable }) => ({ course, formatAvailable }));
}
