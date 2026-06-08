CREATE TABLE IF NOT EXISTS public.swiss_waitlist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL CHECK (char_length(first_name) BETWEEN 1 AND 80),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254),
  normalized_email text NOT NULL CHECK (char_length(normalized_email) BETWEEN 3 AND 254),
  city text NOT NULL CHECK (char_length(city) BETWEEN 1 AND 120),
  institution_id text NOT NULL CHECK (char_length(institution_id) BETWEEN 1 AND 120),
  institution_name text NOT NULL CHECK (char_length(institution_name) BETWEEN 1 AND 200),
  institution_type text NOT NULL CHECK (institution_type IN ('university', 'hochschule')),
  consent_to_updates boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'switzerland-launch-page' CHECK (char_length(source) <= 120),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (normalized_email, institution_id)
);

CREATE TABLE IF NOT EXISTS public.swiss_waitlist_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_fingerprint text NOT NULL CHECK (char_length(request_fingerprint) = 64),
  email_hash text NOT NULL CHECK (char_length(email_hash) = 64),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_swiss_waitlist_entries_created_at
  ON public.swiss_waitlist_entries (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_swiss_waitlist_attempts_request_fingerprint_created_at
  ON public.swiss_waitlist_attempts (request_fingerprint, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_swiss_waitlist_attempts_email_hash_created_at
  ON public.swiss_waitlist_attempts (email_hash, created_at DESC);

ALTER TABLE public.swiss_waitlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swiss_waitlist_attempts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'swiss_waitlist_entries'
      AND policyname = 'Admins can manage Swiss waitlist entries'
  ) THEN
    CREATE POLICY "Admins can manage Swiss waitlist entries"
      ON public.swiss_waitlist_entries
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
      AND tablename = 'swiss_waitlist_attempts'
      AND policyname = 'Admins can review Swiss waitlist attempts'
  ) THEN
    CREATE POLICY "Admins can review Swiss waitlist attempts"
      ON public.swiss_waitlist_attempts
      FOR SELECT
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;
