CREATE TABLE IF NOT EXISTS public.building_event_budget_settings (
  building_id uuid PRIMARY KEY REFERENCES public.buildings(id) ON DELETE CASCADE,
  event_budget_amount numeric(12, 2)
    CHECK (event_budget_amount IS NULL OR event_budget_amount >= 0),
  event_budget_period text
    CHECK (event_budget_period IS NULL OR event_budget_period IN ('monthly', 'yearly')),
  preferred_event_frequency text
    CHECK (preferred_event_frequency IS NULL OR char_length(preferred_event_frequency) BETWEEN 1 AND 80),
  preferred_event_types text[] NOT NULL DEFAULT '{}'::text[],
  event_planning_notes text
    CHECK (event_planning_notes IS NULL OR char_length(event_planning_notes) <= 4000),
  updated_by_manager_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.building_event_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  title text NOT NULL
    CHECK (char_length(title) BETWEEN 1 AND 160),
  description text
    CHECK (description IS NULL OR char_length(description) <= 2000),
  estimated_min_cost numeric(12, 2)
    CHECK (estimated_min_cost IS NULL OR estimated_min_cost >= 0),
  estimated_max_cost numeric(12, 2)
    CHECK (estimated_max_cost IS NULL OR estimated_max_cost >= 0),
  expected_attendance integer
    CHECK (expected_attendance IS NULL OR expected_attendance >= 0),
  recommended_capacity integer
    CHECK (recommended_capacity IS NULL OR recommended_capacity >= 0),
  suggested_location text
    CHECK (suggested_location IS NULL OR char_length(suggested_location) <= 160),
  suggested_timing text
    CHECK (suggested_timing IS NULL OR char_length(suggested_timing) <= 160),
  resident_interest_signals_used jsonb NOT NULL DEFAULT '[]'::jsonb,
  reason_recommended text
    CHECK (reason_recommended IS NULL OR char_length(reason_recommended) <= 2000),
  budget_fit_label text NOT NULL DEFAULT 'unknown'
    CHECK (budget_fit_label IN ('within_budget', 'stretch', 'above_budget', 'unknown')),
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'resident_suggestion', 'ai_draft')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'proposed', 'approved', 'rejected', 'scheduled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT building_event_recommendations_cost_range_check
    CHECK (
      estimated_min_cost IS NULL
      OR estimated_max_cost IS NULL
      OR estimated_max_cost >= estimated_min_cost
    )
);

