-- Add price_range column to venues table
-- price_range represents the approximate cost per person in CHF (0 = free, null = unknown)
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS price_range integer;

-- Update existing misclassified venues
-- Museums and gardens should be 'activity' type with price_range = 0
UPDATE public.venues SET type = 'activity', price_range = 0 WHERE LOWER(name) LIKE '%graphische sammlung%';
UPDATE public.venues SET type = 'activity', price_range = 0 WHERE LOWER(name) LIKE '%botanical garden%' OR LOWER(name) LIKE '%botanischer garten%';
UPDATE public.venues SET type = 'activity', price_range = 0 WHERE LOWER(name) LIKE '%anatomische%';

-- Kunsthaus is a museum/activity, not free
UPDATE public.venues SET type = 'activity', price_range = 23 WHERE LOWER(name) LIKE '%kunsthaus%';

-- Comment: Run this script manually in Supabase SQL editor
