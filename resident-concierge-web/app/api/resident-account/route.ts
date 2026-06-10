import { NextRequest, NextResponse } from "next/server"

import {
  authenticateResidentAccessToken,
  getBearerToken,
  persistResidentOnboardingForUser,
  syncResidentAccountForUser,
} from "@/lib/resident-account-server"
import {
  availabilityGridDays,
  availabilitySummaryOptions,
  availabilityTimeBlocks,
  buildAvailabilitySummaryFromGrid,
  connectionStyles,
  hasAvailabilitySelection,
  interestOptions,
  intents,
  normalizeAvailabilityGrid,
  type WeekdayId,
} from "@/lib/concierge-data"

export const dynamic = "force-dynamic"

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  )
}

const allowedInterestIds = new Set(interestOptions.map((interest) => interest.id))
const allowedGoalIds = new Set(intents.map((intent) => intent.id))
const allowedStyleIds = new Set(connectionStyles.map((style) => style.id))
const allowedAvailabilityIds = new Set(availabilitySummaryOptions.map((option) => option.id))
const allowedWeekdayIds = new Set(availabilityGridDays.map((option) => option.id))
const allowedTimeBlockIds = new Set(availabilityTimeBlocks.map((option) => option.id))

export async function GET(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"))
    const user = await authenticateResidentAccessToken(token)

    if (!user) {
      return jsonError("Authentication required.", 401)
    }

    const snapshot = await syncResidentAccountForUser(user)

    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("resident-account GET failed", error)
    return jsonError(error instanceof Error ? error.message : "Unable to load resident account.", 400)
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"))
    const user = await authenticateResidentAccessToken(token)

    if (!user) {
      return jsonError("Authentication required.", 401)
    }

    const body = (await request.json()) as {
      interests?: unknown
      lookingFor?: unknown
      connectionStyles?: unknown
      availability?: unknown
      availabilityGrid?: unknown
      conciergeNote?: unknown
    }

    const selectedInterests = Array.isArray(body.interests)
      ? body.interests.filter((value): value is string => typeof value === "string")
      : []
    const selectedGoals = Array.isArray(body.lookingFor)
      ? body.lookingFor.filter((value): value is string => typeof value === "string")
      : []
    const selectedStyles = Array.isArray(body.connectionStyles)
      ? body.connectionStyles.filter((value): value is string => typeof value === "string")
      : []
    const availabilityGrid = normalizeAvailabilityGrid(body.availabilityGrid)
    const derivedAvailability = buildAvailabilitySummaryFromGrid(availabilityGrid)
    const conciergeNote = typeof body.conciergeNote === "string" ? body.conciergeNote.trim() : ""

    const normalizedInterests = [...new Set(selectedInterests.map((value) => value.trim()))]
    const normalizedGoals = [...new Set(selectedGoals.map((value) => value.trim()))]
    const normalizedStyles = [...new Set(selectedStyles.map((value) => value.trim()))]

    if (
      normalizedInterests.length < 3 ||
      normalizedInterests.length > 10 ||
      normalizedInterests.some((value) => !allowedInterestIds.has(value))
    ) {
      return jsonError("Choose three to ten valid interests.", 400)
    }

    if (
      normalizedGoals.length === 0 ||
      normalizedGoals.some((value) => !allowedGoalIds.has(value))
    ) {
      return jsonError("Choose at least one valid onboarding goal.", 400)
    }

    if (
      normalizedStyles.length === 0 ||
      normalizedStyles.some((value) => !allowedStyleIds.has(value))
    ) {
      return jsonError("Choose at least one valid connection style.", 400)
    }

    if (!hasAvailabilitySelection(availabilityGrid)) {
      return jsonError("Choose at least one real weekly availability window.", 400)
    }

    if (
      derivedAvailability.length === 0 ||
      derivedAvailability.some((value) => !allowedAvailabilityIds.has(value))
    ) {
      return jsonError("Choose a weekly schedule we can actually match around.", 400)
    }

    if (
      Object.keys(availabilityGrid).some((day) => !allowedWeekdayIds.has(day as WeekdayId)) ||
      Object.values(availabilityGrid).some((slots) =>
        slots.some((slot) => !allowedTimeBlockIds.has(slot)),
      )
    ) {
      return jsonError("Please review your availability selections and try again.", 400)
    }

    if (conciergeNote.length > 280) {
      return jsonError("Please keep your concierge note under 280 characters.", 400)
    }

    const snapshot = await persistResidentOnboardingForUser(user, {
      interests: normalizedInterests,
      lookingFor: normalizedGoals,
      connectionStyles: normalizedStyles,
      availability: derivedAvailability,
      availabilityGrid,
      conciergeNote,
    })

    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("resident-account POST failed", error)
    return jsonError(
      error instanceof Error ? error.message : "Unable to save resident onboarding.",
      400,
    )
  }
}
