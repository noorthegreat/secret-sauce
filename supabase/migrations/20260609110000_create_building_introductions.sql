CREATE TABLE IF NOT EXISTS public.building_introductions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  resident_a_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resident_b_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  intro_type text NOT NULL DEFAULT 'friendship'
    CHECK (intro_type IN ('friendship', 'professional')),
  status text NOT NULL DEFAULT 'suggested'
    CHECK (status IN ('suggested', 'requested', 'accepted', 'mutual', 'delivered', 'declined', 'paused')),
  source text NOT NULL DEFAULT 'system'
    CHECK (char_length(source) BETWEEN 1 AND 80),
  requested_by_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resident_a_decision text
    CHECK (resident_a_decision IS NULL OR resident_a_decision IN ('requested', 'accepted', 'declined', 'paused')),
  resident_b_decision text
    CHECK (resident_b_decision IS NULL OR resident_b_decision IN ('requested', 'accepted', 'declined', 'paused')),
  suggested_at timestamptz NOT NULL DEFAULT now(),
  mutual_at timestamptz,
  delivered_at timestamptz,
  delivered_channel text
    CHECK (delivered_channel IS NULL OR delivered_channel IN ('email', 'sms', 'in_app')),
  declined_by_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  paused_by_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  compatibility_summary text
    CHECK (compatibility_summary IS NULL OR char_length(compatibility_summary) <= 400),
  shared_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT building_introductions_distinct_residents_check
    CHECK (resident_a_user_id <> resident_b_user_id),
  CONSTRAINT building_introductions_canonical_pair_check
    CHECK (resident_a_user_id::text < resident_b_user_id::text),
  CONSTRAINT building_introductions_requested_by_participant_check
    CHECK (
      requested_by_user_id IS NULL
      OR requested_by_user_id = resident_a_user_id
      OR requested_by_user_id = resident_b_user_id
    ),
  CONSTRAINT building_introductions_declined_by_participant_check
    CHECK (
      declined_by_user_id IS NULL
      OR declined_by_user_id = resident_a_user_id
      OR declined_by_user_id = resident_b_user_id
    ),
  CONSTRAINT building_introductions_paused_by_participant_check
    CHECK (
      paused_by_user_id IS NULL
      OR paused_by_user_id = resident_a_user_id
      OR paused_by_user_id = resident_b_user_id
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_building_introductions_unique_pair
  ON public.building_introductions (building_id, resident_a_user_id, resident_b_user_id, intro_type);

CREATE INDEX IF NOT EXISTS idx_building_introductions_building_status
  ON public.building_introductions (building_id, status, suggested_at DESC);

CREATE INDEX IF NOT EXISTS idx_building_introductions_resident_a
  ON public.building_introductions (resident_a_user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_building_introductions_resident_b
  ON public.building_introductions (resident_b_user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_building_introductions_requested_by
  ON public.building_introductions (requested_by_user_id, updated_at DESC);

ALTER TABLE public.building_introductions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'building_introductions'
      AND policyname = 'Residents can read their building introductions'
  ) THEN
    CREATE POLICY "Residents can read their building introductions"
      ON public.building_introductions
      FOR SELECT
      USING (
        public.is_building_member(building_id)
        AND auth.uid() IN (resident_a_user_id, resident_b_user_id)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'building_introductions'
      AND policyname = 'Residents can create their building introductions'
  ) THEN
    CREATE POLICY "Residents can create their building introductions"
      ON public.building_introductions
      FOR INSERT
      WITH CHECK (
        public.is_building_member(building_id)
        AND auth.uid() IN (resident_a_user_id, resident_b_user_id)
        AND requested_by_user_id = auth.uid()
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'building_introductions'
      AND policyname = 'Residents can update their building introductions'
  ) THEN
    CREATE POLICY "Residents can update their building introductions"
      ON public.building_introductions
      FOR UPDATE
      USING (
        public.is_building_member(building_id)
        AND auth.uid() IN (resident_a_user_id, resident_b_user_id)
      )
      WITH CHECK (
        public.is_building_member(building_id)
        AND auth.uid() IN (resident_a_user_id, resident_b_user_id)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'building_introductions'
      AND policyname = 'Managers can read building introductions'
  ) THEN
    CREATE POLICY "Managers can read building introductions"
      ON public.building_introductions
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
      AND tablename = 'building_introductions'
      AND policyname = 'Managers can manage building introductions'
  ) THEN
    CREATE POLICY "Managers can manage building introductions"
      ON public.building_introductions
      FOR ALL
      USING (public.is_building_manager(building_id))
      WITH CHECK (public.is_building_manager(building_id));
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE ON TABLE public.building_introductions TO authenticated;
GRANT ALL ON TABLE public.building_introductions TO service_role;
