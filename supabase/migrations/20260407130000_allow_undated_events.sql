ALTER TABLE public.events
  ALTER COLUMN start_date DROP NOT NULL,
  ALTER COLUMN end_date DROP NOT NULL;

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_end_after_start;

ALTER TABLE public.events
  ADD CONSTRAINT events_end_after_start
  CHECK (
    start_date IS NULL
    OR end_date IS NULL
    OR end_date >= start_date
  );
