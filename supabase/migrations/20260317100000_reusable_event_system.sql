CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Untitled event',
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz NOT NULL DEFAULT (now() + interval '2 hours'),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS venue_name text,
  ADD COLUMN IF NOT EXISTS venue_address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS hero_image_url text,
  ADD COLUMN IF NOT EXISTS flyer_image_url text,
  ADD COLUMN IF NOT EXISTS cta_label text NOT NULL DEFAULT 'Count me in!',
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS matchmaking_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_matches_per_user integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS matching_mode text NOT NULL DEFAULT 'event_default',
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS enrollment_opens_at timestamptz,
  ADD COLUMN IF NOT EXISTS enrollment_closes_at timestamptz,
  ADD COLUMN IF NOT EXISTS match_window_opens_at timestamptz,
  ADD COLUMN IF NOT EXISTS match_window_closes_at timestamptz,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

INSERT INTO public.events (
  name,
  slug,
  start_date,
  end_date,
  active,
  is_public,
  is_featured,
  short_description
)
SELECT
  initcap(replace(legacy.event_name, '_', ' ')),
  legacy.event_name,
  now(),
  now() + interval '2 hours',
  false,
  false,
  false,
  'Imported legacy event'
FROM (
  SELECT DISTINCT event_name
  FROM public.event_enrollments
  WHERE event_name IS NOT NULL
    AND btrim(event_name) <> ''
) AS legacy
WHERE NOT EXISTS (
  SELECT 1
  FROM public.events e
  WHERE e.slug = legacy.event_name
);

UPDATE public.events
SET slug = trim(both '-' FROM regexp_replace(lower(coalesce(name, 'event')), '[^a-z0-9]+', '-', 'g')) || '-' || substr(id::text, 1, 8)
WHERE slug IS NULL OR btrim(slug) = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_slug_unique ON public.events(slug);
CREATE INDEX IF NOT EXISTS idx_events_active_public_start ON public.events(active, is_public, start_date);

ALTER TABLE public.event_enrollments
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE CASCADE;

UPDATE public.event_enrollments ee
SET event_id = e.id
FROM public.events e
WHERE ee.event_id IS NULL
  AND ee.event_name IS NOT NULL
  AND (e.slug = ee.event_name OR e.name = ee.event_name);

CREATE INDEX IF NOT EXISTS idx_event_enrollments_event_id ON public.event_enrollments(event_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_enrollments_user_event_id_unique
  ON public.event_enrollments(user_id, event_id)
  WHERE event_id IS NOT NULL;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'events'
      AND policyname = 'Public can read visible events'
  ) THEN
    CREATE POLICY "Public can read visible events"
      ON public.events
      FOR SELECT
      USING (
        is_public = true
        OR EXISTS (
          SELECT 1
          FROM public.event_enrollments ee
          WHERE ee.event_id = events.id
            AND ee.user_id = auth.uid()
        )
        OR public.has_role(auth.uid(), 'admin')
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'events'
      AND policyname = 'Admins can manage events'
  ) THEN
    CREATE POLICY "Admins can manage events"
      ON public.events
      FOR ALL
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE SET NULL;

ALTER TABLE public.match_history
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_matches_event_id ON public.matches(event_id);
CREATE INDEX IF NOT EXISTS idx_match_history_event_id ON public.match_history(event_id);
