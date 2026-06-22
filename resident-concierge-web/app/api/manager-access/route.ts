import { NextRequest, NextResponse } from "next/server"

import {
  authenticateResidentAccessToken,
  getBearerToken,
} from "@/lib/resident-account-server"
import { resolveManagerBuildingAccess } from "@/lib/manager-access-server"

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

    const access = await resolveManagerBuildingAccess(user)

    return NextResponse.json(
      {
        state: access.state,
        message: access.message,
        buildingName: access.building?.name ?? null,
        buildingSlug: access.building?.slug ?? null,
        isAdmin: access.isAdmin,
        isManager: access.isManager,
        provisionedNow: access.provisionedNow,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    )
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to resolve manager access.",
      400,
    )
  }
}
