-- Lightweight client-side error sink. The app's reportClientError() inserts
-- here so production crashes / unhandled rejections are visible without an
-- external service. Insert is open to clients (anon may hit errors around auth);
-- reads and deletes are admin-only. Only message/stack/url/context/user-agent
-- are stored — never secrets or PII beyond that (per CLAUDE.md).

CREATE TABLE IF NOT EXISTS public.client_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  message text,
  stack text,
  url text,
  user_agent text,
  user_id uuid,
  context jsonb
);

CREATE INDEX IF NOT EXISTS client_error_logs_created_at_idx
  ON public.client_error_logs (created_at DESC);

ALTER TABLE public.client_error_logs ENABLE ROW LEVEL SECURITY;

-- Clients (anon or authenticated) may report their own errors. Authenticated
-- callers can only attribute a row to themselves; anon rows have a null user_id.
DROP POLICY IF EXISTS "Anyone can report client errors" ON public.client_error_logs;
CREATE POLICY "Anyone can report client errors" ON public.client_error_logs
  FOR INSERT WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- Admins can read the logs.
DROP POLICY IF EXISTS "Admins can read client errors" ON public.client_error_logs;
CREATE POLICY "Admins can read client errors" ON public.client_error_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can clear the logs.
DROP POLICY IF EXISTS "Admins can delete client errors" ON public.client_error_logs;
CREATE POLICY "Admins can delete client errors" ON public.client_error_logs
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
