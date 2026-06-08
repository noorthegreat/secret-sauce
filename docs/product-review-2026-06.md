# Orbiit — Product Review (June 2026)

> Author: product/engineering review. Method: full source walkthrough of every flow,
> production-database funnel analysis (652 real users, excl. admin/test), and a clean build/run.
> Caveat: no live click-through or rendered-email testing; items marked "verify" are code-review
> hypotheses. All metrics are from the live DB on 2026-06-05.

## TL;DR — the 7 things that matter

1. **Gender liquidity problem: ~1.7:1 male skew (455 men vs 268 women).** For a dating product
   this is the existential metric. It quietly explains the 71% pass rate, churn, and low engagement.
2. **Acquisition is spiky; retention is weak.** Two launch spikes (Oct: 272, Mar: 226) each decayed
   fast. Median user makes only **6 like/pass decisions, ever** — people sample it for ~2 weeks and leave.
3. **~46% of created dates never happen** (41 of 90 cancelled/auto-cancelled). The core value moment
   leaks half its volume; the scheduling flow is too heavy.
4. **The onboarding funnel is genuinely good** — 95% finish the survey, 100% have 3+ photos, 82% make
   at least one decision. The problem is downstream, not acquisition-to-activation.
5. **Friendship mode is effectively dead weight:** 12% did the friendship survey, 17 friendship likes
   ever, 0 friendship matches — yet it doubles complexity (separate surveys, tables, admin tabs, code).
6. **The 36-hour weekly decision window (Mon 00:00–Tue 12:00 Zurich) is too tight** and is the single
   biggest fixable engagement lever.
7. **Engineering foundation is solid but under-instrumented:** 0% test coverage, no error tracking,
   some security gating is client-side only, 1.3 MB face-api un-split, mobile is a web shell.

## Production snapshot (live data, real users only)

| Metric | Value | Read |
|---|---|---|
| Active profiles | 652 (+232 deleted) | ~26% of all accounts ever created are deleted — churn signal |
| Gender split | 455 M / 268 F / 5 NB / 3 — | 1.7:1 male skew ⚠️ |
| Age 20–25 | 66% | Tight student focus ✅ |
| Completed romance survey | 621 (95%) | Onboarding works ✅ |
| Completed friendship survey | 76 (12%) | Underused ⚠️ |
| Have 3+ photos | 652 (100%) | Forced at signup ✅ |
| Made ≥1 like/pass | 535 (82%) | Good activation ✅ |
| Median decisions per user | 6 (avg 8.7, max 81) | Shallow retention ⚠️ |
| Romance like rate | 1,334 likes / 3,340 passes = 28.5% | Selective; women likely flooded |
| Friendship activity | 17 likes / 14 passes, 0 matches | Dead ⚠️ |
| Dates created | 90 → 47 completed (52%), 41 cancelled/auto (46%) | Half leak ⚠️ |
| Avg create→date time | 7.4 days | A full week to meet |
| Events | 5 (1 active), 85 distinct enrollees (13% of base) | Real traction ✅ |
| Signups by month | Oct 272 · Nov 39 · Dec 17 · Jan 9 · Feb 23 · Mar 226 · Apr 37 · May 26 | Spike-and-decay |

## What's working — keep & double down

- **Activation funnel.** Forced 3-photo minimum + production-grade photo validation (EXIF screenshot
  detection, face detection, luminance) + 95% survey completion = high-quality, real profiles.
- **The weekly "drop" ritual** is a good differentiator vs. infinite-swipe. The mechanic is right; the
  window length is wrong.
- **Events.** 13% of the base enrolled in an event — the strongest engagement surface, possibly a
  better wedge than weekly matching (social proof + real-world deadline).
- **Feedback loop + gate** (now automated): requiring feedback to keep matching is a smart engagement/
  data flywheel.
- **Backend quality** — clean RLS separation (private_profile_data), Zurich/DST handling, janitor
  cadence patterns, parameterized queries.

## What's NOT working — ranked by impact

### 1. Gender liquidity (1.7:1 male skew) — existential
Too many men, not enough women is the #1 killer of dating marketplaces. Women get flooded → churn;
men get starved → churn. Likely root cause behind low median engagement and churn.
**Do:** measure match-rate-by-gender; gate male intake or run women-focused acquisition (referrals,
ambassadors, women-only events) until <1.3:1; consider fewer-but-higher-quality matches for men.

### 2. Retention / spiky growth
Median 6 lifetime decisions = sample-and-leave. Two acquisition spikes decayed within weeks → no
organic/viral engine, and the weekly cadence may be too slow to build a habit.
**Do:** instrument real W1/W2/W4 retention cohorts (currently invisible); add re-engagement (push, not
just email); make empty/closed states sell the next drop.

### 3. ~46% of dates die in scheduling
The flow is 8–10 decisions: availability grid → 3 preferences (duration/spending/venue-type) → venue
voting → dual confirmation → phone share. Each step sheds users; the auto-cancel cycle then quietly
kills stalled dates.
**Do:** availability quick-presets; collapse the 3 preferences + venue-vote into one step; show a
visible deadline on the date card; pre-fill availability on reschedule. Target ≤3 decisions to confirm.

### 4. The 36-hour decision window
Mon 00:00 → Tue 12:00 Zurich. Miss Monday and you're out for a week. There's even a disabled
`ONE_TIME_DECISION_EXTENSION_ENABLED` flag — a fossil of past pain.
**Do:** extend to ~72h (through Wednesday). Highest-ROI single fix.

### 5. Friendship mode = complexity tax for ~zero usage
12% survey completion, 17 likes, 0 matches — but it doubles surveys, tables (`friendship_*`), admin
tabs, and branching, and confuses onboarding (`ProfileViewDialog` even defaults to relationship
compatibility for friendship matches).
**Do:** cut it for now (flag) or make it a deliberate, explained mode. Don't leave it half-alive.

