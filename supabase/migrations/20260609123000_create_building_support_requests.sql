CREATE TABLE IF NOT EXISTS public.building_support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  resident_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_resident_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  category text NOT NULL
    CHECK (category IN ('harassment', 'inappropriate_behavior', 'bug', 'safety_concern', 'support_request', 'other')),
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reviewed', 'closed')),
  subject text
    CHECK (subject IS NULL OR char_length(subject) BETWEEN 1 AND 120),
  message text NOT NULL
    CHECK (char_length(message) BETWEEN 12 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT building_support_requests_self_report_check
    CHECK (reported_resident_user_id IS NULL OR reported_resident_user_id <> resident_user_id)
);

CREATE INDEX IF NOT EXISTS idx_building_support_requests_building_status_created
  ON public.building_support_requests (building_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_building_support_requests_resident_created
  ON public.building_support_requests (resident_user_id, created_at DESC);

ALTER TABLE public.building_support_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'building_support_requests'
      AND policyname = 'Residents can submit building support requests'
  ) THEN
    CREATE POLICY "Residents can submit building support requests"
      ON public.building_support_requests
      FOR INSERT
      WITH CHECK (
        public.is_building_member(building_id)
        AND resident_user_id = auth.uid()
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'building_support_requests'
      AND policyname = 'Residents can read their support requests'
  ) THEN
    CREATE POLICY "Residents can read their support requests"
      ON public.building_support_requests
      FOR SELECT
      USING (
        public.is_building_member(building_id)
        AND resident_user_id = auth.uid()
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'building_support_requests'
      AND policyname = 'Managers can read building support requests'
  ) THEN
    CREATE POLICY "Managers can read building support requests"
      ON public.building_support_requests
      FOR SELECT
      USING (public.is_building_manager(building_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'building_support_requests'
      AND policyname = 'Managers can update building support requests'
  ) THEN
    CREATE POLICY "Managers can update building support requests"
      ON public.building_support_requests
      FOR UPDATE
      USING (public.is_building_manager(building_id))
      WITH CHECK (public.is_building_manager(building_id));
  END IF;
END $$;

GRANT SELECT, INSERT ON TABLE public.building_support_requests TO authenticated;
GRANT ALL ON TABLE public.building_support_requests TO service_role;
