import { NextRequest, NextResponse } from "next/server"

import {
  listResidentEventRsvps,
  setResidentEventRsvp,
} from "@/lib/event-engagements-server"
import {
  authenticateResidentAccessToken,
  getBearerToken,
  syncResidentAccountForUser,
} from "@/lib/resident-account-server"

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

export async function GET(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"))
    const user = await authenticateResidentAccessToken(token)
    if (!user) {
      return jsonError("Authentication required.", 401)
    }

    const account = await syncResidentAccountForUser(user)
    if (account.status !== "active" || !account.hasActiveMembership) {
      return jsonError(account.message, 403)
    }

    const rawEventIds = (request.nextUrl.searchParams.get("eventIds") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 24)

    const attending = await listResidentEventRsvps({
      userId: user.id,
      buildingId: account.buildingId,
      eventIds: rawEventIds,
    })

    return NextResponse.json(
      { attending },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    )
  } catch (error) {
    console.error("event-rsvp GET failed", error)
    return jsonError(error instanceof Error ? error.message : "Unable to load RSVP state.", 400)
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"))
    const user = await authenticateResidentAccessToken(token)
    if (!user) {
      return jsonError("Authentication required.", 401)
    }

    const body = (await request.json()) as { eventId?: unknown; attending?: unknown }
    const eventId = typeof body.eventId === "string" ? body.eventId.trim() : ""
    const attending = typeof body.attending === "boolean" ? body.attending : null

    if (!eventId || eventId.length > 100 || attending === null) {
      return jsonError("Invalid RSVP request.", 400)
    }

    const account = await syncResidentAccountForUser(user)
    if (account.status !== "active" || !account.hasActiveMembership) {
      return jsonError(account.message, 403)
    }

    const result = await setResidentEventRsvp({
      userId: user.id,
      buildingId: account.buildingId,
      eventId,
      attending,
      needsSurveyCompletion: account.needsSurveyCompletion,
    })

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("event-rsvp POST failed", error)
    return jsonError(error instanceof Error ? error.message : "Unable to update your RSVP.", 400)
  }
}
