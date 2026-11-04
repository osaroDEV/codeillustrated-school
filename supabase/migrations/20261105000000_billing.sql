-- Phase 3: monthly billing for cohort seats through Flutterwave.
-- See docs/lms-roadmap.md and lib/billing.ts.
--
-- A learner buys a group or 1-on-1 offering as a monthly card subscription
-- (a Flutterwave payment plan). Checkout creates a pending order; the first
-- successful charge creates the subscription and the enrolment; every renewal
-- charge is stored as another paid order and extends current_period_end by a
-- month. Admins still place learners in cohorts.
--
-- Every table here is written only by service-role code (webhook, checkout,
-- cron, admin routes) through the functions below.

-- ─── Flutterwave payment plans ───
-- A plan's amount can't change, so a new price gets a new plan; existing
-- subscribers stay on the plan (and price) they signed up to.

create table if not exists public.payment_plans (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.offerings (id) on delete restrict,
  currency text not null check (currency in ('NGN', 'USD')),
  amount numeric(12, 2) not null check (amount > 0),
  interval text not null default 'monthly' check (interval in ('monthly')),
  flw_plan_id bigint not null unique,
  created_at timestamptz not null default now(),
  unique (offering_id, currency, amount, interval)
);

-- ─── Subscriptions ───

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  course_id text not null references public.courses (id) on update cascade on delete restrict,
  offering_id uuid not null references public.offerings (id) on delete restrict,
  plan_id uuid not null references public.payment_plans (id) on delete restrict,
  currency text not null check (currency in ('NGN', 'USD')),
  amount numeric(12, 2) not null check (amount > 0),
  -- lower-case; renewals are matched to the subscription by this
  customer_email text not null,
  -- tx_ref of the checkout that started it
  first_tx_ref text not null unique,
  flw_subscription_id bigint,
  status text not null default 'active'
    check (status in ('active', 'past_due', 'cancelled', 'expired')),
  -- paid up until; access lasts until this plus a grace period
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create index if not exists subscriptions_email_idx on public.subscriptions (customer_email);

-- At most one live subscription per learner per course.
create unique index if not exists subscriptions_one_live_per_course
  on public.subscriptions (user_id, course_id)
  where status in ('active', 'past_due');

-- ─── Orders: checkouts and every charge ───

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  customer_email text not null,
  -- 'one_off' is reserved for certificates (Phase 6)
  kind text not null check (kind in ('subscription', 'one_off')),
  course_id text not null references public.courses (id) on update cascade on delete restrict,
  offering_id uuid references public.offerings (id) on delete restrict,
  plan_id uuid references public.payment_plans (id) on delete restrict,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  is_renewal boolean not null default false,
  currency text not null check (currency in ('NGN', 'USD')),
  amount numeric(12, 2) not null check (amount > 0),
  amount_paid numeric(12, 2),
  tx_ref text not null unique,
  flw_transaction_id bigint unique,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
  failure_reason text,
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_subscription_id_idx on public.orders (subscription_id);
create index if not exists orders_pending_idx on public.orders (created_at) where status = 'pending';

-- ─── Webhook audit log ───

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  flw_transaction_id bigint,
  tx_ref text,
  -- what the handler did: e.g. enrolled, renewed, duplicate, unmatched, failed
  outcome text not null,
  detail text,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists payment_events_created_idx on public.payment_events (created_at desc);
create index if not exists payment_events_unmatched_idx on public.payment_events (created_at desc)
  where outcome = 'unmatched';

-- ─── Enrolments know how they were paid for ───

alter table public.enrollments
  add column if not exists source text not null default 'manual'
    check (source in ('manual', 'code', 'purchase', 'subscription')),
  add column if not exists subscription_id uuid references public.subscriptions (id) on delete set null;

-- Enrolments created by redeeming a scholarship code.
update public.enrollments e
set source = 'code'
where e.source = 'manual'
  and exists (
    select 1 from public.invite_codes i
    where i.used_by = e.user_id and i.course_id = e.course_id
  );

create index if not exists enrollments_subscription_id_idx on public.enrollments (subscription_id);

