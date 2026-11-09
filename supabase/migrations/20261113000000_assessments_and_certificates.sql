-- Phase 6: quizzes, assignments, course completion and certificates.
-- See docs/lms-roadmap.md, lib/assessments.ts and lib/certificates.ts.

-- ─── Quiz and assignment blocks ───

alter table public.lesson_blocks
  add column if not exists quiz jsonb,
  add column if not exists pass_mark integer not null default 70 check (pass_mark between 1 and 100),
  add column if not exists is_required boolean not null default true;

alter table public.lesson_blocks drop constraint if exists lesson_blocks_kind_check;
alter table public.lesson_blocks
  add constraint lesson_blocks_kind_check check (kind in ('text', 'video', 'file', 'quiz', 'assignment'));

alter table public.lesson_blocks drop constraint if exists lesson_blocks_check;
alter table public.lesson_blocks
  add constraint lesson_blocks_check check (
    (kind = 'text' and content is not null)
    or (kind = 'video' and video_url is not null)
    or (kind = 'file' and file_path is not null)
    or (kind = 'quiz' and quiz is not null)
    or (kind = 'assignment' and content is not null)
  );

-- ─── Learner work ───
-- Deleting a block that has learner work is refused (on delete restrict).
-- Only server code reads or writes these, after its own access checks.

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.lesson_blocks (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete cascade,
  answers jsonb not null,
  score integer not null check (score between 0 and 100),
  passed boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists quiz_attempts_user_block_idx on public.quiz_attempts (user_id, block_id);
create index if not exists quiz_attempts_block_idx on public.quiz_attempts (block_id);

create table if not exists public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.lesson_blocks (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text,
  file_path text,
  status text not null default 'submitted' check (status in ('submitted', 'passed', 'needs_work')),
  score integer check (score between 0 and 100),
  feedback text,
  graded_by uuid references public.profiles (id) on delete set null,
  graded_at timestamptz,
  submitted_at timestamptz not null default now(),
  unique (block_id, user_id),
  check (body is not null or file_path is not null)
);

create index if not exists assignment_submissions_status_idx
  on public.assignment_submissions (status, submitted_at);

alter table public.quiz_attempts enable row level security;
alter table public.assignment_submissions enable row level security;

-- ─── Keep block IDs when a lesson is saved ───
-- Learner work points at blocks, so saving must update them in place. Blocks
-- are matched by id; removing one that has learner work is refused.

create or replace function public.replace_lesson_blocks(p_lesson_id uuid, p_blocks jsonb)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old text[];
  v_unused text[];
  v_keep uuid[];
  v_course text;
  r record;
begin
  select m.course_id into v_course
  from public.lessons l
  join public.course_modules m on m.id = l.module_id
  where l.id = p_lesson_id
  for update of l;
  if not found then
    raise exception 'Unknown lesson' using errcode = 'CI004';
  end if;

  select coalesce(array_agg(file_path), '{}') into v_old
  from public.lesson_blocks
  where lesson_id = p_lesson_id and file_path is not null;

  select coalesce(array_agg(b.id), '{}') into v_keep
  from public.lesson_blocks b
  where b.lesson_id = p_lesson_id
    and b.id::text in (select e->>'id' from jsonb_array_elements(p_blocks) as e where e ? 'id');

  if exists (
    select 1 from public.lesson_blocks b
    where b.lesson_id = p_lesson_id and not (b.id = any (v_keep))
      and (
        exists (select 1 from public.quiz_attempts q where q.block_id = b.id)
        or exists (select 1 from public.assignment_submissions s where s.block_id = b.id)
      )
  ) then
    raise exception 'A quiz or assignment has learner work' using errcode = 'CI006';
  end if;

  delete from public.lesson_blocks where lesson_id = p_lesson_id and not (id = any (v_keep));

  -- Out of the way first, so reordering can't collide on (lesson_id, position).
  update public.lesson_blocks set position = -position where lesson_id = p_lesson_id;

  for r in select b, ord::integer as ord from jsonb_array_elements(p_blocks) with ordinality as t(b, ord) loop
    if (r.b->>'id')::uuid = any (v_keep) then
      update public.lesson_blocks
      set position = r.ord,
          kind = r.b->>'kind',
          title = nullif(r.b->>'title', ''),
          content = r.b->>'content',
          video_url = r.b->>'video_url',
          file_path = r.b->>'file_path',
          quiz = r.b->'quiz',
          pass_mark = coalesce((r.b->>'pass_mark')::integer, 70),
          is_required = coalesce((r.b->>'is_required')::boolean, true)
      where id = (r.b->>'id')::uuid;
    else
      insert into public.lesson_blocks (lesson_id, position, kind, title, content, video_url, file_path, quiz, pass_mark, is_required)
      values (
        p_lesson_id, r.ord, r.b->>'kind', nullif(r.b->>'title', ''), r.b->>'content', r.b->>'video_url', r.b->>'file_path',
        r.b->'quiz', coalesce((r.b->>'pass_mark')::integer, 70), coalesce((r.b->>'is_required')::boolean, true)
      );
    end if;
  end loop;

  select coalesce(array_agg(f), '{}') into v_unused
  from unnest(v_old) as f
  where not exists (
    select 1 from public.lesson_blocks b where b.lesson_id = p_lesson_id and b.file_path = f
  );

  perform public.refresh_progress_for_course(v_course);
  return v_unused;
end;
$$;

-- ─── Completion ───

alter table public.courses
  add column if not exists completion_min_attendance integer check (completion_min_attendance between 1 and 100);

alter table public.enrollments add column if not exists completed_at timestamptz;

-- Where a learner stands against the course's completion rule:
--   every published lesson finished;
--   every required quiz and assignment passed;
--   attendance at the course's minimum, if it sets one and the learner has a
--   cohort. Self-paced subscribers have none, so attendance doesn't apply.
create or replace function public.course_requirements(p_user_id uuid, p_course_id text, p_cohort_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_lessons numeric;
  v_items integer;
  v_passed integer;
  v_min integer;
  v_past integer;
  v_attended integer;
  v_pct integer;
  v_attendance_ok boolean := true;
begin
  v_lessons := public.lesson_completion(p_user_id, p_course_id, p_cohort_id);

  select count(*),
         count(*) filter (
           where (b.kind = 'quiz' and exists (
                    select 1 from public.quiz_attempts q where q.block_id = b.id and q.user_id = p_user_id and q.passed))
              or (b.kind = 'assignment' and exists (
                    select 1 from public.assignment_submissions s where s.block_id = b.id and s.user_id = p_user_id and s.status = 'passed'))
         )
  into v_items, v_passed
  from public.lesson_blocks b
  join public.lessons l on l.id = b.lesson_id
  join public.course_modules m on m.id = l.module_id
  where m.course_id = p_course_id and l.is_published and b.is_required and b.kind in ('quiz', 'assignment');

  select completion_min_attendance into v_min from public.courses where id = p_course_id;

  if v_min is not null and p_cohort_id is not null then
    select count(*),
           count(*) filter (where a.status in ('present', 'late'))
    into v_past, v_attended
    from public.class_sessions cs
    left join public.attendance a on a.session_id = cs.id and a.user_id = p_user_id
    where cs.cohort_id = p_cohort_id and cs.starts_at < now();
    v_pct := case when v_past = 0 then 100 else floor(100.0 * v_attended / v_past)::integer end;
    v_attendance_ok := v_pct >= v_min;
  else
    v_min := null;
  end if;

  return jsonb_build_object(
    'lessons_share', v_lessons,
    'items_total', v_items,
    'items_passed', v_passed,
    'attendance_required', v_min,
    'attendance_pct', v_pct,
    'met', v_lessons >= 1 and v_passed = v_items and v_attendance_ok
  );
end;
$$;

create or replace function public.refresh_progress_for(p_user_id uuid, p_course_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.enrollments e
  set progress = floor(
    e.progress_baseline
    + (100 - e.progress_baseline) * public.lesson_completion(e.user_id, e.course_id, e.cohort_id)
  )::integer
  where e.user_id = p_user_id and e.course_id = p_course_id;

  -- One way: later course changes never take a completion back.
  update public.enrollments e
  set status = 'completed', completed_at = now()
  where e.user_id = p_user_id and e.course_id = p_course_id and e.status = 'active'
    and (public.course_requirements(e.user_id, e.course_id, e.cohort_id)->>'met')::boolean;
end;
$$;

create or replace function public.progress_after_assessment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.refresh_progress_for(new.user_id, m.course_id)
  from public.lesson_blocks b
  join public.lessons l on l.id = b.lesson_id
  join public.course_modules m on m.id = l.module_id
  where b.id = new.block_id;
  return null;
end $$;

drop trigger if exists quiz_attempts_refresh_progress on public.quiz_attempts;
create trigger quiz_attempts_refresh_progress
  after insert on public.quiz_attempts
  for each row execute function public.progress_after_assessment();

drop trigger if exists assignment_submissions_refresh_progress on public.assignment_submissions;
create trigger assignment_submissions_refresh_progress
  after insert or update of status on public.assignment_submissions
  for each row execute function public.progress_after_assessment();

create or replace function public.progress_after_course_rule()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.refresh_progress_for_course(new.id);
  return null;
end $$;

drop trigger if exists courses_refresh_progress on public.courses;
create trigger courses_refresh_progress
  after update of completion_min_attendance on public.courses
  for each row execute function public.progress_after_course_rule();

-- ─── Certificates ───
-- Name and title are copied at issue, so a certificate never changes later.

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  user_id uuid references public.profiles (id) on delete set null,
  course_id text not null references public.courses (id) on delete restrict,
  learner_name text not null,
  course_title text not null,
  order_id uuid references public.orders (id) on delete set null,
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (user_id, course_id)
);

-- Server code only: the public page looks certificates up by code.
alter table public.certificates enable row level security;

-- Issue, or return, this learner's certificate for a course. A revoked one is
-- restored under its original code when it's paid for again.
create or replace function public.issue_certificate(p_user_id uuid, p_course_id text, p_code text, p_order_id uuid default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_title text;
  v_code text;
begin
  select coalesce(nullif(trim(full_name), ''), email) into v_name from public.profiles where id = p_user_id;
  select title into v_title from public.courses where id = p_course_id;
  if v_name is null or v_title is null then
    raise exception 'Unknown learner or course' using errcode = 'CI004';
  end if;

  insert into public.certificates (code, user_id, course_id, learner_name, course_title, order_id)
  values (p_code, p_user_id, p_course_id, v_name, v_title, p_order_id)
  on conflict (user_id, course_id) do update
    set revoked_at = null,
        order_id = coalesce(excluded.order_id, public.certificates.order_id)
  returning code into v_code;
  return v_code;
end;
$$;

-- A paid certificate's charge. Idempotent, like fulfil_subscription_order.
-- Returns { outcome: issued | duplicate | refunded, code }.
create or replace function public.fulfil_certificate_order(
  p_tx_ref text,
  p_flw_transaction_id bigint,
  p_amount_paid numeric,
  p_paid_at timestamptz,
  p_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
  v_code text;
begin
  select * into o from public.orders where tx_ref = p_tx_ref for update;
  if not found or o.kind <> 'one_off' then
    raise exception 'Order % is not a certificate checkout', p_tx_ref using errcode = 'CI004';
  end if;
  if o.status = 'paid' then
    return jsonb_build_object('outcome', 'duplicate');
  end if;
  if o.status = 'refunded' then
    return jsonb_build_object('outcome', 'refunded');
  end if;

  update public.orders
  set status = 'paid',
      flw_transaction_id = p_flw_transaction_id,
      amount_paid = p_amount_paid,
      paid_at = p_paid_at,
      failure_reason = null,
      updated_at = now()
  where id = o.id;

  v_code := public.issue_certificate(o.user_id, o.course_id, p_code, o.id);
  return jsonb_build_object('outcome', 'issued', 'code', v_code);
end;
$$;

-- As in the billing migration, and refunding a certificate revokes it.
create or replace function public.mark_order_refunded(p_order_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  o public.orders%rowtype;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Unknown order %', p_order_id using errcode = 'CI004';
  end if;
  if o.status <> 'paid' then
    raise exception 'Only paid orders can be refunded' using errcode = 'CI005';
  end if;

  update public.orders
  set status = 'refunded', refunded_at = now(), updated_at = now()
  where id = o.id;

  if o.kind = 'one_off' then
    update public.certificates set revoked_at = now() where order_id = o.id;
  end if;

  if o.subscription_id is not null and not o.is_renewal then
    update public.subscriptions
    set status = 'expired', cancel_at_period_end = true,
        cancelled_at = coalesce(cancelled_at, now()), updated_at = now()
    where id = o.subscription_id;
    update public.enrollments
    set status = 'paused'
    where subscription_id = o.subscription_id and status = 'active';
  end if;
end;
$$;

revoke all on function public.course_requirements(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.issue_certificate(uuid, text, text, uuid) from public, anon, authenticated;
revoke all on function public.fulfil_certificate_order(text, bigint, numeric, timestamptz, text) from public, anon, authenticated;
grant execute on function public.course_requirements(uuid, text, uuid) to service_role;
grant execute on function public.issue_certificate(uuid, text, text, uuid) to service_role;
grant execute on function public.fulfil_certificate_order(text, bigint, numeric, timestamptz, text) to service_role;
