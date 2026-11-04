# LMS roadmap for Code Illustrated Academy

## Overview

The plan for turning the academy site into an LMS. Phase 1 (per-user admin auth, course catalogue in the database, email verification, scholarship codes) shipped in PR #1. Each later phase gets its own branch (for example `lms/phase-2-cohorts`) and its own detailed plan before work starts.

Decisions so far:
- **Payments:** Flutterwave, for both NGN and USD.
- **Delivery:** live cohorts come first, with self-paced lessons supporting them.
- **Guardian accounts:** none. Each learner has one account.
- **Subscriptions:** sold per course, billed monthly or yearly, in NGN and USD. A subscription gives access to that course's self-paced lessons, files and session recordings. Live cohort seats are still bought once.

### Where Phase 1 left things
- **Auth:** per-user roles in `profiles.role` (`student` | `admin`). Helpers live in `lib/supabase-server.ts` (`requireUser`, `requireAdmin`, `rejectNonAdmin`, `requireVerifiedUserApi`, `isAdmin`). Email verification and password reset work.
- **Catalogue:** stored in the database (`courses`, `course_modules`, `lessons`, `offerings`) and read through `getCourses` and `getCourseBySlug` in `lib/courses.ts`, with `STATIC_COURSES` as a fallback. `lessons` already has `type` (video/text/file/live), `content`, `video_url`, `file_path` and `is_preview`, but nothing renders lesson content and there's no admin editor.
- **Enrolments:** created by hand by admins or by scholarship codes (`lib/invites.ts` `redeemInvite`, which claims the code atomically and releases it if enrolment fails). "Enroll Now" links to WhatsApp (`components/CourseDetailClient.tsx`). `enrollments.course_id` is text with no foreign key.
- **Progress:** `enrollments.progress` and `next_session` are set by hand with a slider in `components/admin/admin-panel.tsx`, a single 995-line component.
- **Unused so far:** `courses.certificate_price_usd/ngn` exist but no certificate feature uses them. The resources page reads static `MOCKUP_RESOURCES` from `store/resources-store.ts`.

---

## Phase 2: Cohorts, live sessions and catalogue editing

**Status:** built on branch `lms/phase-2-cohorts`. Migration `20261104000000_cohorts_and_sessions.sql`.

**Goal:** run live classes from the LMS instead of WhatsApp and spreadsheets.

**Schema:**
- `cohorts`: `course_id`, `offering_kind` (group / 1-on-1), `name`, `starts_on`, `ends_on`, `capacity` (null means no limit), `meeting_url`, `instructor_id`, `status` (planned/running/finished).
- `enrollments.cohort_id`. The trigger `check_enrollment_cohort` locks the cohort row and refuses a placement when the cohort is full (`CI002`) or belongs to another course (`CI001`). Phase 3 checkout depends on this check.
- `enrollments.course_id` now has a foreign key to `courses`, so a course with enrolments can't be deleted.
- `class_sessions` (named this so they aren't confused with auth sessions): `cohort_id`, optional `lesson_id`, `title`, `starts_at`, `duration_min`, `meeting_url` (overrides the cohort's), `recording_url`.
- `attendance`: (`session_id`, `user_id`) → present/late/absent, plus `marked_by`.
- An `instructor` role, with helpers `is_instructor_of()` and `is_cohort_member()`.
- **RLS:**
  - Instructors can read their own cohorts' sessions, set links on them, and mark attendance.
  - Learners can read their own cohorts and their own attendance, but not `class_sessions` directly.
- **Lesson columns:** anon and signed-in clients can only read the outline columns of `lessons`. `content`, `video_url` and `file_path` are read with the service role only.
- `reorder_course_modules()` and `reorder_lessons()` let the course editor reorder modules and lessons despite the unique position constraints. Only the service role can call them.
- `enrollments.next_session` is deprecated but not dropped yet. It's still shown for learners who haven't been placed in a cohort.

**Learner side:**
- A **Schedule** page lists upcoming classes, past classes with recordings, and the learner's attendance. The overview and My Courses pages take each enrolment's next session from its cohort.
- **Join** goes through `/api/sessions/[id]/join`. That route only sends a cohort member to the meeting link from 15 minutes before the start until the class ends, and the first join marks them present. Meeting links never appear in learner pages.

**Admin and instructor side:**
- The single admin panel is now separate pages: `/admin/learners`, `/admin/cohorts`, `/admin/courses`, `/admin/codes` and `/admin/announcements`.
- **Learners:** set a person's role, and see which cohort each enrolment is in.
- **Cohorts:**
  - create and edit a cohort, and add or remove its learners;
  - a weekly schedule generator: pick the days, a time and how many classes. Start times are worked out in the admin's own time zone, so DST changes don't shift them;
  - add one-off sessions, with recording and meeting links;
  - a per-session attendance register.
  - Instructors only see their own cohorts.
- **Courses:** create courses; edit details, prices per offering and certificate prices; publish or unpublish; and add, rename, reorder and delete modules and lessons. Saving refreshes the public pages straight away.

