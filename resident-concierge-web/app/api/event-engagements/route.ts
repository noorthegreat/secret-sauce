import { NextRequest, NextResponse } from "next/server"

import {
  getResidentEventEngagementState,
  saveResidentEventFeedback,
  saveResidentEventProposal,
  setResidentEventRsvp,
  setResidentEventSignal,
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

function clampText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim().slice(0, maxLength)
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

    const snapshot = await getResidentEventEngagementState({
      userId: user.id,
      buildingId: account.buildingId,
    })

    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("event-engagements GET failed", error)
    return jsonError(
      error instanceof Error ? error.message : "Unable to load event engagement state.",
      400,
    )
  }
}

export async function POST(request: NextRequest) {
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

    const body = (await request.json()) as {
      action?: unknown
      eventId?: unknown
      active?: unknown
      attending?: unknown
      title?: unknown
      detail?: unknown
      rating?: unknown
    }

    const action = typeof body.action === "string" ? body.action.trim() : ""

    if (action === "proposal") {
      const title = clampText(body.title, 120)
      const detail = clampText(body.detail, 600)

      if (title.length < 4) {
        return jsonError("Please add a clear title for the resident gathering idea.", 400)
      }

      const result = await saveResidentEventProposal({
        userId: user.id,
        buildingId: account.buildingId,
        title,
        detail: detail || null,
      })

      return NextResponse.json(result, {
        headers: {
          "Cache-Control": "no-store",
        },
      })
    }

    if (action === "vote" || action === "interest" || action === "waitlist") {
      const eventId = typeof body.eventId === "string" ? body.eventId.trim() : ""
      const active = typeof body.active === "boolean" ? body.active : true

      if (!eventId) {
        return jsonError("Please choose a valid gathering.", 400)
      }

      const result = await setResidentEventSignal({
        userId: user.id,
        buildingId: account.buildingId,
        eventId,
        engagementType: action,
        active,
      })

      return NextResponse.json(result, {
        headers: {
          "Cache-Control": "no-store",
        },
      })
    }

    if (action === "feedback") {
      const eventId = typeof body.eventId === "string" ? body.eventId.trim() : ""
      const detail = clampText(body.detail, 600)
      const rating = typeof body.rating === "number" ? Math.trunc(body.rating) : Number.NaN

      if (!eventId) {
        return jsonError("Please choose a valid gathering.", 400)
      }

      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return jsonError("Please choose a feedback rating between 1 and 5.", 400)
      }

      const result = await saveResidentEventFeedback({
        userId: user.id,
        buildingId: account.buildingId,
        eventId,
        rating,
        detail: detail || null,
      })

      return NextResponse.json(result, {
        headers: {
          "Cache-Control": "no-store",
        },
      })
    }

    if (action === "rsvp") {
      const eventId = typeof body.eventId === "string" ? body.eventId.trim() : ""
      const attending = typeof body.attending === "boolean" ? body.attending : null

      if (!eventId || attending === null) {
        return jsonError("Please review the RSVP request and try again.", 400)
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
    }

    return jsonError("Unsupported event engagement action.", 400)
  } catch (error) {
    console.error("event-engagements POST failed", error)
    return jsonError(
      error instanceof Error ? error.message : "Unable to save event engagement.",
      400,
    )
  }
}
