import { describe, expect, it } from "vitest";
import { STATIC_COURSES } from "./course-catalog";
import { ageGroup, displayAge, isPlayful, lowestMonthlyPrice, moduleName, monthlyPrice } from "./course-groups";
import type { Course } from "./course-types";

const byId = (id: string) => STATIC_COURSES.find((c) => c.id === id)!;

describe("ageGroup", () => {
  it("puts courses whose youngest age is under 13 with the kids", () => {
    expect(ageGroup(byId("junior-web-creator"))).toBe("kids");
    expect(ageGroup(byId("generative-ai-mastery"))).toBe("kids");
  });

  it("keeps 13–17 courses with the teens", () => {
    expect(ageGroup(byId("game-dev-pro"))).toBe("teens");
  });

  it("puts teens & adults courses, and anything unreadable, with the adults", () => {
    expect(ageGroup(byId("frontend-beginner"))).toBe("adults");
    expect(ageGroup({ age: "18+" })).toBe("adults");
    expect(ageGroup({ age: "Teens & Adults" })).toBe("adults");
  });

  it("chooses the playful style for kids' courses only", () => {
    expect(isPlayful(byId("junior-web-creator"))).toBe(true);
    expect(isPlayful(byId("game-dev-pro"))).toBe(false);
    expect(isPlayful(byId("data-science-intro"))).toBe(false);
  });
});

describe("display helpers", () => {
  it("tidies ages", () => {
    expect(displayAge("Age 8-12")).toBe("Ages 8–12");
    expect(displayAge("Teens & Adults")).toBe("Teens & Adults");
  });

  it("drops the module number from module titles", () => {
    expect(moduleName("Module 1: Web Foundation")).toBe("Web Foundation");
    expect(moduleName("Getting started")).toBe("Getting started");
  });
});

describe("prices", () => {
  const course = (offerings: Course["offerings"]) =>
    ({ price: { group: { usd: 50, ngn: 75000 } }, offerings }) as Pick<Course, "price" | "offerings">;

  it("quotes the lowest monthly price in each currency", () => {
    const c = course([
      { kind: "cohort_group", price: { usd: 50, ngn: 70000 } },
      { kind: "self_paced", price: { usd: 15, ngn: 25000 }, yearlyPrice: { usd: 1, ngn: 1 } },
    ]);
    expect(lowestMonthlyPrice(c)).toEqual({ usd: 15, ngn: 25000 });
  });

  it("ignores unpriced offerings and falls back to the catalogue price", () => {
    expect(lowestMonthlyPrice(course([{ kind: "self_paced", price: { usd: 0, ngn: 0 } }]))).toEqual({ usd: 50, ngn: 75000 });
    expect(lowestMonthlyPrice(course(undefined))).toEqual({ usd: 50, ngn: 75000 });
  });

  it("finds one way's monthly price only when it's on sale", () => {
    const c = course([{ kind: "cohort_group", price: { usd: 50, ngn: 70000 } }]);
    expect(monthlyPrice(c, "cohort_group")).toEqual({ usd: 50, ngn: 70000 });
    expect(monthlyPrice(c, "self_paced")).toBeUndefined();
  });
});
