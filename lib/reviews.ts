// Learner and parent reviews, shown on the home page and on the matching
// course page. `courseId` is the course's permanent ID (see lib/course-catalog.ts).

export interface Review {
  id: number;
  quote: string;
  name: string;
  role: string;
  courseId: string;
  /** The course name at the time of the review. */
  course: string;
}

export const REVIEWS: Review[] = [
  {
    id: 1,
    quote:
      "Before Code Illustrated, my daughter thought websites were pure magic. After six weeks of Junior Web Creator, she had built her own multi-page HTML site with CSS animations and a JavaScript quiz.",
    name: "Rachel Okonkwo",
    role: "Parent of Amara",
    courseId: "junior-web-creator",
    course: "Junior Web Creator",
  },
  {
    id: 2,
    quote:
      "We covered React hooks, Next.js routing, Tailwind, and TypeScript. These are the exact tools I now use at work every day.",
    name: "Priya Nair",
    role: "Age 22",
    courseId: "frontend-beginner",
    course: "Frontend Developer",
  },
  {
    id: 3,
    quote:
      "The course gave me the Python skills to automate my weekly reports and build dashboards that impressed my director. Every concept was illustrated with examples relevant to my actual job.",
    name: "Yemi Adeyemi",
    role: "Age 31",
    courseId: "data-science-intro",
    course: "Data Science Intro",
  },
  {
    id: 4,
    quote:
      "I did not know what a div was when I started, and now I have a proper personal website with a navigation bar and everything. The instructor drew everything out so clearly — I never felt lost.",
    name: "Marcus T.",
    role: "Age 12",
    courseId: "junior-web-creator",
    course: "Junior Web Creator",
  },
  {
    id: 5,
    quote:
      "Within four sessions I had a working platformer game. The way the instructor visualises loops and conditionals with actual game mechanics makes everything click instantly.",
    name: "Jordan M.",
    role: "Age 16",
    courseId: "game-dev-pro",
    course: "Game Dev Pro",
  },
  {
    id: 6,
    quote:
      "My son's confidence in logic and problem-solving has transferred directly to his maths results at school.",
    name: "Daniel Asare",
    role: "Parent of Kwame, Age 14",
    courseId: "game-dev-pro",
    course: "Game Dev Pro",
  },
  {
    id: 7,
    quote:
      "I landed a junior frontend role two weeks after finishing the course. I used my React portfolio site, live weather app, and Next.js prototype in every interview.",
    name: "Sofia Nwachukwu",
    role: "Age 27",
    courseId: "frontend-beginner",
    course: "Frontend Developer",
  },
  {
    id: 8,
    quote:
      "Components, props, state — it all made sense within weeks, not years. My mentor would open my actual code, explain what was wrong, and walk me through fixing it live.",
    name: "David Chen",
    role: "Age 34",
    courseId: "frontend-beginner",
    course: "Frontend Developer",
  },
  {
    id: 9,
    quote:
      "By the end I had three visualisation projects I could include in my postgraduate application portfolio. The mentor was genuinely invested in my success.",
    name: "Chiamaka Eze",
    role: "Age 24",
    courseId: "data-science-intro",
    course: "Data Science Intro",
  },
  // A tenth review praised 1-on-1 sessions, which are no longer offered, so it isn't shown.
];

/** The first review for a course, for its course page. */
export function reviewForCourse(courseId: string): Review | undefined {
  return REVIEWS.find((r) => r.courseId === courseId);
}
