# Code Illustrated website redesign: brief for Claude Code

Implement the approved redesign of the public marketing pages in this repo (`osaroDEV/codeillustrated-school`, Next.js App Router + Supabase + Tailwind). Work on a new branch, keep every existing flow working, and open a pull request when done. Don't push to `main`.

The approved designs are in `docs/redesign/` as four HTML files. Open them in a browser to see them:
- `Main.dc.html`: home page
- `Courses.dc.html`: `/courses`
- `Course-Junior-Web-Creator.dc.html`: course page in the playful style (for courses whose youngest age is under 13)
- `Course-Frontend-Developer.dc.html`: course page in the calmer style (teens and adults)

Treat them as the visual reference for layout, copy and tone. Anything in `[SQUARE BRACKETS]` is a placeholder: use real data from the codebase, or leave that element out. Never ship a placeholder.

## Goal
Get more first-time visitors from any country to enrol and pay. Most are parents of 8–17-year-olds, plus some adult beginners. The route from the home page to paid enrolment should be obvious and trustworthy. The look should be modern and friendly but still credible to parents.

## Decisions already made (don't change)
- **Two ways to take each course, never 1-on-1.** Live group classes (small group, tutor, set schedule, billed monthly) and self-paced (lessons plus selected class recordings, no live classes, billed monthly or yearly). The code already drops `cohort_1on1`; keep it that way.
- **Currency.** Use the existing `PriceDisplay` / `useCurrency`: ₦ for visitors in Nigeria, $ for everyone else. One price slot per option.
- **Free first interactive class, no card needed.** Keep it and make it easy to find. Note that there's no booking flow for it in the code; today it links to `/start`. Keep linking there and don't invent a booking flow.
- **One main action per page.** "Find your course" (`/start`) on home and `/courses`; "Enrol" (scrolls to `#enroll`) on course pages. WhatsApp stays, but only as a secondary text link.
- **International wording.** Nothing that assumes the visitor's country. Show any class times with the existing `LocalTime` component, in the visitor's own time zone.
- **Keep these addresses:** `/start`, `/courses/<slug>`, `/signup`, `/login`, `/dashboard`.
- **No tutor sections.** The owner removed "Meet the tutors" / "Your tutor" from the designs.

## Brand
- Crimson `#c31d24` (Tailwind `primary-500`), amber `#ffbd59` (`secondary-400`), teal `#1a596c` (`accent-500`). They're already in `tailwind.config.ts`.
- The logo is already in the repo at `public/code-ill.svg`, used through `components/brand-logo.tsx`. Keep using it.
- Headings: the designs use Bricolage Grotesque, body text Inter. `font-heading` is used in the code but not defined in `tailwind.config.ts`. Add Bricolage Grotesque with `next/font/google` and wire it to `font-heading`.
- Use solid colours: no gradient washes and no gradient text. The current gradient buttons become solid crimson.

## What's in the code (from reading it)
- Home: `app/page.tsx` renders `HeroSection`, `Courses`, `HowItWorks`, `Benefits`, `ReviewsSection`, `CTA`.
- Courses list: `app/courses/page.tsx` → `components/CoursesPageClient.tsx`.
- Course page: `app/courses/[slug]/page.tsx` → `components/CourseDetailClient.tsx` → `components/enroll-options.tsx`. The payment logic is in `EnrollOptions.subscribe()`, which POSTs to `/api/checkout` and sends signed-out visitors to signup with a return path. **Keep that logic exactly**; only change the layout.
- Course data: `lib/courses.ts` (`getCourses()` reads Supabase and falls back to `lib/course-catalog.ts`). Live prices come from `course.offerings` (`cohort_group`, `self_paced` with an optional `yearlyPrice`). The fallback courses have no offerings and only offer WhatsApp enrolment; keep that fallback.
- Real reviews are in `components/ReviewsSection.tsx`. Reuse them, for example the matching review on each course page. Don't write new ones.
- The nav is in `components/Navbar.tsx`; the footer is in `components/site-footer.tsx`.
- Tests: `pnpm test` (vitest). `tests/components/navbar.test.tsx` and `tests/components/enroll-options.test.tsx` check button labels. Where a label changes on purpose ("Get Started" → "Find your course", "Subscribe monthly" → "Enrol in group classes", "Group Classes" → "Live group classes"), update the test but keep what it checks: no 1-on-1, the yearly toggle, signup redirect, correct checkout body.

## Changes, page by page

### Navbar (all public pages)
- Links: Courses, How it works (`/#how-it-works`), For parents (`/#parents`), Reviews (`/#reviews`), About. Move Resources and Contact to the footer.
- Signed-out button: "Find your course" → `/start`. On `/courses/<slug>` pages it becomes "Enrol" → `#enroll`. Signed in: "My Dashboard", as now.

