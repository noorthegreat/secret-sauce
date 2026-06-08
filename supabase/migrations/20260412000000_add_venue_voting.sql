-- Venue options: array of up to 2 venue IDs suggested for this date
ALTER TABLE public.dates ADD COLUMN IF NOT EXISTS venue_options text[];

-- Venue voting: each user votes on which of the 2 suggested venues they prefer
ALTER TABLE public.dates ADD COLUMN IF NOT EXISTS user1_venue_vote text;
ALTER TABLE public.dates ADD COLUMN IF NOT EXISTS user2_venue_vote text;

-- Partner venues get priority in selection scoring
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS is_partner boolean DEFAULT false;

-- Tracks how often a venue has been selected (used for freshness scoring)
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS times_selected integer DEFAULT 0;

-- RPC to safely increment times_selected
CREATE OR REPLACE FUNCTION public.increment_venue_times_selected(venue_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.venues SET times_selected = COALESCE(times_selected, 0) + 1 WHERE id = venue_id::uuid;
$$;

-- Feedback loop: store the confirmed venue ID so we know which venue to rate,
-- and store each user's venue rating (1-5).
ALTER TABLE public.dates ADD COLUMN IF NOT EXISTS confirmed_venue_id uuid REFERENCES public.venues(id);
ALTER TABLE public.dates ADD COLUMN IF NOT EXISTS user1_venue_rating smallint CHECK (user1_venue_rating BETWEEN 1 AND 5);
ALTER TABLE public.dates ADD COLUMN IF NOT EXISTS user2_venue_rating smallint CHECK (user2_venue_rating BETWEEN 1 AND 5);

-- Running average on the venue itself.
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS avg_feedback_score float;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS feedback_count integer DEFAULT 0;

-- Recompute avg_feedback_score for a venue from all rated dates.
CREATE OR REPLACE FUNCTION public.refresh_venue_feedback_score(p_venue_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_avg   float;
  v_count integer;
BEGIN
  SELECT
    AVG(rating) FILTER (WHERE rating IS NOT NULL),
    COUNT(*)     FILTER (WHERE rating IS NOT NULL)
  INTO v_avg, v_count
  FROM (
    SELECT user1_venue_rating AS rating FROM public.dates WHERE confirmed_venue_id = p_venue_id AND user1_venue_rating IS NOT NULL
    UNION ALL
    SELECT user2_venue_rating            FROM public.dates WHERE confirmed_venue_id = p_venue_id AND user2_venue_rating IS NOT NULL
  ) sub;

  UPDATE public.venues
  SET avg_feedback_score = v_avg,
      feedback_count      = COALESCE(v_count, 0)
  WHERE id = p_venue_id;
END;
$$;

-- Trigger: refresh venue score whenever a venue rating changes on a date.
CREATE OR REPLACE FUNCTION public._trg_refresh_venue_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.confirmed_venue_id IS NOT NULL THEN
    PERFORM public.refresh_venue_feedback_score(NEW.confirmed_venue_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_venue_rating_updated ON public.dates;
CREATE TRIGGER trg_venue_rating_updated
AFTER UPDATE OF user1_venue_rating, user2_venue_rating
ON public.dates
FOR EACH ROW
EXECUTE FUNCTION public._trg_refresh_venue_score();
