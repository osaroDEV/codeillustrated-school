# LMS roadmap for Code Illustrated Academy

## Overview

The plan for turning the academy site into an LMS. Phase 1 (per-user admin auth, course catalogue in the database, email verification, scholarship codes) shipped in PR #1. Each later phase gets its own branch (for example `lms/phase-2-cohorts`) and its own detailed plan before work starts.

Decisions so far:
- **Payments:** Flutterwave, for both NGN and USD.
- **Delivery:** live cohorts come first, with self-paced lessons supporting them.
- **Guardian accounts:** none. Each learner has one account.
- **Cohort seats are billed monthly** (decided at the start of Phase 3): group and 1-on-1 classes are monthly card subscriptions through Flutterwave payment plans, billed until the learner cancels or the cohort finishes. Admins place paying learners in cohorts.
- **Self-paced subscriptions** (Phase 5): sold per course, billed monthly or yearly, in NGN and USD, giving access to that course's self-paced lessons, files and session recordings. They reuse Phase 3's billing tables and webhook.

### Where Phase 1 left things
- **Auth:** per-user roles in `profiles.role` (`student` | `admin`). Helpers live in `lib/supabase-server.ts` (`requireUser`, `requireAdmin`, `rejectNonAdmin`, `requireVerifiedUserApi`, `isAdmin`). Email verification and password reset work.
- **Catalogue:** stored in the database (`courses`, `course_modules`, `lessons`, `offerings`) and read through `getCourses` and `getCourseBySlug` in `lib/courses.ts`, with `STATIC_COURSES` as a fallback. `lessons` already has `type` (video/text/file/live), `content`, `video_url`, `file_path` and `is_preview`, but nothing renders lesson content and there's no admin editor.
- **Enrolments:** created by hand by admins or by scholarship codes (`lib/invites.ts` `redeemInvite`, which claims the code atomically and releases it if enrolment fails). "Enroll Now" links to WhatsApp (`components/CourseDetailClient.tsx`). `enrollments.course_id` is text with no foreign key.
- **Progress:** `enrollments.progress` and `next_session` are set by hand with a slider in `components/admin/admin-panel.tsx`, a single 995-line component.
- **Unused so far:** `courses.certificate_price_usd/ngn` exist but no certificate feature uses them. The resources page reads static `MOCKUP_RESOURCES` from `store/resources-store.ts`.

---

## Phase 2: Cohorts, live sessions and catalogue editing

