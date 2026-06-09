# Resident Concierge Backend Map

This project already has the backend foundation needed for the Resident Concierge beta. The safest implementation path is to reuse the existing schema and keep the v0 app as the visual source of truth.

## Source Of Truth

- Supabase project ref: `ddkdcvtueawvjshavxfx`
- Existing repo: `secret-sauce`
- Integration strategy: read existing schema first, keep amenities mocked, avoid duplicate tables

## Domain Mapping

### Residents

- `profiles`
- `private_profile_data`
- `building_memberships`
- `resident_join_requests`

Use `profiles` and `private_profile_data` for active resident accounts. Use `building_memberships` to scope users to a building and identify resident vs. manager roles. Use `resident_join_requests` for intake, preferences, and early demand signals before a resident becomes a fully active member.

### Events

- `events`
- `event_enrollments`

The `events` table is already building-aware. This should remain the shared event model for web and mobile.

### Building / Community

- `buildings`
- `building_memberships`
- `building_subscriptions`
- `user_roles`

Use `buildings` as the building container. Use `building_memberships` for access control and scoped community membership. Use `building_subscriptions` for billing and plan metadata. Use `user_roles` only for higher-level admin authorization.

### Intake / Sales

- `building_manager_leads`
- `public_intake_attempts`
- `resident_join_requests`

These tables already support the manager lead flow and resident onboarding intake.

## Still Mocked For Now

- amenities
- amenity import flow
- amenity-specific analytics

There is no dedicated first-class `amenities` table yet, so these parts should stay mocked until we intentionally design that model.

## Safest Live Screens To Wire First

1. Manager dashboard data summaries from:
   - `buildings`
   - `building_memberships`
   - `resident_join_requests`
   - `events`
2. Building welcome and resident community event lists from:
   - `buildings`
   - `events`
3. Admin/manager resident intake review from:
   - `resident_join_requests`

## Caution

- `building_subscriptions` appears admin-only today, so some billing/plan data may be restricted in manager-facing client views.
- `building_manager_leads` should stay admin-focused rather than being exposed broadly in the product UI.
- Public manager dashboard routes should remain preview-only unless we intentionally add a safe read path.
