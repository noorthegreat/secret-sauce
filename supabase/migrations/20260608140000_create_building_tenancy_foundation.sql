-- Foundation for building-scoped residential communities.
-- This migration is intentionally additive so the existing app keeps working
-- while the product is being reshaped around private building communities.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'app_role'
  ) THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'test');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.has_role(
  _user_id uuid,
  _role public.app_role
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = _role
  )
$$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL DEFAULT 'Resident' CHECK (char_length(first_name) BETWEEN 1 AND 80),
  bio text,
  photo_url text,
  additional_photos text[] DEFAULT '{}'::text[],
  completed_questionnaire boolean NOT NULL DEFAULT false,
  completed_friendship_questionnaire boolean NOT NULL DEFAULT false,
  is_paused boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Untitled event',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  city text,
  state_region text,
  country_code text CHECK (country_code IS NULL OR char_length(country_code) = 2),
  address_line1 text,
  address_line2 text,
  postal_code text,
  timezone text NOT NULL DEFAULT 'America/Los_Angeles',
  invite_code text UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS public.building_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('resident', 'manager')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'suspended')),
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  joined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (building_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_buildings_active_slug
  ON public.buildings (is_active, slug);

CREATE INDEX IF NOT EXISTS idx_building_memberships_user_id
  ON public.building_memberships (user_id);

CREATE INDEX IF NOT EXISTS idx_building_memberships_building_id_role_status
  ON public.building_memberships (building_id, role, status);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS building_id uuid REFERENCES public.buildings(id) ON DELETE SET NULL;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS building_id uuid REFERENCES public.buildings(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_profiles_building_id
  ON public.profiles (building_id);

CREATE INDEX IF NOT EXISTS idx_events_building_id
  ON public.events (building_id);

CREATE OR REPLACE FUNCTION public.current_building_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.building_id
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_building_member(
  _building_id uuid,
  _user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.building_memberships bm
    WHERE bm.building_id = _building_id
      AND bm.user_id = _user_id
      AND bm.status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_building_manager(
  _building_id uuid,
  _user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.building_memberships bm
    WHERE bm.building_id = _building_id
      AND bm.user_id = _user_id
      AND bm.role = 'manager'
      AND bm.status = 'active'
  )
  OR public.has_role(_user_id, 'admin')
$$;

ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_memberships ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'buildings'
      AND policyname = 'Members can read their building'
  ) THEN
    CREATE POLICY "Members can read their building"
      ON public.buildings
      FOR SELECT
      USING (public.is_building_member(id) OR public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'buildings'
      AND policyname = 'Managers can manage their building'
  ) THEN
    CREATE POLICY "Managers can manage their building"
      ON public.buildings
      FOR ALL
      USING (public.is_building_manager(id))
      WITH CHECK (public.is_building_manager(id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'building_memberships'
      AND policyname = 'Users can read memberships in their building'
  ) THEN
    CREATE POLICY "Users can read memberships in their building"
      ON public.building_memberships
      FOR SELECT
      USING (
        public.is_building_member(building_id)
        OR public.has_role(auth.uid(), 'admin')
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'building_memberships'
      AND policyname = 'Managers can manage memberships in their building'
  ) THEN
    CREATE POLICY "Managers can manage memberships in their building"
      ON public.building_memberships
      FOR ALL
      USING (public.is_building_manager(building_id))
      WITH CHECK (public.is_building_manager(building_id));
  END IF;
END $$;
