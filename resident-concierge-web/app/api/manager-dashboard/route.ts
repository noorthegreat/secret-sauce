import { NextRequest, NextResponse } from "next/server"

import {
  authenticateResidentAccessToken,
  getBearerToken,
} from "@/lib/resident-account-server"
import {
  getAuthorizedManagerBuilding,
  getMockManagerDashboardSnapshot,
  getManagerDashboardSnapshotForBuilding,
} from "@/lib/manager-dashboard-live"
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

    if (!user) {
      return jsonError("Authentication required.", 401)
    }

    const building = await getAuthorizedManagerBuilding(user.id)

    if (!building) {
      return jsonError(
        "Only authenticated building managers or admins can access Community Pulse.",
        403,
      )
    }

    const snapshot = await getManagerDashboardSnapshotForBuilding({
      buildingId: building.id,
      buildingName: building.name,
    })

    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("manager-dashboard GET failed", error)

    if (isPreviewFallbackAllowed()) {
      return NextResponse.json(getMockManagerDashboardSnapshot(), {
        headers: {
          "Cache-Control": "no-store",
          "X-Resident-Concierge-Preview": "mock",
        },
      })
    }

    return jsonError(
      error instanceof Error ? error.message : "Unable to load manager dashboard.",
      400,
    )
  }
}
