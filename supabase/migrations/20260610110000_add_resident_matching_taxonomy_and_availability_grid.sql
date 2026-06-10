ALTER TABLE public.resident_join_requests
  ADD COLUMN IF NOT EXISTS availability_grid jsonb;

UPDATE public.resident_join_requests
SET interests = (
  SELECT COALESCE(array_agg(DISTINCT mapped_value), '{}'::text[])
  FROM (
    SELECT CASE interest_value
      WHEN 'Coffee' THEN 'coffee'
      WHEN 'Food' THEN 'food'
      WHEN 'Travel' THEN 'travel'
      WHEN 'Books' THEN 'books'
      WHEN 'Reading' THEN 'books'
      WHEN 'Wellness' THEN 'wellness'
      WHEN 'Art' THEN 'art'
      WHEN 'Design' THEN 'design'
      WHEN 'Film' THEN 'film'
      WHEN 'Music' THEN 'music'
      WHEN 'Technology' THEN 'technology'
      WHEN 'Entrepreneurship' THEN 'entrepreneurship'
      WHEN 'Fitness' THEN 'fitness'
      WHEN 'Running' THEN 'running'
      WHEN 'Hiking' THEN 'hiking'
      WHEN 'Outdoors' THEN 'hiking'
      WHEN 'Tennis' THEN 'tennis'
      WHEN 'Walking' THEN 'walking'
      WHEN 'Yoga' THEN 'yoga'
      WHEN 'Coworking' THEN 'coworking'
      WHEN 'Volunteering' THEN 'volunteering'
      WHEN 'Dogs' THEN 'dogs'
      WHEN 'Pets' THEN 'dogs'
      WHEN 'Cooking' THEN 'food'
      ELSE NULL
    END AS mapped_value
    FROM unnest(COALESCE(interests, '{}'::text[])) AS interest_value
  ) mapped
  WHERE mapped_value IS NOT NULL
)
WHERE interests IS NOT NULL;

UPDATE public.resident_join_requests
SET looking_for = (
  SELECT COALESCE(array_agg(DISTINCT mapped_value), '{}'::text[])
  FROM (
    SELECT CASE goal_value
      WHEN 'Friendships' THEN 'friendships'
      WHEN 'New Friends' THEN 'friendships'
      WHEN 'Activity partners' THEN 'activity_partners'
      WHEN 'Activity Partners' THEN 'activity_partners'
      WHEN 'Community involvement' THEN 'community_involvement'
      WHEN 'Community events' THEN 'community_involvement'
      WHEN 'Professional networking' THEN 'professional_networking'
      WHEN 'Professional Networking' THEN 'professional_networking'
      WHEN 'Professional connections' THEN 'professional_networking'
      WHEN 'Professional Connections' THEN 'professional_networking'
      WHEN 'Networking' THEN 'professional_networking'
      WHEN 'New-to-city connections' THEN 'friendships'
      ELSE NULL
    END AS mapped_value
    FROM unnest(COALESCE(looking_for, '{}'::text[])) AS goal_value
  ) mapped
  WHERE mapped_value IS NOT NULL
)
WHERE looking_for IS NOT NULL;

UPDATE public.resident_join_requests
SET connection_styles = (
  SELECT COALESCE(array_agg(DISTINCT mapped_value), '{}'::text[])
  FROM (
    SELECT CASE style_value
      WHEN 'One-on-one' THEN 'one_on_one'
      WHEN 'One-on-One' THEN 'one_on_one'
      WHEN 'Small group' THEN 'small_group'
      WHEN 'Small groups' THEN 'small_group'
      WHEN 'Event-based' THEN 'event_based'
      WHEN 'Community events' THEN 'event_based'
      WHEN 'Flexible' THEN 'flexible'
      WHEN 'Activity partners' THEN 'flexible'
      WHEN 'Professional networking' THEN 'flexible'
      ELSE NULL
    END AS mapped_value
    FROM unnest(COALESCE(connection_styles, '{}'::text[])) AS style_value
  ) mapped
  WHERE mapped_value IS NOT NULL
)
WHERE connection_styles IS NOT NULL;

