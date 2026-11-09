-- Phase 7: email notifications and replies on learner notes.
-- See docs/lms-roadmap.md and lib/notifications.ts.

-- Class reminders, announcements and grades. Receipts and account emails
-- aren't affected by this.
alter table public.profiles add column if not exists email_notifications boolean not null default true;

-- ─── Outbox ───
-- Emails are queued here and sent by /api/cron/notifications, so a slow or
-- failed send never holds up the request that caused it. dedupe_key means the
-- same email can't be queued twice however often the job runs.

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique,
  to_email text not null,
  to_name text,
  subject text not null,
  paragraphs jsonb not null,
  -- a class reminder is pointless after the class has started
  not_after timestamptz,
  attempts integer not null default 0,
  claimed_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create index if not exists email_outbox_unsent_idx on public.email_outbox (created_at) where sent_at is null;

alter table public.email_outbox enable row level security;

-- ─── Scheduler token ───
-- Vercel's Hobby plan only allows daily jobs, so Supabase's scheduler calls
-- the notifications endpoint more often. It sends this token, which is
-- generated here so it never has to be copied between systems.

create table if not exists public.internal_settings (
  key text primary key,
  value text not null
);

alter table public.internal_settings enable row level security;

insert into public.internal_settings (key, value)
values ('cron_token', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
on conflict (key) do nothing;

-- ─── Replies on learner notes ───

create table if not exists public.learner_note_replies (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.learner_notes (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null check (length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists learner_note_replies_note_idx on public.learner_note_replies (note_id, created_at);

-- Server code only, after checking the reader owns the note or is an admin.
alter table public.learner_note_replies enable row level security;
