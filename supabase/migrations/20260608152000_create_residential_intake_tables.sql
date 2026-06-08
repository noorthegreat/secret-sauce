CREATE TABLE IF NOT EXISTS public.public_intake_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('building_manager_lead', 'resident_join_request')),
  request_fingerprint text NOT NULL CHECK (char_length(request_fingerprint) = 64),
  email_hash text NOT NULL CHECK (char_length(email_hash) = 64),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_public_intake_attempts_scope_fingerprint_created_at
  ON public.public_intake_attempts (scope, request_fingerprint, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_public_intake_attempts_scope_email_hash_created_at
  ON public.public_intake_attempts (scope, email_hash, created_at DESC);

CREATE TABLE IF NOT EXISTS public.building_manager_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  first_name text NOT NULL CHECK (char_length(first_name) BETWEEN 1 AND 80),
  last_name text NOT NULL CHECK (char_length(last_name) BETWEEN 1 AND 80),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254),
  normalized_email text NOT NULL CHECK (char_length(normalized_email) BETWEEN 3 AND 254),
  phone_number text NOT NULL CHECK (char_length(phone_number) BETWEEN 8 AND 20),
  normalized_phone text NOT NULL CHECK (char_length(normalized_phone) BETWEEN 8 AND 20),
  job_title text CHECK (job_title IS NULL OR char_length(job_title) <= 120),
  unit_count integer CHECK (unit_count IS NULL OR unit_count BETWEEN 1 AND 10000),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 2000),
  contact_via_sms boolean NOT NULL DEFAULT false,
  contact_via_email boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'residential-beta-manager-page' CHECK (char_length(source) <= 120),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (building_id, normalized_email)
);

CREATE INDEX IF NOT EXISTS idx_building_manager_leads_building_id
  ON public.building_manager_leads (building_id);

CREATE TABLE IF NOT EXISTS public.building_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'lead' CHECK (status IN ('lead', 'trial', 'active', 'past_due', 'paused', 'cancelled')),
  plan_code text NOT NULL DEFAULT 'pilot' CHECK (char_length(plan_code) <= 80),
  billing_interval text NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'quarterly', 'annual')),
  monthly_fee_cents integer CHECK (monthly_fee_cents IS NULL OR monthly_fee_cents >= 0),
  resident_capacity integer CHECK (resident_capacity IS NULL OR resident_capacity > 0),
  started_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (building_id)
);

CREATE TABLE IF NOT EXISTS public.resident_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  first_name text NOT NULL CHECK (char_length(first_name) BETWEEN 1 AND 80),
  last_name text NOT NULL CHECK (char_length(last_name) BETWEEN 1 AND 80),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254),
  normalized_email text NOT NULL CHECK (char_length(normalized_email) BETWEEN 3 AND 254),
  phone_number text NOT NULL CHECK (char_length(phone_number) BETWEEN 8 AND 20),
  normalized_phone text NOT NULL CHECK (char_length(normalized_phone) BETWEEN 8 AND 20),
  unit_number text NOT NULL CHECK (char_length(unit_number) BETWEEN 1 AND 32),
  move_in_date date,
  status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'withdrawn')),
  wants_friendships boolean NOT NULL DEFAULT true,
  wants_networking boolean NOT NULL DEFAULT true,
  contact_via_sms boolean NOT NULL DEFAULT true,
  contact_via_email boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'residential-beta-resident-page' CHECK (char_length(source) <= 120),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (building_id, normalized_email)
);

CREATE INDEX IF NOT EXISTS idx_resident_join_requests_building_status_created_at
  ON public.resident_join_requests (building_id, status, created_at DESC);

ALTER TABLE public.public_intake_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_manager_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resident_join_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'public_intake_attempts'
      AND policyname = 'Admins can review public intake attempts'
  ) THEN
    CREATE POLICY "Admins can review public intake attempts"
      ON public.public_intake_attempts
      FOR SELECT
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'building_manager_leads'
      AND policyname = 'Admins can manage building manager leads'
  ) THEN
    CREATE POLICY "Admins can manage building manager leads"
      ON public.building_manager_leads
      FOR ALL
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'building_subscriptions'
      AND policyname = 'Admins can manage building subscriptions'
  ) THEN
    CREATE POLICY "Admins can manage building subscriptions"
      ON public.building_subscriptions
      FOR ALL
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'resident_join_requests'
      AND policyname = 'Managers can read resident join requests in their building'
  ) THEN
    CREATE POLICY "Managers can read resident join requests in their building"
      ON public.resident_join_requests
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
      AND tablename = 'resident_join_requests'
      AND policyname = 'Managers can manage resident join requests in their building'
  ) THEN
    CREATE POLICY "Managers can manage resident join requests in their building"
      ON public.resident_join_requests
      FOR ALL
      USING (public.is_building_manager(building_id))
      WITH CHECK (public.is_building_manager(building_id));
  END IF;
END $$;
