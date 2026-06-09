import { NextRequest, NextResponse } from "next/server"

import {
  authenticateResidentAccessToken,
  getBearerToken,
} from "@/lib/resident-account-server"
import {
  setResidentIntroductionPauseForUser,
  submitSupportRequestForResident,
  supportRequestCategories,
} from "@/lib/support-live"

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

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"))
    const user = await authenticateResidentAccessToken(token)

    if (!user) {
      return jsonError("Authentication required.", 401)
    }

    const body = (await request.json()) as {
      action?: unknown
      category?: unknown
      subject?: unknown
      message?: unknown
      reportedResidentUserId?: unknown
      paused?: unknown
    }

    if (body.action === "set_pause") {
      if (typeof body.paused !== "boolean") {
        return jsonError("Pause state must be true or false.", 400)
      }

      const snapshot = await setResidentIntroductionPauseForUser(user, body.paused)
      return NextResponse.json(
        {
          paused: snapshot.isPaused,
          snapshot,
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        },
      )
    }

    if (body.action !== "submit_request") {
      return jsonError("Unsupported support action.", 400)
    }

    const category = typeof body.category === "string" ? body.category.trim() : ""
    const subject = typeof body.subject === "string" ? body.subject : null
    const message = typeof body.message === "string" ? body.message : ""
    const reportedResidentUserId =
      typeof body.reportedResidentUserId === "string" ? body.reportedResidentUserId : null

    if (!supportRequestCategories.includes(category as (typeof supportRequestCategories)[number])) {
      return jsonError("Choose a valid support category.", 400)
    }

    if (message.trim().length < 12) {
      return jsonError("Please include a little more detail so the concierge team can help.", 400)
    }

    const submission = await submitSupportRequestForResident(user, {
      category,
      subject,
      message,
      reportedResidentUserId,
    })

    return NextResponse.json(submission, {
      headers: {
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("support POST failed", error)
    return jsonError(
      error instanceof Error ? error.message : "Unable to submit your request.",
      400,
    )
  }
}
