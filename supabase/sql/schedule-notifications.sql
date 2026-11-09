-- Production only: run once after the Phase 7 migration and deploy. Staging has
-- no public address for the scheduler to call.
-- Calls the notifications endpoint every 15 minutes, for the 1-hour reminders.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.unschedule('academy-notifications')
where exists (select 1 from cron.job where jobname = 'academy-notifications');

select cron.schedule(
  'academy-notifications',
  '*/15 * * * *',
  $job$
  select net.http_get(
    url := 'https://codeillustrated.com/academy/api/cron/notifications',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select value from public.internal_settings where key = 'cron_token')
    ),
    timeout_milliseconds := 60000
  );
  $job$
);
