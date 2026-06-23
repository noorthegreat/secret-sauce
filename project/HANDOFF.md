# Fifth Circle — Resident UX Handoff (v2)

This package is the **resident-side** front-end reference for Fifth Circle, deployed for the **Chorus** pilot. It is a design prototype (in-browser React/Babel, mock data, localStorage state) — treat it as the canonical spec, not production code.

**Entry point:** `Fifth Circle App.html` → loads `app/*.jsx` + `app/fc-data.js`.

---

## Who should merge this
**Codex** integrated v1 yesterday and holds the mapping from these screens to the real codebase. This v2 is an **incremental delta on top of v1**, not a fresh build — hand it the "What changed" list below and have it diff, rather than re-integrate from scratch.

---

## What changed since v1 (the delta to merge)
1. **Refinement pass for pilot readiness**
   - Closed the *meet loop*: after a mutual-yes introduction, the resident shares availability → concierge coordinates → confirmation. Progression is visible, not a dead end.
   - Clarified the concierge model: "Matched on what matters / Delivered privately / Only with both yeses" (technology-enabled, privacy-first — not AI-forward, not a dating app).
   - Reduced onboarding friction: streamlined to profile → goals → interests → availability → agreement. Deeper goal-specific questions moved **out of onboarding**.
   - Curated introductions are the hero journey; Circles / Events / Activity are secondary.
2. **Chorus customization** — real resident faces (`img/faces/*`), real amenity photography (`img/amenity-*`), Chorus building identity used sparingly (building profile, welcome, event locations). Fifth Circle remains the primary product brand.
3. **Home goal checklist** ("Before your first introductions") — appears post-onboarding, one step per goal the resident picked, with progress; disappears when complete.
4. **Per-goal "Sharpen your matches"** in the Concierge tab — the relocated goal-detail screens (Activity, Professional, Friendships, Group), with a clear "your matches depend on this" framing.
5. **Per-introduction availability** — the mini calendar appears for each match, prefilled from last time, editable if the schedule changed; persists on send.
6. **Privacy scoped to building-only** for the pilot (Settings value reads "Building only").

---

## Open items for engineering (NOT fixed in this prototype — by design)
1. **Seed/default state** — production should inherit the **refined flow + building-only scope**. Do not carry the "before" onboarding branch or the Tweaks variants into the build.
2. **Availability window is hardcoded** — currently starts Jun 18 2026 (6 days × 3 time bands). Make it roll from the **real current date**.
3. **Mock → real services** — `window.FC` mock data, hand-authored concierge matches, and UI-only verification / notifications / number-sharing all need real backends. The concierge matching engine is faked in the prototype.

## Judgment calls to decide before launch (from the product review)
- **Concierge is outbound-only** — fine for pilot if the real concierge handles replies off-app. Flag if in-app reply is wanted later (post-pilot).
- **Empty / early-week states** — the resident view assumes an active building; week one of a real pilot won't be. Seed first-wave events/intros operationally, or add honest "early days" states to Home and Gatherings.
- **No success-metrics surface** in-app — define the pilot metrics (intros made → accepted → met, event attendance, active residents) and where they're tracked, even if manual. (Resident UX correctly has none; this is a program-level gap.)

## No separate Manager UX exists
Everything here is resident-facing. Manager operations (creating building events, acting on suggestions/demand, Trust & Safety queue, participation metrics) have **no UI** in this package. For the pilot they must be handled out-of-band; a manager console is post-pilot scope.
