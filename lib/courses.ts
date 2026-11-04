import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { STATIC_COURSES } from "./course-catalog";
import type { Course, OfferingKind, PriceTier } from "./course-types";

export type { Course, CourseLink, CourseSummary, OfferingKind, PriceTier } from "./course-types";

// Server-only data access for the course catalogue. Reads go through the anon
// key: RLS exposes published courses, their curriculum outline and active
// offerings to everyone, so no session is needed and pages stay cacheable.

const COURSE_SELECT = `
  id, slug, title, description, full_description, age, level, duration,
  icon, color, bg, position,
  course_modules ( title, position, lessons ( title, position, is_published ) ),
  offerings ( kind, price_usd, price_ngn, is_active )
`;

export interface CourseRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  full_description: string;
  age: string;
  level: string;
  duration: string;
  icon: string;
  color: string;
  bg: string;
  position: number;
  course_modules:
    | {
        title: string;
        position: number;
        lessons: { title: string; position: number; is_published: boolean }[] | null;
      }[]
    | null;
  offerings:
    | {
        kind: OfferingKind;
        price_usd: number | string;
        price_ngn: number | string;
        is_active: boolean;
      }[]
    | null;
}

const byPosition = (a: { position: number }, b: { position: number }) =>
  a.position - b.position;

export function mapCourseRow(row: CourseRow): Course {
  const offerings = (row.offerings ?? [])
    .filter((o) => o.is_active)
    .map((o) => ({
      kind: o.kind,
      price: { usd: Number(o.price_usd), ngn: Number(o.price_ngn) } as PriceTier,
    }));

  const priceFor = (kind: OfferingKind) => offerings.find((o) => o.kind === kind)?.price;
  // "Starts from" on the marketing cards shows the group price; fall back to
  // the cheapest active offering for courses that aren't sold as a group cohort.
  const cheapest = [...offerings].sort((a, b) => a.price.usd - b.price.usd)[0]?.price;
  const group = priceFor("cohort_group") ?? cheapest ?? { usd: 0, ngn: 0 };

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    age: row.age,
    description: row.description,
    icon: row.icon,
    color: row.color,
    bg: row.bg,
    fullDescription: row.full_description,
    duration: row.duration,
    level: row.level,
    curriculum: [...(row.course_modules ?? [])].sort(byPosition).map((m) => ({
      module: m.title,
      lessons: [...(m.lessons ?? [])]
        .filter((l) => l.is_published)
        .sort(byPosition)
        .map((l) => l.title),
    })),
    price: {
      group,
      oneOnOne: priceFor("cohort_1on1") ?? group,
    },
    offerings,
  };
}

function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Unlike lib/auth.ts, a failed fetch here doesn't map to an empty result: it
// falls back to the bundled STATIC_COURSES so marketing pages keep rendering
// (e.g. before the catalogue migrations have been applied).
export const getCourses = cache(async (): Promise<Course[]> => {
  const client = createPublicClient();
  if (!client) return STATIC_COURSES;

  try {
    const { data, error } = await client
      .from("courses")
      .select(COURSE_SELECT)
      .eq("is_published", true)
      .order("position");

    if (error || !data) {
      console.warn("getCourses: falling back to static catalogue:", error?.message);
      return STATIC_COURSES;
    }
    return (data as unknown as CourseRow[]).map(mapCourseRow);
  } catch (err) {
    console.warn("getCourses: falling back to static catalogue:", err);
    return STATIC_COURSES;
  }
});

export async function getCourseBySlug(slug: string): Promise<Course | null> {
  const courses = await getCourses();
  return courses.find((c) => c.slug === slug) ?? null;
}

/**
 * Where a course page address that isn't live should go: the current slug of
 * the published course that used to have it, or whose internal ID it is
 * (older links and internal pages that only know course_id). Null for 404.
 */
export async function findCourseRedirect(address: string): Promise<string | null> {
  const courses = await getCourses();
  const byId = courses.find((c) => c.id === address);
  if (byId) return byId.slug;

  const client = createPublicClient();
  if (!client) return null;
  try {
    const { data } = await client
      .from("course_slug_redirects")
      .select("course_id")
      .eq("slug", address)
      .maybeSingle();
    if (!data) return null;
    return courses.find((c) => c.id === data.course_id)?.slug ?? null;
  } catch {
    return null;
  }
}
