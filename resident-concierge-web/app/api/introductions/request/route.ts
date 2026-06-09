import { NextRequest, NextResponse } from "next/server"

import {
  authenticateResidentAccessToken,
  getBearerToken,
} from "@/lib/resident-account-server"
import {
  requestIntroductionForResident,
  type IntroductionType,
} from "@/lib/introductions-live"

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

function isIntroductionType(value: string): value is IntroductionType {
  return value === "friendship" || value === "professional"
}

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"))
    const user = await authenticateResidentAccessToken(token)

    if (!user?.email) {
      return jsonError("Authentication required.", 401)
    }

    const body = (await request.json()) as {
      targetUserId?: string
      introType?: string
    }

    const targetUserId = body.targetUserId?.trim() ?? ""
    const introType = body.introType?.trim() ?? "friendship"

    if (!uuidPattern.test(targetUserId)) {
      return jsonError("Please choose a valid resident to introduce.", 400)
    }

    if (!isIntroductionType(introType)) {
      return jsonError("Unsupported introduction type.", 400)
    }

    const payload = await requestIntroductionForResident(user, targetUserId, introType)

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("introductions request POST failed", error)

    return jsonError(
      error instanceof Error ? error.message : "Unable to request the introduction.",
      400,
    )
  }
}
