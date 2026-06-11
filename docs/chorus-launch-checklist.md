# Chorus Apartments — Fifth Circle Launch Checklist

Use this checklist to run the first live building pilot with meaningful density and measurable outcomes.

## Pre-launch (building team)

- [ ] Production env configured: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `CRON_SECRET`
- [ ] `RESIDENT_CONCIERGE_BUILDING_SLUG=chorus-apartments` set in production
- [ ] `RESIDENT_CONCIERGE_ALLOW_PREVIEW_FALLBACK` is **not** enabled in production
- [ ] Building record exists with pilot invite code (default demo: `CHORUS`)
- [ ] At least one manager has active `building_memberships` with role `manager`
- [ ] Manager can sign in and load Community Pulse at `/manager/dashboard`
- [ ] First building event drafted and ready to publish

## Resident acquisition (target: 40+ active members)

- [ ] Manager sends private email with join link: `/join-community?invite=CHORUS`
- [ ] Lobby QR code points to the same join link
- [ ] Concierge or front desk script explains: private, opt-in, not a public directory
- [ ] Review queue monitored daily — approve within 48 hours
- [ ] Approved residents receive sign-in link: `/auth?next=%2Fapp%2Fonboarding`

## Week 1 success metrics

| Metric | Target |
|--------|--------|
| Join requests submitted | 60+ |
| Approved residents | 40+ |
| Onboarding completed | 35+ (≥85% of approved) |
| First introductions requested | 10+ |
| Mutual introductions | 5+ |
| Event RSVPs | 15+ |
| Week-2 return (opened app again) | 50% of activated |

## Operator cadence

- **Daily:** Review pending join requests; respond to support queue
- **Twice weekly:** Review introduction queue; mark mutual intros as delivered
- **Weekly:** Publish or promote one gathering; check Community Pulse ROI stats
- **Biweekly:** Share pilot summary with building leadership (opt-in rate, mutual intros, RSVPs)

## Introduction delivery

- [ ] Email notifications fire on: introduction requested, mutual interest, concierge delivered
- [ ] Manager marks mutual introductions as delivered after contact handoff
- [ ] Residents know to schedule meetups in-app after mutual interest

## Security and privacy

- [ ] Residents only see their own building data
- [ ] Mock/preview fallback disabled in production
- [ ] No resident contact details exposed before mutual opt-in (except concierge-delivered handoff)
- [ ] Support reports reviewed within 24 hours

## Post-pilot (week 4)

- [ ] Capture 2 resident quotes and 1 manager quote for landing page
- [ ] Document: opt-in rate, intro → mutual rate, delivered rate, event attendance
- [ ] Decide: expand to second building, deepen Chorus density, or adjust matching cadence
