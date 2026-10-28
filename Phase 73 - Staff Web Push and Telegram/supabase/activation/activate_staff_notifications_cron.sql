-- ONE-TIME ACTIVATION (not yet applied): first set the SAME worker secret in:
-- (1) Supabase Edge Functions Secrets: STAFF_NOTIFICATION_WORKER_SECRET
-- (2) Supabase Vault secret named chef_staff_notify_worker_secret
-- Save worker secret securely using Supabase Vault interface; never paste it into GitHub or Figma.
-- Telegram Bot token + webhook secret and VAPID keys are also required for their channels.
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
DO $verify$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name='chef_staff_notify_worker_secret' AND decrypted_secret IS NOT NULL) THEN
    RAISE EXCEPTION 'Create chef_staff_notify_worker_secret in Supabase Vault before scheduling';
  END IF;
END $verify$;
SELECT cron.schedule(
  'chef-mujahed-staff-notifications',
  '* * * * *',
  $job$
    SELECT net.http_post(
      url := 'https://hqvxhhhwzhefydvwlpje.supabase.co/functions/v1/staff-notifications-dispatch',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'x-staff-dispatch-secret',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='chef_staff_notify_worker_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 10000
    );
  $job$
);
