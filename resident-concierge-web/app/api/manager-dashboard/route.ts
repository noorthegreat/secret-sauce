import { NextRequest, NextResponse } from "next/server"

import {
  authenticateResidentAccessToken,
  getBearerToken,
} from "@/lib/resident-account-server"
import { requireManagerBuilding } from "@/lib/manager-access-server"
import { getManagerDashboardSnapshotForBuilding } from "@/lib/manager-dashboard-live"

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

    const building = await requireManagerBuilding(user)

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

    const message = error instanceof Error ? error.message.toLowerCase() : ""
    const isAccessError =
      message.includes("manager access") ||
      message.includes("authentication") ||
      message.includes("authorized") ||
      message.includes("building-team") ||
      message.includes("pilot request") ||
      message.includes("same work email") ||
      message.includes("subscription")

    return jsonError(
      error instanceof Error ? error.message : "Unable to load manager dashboard.",
      isAccessError ? 403 : 400,
    )
  }
}
