DO $$
DECLARE
  v_building_id uuid;
BEGIN
  INSERT INTO public.buildings (
    name,
    slug,
    city,
    state_region,
    country_code,
    timezone,
    invite_code,
    is_active,
    metadata
  )
  VALUES (
    'Chorus Apartments',
    'chorus-apartments',
    'San Francisco',
    'CA',
    'US',
    'America/Los_Angeles',
    'CHORUS',
    true,
    jsonb_build_object(
      'brandName', 'Resident Concierge',
      'launchMode', 'beta',
      'communityType', 'luxury-residential',
      'suggestedAmenities', jsonb_build_array('Sky deck', 'Pool', 'Game room')
    )
  )
  ON CONFLICT (slug)
  DO UPDATE SET
    city = EXCLUDED.city,
    state_region = EXCLUDED.state_region,
    country_code = EXCLUDED.country_code,
    timezone = EXCLUDED.timezone,
    invite_code = EXCLUDED.invite_code,
    is_active = EXCLUDED.is_active,
    metadata = EXCLUDED.metadata,
    updated_at = now()
  RETURNING id INTO v_building_id;

  INSERT INTO public.building_subscriptions (
    building_id,
    status,
    plan_code,
    billing_interval,
    monthly_fee_cents,
    resident_capacity,
    started_at
  )
  VALUES (
    v_building_id,
    'trial',
    'pilot',
    'monthly',
    0,
    250,
    now()
  )
  ON CONFLICT (building_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    plan_code = EXCLUDED.plan_code,
    billing_interval = EXCLUDED.billing_interval,
    resident_capacity = EXCLUDED.resident_capacity,
    updated_at = now();
END $$;
