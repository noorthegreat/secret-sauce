import { NextRequest, NextResponse } from "next/server"

import {
  authenticateResidentAccessToken,
  getBearerToken,
} from "@/lib/resident-account-server"
import { listIntroductionsForResident } from "@/lib/introductions-live"
import { isPreviewFallbackAllowed } from "@/lib/preview-mode"

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

    if (!user?.email) {
      return jsonError("Authentication required.", 401)
    }

    const payload = await listIntroductionsForResident(user)

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("introductions GET failed", error)

    if (isPreviewFallbackAllowed()) {
      return NextResponse.json(
        {
          buildingId: "preview-building",
          buildingName: "Fifth Circle",
          introductions: [],
        },
        {
          headers: {
            "Cache-Control": "no-store",
            "X-Resident-Concierge-Preview": "empty",
          },
        },
      )
    }

    return jsonError(
      error instanceof Error ? error.message : "Unable to load introductions.",
      400,
    )
  }
}
