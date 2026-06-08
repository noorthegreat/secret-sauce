-- Server-side enforcement that a user has completed the required questionnaire
-- before enrolling in an event. Mirrors the client rule in Event.tsx
-- (getRequiredQuestionnaires):
--   * matching_mode = 'friendship'                  -> friendship survey required
--   * 'relationship' / 'both' / 'event_default'/etc -> romantic survey required
-- Closes the gap where a crafted request could enroll without the survey.
-- Service-role (edge functions) bypasses RLS entirely, so this only affects
-- direct client inserts.

-- SECURITY DEFINER helper so the policy can read events/profiles without being
-- subject to those tables' RLS (avoids false negatives / recursion).
CREATE OR REPLACE FUNCTION public.user_meets_event_survey_requirement(p_user uuid, p_event uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.profiles p ON p.id = p_user
    WHERE e.id = p_event
      AND CASE
            WHEN e.matching_mode = 'friendship'
              THEN COALESCE(p.completed_friendship_questionnaire, false)
            ELSE COALESCE(p.completed_questionnaire, false)
          END
  );
$$;

ALTER POLICY "Users can enroll themselves" ON public.event_enrollments
  WITH CHECK (
    auth.uid() = user_id
    AND public.user_meets_event_survey_requirement(auth.uid(), event_enrollments.event_id)
  );