CREATE INDEX IF NOT EXISTS idx_building_event_recommendations_building_status_updated
  ON public.building_event_recommendations (building_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.building_event_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  submitted_by_resident_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category text NOT NULL
    CHECK (
      category IN (
        'venue',
        'food_truck',
        'caterer',
        'dj_performer',
        'fitness_instructor',
        'wellness_provider',
        'artist',
        'local_business',
        'workshop',
        'pop_up',
        'other'
      )
    ),
  title text NOT NULL
    CHECK (char_length(title) BETWEEN 1 AND 160),
  description text
    CHECK (description IS NULL OR char_length(description) <= 2000),
  why_residents_would_like_it text
    CHECK (why_residents_would_like_it IS NULL OR char_length(why_residents_would_like_it) <= 1200),
  suggested_for_event_type text
    CHECK (suggested_for_event_type IS NULL OR char_length(suggested_for_event_type) <= 120),
  estimated_cost_range text
    CHECK (estimated_cost_range IS NULL OR char_length(estimated_cost_range) <= 120),
  contact_info text
    CHECK (contact_info IS NULL OR char_length(contact_info) <= 280),
  website_or_social_link text
    CHECK (website_or_social_link IS NULL OR char_length(website_or_social_link) <= 500),
  location text
    CHECK (location IS NULL OR char_length(location) <= 200),
  resident_visibility text NOT NULL DEFAULT 'private_to_management'
    CHECK (resident_visibility IN ('private_to_management', 'visible_for_voting')),
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'under_review', 'shortlisted', 'approved', 'rejected', 'used_for_event')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_building_event_suggestions_building_status_created
  ON public.building_event_suggestions (building_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_building_event_suggestions_submitter_created
  ON public.building_event_suggestions (submitted_by_resident_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.building_event_suggestion_supports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id uuid NOT NULL REFERENCES public.building_event_suggestions(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  support_type text NOT NULL
    CHECK (support_type IN ('interested', 'love_this', 'would_attend', 'not_for_me')),
  optional_comment text
    CHECK (optional_comment IS NULL OR char_length(optional_comment) <= 600),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT building_event_suggestion_supports_unique_resident
    UNIQUE (suggestion_id, resident_id)
);

CREATE INDEX IF NOT EXISTS idx_building_event_suggestion_supports_suggestion
  ON public.building_event_suggestion_supports (suggestion_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_building_event_suggestion_supports_resident
  ON public.building_event_suggestion_supports (resident_id, updated_at DESC);

ALTER TABLE public.building_event_budget_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_event_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_event_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_event_suggestion_supports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'building_event_budget_settings'
      AND policyname = 'Managers can read building event budget settings'
  ) THEN
    CREATE POLICY "Managers can read building event budget settings"
      ON public.building_event_budget_settings
      FOR SELECT
      USING (
        public.is_building_manager(building_id)
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
      AND tablename = 'building_event_budget_settings'
      AND policyname = 'Managers can manage building event budget settings'
  ) THEN
    CREATE POLICY "Managers can manage building event budget settings"
      ON public.building_event_budget_settings
      FOR ALL
      USING (
        public.is_building_manager(building_id)
        OR public.has_role(auth.uid(), 'admin')
      )
      WITH CHECK (
        public.is_building_manager(building_id)
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
      AND tablename = 'building_event_recommendations'
      AND policyname = 'Managers can read building event recommendations'
  ) THEN
    CREATE POLICY "Managers can read building event recommendations"
      ON public.building_event_recommendations
      FOR SELECT
      USING (
        public.is_building_manager(building_id)
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
      AND tablename = 'building_event_recommendations'
      AND policyname = 'Managers can manage building event recommendations'
  ) THEN
    CREATE POLICY "Managers can manage building event recommendations"
      ON public.building_event_recommendations
      FOR ALL
      USING (
        public.is_building_manager(building_id)
        OR public.has_role(auth.uid(), 'admin')
      )
      WITH CHECK (
        public.is_building_manager(building_id)
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
      AND tablename = 'building_event_suggestions'
      AND policyname = 'Residents can read visible or own building suggestions'
  ) THEN
    CREATE POLICY "Residents can read visible or own building suggestions"
      ON public.building_event_suggestions
      FOR SELECT
      USING (
        public.is_building_member(building_id)
        AND (
          resident_visibility = 'visible_for_voting'
          OR submitted_by_resident_id = auth.uid()
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
      AND tablename = 'building_event_suggestions'
      AND policyname = 'Residents can create building suggestions'
  ) THEN
    CREATE POLICY "Residents can create building suggestions"
      ON public.building_event_suggestions
      FOR INSERT
      WITH CHECK (
        public.is_building_member(building_id)
        AND submitted_by_resident_id = auth.uid()
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'building_event_suggestions'
      AND policyname = 'Residents can update own submitted building suggestions'
  ) THEN
    CREATE POLICY "Residents can update own submitted building suggestions"
      ON public.building_event_suggestions
      FOR UPDATE
      USING (
        public.is_building_member(building_id)
        AND submitted_by_resident_id = auth.uid()
        AND status = 'submitted'
      )
      WITH CHECK (
        public.is_building_member(building_id)
        AND submitted_by_resident_id = auth.uid()
        AND status = 'submitted'
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'building_event_suggestions'
      AND policyname = 'Residents can delete own submitted building suggestions'
  ) THEN
    CREATE POLICY "Residents can delete own submitted building suggestions"
      ON public.building_event_suggestions
      FOR DELETE
      USING (
        public.is_building_member(building_id)
        AND submitted_by_resident_id = auth.uid()
        AND status = 'submitted'
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'building_event_suggestions'
      AND policyname = 'Managers can read building event suggestions'
  ) THEN
    CREATE POLICY "Managers can read building event suggestions"
      ON public.building_event_suggestions
      FOR SELECT
      USING (
        public.is_building_manager(building_id)
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
      AND tablename = 'building_event_suggestions'
      AND policyname = 'Managers can update building event suggestions'
  ) THEN
    CREATE POLICY "Managers can update building event suggestions"
      ON public.building_event_suggestions
      FOR UPDATE
      USING (
        public.is_building_manager(building_id)
        OR public.has_role(auth.uid(), 'admin')
      )
      WITH CHECK (
        public.is_building_manager(building_id)
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
      AND tablename = 'building_event_suggestion_supports'
      AND policyname = 'Residents can read own suggestion support signals'
  ) THEN
    CREATE POLICY "Residents can read own suggestion support signals"
      ON public.building_event_suggestion_supports
      FOR SELECT
      USING (resident_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'building_event_suggestion_supports'
      AND policyname = 'Managers can read building suggestion support signals'
  ) THEN
    CREATE POLICY "Managers can read building suggestion support signals"
      ON public.building_event_suggestion_supports
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.building_event_suggestions suggestion
          WHERE suggestion.id = suggestion_id
            AND (
              public.is_building_manager(suggestion.building_id)
              OR public.has_role(auth.uid(), 'admin')
            )
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
      AND tablename = 'building_event_suggestion_supports'
      AND policyname = 'Residents can create own visible suggestion support signals'
  ) THEN
    CREATE POLICY "Residents can create own visible suggestion support signals"
      ON public.building_event_suggestion_supports
      FOR INSERT
      WITH CHECK (
        resident_id = auth.uid()
        AND EXISTS (
          SELECT 1
          FROM public.building_event_suggestions suggestion
          WHERE suggestion.id = suggestion_id
            AND suggestion.resident_visibility = 'visible_for_voting'
            AND public.is_building_member(suggestion.building_id)
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
      AND tablename = 'building_event_suggestion_supports'
      AND policyname = 'Residents can update own visible suggestion support signals'
  ) THEN
    CREATE POLICY "Residents can update own visible suggestion support signals"
      ON public.building_event_suggestion_supports
      FOR UPDATE
      USING (resident_id = auth.uid())
      WITH CHECK (
        resident_id = auth.uid()
        AND EXISTS (
          SELECT 1
          FROM public.building_event_suggestions suggestion
          WHERE suggestion.id = suggestion_id
            AND suggestion.resident_visibility = 'visible_for_voting'
            AND public.is_building_member(suggestion.building_id)
        )
      );
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.building_event_budget_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.building_event_recommendations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.building_event_suggestions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.building_event_suggestion_supports TO authenticated;

GRANT ALL ON TABLE public.building_event_budget_settings TO service_role;
GRANT ALL ON TABLE public.building_event_recommendations TO service_role;
GRANT ALL ON TABLE public.building_event_suggestions TO service_role;
GRANT ALL ON TABLE public.building_event_suggestion_supports TO service_role;
