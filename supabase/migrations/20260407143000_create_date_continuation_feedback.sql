CREATE TABLE IF NOT EXISTS public.date_continuation_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date_id uuid NOT NULL REFERENCES public.dates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('still_dating', 'still_friends', 'stayed_in_touch', 'not_anymore', 'other')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(date_id, user_id)
);

ALTER TABLE public.date_continuation_feedback ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'date_continuation_feedback'
      AND policyname = 'Users can read own continuation feedback'
  ) THEN
    CREATE POLICY "Users can read own continuation feedback"
      ON public.date_continuation_feedback
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'date_continuation_feedback'
      AND policyname = 'Users can insert own continuation feedback'
  ) THEN
    CREATE POLICY "Users can insert own continuation feedback"
      ON public.date_continuation_feedback
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'date_continuation_feedback'
      AND policyname = 'Users can update own continuation feedback'
  ) THEN
    CREATE POLICY "Users can update own continuation feedback"
      ON public.date_continuation_feedback
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'date_continuation_feedback'
      AND policyname = 'Admins can read all continuation feedback'
  ) THEN
    CREATE POLICY "Admins can read all continuation feedback"
      ON public.date_continuation_feedback
      FOR SELECT
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;
