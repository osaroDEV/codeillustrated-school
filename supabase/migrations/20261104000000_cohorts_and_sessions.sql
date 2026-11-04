-- Phase 2: cohorts, live class sessions, attendance and the instructor role.
-- See docs/lms-roadmap.md.

-- ─── Instructor role ───

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('student', 'instructor', 'admin'));

-- ─── enrollments.course_id → courses ───
-- Added NOT VALID so legacy rows pointing at a course slug that was never
-- seeded don't block the migration; new and updated rows are checked, and
-- courses with enrolments can't be deleted. Validation is attempted and only
-- skipped (with a notice) if such rows exist.

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'enrollments_course_id_fkey'
  ) then
    alter table public.enrollments
      add constraint enrollments_course_id_fkey
      foreign key (course_id) references public.courses (id)
      on update cascade on delete restrict
      not valid;
  end if;

  begin
    alter table public.enrollments validate constraint enrollments_course_id_fkey;
  exception when foreign_key_violation then
    raise notice 'enrollments_course_id_fkey left NOT VALID: some enrollments reference unknown courses';
  end;
end $$;

-- ─── Cohorts ───

create table if not exists public.cohorts (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses (id) on update cascade on delete restrict,
  offering_kind text not null default 'cohort_group'
    check (offering_kind in ('cohort_group', 'cohort_1on1')),
  name text not null,
  starts_on date,
  ends_on date,
  -- null means no limit
  capacity integer check (capacity is null or capacity > 0),
  meeting_url text,
  instructor_id uuid references public.profiles (id) on delete set null,
  status text not null default 'planned' check (status in ('planned', 'running', 'finished')),
  created_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create index if not exists cohorts_course_id_idx on public.cohorts (course_id);
create index if not exists cohorts_instructor_id_idx on public.cohorts (instructor_id);

alter table public.enrollments
  add column if not exists cohort_id uuid references public.cohorts (id) on delete set null;

create index if not exists enrollments_cohort_id_idx on public.enrollments (cohort_id);

comment on column public.enrollments.next_session is
  'Deprecated: set by hand before cohorts existed. Learners in a cohort get their next session from class_sessions.';

-- A learner can only be placed in a cohort of the course they're enrolled in,
-- and never beyond the cohort's capacity. The cohort row is locked so two
-- concurrent assignments can't both take the last seat.
-- security definer: the seat count must see every enrolment, not just the
-- rows the caller's RLS policies expose.
create or replace function public.check_enrollment_cohort()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
  taken integer;
begin
  if new.cohort_id is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.cohort_id is not distinct from old.cohort_id
     and new.course_id = old.course_id then
    return new;
  end if;

  select id, course_id, capacity into c
  from public.cohorts where id = new.cohort_id
  for update;

  if c.course_id <> new.course_id then
    raise exception 'Cohort belongs to a different course' using errcode = 'CI001';
  end if;

  if c.capacity is not null then
    select count(*) into taken
    from public.enrollments
    where cohort_id = new.cohort_id and id <> new.id;
    if taken >= c.capacity then
      raise exception 'Cohort is full' using errcode = 'CI002';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists check_enrollment_cohort on public.enrollments;
create trigger check_enrollment_cohort
  before insert or update of cohort_id, course_id on public.enrollments
  for each row execute function public.check_enrollment_cohort();

-- ─── Class sessions and attendance ───

create table if not exists public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts (id) on delete cascade,
  -- the lesson this session teaches, if any
  lesson_id uuid references public.lessons (id) on delete set null,
  title text,
  starts_at timestamptz not null,
  duration_min integer not null default 60 check (duration_min > 0),
  -- overrides the cohort's meeting_url
  meeting_url text,
  recording_url text,
  created_at timestamptz not null default now()
);

create index if not exists class_sessions_cohort_starts_idx
  on public.class_sessions (cohort_id, starts_at);

create table if not exists public.attendance (
  session_id uuid not null references public.class_sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('present', 'late', 'absent')),
  marked_by uuid references public.profiles (id) on delete set null,
  marked_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

create index if not exists attendance_user_id_idx on public.attendance (user_id);

-- ─── Helpers ───

create or replace function public.is_instructor_of(p_cohort_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.cohorts
    where id = p_cohort_id and instructor_id = auth.uid()
  );
$$;

create or replace function public.is_cohort_member(p_cohort_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.enrollments
    where cohort_id = p_cohort_id and user_id = auth.uid()
  );
$$;

-- ─── RLS ───
-- API routes use the service role and do their own checks (lib/staff.ts).
-- These policies govern the anon/user-scoped clients. Learners get no direct
-- read on class_sessions: meeting links are only handed out by
-- /api/sessions/[id]/join inside the join window.

