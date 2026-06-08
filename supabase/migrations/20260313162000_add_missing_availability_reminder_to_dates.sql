ALTER TABLE public.dates
ADD COLUMN IF NOT EXISTS reminder_missing_availability_sent boolean;

UPDATE public.dates
SET reminder_missing_availability_sent = false
WHERE reminder_missing_availability_sent IS NULL;

ALTER TABLE public.dates
ALTER COLUMN reminder_missing_availability_sent SET DEFAULT false,
ALTER COLUMN reminder_missing_availability_sent SET NOT NULL;
