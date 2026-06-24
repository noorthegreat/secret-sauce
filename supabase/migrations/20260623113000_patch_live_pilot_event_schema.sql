-- Live pilot patch for the residential event flow.
-- The Chorus pilot database received the lightweight building foundation,
-- but not the richer event schema that the Fifth Circle web app now expects.
-- This patch is intentionally additive and safe to run against partially
-- provisioned environments.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS start_date timestamptz,
  ADD COLUMN IF NOT EXISTS end_date timestamptz,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS venue_name text,
  ADD COLUMN IF NOT EXISTS venue_address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS hero_image_url text,
  ADD COLUMN IF NOT EXISTS flyer_image_url text,
  ADD COLUMN IF NOT EXISTS cta_label text NOT NULL DEFAULT 'RSVP',
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS matchmaking_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_matches_per_user integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS matching_mode text NOT NULL DEFAULT 'friendship',
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Los_Angeles',
  ADD COLUMN IF NOT EXISTS enrollment_opens_at timestamptz,
  ADD COLUMN IF NOT EXISTS enrollment_closes_at timestamptz,
  ADD COLUMN IF NOT EXISTS match_window_opens_at timestamptz,
  ADD COLUMN IF NOT EXISTS match_window_closes_at timestamptz,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.events
SET
  start_date = COALESCE(start_date, created_at),
  end_date = COALESCE(end_date, created_at + interval '2 hours'),
  slug = COALESCE(NULLIF(btrim(slug), ''), trim(both '-' FROM regexp_replace(lower(coalesce(name, 'event')), '[^a-z0-9]+', '-', 'g')) || '-' || substr(id::text, 1, 8))
WHERE start_date IS NULL
   OR end_date IS NULL
   OR slug IS NULL
   OR btrim(slug) = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_slug_unique
  ON public.events (slug)
  WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_building_active_start_date
  ON public.events (building_id, active, start_date);

CREATE TABLE IF NOT EXISTS public.event_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_name)
);

CREATE INDEX IF NOT EXISTS idx_event_enrollments_event_id
  ON public.event_enrollments (event_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_enrollments_user_event_id_unique
  ON public.event_enrollments (user_id, event_id)
  WHERE event_id IS NOT NULL;

ALTER TABLE public.event_enrollments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.user_meets_event_survey_requirement(p_user uuid, p_event uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.profiles p
      ON p.id = p_user
    WHERE e.id = p_event
      AND CASE
            WHEN e.matching_mode = 'friendship'
              THEN COALESCE(p.completed_friendship_questionnaire, false)
            ELSE COALESCE(p.completed_questionnaire, false)
          END
  );
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'event_enrollments'
      AND policyname = 'Users can view all event enrollments'
  ) THEN
    CREATE POLICY "Users can view all event enrollments"
      ON public.event_enrollments
      FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'event_enrollments'
      AND policyname = 'Users can enroll themselves'
  ) THEN
    CREATE POLICY "Users can enroll themselves"
      ON public.event_enrollments
      FOR INSERT
      WITH CHECK (
        auth.uid() = user_id
        AND (
          event_id IS NULL
          OR public.user_meets_event_survey_requirement(auth.uid(), event_enrollments.event_id)
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'event_enrollments'
      AND policyname = 'Users can unenroll themselves'
  ) THEN
    CREATE POLICY "Users can unenroll themselves"
      ON public.event_enrollments
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

GRANT SELECT, INSERT, DELETE ON TABLE public.event_enrollments TO authenticated;
GRANT ALL ON TABLE public.event_enrollments TO service_role;
