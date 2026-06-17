import { NextRequest, NextResponse } from "next/server"

import {
  allowedSuggestionCategories,
  allowedSuggestionSupportTypes,
  allowedSuggestionVisibilities,
  createResidentEventSuggestion,
  deleteResidentEventSuggestion,
  getResidentVisibleEventSuggestions,
  updateResidentEventSuggestion,
  upsertResidentSuggestionSupport,
} from "@/lib/event-planning-server"
import {
  authenticateResidentAccessToken,
  getBearerToken,
  syncResidentAccountForUser,
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

async function requireActiveResident(request: NextRequest) {
  const token = getBearerToken(request.headers.get("authorization"))
  const user = await authenticateResidentAccessToken(token)

  if (!user) {
    throw new Error("Authentication required.")
  }

  const account = await syncResidentAccountForUser(user)
  if (account.status !== "active" || !account.hasActiveMembership) {
    throw new Error(account.message)
  }

  return {
    user,
    account,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user, account } = await requireActiveResident(request)
    const snapshot = await getResidentVisibleEventSuggestions({
      userId: user.id,
      buildingId: account.buildingId,
    })

    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("event-suggestions GET failed", error)
    const message = error instanceof Error ? error.message : "Unable to load resident suggestions."
    const status =
      message === "Authentication required."
        ? 401
        : message.includes("active") || message.includes("review")
          ? 403
          : 400

    return jsonError(message, status)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, account } = await requireActiveResident(request)
    const body = (await request.json()) as {
      action?: unknown
      suggestionId?: unknown
      category?: unknown
      title?: unknown
      description?: unknown
      whyResidentsWouldLikeIt?: unknown
      suggestedForEventType?: unknown
      estimatedCostRange?: unknown
      contactInfo?: unknown
      websiteOrSocialLink?: unknown
      location?: unknown
      residentVisibility?: unknown
      supportType?: unknown
      optionalComment?: unknown
    }

    const action = typeof body.action === "string" ? body.action.trim() : ""

    if (action === "create_suggestion" || action === "update_suggestion") {
      if (typeof body.category !== "string" || !allowedSuggestionCategories.has(body.category as never)) {
        return jsonError("Please choose a valid suggestion category.", 400)
      }

      const residentVisibility =
        typeof body.residentVisibility === "string" &&
        allowedSuggestionVisibilities.has(body.residentVisibility as never)
          ? (body.residentVisibility as "private_to_management" | "visible_for_voting")
          : "private_to_management"

      if (action === "create_suggestion") {
        const payload = await createResidentEventSuggestion({
          userId: user.id,
          buildingId: account.buildingId,
          input: {
            category: body.category as
              | "venue"
              | "food_truck"
              | "caterer"
              | "dj_performer"
              | "fitness_instructor"
              | "wellness_provider"
              | "artist"
              | "local_business"
              | "workshop"
              | "pop_up"
              | "other",
            title: typeof body.title === "string" ? body.title : "",
            description: asOptionalString(body.description),
            whyResidentsWouldLikeIt: asOptionalString(body.whyResidentsWouldLikeIt),
            suggestedForEventType: asOptionalString(body.suggestedForEventType),
            estimatedCostRange: asOptionalString(body.estimatedCostRange),
            contactInfo: asOptionalString(body.contactInfo),
            websiteOrSocialLink: asOptionalString(body.websiteOrSocialLink),
            location: asOptionalString(body.location),
            residentVisibility,
          },
        })

        return NextResponse.json(payload, {
          headers: {
            "Cache-Control": "no-store",
          },
        })
      }

      const suggestionId = typeof body.suggestionId === "string" ? body.suggestionId.trim() : ""
      if (!uuidPattern.test(suggestionId)) {
        return jsonError("Please choose a valid resident suggestion.", 400)
      }

      const payload = await updateResidentEventSuggestion({
        userId: user.id,
        buildingId: account.buildingId,
        suggestionId,
        input: {
          category: body.category as
            | "venue"
            | "food_truck"
            | "caterer"
            | "dj_performer"
            | "fitness_instructor"
            | "wellness_provider"
            | "artist"
            | "local_business"
            | "workshop"
            | "pop_up"
            | "other",
          title: typeof body.title === "string" ? body.title : "",
          description: asOptionalString(body.description),
          whyResidentsWouldLikeIt: asOptionalString(body.whyResidentsWouldLikeIt),
          suggestedForEventType: asOptionalString(body.suggestedForEventType),
          estimatedCostRange: asOptionalString(body.estimatedCostRange),
          contactInfo: asOptionalString(body.contactInfo),
          websiteOrSocialLink: asOptionalString(body.websiteOrSocialLink),
          location: asOptionalString(body.location),
          residentVisibility,
        },
      })

      return NextResponse.json(payload, {
        headers: {
          "Cache-Control": "no-store",
        },
      })
    }

    if (action === "delete_suggestion") {
      const suggestionId = typeof body.suggestionId === "string" ? body.suggestionId.trim() : ""
      if (!uuidPattern.test(suggestionId)) {
        return jsonError("Please choose a valid resident suggestion.", 400)
      }

      const payload = await deleteResidentEventSuggestion({
        userId: user.id,
        buildingId: account.buildingId,
        suggestionId,
      })

      return NextResponse.json(payload, {
        headers: {
          "Cache-Control": "no-store",
        },
      })
    }

    if (action === "set_support") {
      const suggestionId = typeof body.suggestionId === "string" ? body.suggestionId.trim() : ""
      if (!uuidPattern.test(suggestionId)) {
        return jsonError("Please choose a valid resident suggestion.", 400)
      }

      if (typeof body.supportType !== "string" || !allowedSuggestionSupportTypes.has(body.supportType as never)) {
        return jsonError("Please choose a valid support signal.", 400)
      }

      const payload = await upsertResidentSuggestionSupport({
        userId: user.id,
        buildingId: account.buildingId,
        suggestionId,
        supportType: body.supportType as "interested" | "love_this" | "would_attend" | "not_for_me",
        optionalComment: asOptionalString(body.optionalComment),
      })

      return NextResponse.json(payload, {
        headers: {
          "Cache-Control": "no-store",
        },
      })
    }

    return jsonError("Unsupported resident event suggestion action.", 400)
  } catch (error) {
    console.error("event-suggestions POST failed", error)
    const message = error instanceof Error ? error.message : "Unable to save the resident suggestion."
    const status =
      message === "Authentication required."
        ? 401
        : message.includes("active") || message.includes("review")
          ? 403
          : 400

    return jsonError(message, status)
  }
}
