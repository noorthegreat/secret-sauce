-- Add optional notes field to venues for admin documentation
-- e.g. seasonal hours, access restrictions, semester schedules
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS notes text;
