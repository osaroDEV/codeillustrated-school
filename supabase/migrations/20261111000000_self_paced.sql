-- Phase 5: per-course self-paced subscriptions, billed monthly or yearly.
-- See docs/lms-roadmap.md and lib/billing.ts.
--
-- A self-paced subscriber is an enrolment with source 'subscription' whose
-- subscription is on a self_paced offering, and which has no cohort. That
-- gives lessons, resources and class recordings, but no live classes.

-- ─── Yearly prices ───
-- Optional, and only for self_paced offerings: without both, only monthly is sold.

alter table public.offerings
  add column if not exists yearly_price_usd numeric(10, 2) check (yearly_price_usd is null or yearly_price_usd > 0),
  add column if not exists yearly_price_ngn numeric(12, 2) check (yearly_price_ngn is null or yearly_price_ngn > 0);

alter table public.payment_plans drop constraint if exists payment_plans_interval_check;
alter table public.payment_plans
  add constraint payment_plans_interval_check check ("interval" in ('monthly', 'yearly'));

-- The period_end a yearly renewal reminder was last sent for, so the daily job
-- sends one per renewal even if it runs late or twice.
alter table public.subscriptions add column if not exists renewal_reminder_for timestamptz;

create or replace function public.plan_period(p_plan_id uuid)
returns interval
language sql
stable
set search_path = public
as $$
  select case when p."interval" = 'yearly' then interval '1 year' else interval '1 month' end
  from public.payment_plans p
  where p.id = p_plan_id;
$$;

-- As in the billing migration, but each period follows the plan's interval,
-- and a self-paced purchase takes the learner out of any earlier cohort so
-- they don't keep a live-class seat.
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
  v_kind text;
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

  select kind into v_kind from public.offerings where id = o.offering_id;

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
    p_paid_at + public.plan_period(o.plan_id),
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
    set subscription_id = s_id,
        status = 'active',
        cohort_id = case when v_kind = 'self_paced' then null else cohort_id end
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
    coalesce(p_tx_ref, 'renewal') || ':' || p_flw_transaction_id,
    p_flw_transaction_id, 'paid', p_paid_at
  )
  returning id into order_id;

  update public.subscriptions
  set current_period_end = greatest(current_period_end, p_paid_at) + public.plan_period(s.plan_id),
      status = case when status = 'cancelled' then 'cancelled' else 'active' end,
      updated_at = now()
  where id = s.id;

  update public.enrollments
  set status = 'active'
  where subscription_id = s.id and status = 'paused';

  return jsonb_build_object('outcome', 'renewed', 'order_id', order_id);
end;
$$;

revoke all on function public.plan_period(uuid) from public, anon, authenticated;
grant execute on function public.plan_period(uuid) to service_role;
