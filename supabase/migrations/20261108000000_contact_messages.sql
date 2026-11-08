-- Messages from the public contact forms, so one is never lost if its email
-- fails. Written only by /api/contact with the service role; only admins can
-- read them (Admin -> Messages).

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null,
  course text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'handled')),
  email_sent boolean not null default false,
  created_at timestamptz not null default now(),
  handled_at timestamptz
);

create index if not exists contact_messages_status_idx on public.contact_messages (status, created_at desc);
create index if not exists contact_messages_email_idx on public.contact_messages (email, created_at desc);

alter table public.contact_messages enable row level security;

drop policy if exists "contact_messages: admin read" on public.contact_messages;
create policy "contact_messages: admin read" on public.contact_messages
  for select using (public.is_admin());
