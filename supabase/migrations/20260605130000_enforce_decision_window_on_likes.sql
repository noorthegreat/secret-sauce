-- Server-side enforcement of the weekly decision window (Mon 00:00 -> Tue 12:00
-- Europe/Zurich) for likes/passes. The client already blocks out-of-window
-- actions; this closes the gap where a crafted request could insert directly
-- and create off-cadence matches/dates.
--
-- Exemptions:
--   * service_role  -> all edge functions / cron / admin tooling
--   * admin & test accounts
--   * event matches (from_algorithm='event') -> intentionally not tied to the
--     weekly window
--
-- DST is handled automatically by `AT TIME ZONE 'Europe/Zurich'`.

CREATE OR REPLACE FUNCTION public.enforce_decision_window()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  zurich_now timestamp;
  target_id uuid;
BEGIN
  -- Backend (edge functions, cron, admin tooling) runs as the service role.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Admins and test accounts bypass the window (debugging / ops).
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = NEW.user_id AND role IN ('admin', 'test')
  ) THEN
    RETURN NEW;
  END IF;

  -- Inside the decision window? Monday all day, Tuesday until 12:00 Zurich.
  zurich_now := now() AT TIME ZONE 'Europe/Zurich';
  IF EXTRACT(ISODOW FROM zurich_now) = 1
     OR (EXTRACT(ISODOW FROM zurich_now) = 2 AND zurich_now::time < TIME '12:00') THEN
    RETURN NEW;
  END IF;

  -- Event matches are exempt from the weekly window.
  target_id := (to_jsonb(NEW) ->> TG_ARGV[0])::uuid;
  IF EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.from_algorithm = 'event'
      AND ((m.user_id = NEW.user_id AND m.matched_user_id = target_id)
        OR (m.user_id = target_id AND m.matched_user_id = NEW.user_id))
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'decision_window_closed'
    USING ERRCODE = 'check_violation',
          HINT = 'Likes and passes are only allowed during the Monday 00:00 to Tuesday 12:00 (Zurich) decision window.';
END;
$$;

DROP TRIGGER IF EXISTS enforce_decision_window ON public.likes;
CREATE TRIGGER enforce_decision_window
  BEFORE INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_decision_window('liked_user_id');

DROP TRIGGER IF EXISTS enforce_decision_window ON public.dislikes;
CREATE TRIGGER enforce_decision_window
  BEFORE INSERT ON public.dislikes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_decision_window('disliked_user_id');

DROP TRIGGER IF EXISTS enforce_decision_window ON public.friendship_likes;
CREATE TRIGGER enforce_decision_window
  BEFORE INSERT ON public.friendship_likes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_decision_window('liked_user_id');

DROP TRIGGER IF EXISTS enforce_decision_window ON public.friendship_dislikes;
CREATE TRIGGER enforce_decision_window
  BEFORE INSERT ON public.friendship_dislikes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_decision_window('disliked_user_id');
