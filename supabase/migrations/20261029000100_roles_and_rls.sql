-- Per-user roles replace the shared ADMIN_SECRET password.
--
-- To promote the first admin after running this migration (SQL editor):
--   update public.profiles set role = 'admin' where email = 'you@example.com';

alter table public.profiles
  add column if not exists role text not null default 'student',
  add column if not exists email text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check check (role in ('student', 'admin'));
  end if;
end $$;

-- Backfill emails for existing learners.
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

-- Every new auth user gets a profile row, whichever signup path created them.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- security definer so RLS policies can call it without recursing into the
-- profiles policies themselves.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Students can edit their own profile but never their own role. The service
-- role (auth.uid() is null) and admins are allowed through.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only admins can change roles';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ─── RLS on the existing tables ───
-- The service-role client used by API routes bypasses RLS; these policies
-- govern the anon/user-scoped clients (browser and server components).

-- Legacy policies from the hand-built schema. Despite their names they were
-- granted to every role ("to public using (true)"), so anyone holding the
-- public anon key could read and modify every row. The service role bypasses
-- RLS and never needed them. The "view own" ones are superseded below.
drop policy if exists "Service role has full access to enrollments" on public.enrollments;
drop policy if exists "Service role has full access to invite_codes" on public.invite_codes;
drop policy if exists "Service role has full access to profiles" on public.profiles;
drop policy if exists "Users can view own enrollments" on public.enrollments;
drop policy if exists "Users can view own profile" on public.profiles;
-- Interim policies from the 2026-10-29 production hotfix, superseded below.
drop policy if exists "profiles: update own" on public.profiles;
drop policy if exists "learner_notes: read own" on public.learner_notes;

alter table public.profiles enable row level security;
alter table public.invite_codes enable row level security;
alter table public.enrollments enable row level security;
alter table public.announcements enable row level security;
alter table public.learner_notes enable row level security;

drop policy if exists "profiles: read own or admin" on public.profiles;
create policy "profiles: read own or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles: update own or admin" on public.profiles;
create policy "profiles: update own or admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles
  for insert with check (id = auth.uid());

-- Invite codes are only ever touched through service-role API routes.
drop policy if exists "invite_codes: admin all" on public.invite_codes;
create policy "invite_codes: admin all" on public.invite_codes
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "enrollments: read own or admin" on public.enrollments;
create policy "enrollments: read own or admin" on public.enrollments
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "enrollments: admin write" on public.enrollments;
create policy "enrollments: admin write" on public.enrollments
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "announcements: read authenticated" on public.announcements;
create policy "announcements: read authenticated" on public.announcements
  for select using (auth.uid() is not null);

drop policy if exists "announcements: admin write" on public.announcements;
create policy "announcements: admin write" on public.announcements
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "learner_notes: read own or admin" on public.learner_notes;
create policy "learner_notes: read own or admin" on public.learner_notes
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "learner_notes: admin write" on public.learner_notes;
create policy "learner_notes: admin write" on public.learner_notes
  for all using (public.is_admin()) with check (public.is_admin());
