-- Read-only preview for remove-learners.sql: what a learner cleanup would
-- delete. Run it first, on the same project:
--   pnpm exec supabase db query --linked [--project-ref <ref>] -f supabase/sql/remove-learners-preview.sql
--
-- "Learners" are every account whose profile role isn't admin (students,
-- instructors and accounts with no profile). Emails are masked.

with targets as (
  select u.id, lower(u.email) as email, coalesce(p.role, '(no profile)') as role
  from auth.users u
  left join public.profiles p on p.id = u.id
  where coalesce(p.role, 'student') <> 'admin'
),
target_orders as (
  select o.tx_ref from public.orders o
  where o.user_id in (select id from targets) or lower(o.customer_email) in (select email from targets)
)
select
  (select count(*) from targets) as accounts,
  (select string_agg(left(email, 2) || '***@' || split_part(email, '@', 2) || ' (' || role || ')', ', ') from targets) as who,
  (select count(*) from public.profiles where role = 'admin') as admins_kept,
  (select count(*) from public.enrollments where user_id in (select id from targets)) as enrolments,
  (select count(*) from public.lesson_progress where user_id in (select id from targets)) as lesson_progress,
  (select count(*) from public.attendance where user_id in (select id from targets)) as attendance,
  (select count(*) from public.quiz_attempts where user_id in (select id from targets)) as quiz_attempts,
  (select count(*) from public.assignment_submissions where user_id in (select id from targets)) as submissions,
  (select count(*) from public.learner_notes where user_id in (select id from targets)) as notes,
  (select count(*) from public.certificates where user_id in (select id from targets)) as certificates,
  (select count(*) from target_orders) as orders,
  (select count(*) from public.payment_events e
     where e.tx_ref in (select tx_ref from target_orders)
        or lower(e.payload -> 'data' -> 'customer' ->> 'email') in (select email from targets)) as payment_events,
  (select count(*) from public.subscriptions s
     where s.user_id in (select id from targets) or lower(s.customer_email) in (select email from targets)) as subscriptions,
  -- must be 0 before remove-learners.sql will run: cancel these first in
  -- Admin -> Payments so Flutterwave stops charging the card
  (select count(*) from public.subscriptions s
     where (s.user_id in (select id from targets) or lower(s.customer_email) in (select email from targets))
       and s.status in ('active', 'past_due')) as live_subscriptions,
  (select count(*) from public.email_outbox where lower(to_email) in (select email from targets)) as outbox_emails,
  (select count(*) from public.invite_codes where used_by in (select id from targets)) as invite_codes_unlinked,
  -- uploaded assignment files of anyone who isn't an admin, including ones
  -- left behind by an earlier run: remove these with `supabase storage rm`
  (select string_agg(o.name, ' ') from storage.objects o
     where o.bucket_id = 'course-files' and o.name like 'submissions/%'
       and split_part(o.name, '/', 3) not in (select id::text from public.profiles where role = 'admin')) as files_to_remove;
