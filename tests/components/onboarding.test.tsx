import * as React from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CourseFinder } from "@/components/start/course-finder";
import { GettingStarted } from "@/components/dashboard/getting-started";
import type { Course } from "@/lib/course-types";

const act = (React as unknown as { act: (fn: () => unknown) => Promise<void> }).act;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/hooks/use-currency", () => ({ useCurrency: () => ({ currency: "USD", symbol: "$", isLoading: false }) }));
vi.mock("@/components/course-icon", () => ({ CourseIcon: () => null }));

const courses = [
  { id: "jw", slug: "junior-web-creator", title: "Junior Web Creator", age: "Age 8-12", level: "Beginner", duration: "24 Weeks" },
  { id: "fe", slug: "frontend", title: "Frontend Developer", age: "Teens & Adults", level: "Intermediate", duration: "24 Weeks" },
].map((c) => ({
  ...c,
  description: "",
  price: { group: { usd: 50, ngn: 75000 }, oneOnOne: { usd: 85, ngn: 120000 } },
  offerings: [{ kind: "cohort_group", price: { usd: 50, ngn: 75000 } }],
})) as unknown as Course[];

let root: Root;
let host: HTMLDivElement;
const click = (text: string) =>
  act(async () =>
    Array.from(host.querySelectorAll("button"))
      .find((b) => b.textContent?.includes(text))!
      .click()
  );
const links = () => Array.from(host.querySelectorAll("a")).map((a) => [a.textContent?.trim(), a.getAttribute("href")]);

beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("course finder", () => {
  it("asks three questions, then links to the matching course's enrol section", async () => {
    await act(async () => root.render(<CourseFinder courses={courses} />));
    expect(host.textContent).toContain("Who is learning?");
    await click("My child");
    expect(host.textContent).toContain("Any coding experience?");
    await click("Brand new");
    expect(host.textContent).not.toMatch(/1-on-1/i);
    await click("Live group classes");
    expect(host.textContent).toContain("Best match");
    expect(links()).toContainEqual(["View course & enrol", "/courses/junior-web-creator#enroll"]);
    expect(host.textContent).not.toContain("Frontend Developer");
  });

  it("can go back and start again", async () => {
    await act(async () => root.render(<CourseFinder courses={courses} />));
    await click("Me");
    await click("Back");
    expect(host.textContent).toContain("Who is learning?");
    await click("Me");
    await click("Some experience");
    await click("Not sure yet");
    await click("Start again");
    expect(host.textContent).toContain("Who is learning?");
  });

  it("changes one answer from the results and keeps the others", async () => {
    await act(async () => root.render(<CourseFinder courses={courses} />));
    await click("My child");
    await click("Brand new");
    await click("Live group classes");
    expect(host.textContent).toContain("Junior Web Creator");

    // Change only "who is learning" and go straight back to the results.
    await click("My child");
    expect(host.textContent).toContain("Who is learning?");
    await click("Me");
    expect(host.textContent).toContain("Best match");
    expect(host.textContent).toContain("Frontend Developer");
    expect(host.textContent).not.toContain("Junior Web Creator");
    const chips = Array.from(host.querySelectorAll('[aria-label="Your answers"] button')).map((b) => b.textContent);
    expect(chips).toEqual(["For me", "Brand new", "Live group classes"]);
  });

  it("offers the free class on WhatsApp with the match already in the message", async () => {
    await act(async () => root.render(<CourseFinder courses={courses} />));
    await click("My child");
    await click("Brand new");
    await click("Not sure yet");
    const booking = links().find(([text]) => text === "Book a free class on WhatsApp");
    expect(booking?.[1]).toBe(
      "https://wa.me/447405786279?text=" +
        encodeURIComponent(
          "Hi! I'd like to book a free first class for Junior Web Creator. It's for my child, who is brand new to coding."
        )
    );
  });

  it("shows the same 'from' price as /courses: the cheapest way to take the course", async () => {
    const withSelfPaced = [
      {
        ...courses[0],
        offerings: [
          { kind: "cohort_group", price: { usd: 50, ngn: 75000 } },
          { kind: "self_paced", price: { usd: 30, ngn: 45000 } },
        ],
      },
    ] as unknown as Course[];
    await act(async () => root.render(<CourseFinder courses={withSelfPaced} />));
    await click("My child");
    await click("Brand new");
    await click("Not sure yet");
    expect(host.textContent).toContain("from $30/mo");
    expect(host.textContent).not.toContain("$50");
  });
});

describe("getting started checklist", () => {
  it("points a new learner to the course finder and catalogue", async () => {
    await act(async () => root.render(<GettingStarted />));
    expect(host.textContent).toContain("2 of 5 steps done");
    expect(links()).toEqual([
      ["Find your course", "/start"],
      ["Browse all courses", "/courses"],
    ]);
  });
});
