import { track } from "@vercel/analytics"

type ProductEvent =
  | "join_request_submitted"
  | "building_pilot_requested"
  | "resident_signed_in"
  | "onboarding_completed"
  | "introduction_requested"
  | "introduction_responded"
  | "meetup_scheduled"
  | "event_rsvp"
  | "manager_intro_delivered"

export function trackProductEvent(
  name: ProductEvent,
  properties?: Record<string, string | number | boolean>,
) {
  if (process.env.NODE_ENV !== "production") {
    return
  }

  track(name, properties)
}
