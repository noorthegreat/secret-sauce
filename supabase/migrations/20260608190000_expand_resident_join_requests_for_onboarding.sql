ALTER TABLE public.resident_join_requests
  ADD COLUMN IF NOT EXISTS occupation text,
  ADD COLUMN IF NOT EXISTS age_range text,
  ADD COLUMN IF NOT EXISTS introduction text,
  ADD COLUMN IF NOT EXISTS interests text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS looking_for text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS connection_styles text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS availability text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS amenity_preferences text[] NOT NULL DEFAULT '{}'::text[];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'resident_join_requests_age_range_check'
  ) THEN
    ALTER TABLE public.resident_join_requests
      ADD CONSTRAINT resident_join_requests_age_range_check
      CHECK (
        age_range IS NULL
        OR age_range IN ('18-24', '25-34', '35-44', '45-54', '55-64', '65+')
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'resident_join_requests_occupation_check'
  ) THEN
    ALTER TABLE public.resident_join_requests
      ADD CONSTRAINT resident_join_requests_occupation_check
      CHECK (
        occupation IS NULL
        OR char_length(occupation) BETWEEN 1 AND 120
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'resident_join_requests_introduction_check'
  ) THEN
    ALTER TABLE public.resident_join_requests
      ADD CONSTRAINT resident_join_requests_introduction_check
      CHECK (
        introduction IS NULL
        OR char_length(introduction) BETWEEN 1 AND 400
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'resident_join_requests_interests_check'
  ) THEN
    ALTER TABLE public.resident_join_requests
      ADD CONSTRAINT resident_join_requests_interests_check
      CHECK (
        coalesce(cardinality(interests), 0) <= 12
        AND interests <@ ARRAY[
          'Fitness',
          'Running',
          'Hiking',
          'Reading',
          'Technology',
          'Entrepreneurship',
          'Cooking',
          'Travel',
          'Music',
          'Art',
          'Wellness',
          'Food',
          'Design',
          'Outdoors',
          'Volunteering',
          'Pets'
        ]::text[]
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'resident_join_requests_looking_for_check'
  ) THEN
    ALTER TABLE public.resident_join_requests
      ADD CONSTRAINT resident_join_requests_looking_for_check
      CHECK (
        coalesce(cardinality(looking_for), 0) BETWEEN 1 AND 6
        AND looking_for <@ ARRAY[
          'Friendships',
          'Networking',
          'Activity partners',
          'New-to-city connections',
          'Professional connections',
          'Community events'
        ]::text[]
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'resident_join_requests_connection_styles_check'
  ) THEN
    ALTER TABLE public.resident_join_requests
      ADD CONSTRAINT resident_join_requests_connection_styles_check
      CHECK (
        coalesce(cardinality(connection_styles), 0) BETWEEN 1 AND 6
        AND connection_styles <@ ARRAY[
          'One-on-one',
          'Small groups',
          'Community events',
          'Activity partners',
          'Professional networking'
        ]::text[]
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'resident_join_requests_availability_check'
  ) THEN
    ALTER TABLE public.resident_join_requests
      ADD CONSTRAINT resident_join_requests_availability_check
      CHECK (
        coalesce(cardinality(availability), 0) BETWEEN 1 AND 6
        AND availability <@ ARRAY[
          'Weekday mornings',
          'Weekday evenings',
          'Weekends',
          'Flexible',
          'Workday lunch',
          'Late evenings'
        ]::text[]
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'resident_join_requests_amenity_preferences_check'
  ) THEN
    ALTER TABLE public.resident_join_requests
      ADD CONSTRAINT resident_join_requests_amenity_preferences_check
      CHECK (
        coalesce(cardinality(amenity_preferences), 0) <= 8
        AND amenity_preferences <@ ARRAY[
          'Sky deck',
          'Pool',
          'Game room',
          'Lounge',
          'Gym',
          'Coworking space',
          'Private dining room',
          'Lobby cafe'
        ]::text[]
      );
  END IF;
END $$;
