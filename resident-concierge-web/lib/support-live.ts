import type { User } from "@supabase/supabase-js"

import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { syncResidentAccountForUser } from "@/lib/resident-account-server"

export const supportRequestCategories = [
  "harassment",
  "inappropriate_behavior",
  "bug",
  "safety_concern",
  "support_request",
  "other",
] as const

export type SupportRequestCategory = (typeof supportRequestCategories)[number]

export type ManagerSupportRequestItem = {
  id: string
  category: SupportRequestCategory
  status: "open" | "reviewed" | "closed"
  subject: string | null
  messagePreview: string
  submittedAt: string
  residentFirstName: string
  reportedResidentFirstName: string | null
}

type SupportRequestRow = {
  id: string
  building_id: string
  resident_user_id: string
  reported_resident_user_id: string | null
  category: SupportRequestCategory
  status: "open" | "reviewed" | "closed"
  subject: string | null
  message: string
  created_at: string
}

type ResidentProfileRow = {
  id: string
  first_name: string
  building_id: string | null
}

type ResidentMembershipRow = {
  user_id: string
}

function isSupportCategory(value: string): value is SupportRequestCategory {
  return supportRequestCategories.includes(value as SupportRequestCategory)
}

function isMissingSupportTableError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      typeof error.code === "string" &&
      error.code === "42P01",
  )
}

function toPreviewMessage(message: string) {
  const trimmed = message.trim().replace(/\s+/g, " ")
  if (trimmed.length <= 140) {
    return trimmed
  }

  return `${trimmed.slice(0, 137).trimEnd()}...`
}

export async function submitSupportRequestForResident(
  user: User,
  input: {
    category: string
    subject?: string | null
    message: string
    reportedResidentUserId?: string | null
  },
) {
  const snapshot = await syncResidentAccountForUser(user)

  if (snapshot.status !== "active" || !snapshot.hasActiveMembership) {
    throw new Error(snapshot.message)
  }

  if (!isSupportCategory(input.category)) {
    throw new Error("Choose a valid support category.")
  }

  const subject = input.subject?.trim() || null
  const message = input.message.trim()
  const reportedResidentUserId = input.reportedResidentUserId?.trim() || null

  if (subject && subject.length > 120) {
    throw new Error("Keep the subject under 120 characters.")
  }

  if (message.length < 12 || message.length > 2000) {
    throw new Error("Please share between 12 and 2000 characters.")
  }

  if (reportedResidentUserId) {
    if (reportedResidentUserId === user.id) {
      throw new Error("You cannot submit a report about your own account.")
    }

    const supabase = getSupabaseAdmin()
    const [{ data: targetMembership, error: membershipError }, { data: targetProfile, error: profileError }] =
      await Promise.all([
        supabase
          .from("building_memberships")
          .select("user_id")
          .eq("building_id", snapshot.buildingId)
          .eq("user_id", reportedResidentUserId)
          .eq("role", "resident")
          .eq("status", "active")
          .maybeSingle<ResidentMembershipRow>(),
        supabase
          .from("profiles")
          .select("id, first_name, building_id")
          .eq("id", reportedResidentUserId)
          .maybeSingle<ResidentProfileRow>(),
      ])

    if (membershipError || profileError) {
      throw new Error("Unable to verify the resident referenced in this request.")
    }

    if (!targetMembership || !targetProfile || targetProfile.building_id !== snapshot.buildingId) {
      throw new Error("Reports can only reference an active resident in your building.")
    }
  }

  const { data, error } = await getSupabaseAdmin()
    .from("building_support_requests")
    .insert({
      building_id: snapshot.buildingId,
      resident_user_id: user.id,
      reported_resident_user_id: reportedResidentUserId,
      category: input.category,
      subject,
      message,
      status: "open",
      updated_at: new Date().toISOString(),
    })
    .select("id, category, status, created_at")
    .maybeSingle<{
      id: string
      category: SupportRequestCategory
      status: "open" | "reviewed" | "closed"
      created_at: string
    }>()

  if (error || !data) {
    if (isMissingSupportTableError(error)) {
      throw new Error("Support reporting is still being configured for this building.")
    }

    throw new Error("Unable to send your request right now.")
  }

  return {
    id: data.id,
    category: data.category,
    status: data.status,
    submittedAt: data.created_at,
  }
}

export async function setResidentIntroductionPauseForUser(user: User, paused: boolean) {
  const snapshot = await syncResidentAccountForUser(user)

  if (snapshot.status !== "active" || !snapshot.hasActiveMembership) {
    throw new Error(snapshot.message)
  }

  const { error } = await getSupabaseAdmin()
    .from("profiles")
    .update({
      is_paused: paused,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)

  if (error) {
    throw new Error("Unable to update your introduction availability.")
  }

  return syncResidentAccountForUser(user)
}

export async function getManagerSupportRequestsForBuilding(buildingId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("building_support_requests")
    .select(
      "id, building_id, resident_user_id, reported_resident_user_id, category, status, subject, message, created_at",
    )
    .eq("building_id", buildingId)
    .order("created_at", { ascending: false })
    .limit(8)
    .returns<SupportRequestRow[]>()

  if (error) {
    if (isMissingSupportTableError(error)) {
      return {
        supportQueue: [] as ManagerSupportRequestItem[],
        supportCategoryBreakdown: [] as { label: string; value: number }[],
      }
    }

    throw new Error("Unable to load resident support requests.")
  }

  const rows = data ?? []
  const residentIds = Array.from(
    new Set(
      rows.flatMap((row) => [row.resident_user_id, row.reported_resident_user_id].filter(Boolean) as string[]),
    ),
  )

  const { data: profiles, error: profilesError } = residentIds.length
    ? await getSupabaseAdmin()
        .from("profiles")
        .select("id, first_name, building_id")
        .in("id", residentIds)
        .returns<ResidentProfileRow[]>()
    : { data: [] as ResidentProfileRow[], error: null }

  if (profilesError) {
    throw new Error("Unable to load resident support requests.")
  }

  const profileNameById = new Map<string, string>()
  for (const profile of profiles ?? []) {
    profileNameById.set(profile.id, profile.first_name?.trim() || "Resident")
  }

  const categoryCounts = new Map<string, number>()
  for (const row of rows) {
    categoryCounts.set(row.category, (categoryCounts.get(row.category) ?? 0) + 1)
  }

  return {
    supportQueue: rows.map((row) => ({
      id: row.id,
      category: row.category,
      status: row.status,
      subject: row.subject?.trim() || null,
      messagePreview: toPreviewMessage(row.message),
      submittedAt: row.created_at,
      residentFirstName: profileNameById.get(row.resident_user_id) ?? "Resident",
      reportedResidentFirstName: row.reported_resident_user_id
        ? profileNameById.get(row.reported_resident_user_id) ?? "Resident"
        : null,
    })),
    supportCategoryBreakdown: [...categoryCounts.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([label, value]) => ({ label: label.replaceAll("_", " "), value })),
  }
}
