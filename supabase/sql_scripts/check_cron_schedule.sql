-- Verify what's actually scheduled in pg_cron.
--
-- Run in the Supabase SQL editor. As of 2026-05-27 the active jobs are:
--
--   jobid=3 "date janitor"        '0 0 * * *'      → check-mutual-likes daily 00:00 UTC
--   jobid=5 "daily cron job"      '0 22,23 * * 0'  → daily-cron Sun 22:00+23:00 UTC
--   jobid=8 "send-date-reminders" '*/30 * * * *'   → send-date-reminders every 30min
--
-- If you see different schedules or missing jobs, something has changed since
-- this was written. To inspect recent runs of a specific job:
--
--   SELECT status, return_message, start_time, end_time
--   FROM cron.job_run_details
--   WHERE jobid = 3
--   ORDER BY start_time DESC
--   LIMIT 10;
--
-- Note: pg_cron's "succeeded" status only confirms the net.http_post returned a
-- request_id — it does NOT reflect whether the edge function itself succeeded.
-- Check the function's logs for that.

SELECT
    jobid,
    jobname,
    schedule,
    active,
    command
FROM cron.job
ORDER BY jobid;