### Home (`Main.dc.html`)
1. **Hero:** warm amber-tint background. Headline "Learn to code with a real tutor, in a small group." One crimson "Find your course" button, "or browse all courses" as a text link, and a small "Free first class · no card" badge. A proof strip with 300+ students, 97% completion, 10+ expert tutors and "Since 2023". Drop "14k+ hours" (the About page says 250+, so the figures conflict).
2. **Courses:** cards colour-coded by age (amber for under 13, crimson for 13–17, teal for teens & adults). Each shows "from <price>/month", using the lowest monthly price across the course's offerings (fall back to `price.group`). The whole card links to the course.
3. **New "Two ways to learn" section:** Live group classes vs Self-paced, explained without prices.
4. **How it works:** a lighter style, reusing `ENROL_STEPS` (they're accurate). One button only: "Find your course". Remove the second "Create a free account" button.
5. **Replace `Benefits` with a "For parents" section** (`id="parents"`) with two cards. "How a live lesson runs": join from a link, the tutor explains with pictures, everyone codes along in a small group, finish with a project and feedback. Leave out group-size numbers unless they're in the data. "See their progress": an illustrative dashboard preview labelled "Example", plus a line on the learner dashboard and certificate. Also include the line "Our learner community is moderated by our team."
6. **Reviews:** keep `ReviewsSection`, add `id="reviews"`, and restyle it to match.
7. **FAQ (new):** first class free, group vs self-paced, time zones, currency, cancel any time from the dashboard.
8. **CTA:** crimson band, "Start with a free interactive class", one "Find your course" button and a WhatsApp text link. Remove "Limited spots available for this month's cohort".

### `/courses` (`Courses.dc.html`)
- Intro plus filter chips that jump to the age groups (8–12, 13–17, Teens & adults). Work out each course's group from `course.age` (youngest age under 13, 13–17, otherwise teens & adults).
- A "Not sure which course fits?" strip linking to `/start`.
- Each card shows **both** "Live group classes from X/mo" and "Self-paced from Y/mo" when self-paced is on sale. The page's main button is the navbar's "Find your course".

### Course page (both course designs)
- **Playful style** (Junior Web Creator, ages 8–12): amber hero with rounded shapes. **Calm style** (adults): dark teal hero with a code panel. Pick the style from the course's age.
- Hero: badges for age, level, duration and certificate, the title, the description, a crimson "Enrol" button (→ `#enroll`), and a "Try a free class first (no card) →" link to `/start`.
- Curriculum: module cards from `course.curriculum`, keeping the free-preview lesson links.
- **`#enroll` section: the two plans side by side** (stacked on phones). Each card shows its price, and self-paced keeps the monthly/yearly toggle. They share the same comparison rows: Live classes / Pace / Starts / Lessons & projects / Tutor feedback or Class recordings / Certificate / Billing. Each card has one button: "Enrol in group classes" (crimson) or "Enrol self-paced" (teal), both wired to the existing `subscribe()`. Under the cards: "Secure card payment by Flutterwave · Cancel any time from your dashboard · Free first class, no card needed". Remove "Lifetime access to course materials", which contradicts the subscription model.
- **Class times:** say "Group class times are shown in your time zone, and your schedule email confirms them." Only if you add a safe server-side query for upcoming cohort sessions should you list actual times, with `LocalTime`. Otherwise show just that sentence.
- Kids courses get a short "For parents" block (how lessons run online, following progress). Teens & adults courses get "Career support" (CV and portfolio reviews, mock interviews, guidance on finding a first role; all claimed on the About page). Then the matching real review from `ReviewsSection`.
- A course FAQ and a final "Enrol" band. Replace the `mailto:info@` "Ask a question" with a WhatsApp text link.

## Accessibility and quality
- Real `<a>`/`<button>` elements, text contrast of at least 4.5:1, touch targets of at least 44px, and everything readable at 390px wide.
- Don't make up stats, reviews, tutor names, schedules or group sizes.

## Done means
- `pnpm test` and `pnpm lint` pass, and `pnpm build` succeeds.
- Check every page in the browser with `pnpm dev` at desktop and phone width. If `.env.local` isn't set up, the static catalogue fallback is used; ask the owner for the Supabase env vars if live prices need checking.
- Open a pull request describing what changed. List anything left out because the data doesn't exist yet: student project screenshots, a free-class booking flow, and public class times if not done.
- One open question for the owner: the live site still lists a seventh course, Data Management (ages 12–15). Ask whether to keep or unpublish it; it's in the database, not the code.
