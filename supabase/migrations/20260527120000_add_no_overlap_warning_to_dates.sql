-- Track when we first warned both users that their availability has no shared
-- overlap. Set by the janitor (check-mutual-likes) when a stuck pending date
-- with both availabilities submitted yields no venue. Cleared by
-- refresh-venue-options when a venue is successfully found again (e.g. after
-- a user updates their availability).
--
-- Used to enforce a one-week grace period between the first no-overlap
-- warning email and auto-cancellation.

ALTER TABLE public.dates
  ADD COLUMN IF NOT EXISTS no_overlap_warning_sent_at timestamptz NULL;

COMMENT ON COLUMN public.dates.no_overlap_warning_sent_at IS
  'Set when janitor first emails both users that their availability has no shared overlap. Triggers cancellation if still set 7+ days later. Cleared by refresh-venue-options on successful venue selection.';
