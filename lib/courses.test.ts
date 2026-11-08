import { afterEach, describe, expect, it, vi } from "vitest";
import { STATIC_COURSES } from "./course-catalog";
import { findCourseRedirect, getCourseBySlug, getCourses, mapCourseRow, type CourseRow } from "./courses";

// vi.mock is hoisted above the imports, so ./courses sees the mocked client.
const selectResult = vi.hoisted(() => ({
  value: { data: null as unknown, error: null as unknown },
}));
const redirectRows = vi.hoisted(() => new Map<string, string>());

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) =>
      table === "course_slug_redirects"
        ? {
            select: () => ({
              eq: (_col: string, slug: string) => ({
                maybeSingle: async () => ({
                  data: redirectRows.has(slug) ? { course_id: redirectRows.get(slug) } : null,
                  error: null,
                }),
              }),
            }),
          }
        : {
            select: () => ({
              eq: () => ({
                order: async () => selectResult.value,
              }),
            }),
          },
  }),
}));

function row(overrides: Partial<CourseRow> = {}): CourseRow {
  return {
    id: "test-course",
    slug: "test-course",
    title: "Test Course",
    description: "Short",
    full_description: "Long",
    age: "Age 8-12",
    level: "Beginner",
    duration: "10 Weeks",
    icon: "globe",
    color: "text-accent-500",
    bg: "bg-accent-500/10",
    position: 1,
    course_modules: [],
    offerings: [],
    ...overrides,
  };
}

describe("mapCourseRow", () => {
  it("maps snake_case columns to the Course shape", () => {
    const course = mapCourseRow(row());
    expect(course.id).toBe("test-course");
    expect(course.fullDescription).toBe("Long");
    expect(course.icon).toBe("globe");
  });

  it("orders modules and lessons by position and hides unpublished lessons", () => {
    const course = mapCourseRow(
      row({
        course_modules: [
          {
            title: "Module 2",
            position: 2,
            lessons: [{ title: "B1", position: 1, is_published: true }],
          },
          {
            title: "Module 1",
            position: 1,
            lessons: [
              { title: "A2", position: 2, is_published: true },
              { title: "Draft", position: 3, is_published: false },
              { title: "A1", position: 1, is_published: true },
            ],
          },
        ],
      })
    );
    expect(course.curriculum).toEqual([
      { module: "Module 1", lessons: ["A1", "A2"] },
      { module: "Module 2", lessons: ["B1"] },
    ]);
  });

  it("takes group and 1-on-1 prices from the matching offerings", () => {
    const course = mapCourseRow(
      row({
        offerings: [
          { kind: "cohort_group", price_usd: 50, price_ngn: "75000", is_active: true },
          { kind: "cohort_1on1", price_usd: "85", price_ngn: 120000, is_active: true },
        ],
      })
    );
    expect(course.price.group).toEqual({ usd: 50, ngn: 75000 });
    expect(course.price.oneOnOne).toEqual({ usd: 85, ngn: 120000 });
  });

  it("ignores inactive offerings and falls back to the cheapest active one", () => {
    const course = mapCourseRow(
      row({
        offerings: [
          { kind: "cohort_group", price_usd: 50, price_ngn: 75000, is_active: false },
          { kind: "self_paced", price_usd: 30, price_ngn: 40000, is_active: true },
        ],
      })
    );
    expect(course.price.group).toEqual({ usd: 30, ngn: 40000 });
    expect(course.price.oneOnOne).toEqual({ usd: 30, ngn: 40000 });
  });

  it("returns zero prices when a course has no offerings", () => {
    const course = mapCourseRow(row({ offerings: null, course_modules: null }));
    expect(course.price.group).toEqual({ usd: 0, ngn: 0 });
    expect(course.curriculum).toEqual([]);
  });
});

describe("mapCourseRow previews", () => {
  it("exposes only free-preview lesson IDs, lined up with the lessons", () => {
    const course = mapCourseRow(
      row({
        course_modules: [
          {
            title: "M",
            position: 1,
            lessons: [
              { id: "a", title: "A", position: 1, is_published: true, is_preview: false },
              { id: "b", title: "B", position: 2, is_published: true, is_preview: true },
            ],
          },
        ],
      })
    );
    expect(course.curriculum[0].previewIds).toEqual([null, "b"]);
  });
});

describe("getCourses", () => {
  afterEach(() => {
    selectResult.value = { data: null, error: null };
  });

  it("returns mapped database rows", async () => {
    selectResult.value = { data: [row({ id: "from-db" })], error: null };
    const courses = await getCourses();
    expect(courses.map((c) => c.id)).toEqual(["from-db"]);
  });

  it("falls back to the static catalogue when the query errors", async () => {
    selectResult.value = { data: null, error: { message: 'relation "courses" does not exist' } };
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await getCourses()).toBe(STATIC_COURSES);
  });

  it("getCourseBySlug finds a course by its address, not its ID", async () => {
    selectResult.value = { data: [row({ id: "from-db", slug: "new-address" })], error: null };
    expect((await getCourseBySlug("new-address"))?.id).toBe("from-db");
    expect(await getCourseBySlug("from-db")).toBeNull();
    expect(await getCourseBySlug("missing")).toBeNull();
  });

  it("findCourseRedirect sends old addresses and internal IDs to the live address", async () => {
    selectResult.value = { data: [row({ id: "from-db", slug: "new-address" })], error: null };
    redirectRows.set("old-address", "from-db");
    redirectRows.set("gone", "unpublished-course");
    expect(await findCourseRedirect("from-db")).toBe("new-address");
    expect(await findCourseRedirect("old-address")).toBe("new-address");
    expect(await findCourseRedirect("gone")).toBeNull();
    expect(await findCourseRedirect("never-existed")).toBeNull();
    redirectRows.clear();
  });
});
