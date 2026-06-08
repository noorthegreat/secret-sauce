-- Track reschedule limits per user (not per date total).
-- Fixes: A reschedule by each partner should not exhaust the other partner's limit.

ALTER TABLE public.dates
  ADD COLUMN IF NOT EXISTS user1_reschedule_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS user2_reschedule_count integer NOT NULL DEFAULT 0;

