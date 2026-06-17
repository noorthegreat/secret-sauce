import { NextRequest, NextResponse } from "next/server"

import {
  markIntroductionDeliveredForBuilding,
} from "@/lib/manager-dashboard-live"
import {
  authenticateResidentAccessToken,
  getBearerToken,
} from "@/lib/resident-account-server"
import { requireManagerBuilding } from "@/lib/manager-access-server"

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

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"))
    const user = await authenticateResidentAccessToken(token)

    if (!user) {
      return jsonError("Authentication required.", 401)
    }

    const building = await requireManagerBuilding(user)

    const body = (await request.json()) as {
      introductionId?: string
      action?: string
    }

    const introductionId = body.introductionId?.trim() ?? ""
    const action = body.action?.trim() ?? ""

    if (!uuidPattern.test(introductionId)) {
      return jsonError("Please choose a valid introduction.", 400)
    }

    if (action !== "mark_delivered") {
      return jsonError("Unsupported manager introduction action.", 400)
    }

    const payload = await markIntroductionDeliveredForBuilding({
      buildingId: building.id,
      introductionId,
    })

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("manager-introductions POST failed", error)

    const message = error instanceof Error ? error.message.toLowerCase() : ""
    const isAccessError =
      message.includes("building-team") ||
      message.includes("pilot request") ||
      message.includes("same work email") ||
      message.includes("manager") ||
      message.includes("subscription")

    return jsonError(
      error instanceof Error
        ? error.message
        : "Unable to update the concierge introduction.",
      isAccessError ? 403 : 400,
    )
  }
}
