ALTER TABLE public.dates
ADD COLUMN IF NOT EXISTS match_type public.match_type;

UPDATE public.dates
SET match_type = 'relationship'
WHERE match_type IS NULL;

ALTER TABLE public.dates
ALTER COLUMN match_type SET DEFAULT 'relationship',
ALTER COLUMN match_type SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dates_match_type
ON public.dates(match_type);