-- ─── RLS: learners read their own billing; nobody writes from the client ───

alter table public.payment_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.orders enable row level security;
alter table public.payment_events enable row level security;

drop policy if exists "payment_plans: admin read" on public.payment_plans;
create policy "payment_plans: admin read" on public.payment_plans
  for select using (public.is_admin());

drop policy if exists "subscriptions: read own or admin" on public.subscriptions;
create policy "subscriptions: read own or admin" on public.subscriptions
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "orders: read own or admin" on public.orders;
create policy "orders: read own or admin" on public.orders
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "payment_events: admin read" on public.payment_events;
create policy "payment_events: admin read" on public.payment_events
  for select using (public.is_admin());

-- ─── Billing functions (service role only) ───
-- Grace period after current_period_end before a lapsed seat is paused.
-- Keep in sync with SUBSCRIPTION_GRACE_DAYS in lib/billing.ts.

create or replace function public.subscription_grace()
returns interval
language sql
immutable
as $$ select interval '3 days' $$;

-- First successful charge of a checkout. Idempotent: a repeated webhook or a
-- redirect racing the webhook returns 'duplicate' and changes nothing.
--
-- Returns { outcome, subscription_id, enrollment_id } where outcome is
--   enrolled          new enrolment
--   reactivated       an earlier, lapsed subscription enrolment resumed
--   already_enrolled  they already had access (another live subscription, or
--                     a manual, code or purchase enrolment). The charge is
--                     recorded and the new subscription is stored as
--                     cancelled; the caller cancels it at Flutterwave and an
--                     admin refunds the charge.
--   duplicate         this order was already fulfilled
--   refunded          the order was refunded; nothing changed
create or replace function public.fulfil_subscription_order(
  p_tx_ref text,
  p_flw_transaction_id bigint,
  p_amount_paid numeric,
  p_paid_at timestamptz
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  o public.orders%rowtype;
  s_id uuid;
  e_id uuid;
  e_source text;
  has_access boolean;
  outcome text;
begin
  select * into o from public.orders where tx_ref = p_tx_ref for update;
  if not found then
    raise exception 'Unknown order %', p_tx_ref using errcode = 'CI004';
  end if;
  if o.kind <> 'subscription' or o.plan_id is null then
    raise exception 'Order % is not a subscription checkout', p_tx_ref using errcode = 'CI004';
  end if;
  if o.status = 'paid' then
    return jsonb_build_object('outcome', 'duplicate', 'subscription_id', o.subscription_id);
  end if;
  if o.status = 'refunded' then
    return jsonb_build_object('outcome', 'refunded');
  end if;

  select id, source into e_id, e_source
  from public.enrollments
  where user_id = o.user_id and course_id = o.course_id
  for update;

  has_access := e_id is not null and (
    e_source <> 'subscription'
    or exists (
      select 1 from public.subscriptions
      where user_id = o.user_id and course_id = o.course_id and status in ('active', 'past_due')
    )
  );

  insert into public.subscriptions (
    user_id, course_id, offering_id, plan_id, currency, amount, customer_email,
    first_tx_ref, status, current_period_end, cancel_at_period_end, cancelled_at
  ) values (
    o.user_id, o.course_id, o.offering_id, o.plan_id, o.currency, o.amount, lower(o.customer_email),
    o.tx_ref,
    case when has_access then 'cancelled' else 'active' end,
    p_paid_at + interval '1 month',
    has_access,
    case when has_access then now() end
  )
  returning id into s_id;

  if has_access then
    outcome := 'already_enrolled';
  elsif e_id is null then
    insert into public.enrollments (user_id, course_id, source, subscription_id, status)
    values (o.user_id, o.course_id, 'subscription', s_id, 'active')
    returning id into e_id;
    outcome := 'enrolled';
  else
    update public.enrollments
    set subscription_id = s_id, status = 'active'
    where id = e_id;
    outcome := 'reactivated';
  end if;

  update public.orders
  set status = 'paid',
      subscription_id = s_id,
      flw_transaction_id = p_flw_transaction_id,
      amount_paid = p_amount_paid,
      paid_at = p_paid_at,
      failure_reason = null,
      updated_at = now()
  where id = o.id;

  return jsonb_build_object('outcome', outcome, 'subscription_id', s_id, 'enrollment_id', e_id);
end;
$$;

-- A renewal charge on an existing subscription. Idempotent on the Flutterwave
-- transaction id. Extends the paid period by a month from whichever is later,
-- the current period end or the payment, so a late payment doesn't buy time
-- retroactively. Returns { outcome: renewed | duplicate, order_id }.
create or replace function public.record_renewal(
  p_subscription_id uuid,
  p_tx_ref text,
  p_flw_transaction_id bigint,
  p_amount_paid numeric,
  p_paid_at timestamptz
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  s public.subscriptions%rowtype;
  existing uuid;
  order_id uuid;
begin
  select * into s from public.subscriptions where id = p_subscription_id for update;
  if not found then
    raise exception 'Unknown subscription %', p_subscription_id using errcode = 'CI004';
  end if;

  select id into existing from public.orders where flw_transaction_id = p_flw_transaction_id;
  if found then
    return jsonb_build_object('outcome', 'duplicate', 'order_id', existing);
  end if;

  insert into public.orders (
    user_id, customer_email, kind, course_id, offering_id, plan_id, subscription_id,
    is_renewal, currency, amount, amount_paid, tx_ref, flw_transaction_id, status, paid_at
  ) values (
    s.user_id, s.customer_email, 'subscription', s.course_id, s.offering_id, s.plan_id, s.id,
    true, s.currency, s.amount, p_amount_paid,
    -- Flutterwave's tx_ref for the renewal isn't guaranteed unique to us
    coalesce(p_tx_ref, 'renewal') || ':' || p_flw_transaction_id,
    p_flw_transaction_id, 'paid', p_paid_at
  )
  returning id into order_id;

  update public.subscriptions
  set current_period_end = greatest(current_period_end, p_paid_at) + interval '1 month',
      status = case when status = 'cancelled' then 'cancelled' else 'active' end,
      updated_at = now()
  where id = s.id;

  update public.enrollments
  set status = 'active'
  where subscription_id = s.id and status = 'paused';

  return jsonb_build_object('outcome', 'renewed', 'order_id', order_id);
end;
$$;

-- Daily: subscriptions whose paid period (plus grace) is over become expired,
-- and their enrolments are paused. Enrolments are kept, so progress, notes
-- and cohort placement survive a lapse. Returns the number expired.
create or replace function public.expire_subscriptions(p_now timestamptz default now())
returns integer
language plpgsql
set search_path = public
as $$
declare
  n integer;
begin
  with expired as (
    update public.subscriptions
    set status = 'expired', updated_at = now()
    where status in ('active', 'past_due', 'cancelled')
      and current_period_end + public.subscription_grace() < p_now
    returning id
  ),
  paused as (
    update public.enrollments e
    set status = 'paused'
    from expired x
    where e.subscription_id = x.id and e.status = 'active'
    returning e.id
  )
  select count(*) into n from expired;
  return n;
end;
$$;

-- Admin "refund": records that a charge was refunded in the Flutterwave
-- dashboard. It does not move money. Refunding a subscription's first charge
-- also cancels it and pauses the seat.
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

revoke all on function public.fulfil_subscription_order(text, bigint, numeric, timestamptz) from public, anon, authenticated;
revoke all on function public.record_renewal(uuid, text, bigint, numeric, timestamptz) from public, anon, authenticated;
revoke all on function public.expire_subscriptions(timestamptz) from public, anon, authenticated;
revoke all on function public.mark_order_refunded(uuid) from public, anon, authenticated;
grant execute on function public.fulfil_subscription_order(text, bigint, numeric, timestamptz) to service_role;
grant execute on function public.record_renewal(uuid, text, bigint, numeric, timestamptz) to service_role;
grant execute on function public.expire_subscriptions(timestamptz) to service_role;
grant execute on function public.mark_order_refunded(uuid) to service_role;
