import { NextRequest, NextResponse } from "next/server"

import {
  getAuthorizedManagerBuilding,
  saveManagerEventForBuilding,
  setManagerEventStateForBuilding,
} from "@/lib/manager-dashboard-live"
import {
  authenticateResidentAccessToken,
  getBearerToken,
} from "@/lib/resident-account-server"

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

function parseOptionalIsoDate(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed
}

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"))
    const user = await authenticateResidentAccessToken(token)

    if (!user) {
      return jsonError("Authentication required.", 401)
    }

    const building = await getAuthorizedManagerBuilding(user.id)

    if (!building) {
      return jsonError(
        "Only authenticated building managers or admins can manage events.",
        403,
      )
    }

    const body = (await request.json()) as {
      action?: string
      eventId?: string
      name?: string
      description?: string
      venueName?: string
      startDate?: string
      endDate?: string
    }

    const action = body.action?.trim() ?? ""
    const eventId = body.eventId?.trim() ?? ""

    if (action === "save") {
      const name = body.name?.trim() ?? ""
      if (!name) {
        return jsonError("Event name is required.", 400)
      }

      const startDate = body.startDate ?? null
      const endDate = body.endDate ?? null
      const parsedStart = parseOptionalIsoDate(startDate)
      const parsedEnd = parseOptionalIsoDate(endDate)

      if (startDate && !parsedStart) {
        return jsonError("Please choose a valid start date and time.", 400)
      }

      if (endDate && !parsedEnd) {
        return jsonError("Please choose a valid end date and time.", 400)
      }

      if (parsedStart && parsedEnd && parsedEnd.getTime() < parsedStart.getTime()) {
        return jsonError("Event end time must be after the start time.", 400)
      }

      const payload = await saveManagerEventForBuilding({
        buildingId: building.id,
        eventId: eventId || null,
        input: {
          name,
          description: body.description ?? null,
          venueName: body.venueName ?? null,
          startDate,
          endDate,
        },
      })

      return NextResponse.json(payload, {
        headers: {
          "Cache-Control": "no-store",
        },
      })
    }

    if (action === "publish" || action === "close") {
      if (!uuidPattern.test(eventId)) {
        return jsonError("Please choose a valid event.", 400)
      }

      const payload = await setManagerEventStateForBuilding({
        buildingId: building.id,
        eventId,
        state: action === "publish" ? "published" : "closed",
      })

      return NextResponse.json(payload, {
        headers: {
          "Cache-Control": "no-store",
        },
      })
    }

    return jsonError("Unsupported manager event action.", 400)
  } catch (error) {
    console.error("manager-events POST failed", error)

    return jsonError(
      error instanceof Error ? error.message : "Unable to manage the event.",
      400,
    )
  }
}
