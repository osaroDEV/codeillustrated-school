-- Courses move out of lib/courses.ts and into the database so admins can
-- author content. Slugs stay as the primary key so existing course_id text
-- columns (enrollments, invite_codes, announcements) keep working.

create table if not exists public.courses (
  id text primary key,
  title text not null,
  description text not null default '',
  full_description text not null default '',
  age text not null default '',
  level text not null default '',
  duration text not null default '',
  -- key into COURSE_ICONS in lib/course-icons.ts
  icon text not null default 'book',
  color text not null default 'text-primary-500',
  bg text not null default 'bg-primary-500/10',
  -- null means the completion certificate is free
  certificate_price_usd numeric(10, 2),
  certificate_price_ngn numeric(12, 2),
  position integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses (id) on delete cascade,
  title text not null,
  position integer not null,
  unique (course_id, position)
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules (id) on delete cascade,
  title text not null,
  position integer not null,
  type text not null default 'live' check (type in ('video', 'text', 'file', 'live')),
  content text,
  video_url text,
  file_path text,
  is_preview boolean not null default false,
  duration_min integer,
  is_published boolean not null default true,
  unique (module_id, position)
);

-- The ways a course can be bought. Prices live here rather than on courses so
-- a course can be sold as a group cohort, 1-on-1 and self-paced at once.
create table if not exists public.offerings (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses (id) on delete cascade,
  kind text not null check (kind in ('cohort_group', 'cohort_1on1', 'self_paced')),
  price_usd numeric(10, 2) not null check (price_usd >= 0),
  price_ngn numeric(12, 2) not null check (price_ngn >= 0),
  is_active boolean not null default true,
  unique (course_id, kind)
);

create index if not exists course_modules_course_id_idx on public.course_modules (course_id);
create index if not exists lessons_module_id_idx on public.lessons (module_id);

alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.offerings enable row level security;

-- The catalogue is public marketing content: anyone can read published
-- courses and their curriculum outline; only admins can write.
drop policy if exists "courses: public read published" on public.courses;
create policy "courses: public read published" on public.courses
  for select using (is_published or public.is_admin());

drop policy if exists "courses: admin write" on public.courses;
create policy "courses: admin write" on public.courses
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "course_modules: public read" on public.course_modules;
create policy "course_modules: public read" on public.course_modules
  for select using (
    exists (
      select 1 from public.courses c
      where c.id = course_id and (c.is_published or public.is_admin())
    )
  );

drop policy if exists "course_modules: admin write" on public.course_modules;
create policy "course_modules: admin write" on public.course_modules
  for all using (public.is_admin()) with check (public.is_admin());

-- Lesson rows are readable for the curriculum outline. Lesson *content*
-- access (enrollment checks) is enforced server-side in Phase 2.
drop policy if exists "lessons: public read" on public.lessons;
create policy "lessons: public read" on public.lessons
  for select using (
    exists (
      select 1
      from public.course_modules m
      join public.courses c on c.id = m.course_id
      where m.id = module_id and (c.is_published or public.is_admin())
    )
  );

drop policy if exists "lessons: admin write" on public.lessons;
create policy "lessons: admin write" on public.lessons
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "offerings: public read active" on public.offerings;
create policy "offerings: public read active" on public.offerings
  for select using (is_active or public.is_admin());

drop policy if exists "offerings: admin write" on public.offerings;
create policy "offerings: admin write" on public.offerings
  for all using (public.is_admin()) with check (public.is_admin());
