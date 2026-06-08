-- Run this script to add the date_penalty_count column to profiles
-- This tracks how many times a user failed to add availability to a date

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS date_penalty_count integer NOT NULL DEFAULT 0;
