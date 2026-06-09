import { NextRequest, NextResponse } from "next/server"

import {
  authenticateResidentAccessToken,
  getBearerToken,
  syncResidentAccountForUser,
} from "@/lib/resident-account-server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

type EventRow = {
  id: string
  name: string
  slug: string | null
  building_id: string
  active: boolean
  matching_mode: string | null
}

type ProfileRow = {
  completed_questionnaire: boolean | null
  completed_friendship_questionnaire: boolean | null
}

function getBuildingSlug() {
  return (process.env.RESIDENT_CONCIERGE_BUILDING_SLUG ?? "chorus-apartments").trim().toLowerCase()
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

async function getConfiguredBuildingId() {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("buildings")
    .select("id")
    .eq("slug", getBuildingSlug())
    .maybeSingle<BuildingRow>()

  if (error || !data) {
    throw new Error("Unable to load configured building.")
  }

  return data.id
}

async function assertMembership(userId: string, buildingId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("building_memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("building_id", buildingId)
    .eq("status", "active")
    .maybeSingle<{ id: string }>()

  if (error || !data) {
    throw new Error("Only active building members can RSVP.")
  }
}

function getRequiredSurveyMode(matchingMode: string | null) {
  if (matchingMode === "friendship") {
    return "friendship"
  }

  return "relationship"
}

async function assertSurveyEligibility(userId: string, event: EventRow) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("profiles")
    .select("completed_questionnaire, completed_friendship_questionnaire")
    .eq("id", userId)
    .maybeSingle<ProfileRow>()

  if (error || !data) {
    throw new Error("Complete your resident profile before signing up for events.")
  }

  const requiredMode = getRequiredSurveyMode(event.matching_mode)
  const eligible =
    requiredMode === "friendship"
      ? Boolean(data.completed_friendship_questionnaire)
      : Boolean(data.completed_questionnaire)

  if (!eligible) {
    throw new Error(
      requiredMode === "friendship"
        ? "Complete the friendship survey before RSVPing to this event."
        : "Complete the compatibility survey before RSVPing to this event.",
    )
  }
}

async function getScopedEvent(eventId: string, buildingId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("events")
    .select("id, name, slug, building_id, active, matching_mode")
    .eq("id", eventId)
    .eq("building_id", buildingId)
    .eq("active", true)
    .maybeSingle<EventRow>()

  if (error || !data) {
    throw new Error("That event is unavailable.")
  }

  return data
}

export async function GET(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"))
    const user = await authenticateResidentAccessToken(token)
    if (!user) {
      return jsonError("Authentication required.", 401)
    }

    const account = await syncResidentAccountForUser(user)
    if (account.status !== "active") {
      return jsonError(account.message, 403)
    }

    const buildingId = account.buildingId

    const rawEventIds = (request.nextUrl.searchParams.get("eventIds") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 24)

    const supabase = getSupabaseAdmin()
    let enrollmentQuery = supabase
      .from("event_enrollments")
      .select("event_id")
      .eq("user_id", user.id)
      .not("event_id", "is", null)

    if (rawEventIds.length > 0) {
      enrollmentQuery = enrollmentQuery.in("event_id", rawEventIds)
    }

    const { data: enrollments, error: enrollmentError } = await enrollmentQuery.returns<
      Array<{ event_id: string | null }>
    >()

    if (enrollmentError) {
      throw new Error("Unable to load RSVP state.")
    }

    const eventIds = (enrollments ?? [])
      .map((row) => row.event_id)
      .filter((value): value is string => Boolean(value))

    if (eventIds.length === 0) {
      return NextResponse.json({ attending: [] }, { headers: { "Cache-Control": "no-store" } })
    }

    const { data: scopedEvents, error: eventError } = await supabase
      .from("events")
      .select("id")
      .eq("building_id", buildingId)
      .in("id", eventIds)
      .eq("active", true)
      .returns<Array<{ id: string }>>()

    if (eventError) {
      throw new Error("Unable to load RSVP state.")
    }

    const allowedEventIds = new Set((scopedEvents ?? []).map((event) => event.id))

    return NextResponse.json(
      {
        attending: eventIds.filter((eventId) => allowedEventIds.has(eventId)),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    )
  } catch (error) {
    console.error("event-rsvp GET failed", error)
    return jsonError(error instanceof Error ? error.message : "Unable to load RSVP state.", 400)
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"))
    const user = await authenticateResidentAccessToken(token)
    if (!user) {
      return jsonError("Authentication required.", 401)
    }

    const body = (await request.json()) as { eventId?: unknown; attending?: unknown }
    const eventId = typeof body.eventId === "string" ? body.eventId.trim() : ""
    const attending = typeof body.attending === "boolean" ? body.attending : null

    if (!eventId || eventId.length > 100 || attending === null) {
      return jsonError("Invalid RSVP request.", 400)
    }

    const account = await syncResidentAccountForUser(user)
    if (account.status !== "active") {
      return jsonError(account.message, 403)
    }

    const event = await getScopedEvent(eventId, account.buildingId)
    const supabase = getSupabaseAdmin()

    if (attending) {
      await assertSurveyEligibility(user.id, event)

      const { error } = await supabase.from("event_enrollments").upsert(
        {
          user_id: user.id,
          event_id: event.id,
          event_name: event.slug?.trim() || event.name,
        },
        {
          onConflict: "user_id,event_id",
        },
      )

      if (error) {
        throw new Error("Unable to save your RSVP.")
      }
    } else {
      const { error } = await supabase
        .from("event_enrollments")
        .delete()
        .eq("user_id", user.id)
        .eq("event_id", event.id)

      if (error) {
        throw new Error("Unable to update your RSVP.")
      }
    }

    return NextResponse.json(
      {
        attending,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    )
  } catch (error) {
    console.error("event-rsvp POST failed", error)
    return jsonError(error instanceof Error ? error.message : "Unable to update your RSVP.", 400)
  }
}
