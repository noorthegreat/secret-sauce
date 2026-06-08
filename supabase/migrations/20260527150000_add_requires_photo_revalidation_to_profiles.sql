-- Suspension flag for user accounts that need to re-prove their photos meet
-- our content standards (real photo of the person, not screenshots / scenery /
-- blanks) before they're allowed back into matching.
--
-- Set by an admin when pausing a user for content reasons. Cleared
-- automatically by the reactivation flow once the user's current
-- additional_photos all re-pass strict validation. As long as this flag is
-- true, a user CANNOT self-reactivate from the Matches page — the gate is in
-- handleReactivate (src/pages/Matches.tsx).
--
-- Independent from is_paused (which is the generic "not currently matching"
-- state and self-reversible). A user can be paused without being
-- revalidation-locked; revalidation-locked implies paused.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS requires_photo_revalidation boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.requires_photo_revalidation IS
  'When true, the user cannot self-reactivate from pause until their current additional_photos all pass strict validation (incl. face detection). Set by admin when suspending for photo content reasons; cleared by the reactivation flow on success.';
