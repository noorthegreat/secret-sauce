import { NextRequest, NextResponse } from "next/server"

import {
  allowedBudgetFitLabels,
  allowedBudgetPeriods,
  allowedRecommendationSources,
  allowedRecommendationStatuses,
  allowedSuggestionStatuses,
  allowedSuggestionVisibilities,
  getManagerEventPlanningSnapshot,
  saveManagerEventRecommendation,
  updateBuildingEventBudgetSettings,
  updateManagerEventSuggestionStatus,
} from "@/lib/event-planning-server"
import { requireManagerBuilding } from "@/lib/manager-access-server"
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

function asOptionalString(value: unknown) {
  return typeof value === "string" ? value : null
}

function asOptionalNumber(value: unknown) {
  if (typeof value === "number") {
    return value
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === "string")
}

function asDemandSignals(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      label: typeof item.label === "string" ? item.label : "",
      value:
        typeof item.value === "number"
          ? item.value
          : typeof item.value === "string"
            ? Number(item.value)
            : 0,
      source:
        typeof item.source === "string" &&
        ["proposal", "interest", "vote", "waitlist", "rsvp", "feedback"].includes(item.source)
          ? (item.source as "proposal" | "interest" | "vote" | "waitlist" | "rsvp" | "feedback")
          : "proposal",
    }))
}

export async function GET(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"))
    const user = await authenticateResidentAccessToken(token)

    if (!user) {
      return jsonError("Authentication required.", 401)
    }

    const building = await requireManagerBuilding(user)
    const snapshot = await getManagerEventPlanningSnapshot(building.id)

    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("manager-event-planning GET failed", error)

    const message = error instanceof Error ? error.message.toLowerCase() : ""
    const isAccessError =
      message.includes("building-team") ||
      message.includes("pilot request") ||
      message.includes("same work email") ||
      message.includes("manager") ||
      message.includes("subscription")

    return jsonError(
      error instanceof Error ? error.message : "Unable to load event planning.",
      isAccessError ? 403 : 400,
    )
  }
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
      action?: unknown
      recommendationId?: unknown
      suggestionId?: unknown
      eventBudgetAmount?: unknown
      eventBudgetPeriod?: unknown
      preferredEventFrequency?: unknown
      preferredEventTypes?: unknown
      eventPlanningNotes?: unknown
      title?: unknown
      description?: unknown
      estimatedMinCost?: unknown
      estimatedMaxCost?: unknown
      expectedAttendance?: unknown
      recommendedCapacity?: unknown
      suggestedLocation?: unknown
      suggestedTiming?: unknown
      residentInterestSignalsUsed?: unknown
      reasonRecommended?: unknown
      budgetFitLabel?: unknown
      source?: unknown
      status?: unknown
      residentVisibility?: unknown
    }

    const action = typeof body.action === "string" ? body.action.trim() : ""

    if (action === "update_budget") {
      const eventBudgetPeriod =
        typeof body.eventBudgetPeriod === "string" && allowedBudgetPeriods.has(body.eventBudgetPeriod as "monthly" | "yearly")
          ? (body.eventBudgetPeriod as "monthly" | "yearly")
          : null

      const payload = await updateBuildingEventBudgetSettings({
        buildingId: building.id,
        managerUserId: user.id,
        input: {
          eventBudgetAmount: asOptionalNumber(body.eventBudgetAmount),
          eventBudgetPeriod,
          preferredEventFrequency: asOptionalString(body.preferredEventFrequency),
          preferredEventTypes: asStringArray(body.preferredEventTypes),
          eventPlanningNotes: asOptionalString(body.eventPlanningNotes),
        },
      })

      return NextResponse.json(payload, {
        headers: {
          "Cache-Control": "no-store",
        },
      })
    }

    if (action === "save_recommendation") {
      const recommendationId =
        typeof body.recommendationId === "string" ? body.recommendationId.trim() : ""

      if (recommendationId && !uuidPattern.test(recommendationId)) {
        return jsonError("Please choose a valid recommendation draft.", 400)
      }

      const source =
        typeof body.source === "string" && allowedRecommendationSources.has(body.source as never)
          ? (body.source as "manual" | "resident_suggestion" | "ai_draft")
          : undefined
      const status =
        typeof body.status === "string" && allowedRecommendationStatuses.has(body.status as never)
          ? (body.status as "draft" | "proposed" | "approved" | "rejected" | "scheduled")
          : undefined
      const budgetFitLabel =
        typeof body.budgetFitLabel === "string" && allowedBudgetFitLabels.has(body.budgetFitLabel as never)
          ? (body.budgetFitLabel as "within_budget" | "stretch" | "above_budget" | "unknown")
          : undefined

      const payload = await saveManagerEventRecommendation({
        buildingId: building.id,
        recommendationId: recommendationId || null,
        input: {
          title: typeof body.title === "string" ? body.title : "",
          description: asOptionalString(body.description),
          estimatedMinCost: asOptionalNumber(body.estimatedMinCost),
          estimatedMaxCost: asOptionalNumber(body.estimatedMaxCost),
          expectedAttendance: asOptionalNumber(body.expectedAttendance),
          recommendedCapacity: asOptionalNumber(body.recommendedCapacity),
          suggestedLocation: asOptionalString(body.suggestedLocation),
          suggestedTiming: asOptionalString(body.suggestedTiming),
          residentInterestSignalsUsed: asDemandSignals(body.residentInterestSignalsUsed),
          reasonRecommended: asOptionalString(body.reasonRecommended),
          budgetFitLabel,
          source,
          status,
        },
      })

      return NextResponse.json(payload, {
        headers: {
          "Cache-Control": "no-store",
        },
      })
    }

    if (action === "update_suggestion_status") {
      const suggestionId = typeof body.suggestionId === "string" ? body.suggestionId.trim() : ""

      if (!uuidPattern.test(suggestionId)) {
        return jsonError("Please choose a valid resident suggestion.", 400)
      }

      if (typeof body.status !== "string" || !allowedSuggestionStatuses.has(body.status as never)) {
        return jsonError("Please choose a valid resident suggestion status.", 400)
      }

      const residentVisibility =
        typeof body.residentVisibility === "string" &&
        allowedSuggestionVisibilities.has(body.residentVisibility as never)
          ? (body.residentVisibility as "private_to_management" | "visible_for_voting")
          : null

      const payload = await updateManagerEventSuggestionStatus({
        buildingId: building.id,
        suggestionId,
        status: body.status as
          | "submitted"
          | "under_review"
          | "shortlisted"
          | "approved"
          | "rejected"
          | "used_for_event",
        residentVisibility,
      })

      return NextResponse.json(payload, {
        headers: {
          "Cache-Control": "no-store",
        },
      })
    }

    return jsonError("Unsupported manager event-planning action.", 400)
  } catch (error) {
    console.error("manager-event-planning POST failed", error)

    const message = error instanceof Error ? error.message.toLowerCase() : ""
    const isAccessError =
      message.includes("building-team") ||
      message.includes("pilot request") ||
      message.includes("same work email") ||
      message.includes("manager") ||
      message.includes("subscription")

    return jsonError(
      error instanceof Error ? error.message : "Unable to update event planning.",
      isAccessError ? 403 : 400,
    )
  }
}
