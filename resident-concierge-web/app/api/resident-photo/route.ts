import { NextRequest, NextResponse } from "next/server"

import {
  authenticateResidentAccessToken,
  getBearerToken,
  syncResidentAccountForUser,
} from "@/lib/resident-account-server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

const bucketName = "resident-profile-photos"
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"])
const maxFileSizeBytes = 5 * 1024 * 1024

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

function fileExtensionForMimeType(mimeType: string) {
  if (mimeType === "image/png") {
    return "png"
  }

  if (mimeType === "image/webp") {
    return "webp"
  }

  return "jpg"
}

async function ensurePhotoBucket() {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.storage.getBucket(bucketName)

  if (!error && data) {
    return
  }

  const { error: createError } = await supabase.storage.createBucket(bucketName, {
    public: true,
    fileSizeLimit: `${maxFileSizeBytes}`,
    allowedMimeTypes: Array.from(allowedMimeTypes),
  })

  if (createError && !createError.message.toLowerCase().includes("already")) {
    throw new Error("Unable to prepare photo storage for onboarding.")
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"))
    const user = await authenticateResidentAccessToken(token)

    if (!user) {
      return jsonError("Authentication required.", 401)
    }

    const snapshot = await syncResidentAccountForUser(user)
    if (snapshot.status !== "active" || !snapshot.hasActiveMembership) {
      return jsonError(snapshot.message, 403)
    }

    const formData = await request.formData()
    const file = formData.get("photo")

    if (!(file instanceof File)) {
      return jsonError("Choose a photo before continuing.", 400)
    }

    if (!allowedMimeTypes.has(file.type)) {
      return jsonError("Use a JPG, PNG, or WebP image for your resident photo.", 400)
    }

    if (file.size > maxFileSizeBytes) {
      return jsonError("Please keep your photo under 5MB.", 400)
    }

    await ensurePhotoBucket()

    const bytes = new Uint8Array(await file.arrayBuffer())
    const extension = fileExtensionForMimeType(file.type)
    const objectPath = `${user.id}/profile-${Date.now()}.${extension}`
    const supabase = getSupabaseAdmin()

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(objectPath, bytes, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: true,
      })

    if (uploadError) {
      throw new Error("Unable to upload your photo right now.")
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucketName).getPublicUrl(objectPath)

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        photo_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (profileError) {
      throw new Error("Your photo uploaded, but we could not attach it to your profile.")
    }

    return NextResponse.json(
      { photoUrl: publicUrl },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    )
  } catch (error) {
    console.error("resident-photo POST failed", error)
    return jsonError(
      error instanceof Error ? error.message : "Unable to save your resident photo.",
      400,
    )
  }
}
