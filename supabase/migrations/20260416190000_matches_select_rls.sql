-- Allow authenticated users to read their own weekly match rows.
-- Without this, RLS-enabled `matches` returns zero rows for browser clients while
-- service-role inserts (e.g. debug-seed-date-flow, match-users) still succeed.

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select their own matches" ON public.matches;
CREATE POLICY "Users can select their own matches"
ON public.matches
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can select all matches" ON public.matches;
CREATE POLICY "Admins can select all matches"
ON public.matches
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
  )
);

GRANT SELECT ON TABLE public.matches TO authenticated;

NOTIFY pgrst, 'reload schema';
