-- Phase 4: lesson player, automatic progress and course resources.
-- See docs/lms-roadmap.md and lib/lessons.ts.
--
-- enrollments.progress is now calculated. Hand-set values from before this
-- migration move to progress_baseline, a starting credit: lessons fill in the
-- rest, so nobody's bar drops and 100% still means everything is done.

-- ─── Completed lessons ───

create table if not exists public.lesson_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create index if not exists lesson_progress_lesson_idx on public.lesson_progress (lesson_id);

alter table public.lesson_progress enable row level security;

-- Written only by /api/lessons/[id]/progress, after its access check.
drop policy if exists "lesson_progress: read own" on public.lesson_progress;
create policy "lesson_progress: read own" on public.lesson_progress
  for select using (user_id = auth.uid() or public.is_admin());

-- ─── Starting credit ───

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'enrollments' and column_name = 'progress_baseline'
  ) then
    alter table public.enrollments
      add column progress_baseline integer not null default 0
      check (progress_baseline between 0 and 100);
    update public.enrollments set progress_baseline = least(greatest(coalesce(progress, 0), 0), 100);
  end if;
end $$;

-- ─── Calculation ───

-- The share of a course's published lessons this learner has finished, 0 to 1.
-- A lesson is finished when it's marked complete in the player, or when the
-- learner attended a class in their cohort that taught it. Attended classes
-- not tied to a lesson count towards the live lessons still outstanding.
create or replace function public.lesson_completion(p_user_id uuid, p_course_id text, p_cohort_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  with course_lessons as (
    select l.id, l.type
    from public.lessons l
    join public.course_modules m on m.id = l.module_id
    where m.course_id = p_course_id and l.is_published
  ),
  attended as (
    select cs.lesson_id
    from public.attendance a
    join public.class_sessions cs on cs.id = a.session_id
    where a.user_id = p_user_id
      and cs.cohort_id = p_cohort_id
      and a.status in ('present', 'late')
  ),
  finished as (
    select lp.lesson_id as id from public.lesson_progress lp
    where lp.user_id = p_user_id and lp.lesson_id in (select id from course_lessons)
    union
    select lesson_id from attended where lesson_id in (select id from course_lessons)
  ),
  counts as (
    select
      (select count(*) from course_lessons) as total,
      (select count(*) from finished) as done,
      (select count(*) from course_lessons where type = 'live' and id not in (select id from finished)) as live_left,
      (select count(*) from attended where lesson_id is null or lesson_id not in (select id from course_lessons)) as extra_classes
  )
  select case when total = 0 then 0 else (done + least(extra_classes, live_left))::numeric / total end
  from counts;
$$;

create or replace function public.refresh_progress_for(p_user_id uuid, p_course_id text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.enrollments e
  set progress = floor(
    e.progress_baseline
    + (100 - e.progress_baseline) * public.lesson_completion(e.user_id, e.course_id, e.cohort_id)
  )::integer
  where e.user_id = p_user_id and e.course_id = p_course_id;
$$;

create or replace function public.refresh_progress_for_course(p_course_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_progress_for(e.user_id, e.course_id)
  from public.enrollments e
  where e.course_id = p_course_id;
end;
$$;

revoke all on function public.lesson_completion(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.refresh_progress_for(uuid, text) from public, anon, authenticated;
revoke all on function public.refresh_progress_for_course(text) from public, anon, authenticated;

-- ─── Keeping it current ───
-- If a parent row has already gone in a cascade these find no course and do
-- nothing; the trigger on that parent covers it.

create or replace function public.progress_after_lesson_progress()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r public.lesson_progress := coalesce(new, old);
begin
  perform public.refresh_progress_for(r.user_id, m.course_id)
  from public.lessons l
  join public.course_modules m on m.id = l.module_id
  where l.id = r.lesson_id;
  return null;
end $$;

create or replace function public.progress_after_attendance()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r public.attendance := coalesce(new, old);
begin
  perform public.refresh_progress_for(r.user_id, c.course_id)
  from public.class_sessions cs
  join public.cohorts c on c.id = cs.cohort_id
  where cs.id = r.session_id;
  return null;
end $$;

create or replace function public.progress_after_session()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r public.class_sessions := coalesce(new, old);
begin
  perform public.refresh_progress_for(e.user_id, e.course_id)
  from public.enrollments e
  where e.cohort_id = r.cohort_id;
  return null;
end $$;

create or replace function public.progress_after_lesson()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op <> 'INSERT' then
    perform public.refresh_progress_for_course(m.course_id)
    from public.course_modules m where m.id = old.module_id;
  end if;
  if tg_op <> 'DELETE' then
    perform public.refresh_progress_for_course(m.course_id)
    from public.course_modules m where m.id = new.module_id;
  end if;
  return null;
end $$;

create or replace function public.progress_after_module_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.refresh_progress_for_course(old.course_id);
  return null;
end $$;

create or replace function public.progress_after_enrollment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.refresh_progress_for(new.user_id, new.course_id);
  return null;
end $$;

drop trigger if exists lesson_progress_refresh on public.lesson_progress;
create trigger lesson_progress_refresh
  after insert or delete on public.lesson_progress
  for each row execute function public.progress_after_lesson_progress();

drop trigger if exists attendance_refresh_progress on public.attendance;
create trigger attendance_refresh_progress
  after insert or delete or update of status on public.attendance
  for each row execute function public.progress_after_attendance();

drop trigger if exists class_sessions_refresh_progress on public.class_sessions;
create trigger class_sessions_refresh_progress
  after delete or update of lesson_id on public.class_sessions
  for each row execute function public.progress_after_session();

drop trigger if exists lessons_refresh_progress on public.lessons;
create trigger lessons_refresh_progress
  after insert or delete or update of is_published, type, module_id on public.lessons
  for each row execute function public.progress_after_lesson();

drop trigger if exists course_modules_refresh_progress on public.course_modules;
create trigger course_modules_refresh_progress
  after delete on public.course_modules
  for each row execute function public.progress_after_module_delete();

drop trigger if exists enrollments_refresh_progress on public.enrollments;
create trigger enrollments_refresh_progress
  after insert or update of cohort_id on public.enrollments
  for each row execute function public.progress_after_enrollment();

-- ─── Course resources ───

create table if not exists public.course_resources (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses (id) on delete cascade,
  title text not null,
  description text not null default '',
  kind text not null check (kind in ('file', 'link')),
  file_path text,
  url text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  check ((kind = 'file' and file_path is not null) or (kind = 'link' and url is not null))
);

create index if not exists course_resources_course_idx on public.course_resources (course_id, position);

-- No client policies: only server code reads these, after checking the
-- learner's access to the course.
alter table public.course_resources enable row level security;

-- ─── Private file storage ───
-- No policies on storage.objects, so only the service role reaches these:
-- admins upload through signed URLs and learners download through short-lived
-- ones. The local test database has no storage schema.

do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit)
    values ('course-files', 'course-files', false, 52428800)
    on conflict (id) do nothing;
  end if;
end $$;
