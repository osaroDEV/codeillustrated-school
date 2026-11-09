-- Removes every learner account and everything tied to it, keeping admins and
-- all admin-made content (courses, lessons, cohorts, class sessions,
-- announcements, invite codes, contact messages). Used to reset a project for
-- a fresh round of testing. It cannot be undone.
--
-- 1. Run remove-learners-preview.sql and check the numbers.
-- 2. Cancel any live subscription in Admin -> Payments first (this script
--    refuses to run while one exists, so no card keeps being charged).
-- 3. pnpm exec supabase db query --linked [--project-ref <ref>] -f supabase/sql/remove-learners.sql
-- 4. Remove the files the preview listed:
--    pnpm exec supabase storage rm --experimental --linked ss:///course-files/<path> ...
--
-- "Learners" are every account whose profile role isn't admin (students,
-- instructors and accounts with no profile).

begin;

create temp table _targets on commit drop as
  select u.id, lower(u.email) as email
  from auth.users u
  left join public.profiles p on p.id = u.id
  where coalesce(p.role, 'student') <> 'admin';

create temp table _target_orders on commit drop as
  select o.id, o.tx_ref from public.orders o
  where o.user_id in (select id from _targets) or lower(o.customer_email) in (select email from _targets);

do $$
begin
  if exists (
    select 1 from public.subscriptions s
    where (s.user_id in (select id from _targets) or lower(s.customer_email) in (select email from _targets))
      and s.status in ('active', 'past_due')
  ) then
    raise exception 'A learner still has a live subscription. Cancel it in Admin -> Payments first.';
  end if;
end $$;

-- Enrolments first: the progress triggers that fire when lesson_progress and
-- attendance rows cascade away then find no enrolment and do nothing.
delete from public.enrollments where user_id in (select id from _targets);
delete from public.certificates
  where user_id in (select id from _targets) or order_id in (select id from _target_orders);
delete from public.payment_events
  where tx_ref in (select tx_ref from _target_orders)
     or lower(payload -> 'data' -> 'customer' ->> 'email') in (select email from _targets);
delete from public.orders where id in (select id from _target_orders);
delete from public.subscriptions
  where user_id in (select id from _targets) or lower(customer_email) in (select email from _targets);
delete from public.email_outbox where lower(to_email) in (select email from _targets);
-- Production's hand-made invite_codes.used_by has no ON DELETE action, so it
-- would block the account delete. used_at stays set, so the code stays used.
update public.invite_codes set used_by = null where used_by in (select id from _targets);

-- Cascades to profiles, learner notes and their replies, attendance, lesson
-- progress, quiz attempts and assignment submissions.
delete from auth.users where id in (select id from _targets);

commit;