**Tests:**
- `lib/schedule.test.ts`, `lib/admin-schemas.test.ts` and `lib/cohorts.test.ts`.
- `tests/db/migrations.test.ts` applies every migration to PGlite (Postgres in WASM), with a stand-in for Supabase's auth schema, and checks the triggers, RLS and reordering. It runs in CI as part of `pnpm test`. Later phases should add their database checks here.
- Still to do before release: an end-to-end run against `academy-staging`.

---

## Phase 3: Online checkout with Flutterwave

**Goal:** a visitor can pay for an offering and end up enrolled in a cohort without anyone stepping in.

**Schema:**
- `orders`: `id`, `user_id`, `offering_id`, `cohort_id`, `currency` (NGN/USD), `amount`, `tx_ref` (unique), `flw_transaction_id`, `status` (pending/paid/failed/refunded), timestamps.
- A Postgres function `fulfil_order(tx_ref)` that, in one transaction:
  - locks the order row;
  - checks cohort capacity;
  - inserts the enrolment with `on conflict (user_id, course_id) do nothing`;
  - marks the order paid.

  This is the same idempotent claim used in `redeemInvite`, moved into SQL so retried webhooks are safe.

**Flow:**
1. On the course page, "Enroll" per offering calls `POST /api/checkout`. That route needs a verified user, picks the currency from `hooks/use-currency.ts` (re-checked on the server), creates the `pending` order, and calls Flutterwave Standard (`/v3/payments`) for a hosted checkout link.
2. Flutterwave redirects back to `/checkout/complete?tx_ref=…`, which polls the order status. It never trusts the query string.
3. `POST /api/payments/flutterwave/webhook` checks the `verif-hash` header against `FLW_SECRET_HASH`. It then re-verifies through `GET /v3/transactions/{id}/verify`, checking that status, amount, currency and `tx_ref` all match the order, and calls `fulfil_order`.
4. A receipt is emailed through the existing Brevo SMTP.

**Admin:** a payments list with filters, manual "mark refunded" (which ends the enrolment), and comp enrolments through the existing scholarship codes.

**Keep:** WhatsApp stays on the course page as a secondary "Talk to us" link.

**Build for Phase 5 now:** write the webhook as a dispatcher keyed on Flutterwave's `event` field and on the `tx_ref` prefix (`ord_` for orders, `sub_` for subscriptions), so recurring charges can be added later without a rewrite. Add `enrollments.source` (`manual` | `code` | `purchase` | `subscription`) in this phase's migration.

**Env:** `FLW_PUBLIC_KEY`, `FLW_SECRET_KEY`, `FLW_SECRET_HASH`. Use Flutterwave test mode against the `academy-staging` project.

---

## Phase 4: Lesson content and automatic progress

**Goal:** self-paced material that supports the cohorts. This is the "lesson content access" work the comment in `20261029000200_course_catalogue.sql` calls Phase 2. That comment predates this roadmap.

- **Lesson player** at `/dashboard/courses/[courseId]/lessons/[lessonId]`:
  - text lessons render as Markdown;
  - video lessons embed unlisted YouTube or Vimeo for now, with Bunny or Mux as a later upgrade;
  - file lessons are served from a private Supabase Storage bucket through short-lived signed URLs;
  - live lessons link to their session and recording.
- **Access check on the server:** an active enrolment for the course, or `is_preview`, or admin. Lesson `content`, `video_url` and `file_path` are only selected after that check. Either tighten `lessons: public read` to return outline columns only (via a view), or keep content in a separate `lesson_content` table that only service-role code reads.
- **`lesson_progress`:** `user_id`, `lesson_id`, `completed_at`, unique on the pair. The player marks a lesson complete.
- **Computed progress:** `enrollments.progress` becomes a value worked out from completed lessons plus attendance at past sessions. The admin slider is removed.
- **Resources:** move resources into the database per course (`course_resources`), gated by enrolment. This replaces `MOCKUP_RESOURCES`.

---

## Phase 5: Subscriptions per course

**Goal:** a learner can subscribe to one course, monthly or yearly, and keeps its self-paced content and recordings for as long as they pay.

**Schema:**
- `subscription_plans`: `id`, `course_id`, `interval` (`monthly` | `yearly`), `price_usd`, `price_ngn`, `flw_plan_id_usd`, `flw_plan_id_ngn`, `is_active`, unique on (`course_id`, `interval`).
  - Saving a price in the course editor creates the matching Flutterwave payment plan (`POST /v3/payment-plans`), one per currency.
  - A Flutterwave plan's amount can't change, so a price change creates a new plan. Existing subscribers stay on their old price.
- `subscriptions`: `id`, `user_id`, `course_id`, `plan_id`, `currency`, `flw_subscription_id`, `status` (`active` | `past_due` | `cancelled` | `expired`), `current_period_end`, `cancel_at_period_end`, timestamps. Partial unique index: at most one non-expired subscription per user per course.
- `orders` gains `kind` (`offering` | `subscription` | `certificate`) and `subscription_id`. Each renewal charge is stored as a paid order, so receipts and revenue reports work the same way for every kind of payment.