**Status:** shipped (PR #3). Migration `20261104000000_cohorts_and_sessions.sql`.

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

## Phase 3: Monthly checkout with Flutterwave

**Status:** shipped (PR #4). Migration `20261105000000_billing.sql`.

**Goal:** a visitor can subscribe to a course's group or 1-on-1 classes, pay monthly by card, and be enrolled without anyone stepping in. An admin then places them in a cohort.

**Schema:**
- `payment_plans`: one Flutterwave payment plan per offering, currency and price, created the first time someone checks out. A plan's amount can't change, so a new price creates a new plan and existing subscribers keep their price.
- `subscriptions`: learner, course, offering, plan, amount, `customer_email` (lower-case), `first_tx_ref`, `flw_subscription_id`, `status` (active / past_due / cancelled / expired), `current_period_end`. At most one live subscription per learner per course.
- `orders`: every checkout and every charge, first payments and renewals alike. `tx_ref` is ours (`sub_…`) for checkouts.
- `payment_events`: an audit log of every webhook, redirect and cron result, including charges that couldn't be matched.
- `enrollments.source` (`manual` | `code` | `purchase` | `subscription`) and `enrollments.subscription_id`. Code enrolments are backfilled.
- Service-role-only SQL functions keep the money logic atomic and idempotent:
  - `fulfil_subscription_order`: the first charge creates the subscription and the enrolment, or resumes a lapsed one. Someone who already has a seat gets a cancelled subscription and the charge is flagged for a refund.
  - `record_renewal`: adds a month from whichever is later, the paid-until date or the payment.
  - `expire_subscriptions`: once the period plus 3 days' grace is over, the subscription expires and the seat is paused. The enrolment, progress and cohort are kept.
  - `mark_order_refunded`.

**Flow:**
1. **Checkout:** "Subscribe monthly" on the course page calls `POST /api/checkout`. The learner must be signed in and verified. NGN is only charged to visitors in Nigeria (`x-vercel-ip-country`); everyone else pays USD. The route creates the order and the plan, then calls Flutterwave Standard checkout with `payment_plan` set, so the payment is card only.
2. **Redirect:** Flutterwave sends the learner to `/checkout/complete`, which re-verifies the transaction and shows the result.
3. **Webhook:** `POST /api/payments/flutterwave/webhook` checks `verif-hash` and re-verifies every charge with `GET /v3/transactions/{id}/verify`, checking status, `tx_ref`, currency and amount. The redirect and webhook share `processCharge`, so whichever arrives first wins and the other changes nothing.
4. **Renewals:** Flutterwave doesn't document the renewal `tx_ref` or include the plan in the transaction. Renewals are matched to the learner's live subscription by email, then by a `tx_ref` built from the first checkout, then by currency and amount, soonest due first. Anything left over is logged as `unmatched` for an admin. A failed renewal marks the subscription past due, and `subscription.cancelled` marks it cancelled.
5. **Daily cron** (`vercel.json`, `/api/cron/billing`): expires lapsed subscriptions, re-checks checkouts still pending after 15 minutes, and closes abandoned checkouts after 3 days.
6. **Access:** a seat paid by subscription only lets the learner join classes or see recordings while it's paid up (`hasSeatAccess`). Manual and scholarship-code enrolments are unaffected.

**UI:**
- **Learner:** Dashboard → Billing shows subscriptions (renewal date, cancel, subscribe again) and receipts. My Courses and Schedule show a "renew" prompt when a seat lapses.
- **Admin:** Admin → Payments shows MRR per currency and tabs for:
  - **Needs attention:** paid learners waiting for a cohort, plus unmatched or rejected charges and duplicate purchases;
  - **Subscriptions**, with cancel;
  - **Charges**, with "Re-check" for pending ones and "Mark refunded".
- **Ending billing:** marking a cohort finished cancels its members' subscriptions.
- **Receipts:** first payments and renewals send a receipt email through Brevo.

**Not included:**
- Refunds are made in the Flutterwave dashboard. "Mark refunded" only records them.
- Self-paced offerings can't be bought until the lesson player exists (Phase 4).
- WhatsApp stays as "Questions? Talk to us". Courses served from the static fallback keep WhatsApp enrolment.

**Env:** `FLW_SECRET_KEY`, `FLW_SECRET_HASH`, `CRON_SECRET`, `BREVO_API_KEY` (already used for the newsletter), and optionally `RECEIPT_FROM_EMAIL` and `APP_URL`. Setup steps are in `supabase/README.md`.

**Tests:**
- `lib/billing.test.ts`, `lib/flutterwave.test.ts`, `lib/billing-server.test.ts` and `tests/api/flutterwave-webhook.test.ts`.
- Billing checks in `tests/db/migrations.test.ts`: fulfilment, idempotency, renewals, expiry, resubscribing, refunds and RLS.
- **Still to do:** an end-to-end run with Flutterwave test keys against `academy-staging`, including a real renewal. That run should confirm the renewal `tx_ref` format, so the matching in `matchRenewal` can be tightened.

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

**Builds on Phase 3:** the tables (`payment_plans`, `subscriptions`, `orders`, `payment_events`), the webhook, renewal matching, expiry cron, Billing page and admin Payments page already exist for monthly cohort seats. This phase:
- allows `self_paced` in `PURCHASABLE_KINDS`;
- adds `yearly` to `payment_plans.interval`, with a `record_renewal` that extends by the plan's interval;
- grants self-paced subscribers lesson access in the Phase 4 access check.

The design below was written before Phase 3; where they differ, Phase 3's implementation wins.

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