### 6. Engineering risks that bite at scale (verify + fix)
Status after the June 2026 hardening pass:
- **Tests — STARTED.** Vitest now runs (`npm test`); the highest-stakes pure logic (Zurich
  weekly-cycle + decision-window, incl. DST) is covered (11 tests). Matching/scheduling integration
  tests remain TODO.
- **Error tracking — PARTIAL.** App-wide `ErrorBoundary` + global handlers + `reportClientError()`
  hook added (no more white-screen crashes). Remote sink (Sentry DSN or a `client_error_logs`
  Supabase table) is a one-step flip — needs the account/decision.
- **Security — FIXED (enrollment).** `event_enrollments` now enforces the survey requirement
  server-side via RLS (migration `20260605140000`); decision window enforced via trigger
  (`20260605130000`). **Rate limiting:** Supabase Auth has built-in limits on auth endpoints
  (tunable in dashboard); custom edge functions still have none — design TODO.
- **Bundle — FIXED.** `manualChunks` + lazy-loaded Admin route: main chunk 2,650 kB → 1,028 kB
  (−61%); admin libs (recharts/leaflet/reactflow ≈ 1.4 MB) load on demand; face-api stays lazy.
- **Mobile — TODO.** Still a web shell: no push, safe-area, or native camera (needs Capacitor
  plugins + native build + device testing). Safe-area is a small change but unverifiable without a
  device: add `viewport-fit=cover` to the viewport meta + `env(safe-area-inset-*)` padding on the
  nav/bottom bars.
- **Emails English-only — TODO.** Needs a per-user `language` preference (no column today) + DE
  translations of ~30 templates. Scoped project, not a quick fix.

## Flow-by-flow (condensed)

- **Onboarding/Auth:** Strong outcome, rough edges — no route-level auth guards (flicker/race); forced
  romance-vs-friendship choice; location mandatory but only used for display; birthday validates only
  on submit.
- **Weekly matching:** Good ritual; too many competing banners (up to 5); countdown doesn't say what
  it counts to; "closed" reads like a bug; decision window not re-validated server-side (verify).
- **Dating/scheduling:** See #3. Dual-confirmation UX is anxiety-inducing; venue-vote tie-break is
  invisible; hard 2-reschedule cap with no appeal.
- **Profile/account:** Penalty/strike + inactivity works but is opaque/punitive — likely a churn
  contributor. Add plain-language explanations + deadlines; soften thresholds.
- **Events:** Best surface, but `event-matcher` is a separate one-off algorithm (maintenance fork) and
  enrollment validation is client-side.
- **Admin:** Powerful but sprawling — 20 tabs, duplicated viewers, a 1,468-line DateManager.

## Redundant / candidates to cut
- Friendship mode (biggest).
- Duplicated logic: feedback-gate in two places; `reschedule_count` vs per-user counts; overlap/venue
  resolution duplicated; two near-identical admin match viewers; per-page session checks (→ AuthContext).
- Dead flags/code: `ONE_TIME_DECISION_EXTENSION_ENABLED`, `temp_disable_matches`, test-only generic-
  photo upload path, stray console.logs.

## Top bugs — verification & resolution (June 2026)
1. **Auto-paused users could still like/pass** — **FIXED.** `handleLike` now blocks paused accounts; `MatchCard` actions disable when `is_paused` (weekly + event). (admin/test still bypass)
2. **Decision window not enforced server-side** — **FIXED.** `BEFORE INSERT` trigger `enforce_decision_window()` on likes/dislikes/friendship_likes/friendship_dislikes (migration `20260605130000`). Enforces Mon 00:00–Tue 12:00 Zurich; exempts service_role, admin/test, and event matches. Client shows the friendly "window closed" message on the backstop rejection.
3. **`event_enrollments` survey gating client-side only** — **FIXED.** RLS `WITH CHECK` now requires the right completed survey via `user_meets_event_survey_requirement()` (migration `20260605140000`), mirroring `Event.tsx` (friendship→friendship survey, else→romantic).
4. **Tainted-canvas fails open in photo validation** — **NOT A BUG.** Validation always runs on a local `File` blob (same-origin); never a cross-origin URL.
5. **Phone-share toggle doesn't check a phone exists** — **FIXED.** `handleTogglePhoneShare` refuses to enable sharing with no number on file.
6. **`ProfileViewDialog` wrong compat for friendship** — **NOT A BUG.** `MatchCard.tsx:74` already passes `match.match_type`.

## Prioritized roadmap

**Now (this month) — engagement & liquidity**
1. Fix the gender ratio (women-focused acquisition + measure match-rate-by-gender).
2. Extend the decision window to ~72h.
3. Simplify scheduling to ≤3 steps.
4. Decide friendship mode's fate.
5. Add Sentry + a retention dashboard.

**Next (1–2 months) — trust & polish**
6. Server-side gating (enrollment RLS, decision-window check) + rate limiting.
7. Push notifications + "matches are live" cadence.
8. Transparent, gentler penalty/inactivity rules.
9. Route guards + AuthContext; soften/defer location.
10. German email templates.

**Later — scale hygiene**
11. Tests on matching/scheduling; code-split face-api; consolidate admin; iOS safe-area + native camera.

## Bottom line
The craft is here — strong profiles, a distinctive ritual, real event traction, clean backend. What's
missing is marketplace health and meet-up conversion: the gender ratio and the leaky, heavy scheduling
flow cost you the magic moment, and retention is currently invisible. Fix liquidity, widen the decision
window, halve the scheduling steps, and instrument retention — those four move the business most.
