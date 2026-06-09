import { NextRequest, NextResponse } from "next/server"

import {
  authenticateResidentAccessToken,
  getBearerToken,
} from "@/lib/resident-account-server"
import { respondToIntroductionForResident } from "@/lib/introductions-live"

export const dynamic = "force-dynamic"

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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

function isResponseAction(value: string): value is "accepted" | "declined" | "paused" {
  return value === "accepted" || value === "declined" || value === "paused"
}

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"))
    const user = await authenticateResidentAccessToken(token)

    if (!user?.email) {
      return jsonError("Authentication required.", 401)
    }

    const body = (await request.json()) as {
      introductionId?: string
      action?: string
    }

    const introductionId = body.introductionId?.trim() ?? ""
    const action = body.action?.trim() ?? ""

    if (!uuidPattern.test(introductionId)) {
      return jsonError("Please choose a valid introduction.", 400)
    }

    if (!isResponseAction(action)) {
      return jsonError("Unsupported introduction response.", 400)
    }

    const payload = await respondToIntroductionForResident(user, introductionId, action)

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("introductions respond POST failed", error)

    return jsonError(
      error instanceof Error ? error.message : "Unable to update the introduction.",
      400,
    )
  }
}
