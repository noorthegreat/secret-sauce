import { NextRequest, NextResponse } from "next/server"

import {
  authenticateResidentAccessToken,
  getBearerToken,
  persistResidentOnboardingForUser,
  syncResidentAccountForUser,
} from "@/lib/resident-account-server"
import { connectionStyles, interests, intents } from "@/lib/concierge-data"

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

const allowedInterestSet = new Set(interests)
const intentLabelById = new Map(intents.map((intent) => [intent.id, intent.label]))
const connectionStyleLabelById = new Map(connectionStyles.map((style) => [style.id, style.label]))

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
      intent?: unknown
      connectionStyles?: unknown
      biography?: unknown
    }

    const selectedInterests = Array.isArray(body.interests)
      ? body.interests.filter((value): value is string => typeof value === "string")
      : []
    const selectedIntentIds = Array.isArray(body.intent)
      ? body.intent.filter((value): value is string => typeof value === "string")
      : []
    const selectedConnectionStyleIds = Array.isArray(body.connectionStyles)
      ? body.connectionStyles.filter((value): value is string => typeof value === "string")
      : []
    const biography = typeof body.biography === "string" ? body.biography : ""

    const normalizedInterests = [...new Set(selectedInterests.map((value) => value.trim()))]
    const normalizedIntentIds = [...new Set(selectedIntentIds.map((value) => value.trim()))]
    const normalizedConnectionStyleIds = [
      ...new Set(selectedConnectionStyleIds.map((value) => value.trim())),
    ]

    if (
      normalizedInterests.length === 0 ||
      normalizedInterests.length > 12 ||
      normalizedInterests.some((value) => !allowedInterestSet.has(value))
    ) {
      return jsonError("Choose at least one valid interest.", 400)
    }

    if (
      normalizedIntentIds.length === 0 ||
      normalizedIntentIds.some((value) => !intentLabelById.has(value))
    ) {
      return jsonError("Choose at least one valid onboarding goal.", 400)
    }

    if (
      normalizedConnectionStyleIds.length === 0 ||
      normalizedConnectionStyleIds.some((value) => !connectionStyleLabelById.has(value))
    ) {
      return jsonError("Choose at least one valid connection style.", 400)
    }

    if (biography.trim().length > 400) {
      return jsonError("Please keep your introduction under 400 characters.", 400)
    }

    const snapshot = await persistResidentOnboardingForUser(user, {
      interests: normalizedInterests,
      lookingFor: normalizedIntentIds
        .map((value) => intentLabelById.get(value))
        .filter((value): value is string => Boolean(value)),
      connectionStyles: normalizedConnectionStyleIds
        .map((value) => connectionStyleLabelById.get(value))
        .filter((value): value is string => Boolean(value)),
      biography,
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