**Access:**
- A Postgres function `course_access(user_id, course_id)` returns one of:
  - `full`: a non-subscription enrolment, or admin;
  - `self_paced`: a subscription enrolment whose subscription has `current_period_end > now()`, plus a 3-day grace period while `past_due`;
  - `none`.
- The Phase 4 lesson-access check and the recordings list call this function.
- Meeting links and session joining need `full`.
- Subscribing creates or reactivates an enrolment with `source = 'subscription'` and `cohort_id` null.
- When a subscription lapses, the enrolment is kept, so progress and notes survive. Content locks, and subscribing again unlocks it where the learner left off.
- Learners who already have `full` access to a course can't subscribe to it.

**Flow:**
1. On the course page, "Subscribe" (monthly/yearly toggle, currency from `use-currency`) calls `POST /api/subscriptions/checkout`. That route creates the order with `tx_ref = sub_…` and calls Flutterwave `/v3/payments` with `payment_plan` set. Recurring billing works with **cards only**, so restrict `payment_options` to `card` and say so on the button.
2. Webhook `charge.completed` with a `payment_plan`:
   - verify the transaction as in Phase 3;
   - on the first charge, create the subscription and look up `flw_subscription_id` with `GET /v3/subscriptions?email=…`;
   - on each renewal, insert a paid order and move `current_period_end` forward by one interval from the previous period end.
   - Make this idempotent on `flw_transaction_id`.
3. Failed renewal → `past_due` → `expired` once the grace period ends.
4. A daily cron reconciles against `GET /v3/subscriptions` to catch missed webhooks.
5. Cancelling in Dashboard → Billing calls `PUT /v3/subscriptions/{id}/cancel` and sets `cancel_at_period_end`. Access runs until `current_period_end`, then the status becomes `expired`.

**UI:**
- **Learner:** a Dashboard → Billing page showing the plan, next renewal date, cancel and resubscribe, and receipts.
- **Admin:** a monthly/yearly pricing section in the course editor, and a subscribers list per course with MRR (monthly recurring revenue).
- **Course page:** the subscription appears as a third choice alongside the group and 1-on-1 cohorts.

**Emails:** receipts for each renewal, a reminder 7 days before a yearly renewal, and notices for a failed renewal and for expiry, all through Brevo.

---

## Phase 6: Assignments, completion and certificates

- **Assignments and quizzes:**
  - `assignments` are attached to a lesson. `submissions` hold text or file uploads, a grade, feedback and a `graded_by` field.
  - Quizzes are simple multiple-choice, auto-graded and stored as JSON on the lesson.
  - Instructors grade from their cohort view.
- **Completion rule per course:** for example, all required lessons done, attendance of at least X%, and assignments passed. When the rule is met, `enrollments.status` becomes `completed`.
- **Certificates:**
  - A `certificates` row with a unique public code.
  - A PDF is generated on the server.
  - Anyone can check a certificate at `/certificates/[code]`.
  - Where `certificate_price_*` is set, the learner pays through the Phase 3 Flutterwave flow (`orders` with `kind = 'certificate'`) before downloading.
  - Subscribers' completion rule leaves out attendance, because they have no cohort.

---

## Phase 7: Notifications and reporting

- **Email reminders:** a session reminder 24 hours ahead and another 1 hour ahead, plus emails for new announcements and graded assignments. Schedule them with Vercel Cron or Supabase `pg_cron` and send through Brevo.
- **Admin reports:** enrolments and revenue by course and currency (one-off and subscription revenue shown separately), MRR and churn per course, attendance rate per cohort, and completion rate, built with recharts (already a dependency).
- **Learner notes:** let learners reply to notes, which are currently admin-write only.

---

## Verifying each phase
- `pnpm test`, `tsc` and `next build` pass. Add Vitest unit tests for each new `lib/` module, such as order fulfilment and the progress calculation.
- Apply the migrations with `pnpm db:reset` locally, then `pnpm db:push` to `academy-staging`.
- Run end-to-end checks against staging, as Phase 1 did:
  - **Phase 2:** create a cohort, generate sessions, join-link timing, attendance.
  - **Phase 3:** Flutterwave test card pays → webhook → enrolled; a replayed webhook creates no duplicate; a tampered amount is rejected; a full cohort is refused.
  - **Phase 4:** a non-enrolled user gets 403 on lesson content and file URLs.
  - **Phase 5:** a test-card subscription unlocks lessons and recordings but not meeting links. A simulated renewal webhook moves `current_period_end` forward exactly once, even when replayed. Cancelling keeps access until the period ends, then content locks and progress is kept. Subscribing again restores access.
  - **Phase 6:** completing the requirements issues a certificate and the verify page resolves.
- Test RLS as anon, as a student, as an instructor and as an admin for every new table.
