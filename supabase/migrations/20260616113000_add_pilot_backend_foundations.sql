ALTER TABLE public.building_manager_leads
  ADD COLUMN IF NOT EXISTS provisioning_status text NOT NULL DEFAULT 'awaiting_claim',
  ADD COLUMN IF NOT EXISTS provisioned_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provisioned_at timestamptz,
  ADD COLUMN IF NOT EXISTS provisioning_notes text;

ALTER TABLE public.building_manager_leads
  DROP CONSTRAINT IF EXISTS building_manager_leads_provisioning_status_check;

ALTER TABLE public.building_manager_leads
  ADD CONSTRAINT building_manager_leads_provisioning_status_check
    CHECK (provisioning_status IN ('awaiting_claim', 'provisioned', 'disabled'));

CREATE INDEX IF NOT EXISTS idx_building_manager_leads_building_email_provisioning
  ON public.building_manager_leads (building_id, normalized_email, provisioning_status);

ALTER TABLE public.resident_join_requests
  ADD COLUMN IF NOT EXISTS onboarding_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS compatibility_prompts jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS activity_preferences text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS networking_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS intro_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS consent_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

ALTER TABLE public.building_introductions
  ADD COLUMN IF NOT EXISTS match_format text NOT NULL DEFAULT 'one_on_one',
  ADD COLUMN IF NOT EXISTS match_reasoning text,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS sensitive_details_revealed_at timestamptz,
  ADD COLUMN IF NOT EXISTS requires_mutual_consent boolean NOT NULL DEFAULT true;

ALTER TABLE public.building_introductions
  DROP CONSTRAINT IF EXISTS building_introductions_status_check;

ALTER TABLE public.building_introductions
  ADD CONSTRAINT building_introductions_status_check
    CHECK (status IN ('suggested', 'requested', 'accepted', 'mutual', 'delivered', 'declined', 'paused', 'scheduled', 'completed'));

ALTER TABLE public.building_introductions
  DROP CONSTRAINT IF EXISTS building_introductions_match_format_check;

ALTER TABLE public.building_introductions
  ADD CONSTRAINT building_introductions_match_format_check
    CHECK (match_format IN ('one_on_one', 'small_group', 'activity_partner', 'professional_networking'));

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS capacity integer CHECK (capacity IS NULL OR capacity > 0),
  ADD COLUMN IF NOT EXISTS waitlist_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS feedback_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recommendation_context jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.building_event_engagements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  engagement_type text NOT NULL
    CHECK (engagement_type IN ('proposal', 'vote', 'interest', 'waitlist', 'feedback')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'withdrawn', 'resolved')),
  title text,
  detail text,
  value text,
  rating integer CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_building_event_engagements_building_type_created_at
  ON public.building_event_engagements (building_id, engagement_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_building_event_engagements_event_type_status
  ON public.building_event_engagements (event_id, engagement_type, status);

CREATE INDEX IF NOT EXISTS idx_building_event_engagements_user_created_at
  ON public.building_event_engagements (user_id, created_at DESC);

ALTER TABLE public.building_event_engagements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'building_event_engagements'
      AND policyname = 'Members can read their own event engagement'
  ) THEN
    CREATE POLICY "Members can read their own event engagement"
      ON public.building_event_engagements
      FOR SELECT
      USING (
        user_id = auth.uid()
        OR public.is_building_manager(building_id)
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
      AND tablename = 'building_event_engagements'
      AND policyname = 'Members can create their own event engagement'
  ) THEN
    CREATE POLICY "Members can create their own event engagement"
      ON public.building_event_engagements
      FOR INSERT
      WITH CHECK (
        user_id = auth.uid()
        AND public.is_building_member(building_id)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'building_event_engagements'
      AND policyname = 'Members can update their own event engagement'
  ) THEN
    CREATE POLICY "Members can update their own event engagement"
      ON public.building_event_engagements
      FOR UPDATE
      USING (
        user_id = auth.uid()
        OR public.is_building_manager(building_id)
        OR public.has_role(auth.uid(), 'admin')
      )
      WITH CHECK (
        user_id = auth.uid()
        OR public.is_building_manager(building_id)
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
      AND tablename = 'building_event_engagements'
      AND policyname = 'Members can delete or withdraw their own event engagement'
  ) THEN
    CREATE POLICY "Members can delete or withdraw their own event engagement"
      ON public.building_event_engagements
      FOR DELETE
      USING (
        user_id = auth.uid()
        OR public.is_building_manager(building_id)
        OR public.has_role(auth.uid(), 'admin')
      );
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.building_event_engagements TO authenticated;
GRANT ALL ON TABLE public.building_event_engagements TO service_role;
