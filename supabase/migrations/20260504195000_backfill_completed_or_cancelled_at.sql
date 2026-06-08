-- Backfill completed_or_cancelled_at for terminal dates.
-- Some code paths historically updated status without setting completed_or_cancelled_at.
-- The dates table has no updated_at column, so created_at is the only timestamp we
-- have. It under-states the actual cancellation time but is better than NULL for
-- downstream queries that expect a non-null terminal timestamp.

UPDATE public.dates
SET completed_or_cancelled_at = created_at
WHERE status IN ('completed', 'cancelled', 'auto_cancelled')
  AND completed_or_cancelled_at IS NULL
  AND created_at IS NOT NULL;

