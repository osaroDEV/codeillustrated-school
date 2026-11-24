import { describe, expect, it } from "vitest";
import { fitsAge, freeClassMessage, parseAgeRange, recommendCourses, whatsAppLink } from "./course-finder";
import type { Course } from "./course-types";

const course = (id: string, age: string, level: string, kinds: string[] = ["cohort_group"]) =>
  ({
    id,
    slug: id,
    title: id,
    age,
    level,
    price: { group: { usd: 1, ngn: 1 }, oneOnOne: { usd: 1, ngn: 1 } },
    offerings: kinds.map((kind) => ({ kind, price: { usd: 10, ngn: 100 } })),
  }) as unknown as Course;

const CATALOGUE = [
  course("junior-web", "Age 8-12", "Beginner"),
  course("game-dev", "Age 13-17", "Intermediate"),
  course("frontend", "Teens & Adults", "Intermediate"),
  course("architect", "Teens & Adults", "Advanced"),
  course("data", "Teens & Adults", "Beginner", ["cohort_group", "self_paced"]),
  course("gen-ai", "Age 8-20", "Beginner"),
];

describe("parseAgeRange", () => {
  it("reads the catalogue's age labels", () => {
    expect(parseAgeRange("Age 8-12")).toEqual([8, 12]);
    expect(parseAgeRange("Ages 13 – 17")).toEqual([13, 17]);
    expect(parseAgeRange("16+")).toEqual([16, 99]);
    expect(parseAgeRange("Teens & Adults")).toEqual([13, 99]);
    expect(parseAgeRange("Adults")).toEqual([18, 99]);
    expect(parseAgeRange("")).toEqual([0, 99]);
  });

  it("matches learners to courses for their age", () => {
    expect(fitsAge(CATALOGUE[0], "child")).toBe(true);
    expect(fitsAge(CATALOGUE[0], "adult")).toBe(false);
    expect(fitsAge(CATALOGUE[2], "teen")).toBe(true);
  });
});

describe("recommendCourses", () => {
  it("suggests the children's course first for a new child", () => {
    const picks = recommendCourses(CATALOGUE, { learner: "child", experience: "new", format: "cohort_group" });
    expect(picks.map((p) => p.course.id)).toEqual(["junior-web", "gen-ai"]);
  });

  it("prefers beginner courses for new adults, and courses selling the chosen format", () => {
    const picks = recommendCourses(CATALOGUE, { learner: "adult", experience: "new", format: "self_paced" });
    expect(picks[0].course.id).toBe("data");
    expect(picks[0].formatAvailable).toBe(true);
    expect(picks.map((p) => p.course.id)).not.toContain("architect");
  });

  it("suggests harder courses to experienced adults", () => {
    const picks = recommendCourses(CATALOGUE, { learner: "adult", experience: "some", format: "cohort_group" });
    expect(picks[0].course.id).toBe("frontend");
  });

  it("never comes back empty while there are courses", () => {
    const adultsOnly = [course("a", "Adults", "Beginner")];
    expect(recommendCourses(adultsOnly, { learner: "child", experience: "new", format: "any" })).toHaveLength(1);
    expect(recommendCourses([], { learner: "child", experience: "new", format: "any" })).toEqual([]);
  });
});

describe("freeClassMessage", () => {
  it("names the course and who it's for", () => {
    expect(freeClassMessage({ learner: "child", experience: "new" }, "Junior Web Creator")).toBe(
      "Hi! I'd like to book a free first class for Junior Web Creator. It's for my child, who is brand new to coding."
    );
    expect(freeClassMessage({ learner: "teen", experience: "some" }, "Game Dev Pro")).toBe(
      "Hi! I'd like to book a free first class for Game Dev Pro. It's for my teenager, who has some coding experience."
    );
    expect(freeClassMessage({ learner: "adult", experience: "new" }, "Frontend Developer")).toBe(
      "Hi! I'd like to book a free first class for Frontend Developer. I'm brand new to coding."
    );
  });

  it("still works without a course", () => {
    expect(freeClassMessage({ learner: "adult", experience: "some" })).toBe(
      "Hi! I'd like to book a free first class. I have some coding experience."
    );
  });
});

describe("whatsAppLink", () => {
  it("encodes the message into the link", () => {
    expect(whatsAppLink("https://wa.me/447405786279", "Hi! It's me & you?")).toBe(
      "https://wa.me/447405786279?text=Hi!%20It's%20me%20%26%20you%3F"
    );
  });
});
