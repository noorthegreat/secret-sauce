-- Scheduling behaviour flags for venues (issue #13)
-- open_public_holidays: venue explicitly stays bookable on Swiss federal holidays we model.
-- restrict_to_weekdays: campus / institution venues not usable Sat–Sun for typical student pairs.

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS open_public_holidays boolean NOT NULL DEFAULT false;

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS restrict_to_weekdays boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.venues.open_public_holidays IS 'When true, scheduling overlap may include Swiss federal holidays for this venue.';
COMMENT ON COLUMN public.venues.restrict_to_weekdays IS 'When true, exclude Sat/Sun when computing overlaps for this venue (e.g. ETH campus buildings).';
