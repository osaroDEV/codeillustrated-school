import { beforeEach, describe, expect, it } from "vitest";
import { useCourseStore } from "./course-store";

const initialCourses = useCourseStore.getState().courses;

beforeEach(() => {
  useCourseStore.setState({
    courses: initialCourses,
    selectedCourse: null,
    isLoading: false,
    error: null,
  });
});

describe("getCourseById", () => {
  it("returns the matching course when the id exists", () => {
    const course = useCourseStore.getState().getCourseById("react");
    expect(course?.id).toBe("react");
  });

  it("returns undefined and sets an error when the id does not exist", () => {
    const course = useCourseStore.getState().getCourseById("does-not-exist");
    expect(course).toBeUndefined();
    expect(useCourseStore.getState().error).toBe(
      "Course with id does-not-exist not found"
    );
  });

  it("does not touch the error state on a successful lookup", () => {
    useCourseStore.getState().getCourseById("react");
    expect(useCourseStore.getState().error).toBeNull();
  });
});

describe("setSelectedCourse", () => {
  it("stores the given course as selected", () => {
    const course = useCourseStore.getState().getCourseById("react")!;
    useCourseStore.getState().setSelectedCourse(course);
    expect(useCourseStore.getState().selectedCourse).toBe(course);
  });

  it("clears the selected course when passed null", () => {
    useCourseStore.getState().setSelectedCourse(null);
    expect(useCourseStore.getState().selectedCourse).toBeNull();
  });
});

describe("searchCourses", () => {
  it("matches by title, case-insensitively", () => {
    const results = useCourseStore.getState().searchCourses("REACT CRASH");
    expect(results.some((c) => c.id === "react")).toBe(true);
  });

  it("matches by description text", () => {
    const results = useCourseStore.getState().searchCourses("bootcamp");
    expect(results.length).toBeGreaterThan(0);
  });

  it("matches by a listed technology", () => {
    const results = useCourseStore.getState().searchCourses("figma");
    expect(results.some((c) => c.id === "figma")).toBe(true);
  });

  it("matches by instructor name", () => {
    const results = useCourseStore.getState().searchCourses("Osaro Onaiwu");
    expect(results.length).toBe(useCourseStore.getState().courses.length);
  });

  it("returns an empty array when nothing matches", () => {
    const results = useCourseStore.getState().searchCourses("zzz-nonexistent-zzz");
    expect(results).toEqual([]);
  });
});

describe("filterCourses", () => {
  it("filters by type", () => {
    const results = useCourseStore.getState().filterCourses({ type: "crash-course" });
    expect(results.every((c) => c.type === "crash-course")).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it("filters by level", () => {
    const results = useCourseStore.getState().filterCourses({ level: "beginner" });
    expect(results.every((c) => c.level === "beginner")).toBe(true);
  });

  it("filters by technology", () => {
    const results = useCourseStore.getState().filterCourses({ technology: "React" });
    expect(results.every((c) => c.technologies.includes("React"))).toBe(true);
  });

  it("filters by price range", () => {
    const results = useCourseStore.getState().filterCourses({
      priceRange: { min: 0, max: 100 },
    });
    expect(results.every((c) => c.price.usd <= 100)).toBe(true);
  });

  it("combines multiple filters with AND semantics", () => {
    const results = useCourseStore.getState().filterCourses({
      type: "crash-course",
      level: "beginner",
    });
    expect(
      results.every((c) => c.type === "crash-course" && c.level === "beginner")
    ).toBe(true);
  });

  it("returns every course when no filters are given", () => {
    const results = useCourseStore.getState().filterCourses({});
    expect(results.length).toBe(useCourseStore.getState().courses.length);
  });
});

describe("getCoursesByInstructor", () => {
  it("returns courses taught by the given instructor", () => {
    const results = useCourseStore.getState().getCoursesByInstructor("Osaro Onaiwu");
    expect(results.length).toBe(useCourseStore.getState().courses.length);
  });

  it("returns an empty array for an unknown instructor", () => {
    const results = useCourseStore.getState().getCoursesByInstructor("Nobody");
    expect(results).toEqual([]);
  });
});

describe("getCoursesByTechnology", () => {
  it("returns courses that list the given technology", () => {
    const results = useCourseStore.getState().getCoursesByTechnology("SAS");
    expect(results.some((c) => c.id === "sas")).toBe(true);
  });

  it("returns an empty array for an unlisted technology", () => {
    const results = useCourseStore.getState().getCoursesByTechnology("COBOL");
    expect(results).toEqual([]);
  });
});

describe("getPopularCourses", () => {
  it("defaults to the top 3 courses by student count", () => {
    const results = useCourseStore.getState().getPopularCourses();
    expect(results).toHaveLength(3);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].students).toBeGreaterThanOrEqual(results[i].students);
    }
  });

  it("respects a custom limit", () => {
    const results = useCourseStore.getState().getPopularCourses(2);
    expect(results).toHaveLength(2);
  });

  it("does not mutate the underlying courses array order", () => {
    const before = [...useCourseStore.getState().courses];
    useCourseStore.getState().getPopularCourses();
    expect(useCourseStore.getState().courses).toEqual(before);
  });
});

describe("setLoading / setError", () => {
  it("setLoading toggles isLoading", () => {
    useCourseStore.getState().setLoading(true);
    expect(useCourseStore.getState().isLoading).toBe(true);
    useCourseStore.getState().setLoading(false);
    expect(useCourseStore.getState().isLoading).toBe(false);
  });

  it("setError sets and clears the error message", () => {
    useCourseStore.getState().setError("boom");
    expect(useCourseStore.getState().error).toBe("boom");
    useCourseStore.getState().setError(null);
    expect(useCourseStore.getState().error).toBeNull();
  });
});
