-- Chef Mujahed Phase 73 — deployment source for secure Cron / Vault dispatcher.
-- ALREADY APPLIED to production on 28 Oct 2026; do not re-run in the current project.
-- No secrets are embedded in SQL, code, GitHub, or Figma.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $secure_secret$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name='chef_staff_notify_worker_secret') THEN
    PERFORM vault.create_secret(
      encode(extensions.gen_random_bytes(32),'hex'),
      'chef_staff_notify_worker_secret',
      'Chef Mujahed staff notification dispatcher'
    );
  END IF;
END $secure_secret$;

CREATE OR REPLACE FUNCTION public.staff_notification_verify_dispatch_secret(p_candidate text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions
AS $verify$
DECLARE v_expected text;
BEGIN
  IF p_candidate IS NULL OR p_candidate !~ '^[a-f0-9]{64}$' THEN RETURN false; END IF;
  SELECT decrypted_secret INTO v_expected
  FROM vault.decrypted_secrets
  WHERE name='chef_staff_notify_worker_secret'
  LIMIT 1;
  RETURN v_expected IS NOT NULL AND
    extensions.digest(convert_to(p_candidate,'UTF8'),'sha256') =
    extensions.digest(convert_to(v_expected,'UTF8'),'sha256');
END $verify$;

REVOKE ALL ON FUNCTION public.staff_notification_verify_dispatch_secret(text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.staff_notification_verify_dispatch_secret(text)
  TO service_role;

SELECT cron.schedule(
  'chef-mujahed-staff-notifications',
  '* * * * *',
  $run$
    SELECT net.http_post(
      url := 'https://hqvxhhhwzhefydvwlpje.supabase.co/functions/v1/staff-notifications-dispatch',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'x-staff-dispatch-secret',
        (SELECT decrypted_secret FROM vault.decrypted_secrets
         WHERE name='chef_staff_notify_worker_secret' LIMIT 1)
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 10000
    );
  $run$
);
