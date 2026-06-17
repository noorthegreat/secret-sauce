import { NextRequest, NextResponse } from "next/server"

import {
  authenticateResidentAccessToken,
  type FlexibleOnboardingObject,
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function sanitizeStringList(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value)) {
    return []
  }

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => item.slice(0, maxLength)),
    ),
  ).slice(0, maxItems)
}

function sanitizeFlexibleValue(
  value: unknown,
  depth = 0,
): FlexibleOnboardingObject[keyof FlexibleOnboardingObject] | undefined {
  if (depth > 2) {
    return undefined
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed ? trimmed.slice(0, 280) : undefined
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined
  }

  if (typeof value === "boolean") {
    return value
  }

  if (value === null) {
    return null
  }

  if (Array.isArray(value)) {
    const items = sanitizeStringList(value, 16, 80)
    return items.length > 0 ? items : undefined
  }

  if (isPlainObject(value)) {
    const next: FlexibleOnboardingObject = {}

    for (const [key, nestedValue] of Object.entries(value).slice(0, 16)) {
      const normalizedKey = key.trim().slice(0, 64)
      if (!normalizedKey) {
        continue
      }

      const sanitized = sanitizeFlexibleValue(nestedValue, depth + 1)
      if (sanitized !== undefined) {
        next[normalizedKey] = sanitized
      }
    }

    return Object.keys(next).length > 0 ? next : undefined
  }

  return undefined
}

function sanitizeFlexibleObject(value: unknown) {
  const sanitized = sanitizeFlexibleValue(value, 0)
  return isPlainObject(sanitized) ? sanitized : {}
}

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
      profileBasics?: unknown
      compatibilityPrompts?: unknown
      activityPreferences?: unknown
      networkingPreferences?: unknown
      introPreferences?: unknown
      consentState?: unknown
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
    const profileBasics = sanitizeFlexibleObject(body.profileBasics)
    const compatibilityPrompts = sanitizeFlexibleObject(body.compatibilityPrompts)
    const activityPreferences = sanitizeStringList(body.activityPreferences, 16, 80)
    const networkingPreferences = sanitizeFlexibleObject(body.networkingPreferences)
    const introPreferences = sanitizeFlexibleObject(body.introPreferences)
    const consentState = sanitizeFlexibleObject(body.consentState)

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
      profileBasics,
      compatibilityPrompts,
      activityPreferences,
      networkingPreferences,
      introPreferences,
      consentState,
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
