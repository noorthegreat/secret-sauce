import { NextRequest, NextResponse } from "next/server"

import {
  authenticateResidentAccessToken,
  getBearerToken,
} from "@/lib/resident-account-server"
import { requireManagerBuilding } from "@/lib/manager-access-server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

type ResidentRequestStatus = "pending_review" | "approved" | "rejected"

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
      requestId?: string
      status?: ResidentRequestStatus
    }

    const requestId = body.requestId?.trim()
    const status = body.status

    if (!requestId) {
      return jsonError("A resident request id is required.", 400)
    }

    if (!status || !["pending_review", "approved", "rejected"].includes(status)) {
      return jsonError("A valid resident request status is required.", 400)
    }

    const supabase = getSupabaseAdmin()
    const { data: existing, error: loadError } = await supabase
      .from("resident_join_requests")
      .select("id, building_id")
      .eq("id", requestId)
      .eq("building_id", building.id)
      .maybeSingle<{ id: string; building_id: string }>()

    if (loadError) {
      throw new Error("Unable to load the resident request.")
    }

    if (!existing) {
      return jsonError("Resident request not found for this building.", 404)
    }

    const { error: updateError } = await supabase
      .from("resident_join_requests")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq("building_id", building.id)

    if (updateError) {
      throw new Error("Unable to update the resident request.")
    }

    return NextResponse.json(
      {
        ok: true,
        requestId,
        status,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    )
  } catch (error) {
    console.error("manager-resident-requests POST failed", error)

    const message = error instanceof Error ? error.message.toLowerCase() : ""
    const isAccessError =
      message.includes("manager access") ||
      message.includes("authentication") ||
      message.includes("authorized") ||
      message.includes("building-team")

    return jsonError(
      error instanceof Error ? error.message : "Unable to update the resident request.",
      isAccessError ? 403 : 400,
    )
  }
}
