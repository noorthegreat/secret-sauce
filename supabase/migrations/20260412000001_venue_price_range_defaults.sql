-- Set default price_range (CHF per person) for venues missing it, by type.
-- Only fills NULL values — existing prices are preserved.
-- Zurich context: coffee ~10, bar ~18, restaurant ~30, activity ~15

UPDATE public.venues SET price_range = 10  WHERE type = 'coffee'     AND price_range IS NULL;
UPDATE public.venues SET price_range = 18  WHERE type = 'bar'        AND price_range IS NULL;
UPDATE public.venues SET price_range = 30  WHERE type = 'restaurant' AND price_range IS NULL;
UPDATE public.venues SET price_range = 15  WHERE type = 'activity'   AND price_range IS NULL;
