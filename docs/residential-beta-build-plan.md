# Secret Sauce Residential Beta Build Plan

## Product Direction

Secret Sauce is a private resident community platform for luxury apartment buildings.

The beta is:

- friendship and networking only
- manager-led
- scoped to one building community at a time
- sold as a monthly subscription to the property manager or operator

Residents opt in to their building's private community, complete a lightweight onboarding flow, receive compatible introductions, RSVP to events, and suggest future activities.

Managers create events, review suggestions, and see engagement analytics for their building.

## Beta Success Criteria

- residents can only access their own building's data
- managers can manage only their own building community
- residents can onboard and receive community-relevant match suggestions
- managers can create events and review resident suggestions
- analytics are building-scoped and useful in a sales pilot

## Build Principles

- multi-tenancy comes first
- security boundaries come before UI polish
- keep the beta narrow and concierge-feeling
- prefer SMS/email introduction flows over full in-app chat
- preserve user privacy and avoid oversharing resident data

## What We Can Reuse

- auth and session flows
- profile setup and questionnaire patterns
- existing matching pipeline structure
- event CRUD and RSVP patterns
- admin dashboard shell and analytics cards
- email/notification infrastructure

## What Must Change

- replace campus or student assumptions with building communities
- thread `building_id` through profiles, events, manager tools, and analytics
- move from global admin concepts toward building-scoped manager access
- reframe all copy around friendship, networking, and community
- remove dating-specific assumptions from user-facing surfaces

## Recommended Implementation Order

### Phase 1: Tenancy Foundation

- create `buildings`
- create `building_memberships`
- add nullable `building_id` to `profiles`
- add nullable `building_id` to `events`
- add helper functions for building membership checks
- keep changes additive first, then tighten RLS once UI flows are migrated

### Phase 2: Resident Core Experience

- replace onboarding copy and profile fields for residential use
- add building join flow via invite code or manager-issued link
- build resident home page around community, introductions, and events
- adapt matches to friendship/networking only
- generate introduction reasons from shared interests and goals

### Phase 3: Manager Product

- building-scoped admin dashboard
- event management
- resident suggestion review queue
- engagement metrics: opt-ins, active users, intro accepts, RSVPs, suggestions

### Phase 4: Pilot Delivery

- branding pass
- Chorus-specific amenity setup
- SMS or email intro delivery
- launch checklist and QA

## Immediate Next Steps

1. Add the multi-tenant schema foundation.
2. Add a building join mechanism.
3. Introduce building-aware query helpers and server checks.
4. Create a minimal building manager dashboard shell.
5. Rework the landing and onboarding copy for residential positioning.

## Security Notes

- all resident-facing queries must be scoped to the authenticated resident's building
- managers should only access buildings where they hold a manager membership
- avoid exposing private resident details before mutual opt-in
- never rely on client-side filtering for building isolation
- SMS delivery must require explicit consent and clear opt-out handling
