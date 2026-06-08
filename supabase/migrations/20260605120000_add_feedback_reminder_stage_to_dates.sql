-- Post-date feedback reminder cadence tracking.
--
-- Feedback is per-user (each dater submits independently), so we track the
-- reminder progress separately for each side of the date. The send-feedback-reminders
-- cron advances these as it emails:
--   0 = nothing sent yet
--   1 = initial "how did it go?" request sent (right after the date's end time)
--   2 = +1 day reminder sent
--   3 = +1 week reminder sent (final)
-- The cadence stops for a user as soon as they submit feedback
-- (followup_preference set AND >=1 row in date_feedback_answers).

ALTER TABLE public.dates
  ADD COLUMN IF NOT EXISTS user1_feedback_reminder_stage smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS user2_feedback_reminder_stage smallint NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.dates.user1_feedback_reminder_stage IS
  'Post-date feedback email progress for user1. 0=none,1=initial request,2=+1day reminder,3=+1week reminder. Stops once user1 submits feedback.';
COMMENT ON COLUMN public.dates.user2_feedback_reminder_stage IS
  'Post-date feedback email progress for user2. 0=none,1=initial request,2=+1day reminder,3=+1week reminder. Stops once user2 submits feedback.';

-- Don't retroactively email everyone whose date already completed before this
-- feature shipped: mark pre-existing completed dates as fully reminded. Dates
-- still "confirmed" (incl. those past their end time) keep stage 0 so the cron
-- auto-completes them and sends the first feedback request normally.
--
-- Guarded by created_at < the migration timestamp so this is idempotent: if the
-- migration is ever re-applied it only touches rows that pre-date the feature
-- (already at stage 3), never resetting an in-progress reminder cadence.
UPDATE public.dates
  SET user1_feedback_reminder_stage = 3,
      user2_feedback_reminder_stage = 3
  WHERE status = 'completed'
    AND created_at < '2026-06-05 12:00:00+00';