UPDATE public.resident_join_requests
SET availability = (
  SELECT COALESCE(array_agg(DISTINCT mapped_value), '{}'::text[])
  FROM (
    SELECT CASE availability_value
      WHEN 'Weekday mornings' THEN 'weekday_mornings'
      WHEN 'Workday lunch' THEN 'weekday_lunch'
      WHEN 'Weekday evenings' THEN 'weekday_evenings'
      WHEN 'Weekends' THEN 'weekend_afternoons'
      WHEN 'Weekend mornings' THEN 'weekend_mornings'
      WHEN 'Weekend afternoons' THEN 'weekend_afternoons'
      WHEN 'Weekend evenings' THEN 'weekend_evenings'
      WHEN 'Late evenings' THEN 'weekend_evenings'
      WHEN 'Flexible' THEN 'flexible'
      ELSE NULL
    END AS mapped_value
    FROM unnest(COALESCE(availability, '{}'::text[])) AS availability_value
  ) mapped
  WHERE mapped_value IS NOT NULL
)
WHERE availability IS NOT NULL;

UPDATE public.resident_join_requests
SET availability_grid = jsonb_build_object(
  'monday', '[]'::jsonb,
  'tuesday', '[]'::jsonb,
  'wednesday', '[]'::jsonb,
  'thursday', '[]'::jsonb,
  'friday', '[]'::jsonb,
  'saturday', '[]'::jsonb,
  'sunday', '[]'::jsonb
)
WHERE availability_grid IS NULL;

ALTER TABLE public.resident_join_requests
  ALTER COLUMN availability_grid SET DEFAULT jsonb_build_object(
    'monday', '[]'::jsonb,
    'tuesday', '[]'::jsonb,
    'wednesday', '[]'::jsonb,
    'thursday', '[]'::jsonb,
    'friday', '[]'::jsonb,
    'saturday', '[]'::jsonb,
    'sunday', '[]'::jsonb
  );

ALTER TABLE public.resident_join_requests
  DROP CONSTRAINT IF EXISTS resident_join_requests_interests_check,
  DROP CONSTRAINT IF EXISTS resident_join_requests_looking_for_check,
  DROP CONSTRAINT IF EXISTS resident_join_requests_connection_styles_check,
  DROP CONSTRAINT IF EXISTS resident_join_requests_availability_check;

ALTER TABLE public.resident_join_requests
  ADD CONSTRAINT resident_join_requests_interests_check
  CHECK (
    coalesce(cardinality(interests), 0) <= 12
    AND interests <@ ARRAY[
      'coffee',
      'food',
      'travel',
      'books',
      'wellness',
      'art',
      'design',
      'film',
      'music',
      'technology',
      'entrepreneurship',
      'fitness',
      'running',
      'hiking',
      'tennis',
      'walking',
      'yoga',
      'coworking',
      'volunteering',
      'dogs'
    ]::text[]
  ),
  ADD CONSTRAINT resident_join_requests_looking_for_check
  CHECK (
    coalesce(cardinality(looking_for), 0) BETWEEN 1 AND 6
    AND looking_for <@ ARRAY[
      'friendships',
      'activity_partners',
      'community_involvement',
      'professional_networking'
    ]::text[]
  ),
  ADD CONSTRAINT resident_join_requests_connection_styles_check
  CHECK (
    coalesce(cardinality(connection_styles), 0) BETWEEN 1 AND 6
    AND connection_styles <@ ARRAY[
      'one_on_one',
      'small_group',
      'event_based',
      'flexible'
    ]::text[]
  ),
  ADD CONSTRAINT resident_join_requests_availability_check
  CHECK (
    coalesce(cardinality(availability), 0) BETWEEN 0 AND 7
    AND availability <@ ARRAY[
      'weekday_mornings',
      'weekday_lunch',
      'weekday_evenings',
      'weekend_mornings',
      'weekend_afternoons',
      'weekend_evenings',
      'flexible'
    ]::text[]
  ),
  ADD CONSTRAINT resident_join_requests_availability_grid_shape_check
  CHECK (
    availability_grid IS NULL
    OR jsonb_typeof(availability_grid) = 'object'
  );