alter table public.cohorts enable row level security;
alter table public.class_sessions enable row level security;
alter table public.attendance enable row level security;

drop policy if exists "cohorts: read staff or member" on public.cohorts;
create policy "cohorts: read staff or member" on public.cohorts
  for select using (
    public.is_admin() or instructor_id = auth.uid() or public.is_cohort_member(id)
  );

drop policy if exists "cohorts: admin write" on public.cohorts;
create policy "cohorts: admin write" on public.cohorts
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "class_sessions: read staff" on public.class_sessions;
create policy "class_sessions: read staff" on public.class_sessions
  for select using (public.is_admin() or public.is_instructor_of(cohort_id));

drop policy if exists "class_sessions: admin write" on public.class_sessions;
create policy "class_sessions: admin write" on public.class_sessions
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "class_sessions: instructor update" on public.class_sessions;
create policy "class_sessions: instructor update" on public.class_sessions
  for update using (public.is_instructor_of(cohort_id))
  with check (public.is_instructor_of(cohort_id));

drop policy if exists "attendance: read own or staff" on public.attendance;
create policy "attendance: read own or staff" on public.attendance
  for select using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.class_sessions s
      where s.id = session_id and public.is_instructor_of(s.cohort_id)
    )
  );

drop policy if exists "attendance: staff write" on public.attendance;
create policy "attendance: staff write" on public.attendance
  for all using (
    public.is_admin()
    or exists (
      select 1 from public.class_sessions s
      where s.id = session_id and public.is_instructor_of(s.cohort_id)
    )
  ) with check (
    public.is_admin()
    or exists (
      select 1 from public.class_sessions s
      where s.id = session_id and public.is_instructor_of(s.cohort_id)
    )
  );

-- ─── Reordering for the course editor ───
-- (course_id, position) and (module_id, position) are unique, so swapping two
-- rows one UPDATE at a time collides. These move the rows to negative
-- positions first, then assign 1..n in the given order, in one transaction.
-- Service role only.

create or replace function public.reorder_course_modules(p_course_id text, p_ids uuid[])
returns void
language plpgsql
set search_path = public
as $$
begin
  if (select count(*) from public.course_modules where course_id = p_course_id)
     <> coalesce(array_length(p_ids, 1), 0)
     or (select count(distinct i) from unnest(p_ids) as i) <> coalesce(array_length(p_ids, 1), 0)
     or exists (
       select 1 from unnest(p_ids) as i(id)
       where not exists (
         select 1 from public.course_modules m where m.id = i.id and m.course_id = p_course_id
       )
     ) then
    raise exception 'Module list does not match the course' using errcode = 'CI003';
  end if;

  update public.course_modules set position = -position - 1 where course_id = p_course_id;
  update public.course_modules m
  set position = o.ord
  from unnest(p_ids) with ordinality as o(id, ord)
  where m.id = o.id;
end;
$$;

create or replace function public.reorder_lessons(p_module_id uuid, p_ids uuid[])
returns void
language plpgsql
set search_path = public
as $$
begin
  if (select count(*) from public.lessons where module_id = p_module_id)
     <> coalesce(array_length(p_ids, 1), 0)
     or (select count(distinct i) from unnest(p_ids) as i) <> coalesce(array_length(p_ids, 1), 0)
     or exists (
       select 1 from unnest(p_ids) as i(id)
       where not exists (
         select 1 from public.lessons l where l.id = i.id and l.module_id = p_module_id
       )
     ) then
    raise exception 'Lesson list does not match the module' using errcode = 'CI003';
  end if;

  update public.lessons set position = -position - 1 where module_id = p_module_id;
  update public.lessons l
  set position = o.ord
  from unnest(p_ids) with ordinality as o(id, ord)
  where l.id = o.id;
end;
$$;

revoke all on function public.reorder_course_modules(text, uuid[]) from public, anon, authenticated;
revoke all on function public.reorder_lessons(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.reorder_course_modules(text, uuid[]) to service_role;
grant execute on function public.reorder_lessons(uuid, uuid[]) to service_role;

-- ─── Lesson content stays server-side ───
-- "lessons: public read" exposes rows for the curriculum outline, and until
-- now nothing wrote lesson content. The course editor does, so anon and
-- signed-in clients are limited to the outline columns; content, video_url
-- and file_path are only read with the service role, after the enrolment
-- check that Phase 4 adds.

revoke select on public.lessons from anon, authenticated;
grant select (id, module_id, title, position, type, is_preview, duration_min, is_published)
  on public.lessons to anon, authenticated;
