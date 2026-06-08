-- Run this script to add the consecutive_inactive_weeks column to profiles
-- This is updated weekly by the check-user-inactivity cron job

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS consecutive_inactive_weeks integer NOT NULL DEFAULT 0;
