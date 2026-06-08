-- B2 "could-flex" availability. Each user can mark some slots as "free if needed"
-- (a softer yes). To avoid any front-end/back-end divergence, the existing
-- user{1,2}_availability columns keep storing the FULL set the person would
-- accept (firm + flex) — so the venue/overlap engine is unchanged and still sees
-- everything. These new columns simply mark which of those slots are the soft
-- ones, so the UI can prefer firm↔firm matches and only fall back to flex.
--
-- Shape mirrors availability: { "<weekday 0-6>": [slotIndex, ...] }.

ALTER TABLE public.dates
  ADD COLUMN IF NOT EXISTS user1_flex_slots jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS user2_flex_slots jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.dates.user1_flex_slots IS
  'Subset of user1_availability the user marked as "could-flex / if needed". Same {weekday:[slots]} shape. UI prefers firm matches and only uses these as a fallback.';
COMMENT ON COLUMN public.dates.user2_flex_slots IS
  'Subset of user2_availability the user marked as "could-flex / if needed". Same {weekday:[slots]} shape. UI prefers firm matches and only uses these as a fallback.';
