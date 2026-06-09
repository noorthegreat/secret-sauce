import { NextResponse } from "next/server"

import {
  getCommunityFeed,
  getEmptyCommunityFeed,
  getMockCommunityFeed,
} from "@/lib/community-live"
import { isPreviewFallbackAllowed } from "@/lib/preview-mode"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const snapshot = await getCommunityFeed()
    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("community-feed GET failed", error)

    if (isPreviewFallbackAllowed()) {
      return NextResponse.json(getMockCommunityFeed(), {
        headers: {
          "Cache-Control": "no-store",
          "X-Resident-Concierge-Preview": "mock",
        },
      })
    }

    return NextResponse.json(getEmptyCommunityFeed(), {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
      },
    })
  }
}
