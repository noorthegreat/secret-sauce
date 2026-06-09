import { NextRequest, NextResponse } from "next/server"

import {
  authenticateResidentAccessToken,
  getBearerToken,
  syncResidentAccountForUser,
} from "@/lib/resident-account-server"
import {
  getMockResidentPreviewSnapshot,
  getResidentPreviewSnapshot,
} from "@/lib/resident-preview-live"
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

    const account = await syncResidentAccountForUser(user)

    if (account.status !== "active" || !account.hasActiveMembership) {
      return jsonError(account.message, 403)
    }

    const snapshot = await getResidentPreviewSnapshot({
      userId: user.id,
      residentEmail: user.email.trim().toLowerCase(),
      buildingId: account.buildingId,
      buildingName: account.buildingName,
    })

    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("resident-preview GET failed", error)

    if (isPreviewFallbackAllowed()) {
      return NextResponse.json(getMockResidentPreviewSnapshot(), {
        headers: {
          "Cache-Control": "no-store",
          "X-Resident-Concierge-Preview": "mock",
        },
      })
    }

    return jsonError(
      error instanceof Error ? error.message : "Unable to load resident preview.",
      400,
    )
  }
}
