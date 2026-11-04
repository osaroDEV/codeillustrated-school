-- Editable course web addresses.
--
-- courses.id stays the course's permanent internal ID: enrolments, cohorts,
-- offerings, orders and everything else keep pointing at it. The public
-- address /courses/<slug> now comes from courses.slug, which admins can
-- change. Every address a course has had is kept in course_slug_redirects so
-- old links (WhatsApp, search results, bookmarks) redirect to the new one.

alter table public.courses add column if not exists slug text;
update public.courses set slug = id where slug is null;
alter table public.courses alter column slug set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'courses_slug_format') then
    alter table public.courses add constraint courses_slug_format
      check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 80);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'courses_slug_key') then
    alter table public.courses add constraint courses_slug_key unique (slug);
  end if;
end $$;

create table if not exists public.course_slug_redirects (
  slug text primary key,
  course_id text not null references public.courses (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists course_slug_redirects_course_idx on public.course_slug_redirects (course_id);

alter table public.course_slug_redirects enable row level security;

-- Readable for courses the reader can see (published ones, or all for
-- admins, through the courses policy). Only the trigger below writes.
drop policy if exists "course_slug_redirects: read with course" on public.course_slug_redirects;
create policy "course_slug_redirects: read with course" on public.course_slug_redirects
  for select using (exists (select 1 from public.courses c where c.id = course_id));

-- Keep the redirects in step with slug changes:
--   * the address a course leaves becomes a redirect to it;
--   * an address that is live again (a course renamed back, or a new course
--     taking an old address) stops redirecting, so the live course wins.
create or replace function public.track_course_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.slug is distinct from old.slug then
    insert into public.course_slug_redirects (slug, course_id)
    values (old.slug, new.id)
    on conflict (slug) do update set course_id = excluded.course_id, created_at = now();
  end if;
  delete from public.course_slug_redirects where slug = new.slug;
  return null;
end;
$$;

revoke all on function public.track_course_slug() from public, anon, authenticated;

drop trigger if exists courses_track_slug on public.courses;
create trigger courses_track_slug
  after insert or update of slug on public.courses
  for each row execute function public.track_course_slug();
