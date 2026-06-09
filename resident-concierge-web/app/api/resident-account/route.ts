import { NextRequest, NextResponse } from "next/server"

import {
  authenticateResidentAccessToken,
  getBearerToken,
  syncResidentAccountForUser,
} from "@/lib/resident-account-server"

export const dynamic = "force-dynamic"

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function GET(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"))
    const user = await authenticateResidentAccessToken(token)

    if (!user) {
      return jsonError("Authentication required.", 401)
    }

    const snapshot = await syncResidentAccountForUser(user)

    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("resident-account GET failed", error)
    return jsonError(error instanceof Error ? error.message : "Unable to load resident account.", 400)
  }
}
