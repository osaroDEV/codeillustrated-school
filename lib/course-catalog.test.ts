import { describe, expect, it } from "vitest";
import { STATIC_COURSES as courses } from "./course-catalog";
import { COURSE_ICONS } from "./course-icons";

describe("static course catalogue integrity", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(courses)).toBe(true);
    expect(courses.length).toBeGreaterThan(0);
  });

  it("has a unique id for every course", () => {
    const ids = courses.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every course has a non-empty title, age, and description", () => {
    for (const course of courses) {
      expect(course.title.length).toBeGreaterThan(0);
      expect(course.age.length).toBeGreaterThan(0);
      expect(course.description.length).toBeGreaterThan(0);
    }
  });

  it("every course uses a registered icon key", () => {
    for (const course of courses) {
      expect(COURSE_ICONS[course.icon]).toBeDefined();
    }
  });

  it("every course has positive group and one-on-one prices in both currencies", () => {
    for (const course of courses) {
      expect(course.price.group.usd).toBeGreaterThan(0);
      expect(course.price.group.ngn).toBeGreaterThan(0);
      expect(course.price.oneOnOne.usd).toBeGreaterThan(0);
      expect(course.price.oneOnOne.ngn).toBeGreaterThan(0);
    }
  });

  it("one-on-one pricing is always at least as expensive as group pricing", () => {
    for (const course of courses) {
      expect(course.price.oneOnOne.usd).toBeGreaterThanOrEqual(course.price.group.usd);
      expect(course.price.oneOnOne.ngn).toBeGreaterThanOrEqual(course.price.group.ngn);
    }
  });

  it("every course has at least one curriculum module", () => {
    for (const course of courses) {
      expect(course.curriculum.length).toBeGreaterThan(0);
    }
  });

  it("every curriculum module has a name and at least one lesson", () => {
    for (const course of courses) {
      for (const module of course.curriculum) {
        expect(module.module.length).toBeGreaterThan(0);
        expect(module.lessons.length).toBeGreaterThan(0);
      }
    }
  });

  it("every course has a non-empty duration and level", () => {
    for (const course of courses) {
      expect(course.duration.length).toBeGreaterThan(0);
      expect(course.level.length).toBeGreaterThan(0);
    }
  });

  it("includes the junior-web-creator course with expected id and title", () => {
    const course = courses.find((c) => c.id === "junior-web-creator");
    expect(course).toBeDefined();
    expect(course?.title).toBe("Junior Web Creator");
  });

  it("includes the frontend-advanced course with expected id and title", () => {
    const course = courses.find((c) => c.id === "frontend-advanced");
    expect(course).toBeDefined();
    expect(course?.title).toBe("Frontend Architect");
  });

  it("every course has a non-empty color and background class name", () => {
    for (const course of courses) {
      expect(course.color.length).toBeGreaterThan(0);
      expect(course.bg.length).toBeGreaterThan(0);
    }
  });
});
