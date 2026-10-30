-- Baseline: the tables that were originally created by hand in the Supabase
-- dashboard. Every statement is guarded so this is a no-op against the
-- existing production database and a full bootstrap on a fresh one.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  course_id text not null,
  used_by uuid references public.profiles (id) on delete set null,
  used_at timestamptz,
  -- null means the code never expires
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id text not null,
  progress integer not null default 0,
  status text not null default 'active' check (status in ('active', 'completed', 'paused')),
  enrolled_at timestamptz not null default now(),
  next_session timestamptz,
  notes text
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  -- null means the announcement is global (all learners)
  course_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.learner_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The live profiles table was created without avatar_url, which the
-- dashboard reads and writes.
alter table public.profiles add column if not exists avatar_url text;

create index if not exists enrollments_user_id_idx on public.enrollments (user_id);
create index if not exists learner_notes_user_id_idx on public.learner_notes (user_id);
