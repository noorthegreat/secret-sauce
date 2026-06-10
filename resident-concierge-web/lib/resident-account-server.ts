import type { User } from "@supabase/supabase-js"

import {
  buildAvailabilitySummaryFromGrid,
  normalizeAvailabilityGrid,
  type AvailabilityGrid,
} from "@/lib/concierge-data"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export type ResidentAccountStatus =
  | "active"
  | "pending_review"
  | "rejected"
  | "withdrawn"
  | "not_found"
  | "building_inactive"
  | "conflict"

export type ResidentAccountSnapshot = {
  status: ResidentAccountStatus
  buildingId: string
  buildingName: string
  buildingSlug: string
  message: string
  residentEmail: string
  hasActiveMembership: boolean
  completedQuestionnaire: boolean
  completedFriendshipQuestionnaire: boolean
  needsSurveyCompletion: boolean
  isPaused: boolean
}

type BuildingRow = {
  id: string
  name: string
  slug: string
  is_active: boolean
}

type JoinRequestRow = {
  id: string
  building_id: string
  first_name: string
  last_name: string
  email: string
  normalized_email: string
  phone_number: string
  unit_number: string
  status: "pending_review" | "approved" | "rejected" | "withdrawn"
  introduction: string | null
  interests?: string[] | null
  looking_for?: string[] | null
  connection_styles?: string[] | null
  availability?: string[] | null
  availability_grid?: Record<string, unknown> | null
  wants_friendships?: boolean | null
  wants_networking?: boolean | null
}

type ProfileRow = {
  id: string
  first_name: string
  bio: string | null
  completed_questionnaire: boolean | null
  completed_friendship_questionnaire: boolean | null
  is_paused: boolean | null
  building_id: string | null
}

type PrivateProfileRow = {
  user_id: string
  email: string | null
  last_name: string | null
  phone_number: string | null
}

type MembershipRow = {
  building_id: string
  role: string
  status: string
}

function getBuildingSlug() {
  return (process.env.RESIDENT_CONCIERGE_BUILDING_SLUG ?? "chorus-apartments").trim().toLowerCase()
}

export function getBearerToken(authorizationHeader: string | null) {
  const authorization = authorizationHeader ?? ""
  if (!authorization.startsWith("Bearer ")) {
    return null
  }

  const token = authorization.slice("Bearer ".length).trim()
  return token || null
}

export async function authenticateResidentAccessToken(token: string | null) {
  if (!token) {
    return null
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    return null
  }

  return data.user
}

async function getConfiguredBuilding() {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("buildings")
    .select("id, name, slug, is_active")
    .eq("slug", getBuildingSlug())
    .maybeSingle<BuildingRow>()

  if (error || !data) {
    throw new Error("Unable to load configured building.")
  }

  return data
}

async function getActiveResidentMembership(userId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("building_memberships")
    .select("building_id, role, status")
    .eq("user_id", userId)
    .eq("role", "resident")
    .eq("status", "active")
    .returns<MembershipRow[]>()

  if (error) {
    throw new Error("Unable to verify resident membership.")
  }

  return data ?? []
}

async function getJoinRequest(buildingId: string, normalizedEmail: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("resident_join_requests")
    .select(
      "id, building_id, first_name, last_name, email, normalized_email, phone_number, unit_number, status, introduction, interests, looking_for, connection_styles, availability, availability_grid, wants_friendships, wants_networking",
    )
    .eq("building_id", buildingId)
    .eq("normalized_email", normalizedEmail)
    .maybeSingle<JoinRequestRow>()

  if (error) {
    throw new Error("Unable to load the resident approval record.")
  }

  return data
}

async function ensureProfileData(user: User, buildingId: string, request: JoinRequestRow) {
  const supabase = getSupabaseAdmin()
  const nowIso = new Date().toISOString()

  const [{ data: profile }, { data: privateProfile }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, bio, completed_questionnaire, completed_friendship_questionnaire, is_paused, building_id")
      .eq("id", user.id)
      .maybeSingle<ProfileRow>(),
    supabase
      .from("private_profile_data")
      .select("user_id, email, last_name, phone_number")
      .eq("user_id", user.id)
      .maybeSingle<PrivateProfileRow>(),
  ])

  if (profile) {
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: profile.first_name?.trim() || request.first_name,
        bio: profile.bio?.trim() || request.introduction?.trim() || null,
        building_id: buildingId,
        updated_at: nowIso,
      })
      .eq("id", user.id)

    if (error) {
      throw new Error("Unable to update the resident profile.")
    }
  } else {
    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      first_name: request.first_name,
      bio: request.introduction?.trim() || null,
      completed_questionnaire: false,
      completed_friendship_questionnaire: false,
      is_paused: false,
      building_id: buildingId,
      updated_at: nowIso,
    })

    if (error) {
      throw new Error("Unable to create the resident profile.")
    }
  }

  if (privateProfile) {
    const { error } = await supabase
      .from("private_profile_data")
      .update({
        email: privateProfile.email?.trim() || request.normalized_email,
        last_name: privateProfile.last_name?.trim() || request.last_name,
        phone_number: privateProfile.phone_number?.trim() || request.phone_number,
        updated_at: nowIso,
      })
      .eq("user_id", user.id)

    if (error) {
      throw new Error("Unable to update the resident contact profile.")
    }
  } else {
    const { error } = await supabase.from("private_profile_data").insert({
      user_id: user.id,
      email: request.normalized_email,
      last_name: request.last_name,
      phone_number: request.phone_number,
      updated_at: nowIso,
    })

    if (error) {
      throw new Error("Unable to create the resident contact profile.")
    }
  }
}

async function ensureBuildingMembership(userId: string, buildingId: string) {
  const supabase = getSupabaseAdmin()
  const nowIso = new Date().toISOString()

  const { error } = await supabase.from("building_memberships").upsert(
    {
      building_id: buildingId,
      user_id: userId,
      role: "resident",
      status: "active",
      joined_at: nowIso,
      updated_at: nowIso,
    },
    {
      onConflict: "building_id,user_id",
    },
  )

  if (error) {
    throw new Error("Unable to activate the building membership.")
  }
}

async function getProfileCompletionState(userId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("profiles")
    .select("completed_questionnaire, completed_friendship_questionnaire, is_paused")
    .eq("id", userId)
    .maybeSingle<ProfileRow>()

  if (error || !data) {
    throw new Error("Unable to verify the resident profile.")
  }

  const completedQuestionnaire = Boolean(data.completed_questionnaire)
  const completedFriendshipQuestionnaire = Boolean(data.completed_friendship_questionnaire)

  return {
    completedQuestionnaire,
    completedFriendshipQuestionnaire,
    needsSurveyCompletion: !completedQuestionnaire && !completedFriendshipQuestionnaire,
    isPaused: Boolean(data.is_paused),
  }
}

export type ResidentOnboardingSubmission = {
  interests: string[]
  lookingFor: string[]
  connectionStyles: string[]
  availability: string[]
  availabilityGrid: AvailabilityGrid
  conciergeNote?: string
}

export async function persistResidentOnboardingForUser(
  user: User,
  submission: ResidentOnboardingSubmission,
): Promise<ResidentAccountSnapshot> {
  const snapshot = await syncResidentAccountForUser(user)

  if (snapshot.status !== "active" || !snapshot.hasActiveMembership) {
    throw new Error(snapshot.message)
  }

  const normalizedEmail = user.email?.trim().toLowerCase()
  if (!normalizedEmail) {
    throw new Error("Your account is missing an email address.")
  }

  const joinRequest = await getJoinRequest(snapshot.buildingId, normalizedEmail)
  if (!joinRequest || joinRequest.status !== "approved") {
    throw new Error("An approved resident record is required before completing onboarding.")
  }

  const supabase = getSupabaseAdmin()
  const nowIso = new Date().toISOString()
  const trimmedConciergeNote = submission.conciergeNote?.trim() || joinRequest.introduction?.trim() || null
  const normalizedAvailabilityGrid = normalizeAvailabilityGrid(submission.availabilityGrid)
  const normalizedAvailability = buildAvailabilitySummaryFromGrid(normalizedAvailabilityGrid)
  const wantsFriendships = submission.lookingFor.some((value) =>
    ["friendships", "activity_partners", "community_involvement"].includes(value),
  )
  const wantsNetworking = submission.lookingFor.some((value) => value === "professional_networking")

  const [{ error: profileError }, { error: requestError }] = await Promise.all([
    supabase
      .from("profiles")
      .update({
        bio: trimmedConciergeNote,
        completed_questionnaire: true,
        completed_friendship_questionnaire: true,
        updated_at: nowIso,
      })
      .eq("id", user.id),
    supabase
      .from("resident_join_requests")
      .update({
        introduction: trimmedConciergeNote,
        interests: submission.interests,
        looking_for: submission.lookingFor,
        connection_styles: submission.connectionStyles,
        availability: normalizedAvailability.length > 0 ? normalizedAvailability : submission.availability,
        availability_grid: normalizedAvailabilityGrid,
        wants_friendships: wantsFriendships,
        wants_networking: wantsNetworking,
        updated_at: nowIso,
      })
      .eq("id", joinRequest.id),
  ])

  if (profileError) {
    throw new Error("Unable to save your resident profile.")
  }

  if (requestError) {
    throw new Error("Unable to save your onboarding preferences.")
  }

  const completion = await getProfileCompletionState(user.id)

  return {
    ...snapshot,
    message: `Your Resident Concierge account is active for ${snapshot.buildingName}.`,
    completedQuestionnaire: completion.completedQuestionnaire,
    completedFriendshipQuestionnaire: completion.completedFriendshipQuestionnaire,
    needsSurveyCompletion: completion.needsSurveyCompletion,
    isPaused: completion.isPaused,
  }
}

export async function syncResidentAccountForUser(user: User): Promise<ResidentAccountSnapshot> {
  const normalizedEmail = user.email?.trim().toLowerCase()
  if (!normalizedEmail) {
    throw new Error("Your account is missing an email address.")
  }

  const building = await getConfiguredBuilding()

  if (!building.is_active) {
    return {
      status: "building_inactive",
      buildingId: building.id,
      buildingName: building.name,
      buildingSlug: building.slug,
      residentEmail: normalizedEmail,
      message: `${building.name} is still being set up. We will unlock resident access once the building goes live.`,
      hasActiveMembership: false,
      completedQuestionnaire: false,
      completedFriendshipQuestionnaire: false,
      needsSurveyCompletion: false,
      isPaused: false,
    }
  }

  const activeMemberships = await getActiveResidentMembership(user.id)
  const activeMembership = activeMemberships[0]

  if (activeMembership && activeMembership.building_id !== building.id) {
    return {
      status: "conflict",
      buildingId: building.id,
      buildingName: building.name,
      buildingSlug: building.slug,
      residentEmail: normalizedEmail,
      message:
        "This account is already active in a different building community. For the beta, one resident account can only belong to one live building.",
      hasActiveMembership: false,
      completedQuestionnaire: false,
      completedFriendshipQuestionnaire: false,
      needsSurveyCompletion: false,
      isPaused: false,
    }
  }

  const joinRequest = await getJoinRequest(building.id, normalizedEmail)

  if (!joinRequest) {
    return {
      status: "not_found",
      buildingId: building.id,
      buildingName: building.name,
      buildingSlug: building.slug,
      residentEmail: normalizedEmail,
      message: "We could not find a resident request for this email in the current building.",
      hasActiveMembership: false,
      completedQuestionnaire: false,
      completedFriendshipQuestionnaire: false,
      needsSurveyCompletion: false,
      isPaused: false,
    }
  }

  if (joinRequest.status === "pending_review") {
    return {
      status: "pending_review",
      buildingId: building.id,
      buildingName: building.name,
      buildingSlug: building.slug,
      residentEmail: normalizedEmail,
      message: "Your resident request is still under review by the building team.",
      hasActiveMembership: false,
      completedQuestionnaire: false,
      completedFriendshipQuestionnaire: false,
      needsSurveyCompletion: false,
      isPaused: false,
    }
  }

  if (joinRequest.status === "rejected") {
    return {
      status: "rejected",
      buildingId: building.id,
      buildingName: building.name,
      buildingSlug: building.slug,
      residentEmail: normalizedEmail,
      message: "This resident request was not approved. Please contact the building team for help.",
      hasActiveMembership: false,
      completedQuestionnaire: false,
      completedFriendshipQuestionnaire: false,
      needsSurveyCompletion: false,
      isPaused: false,
    }
  }

  if (joinRequest.status === "withdrawn") {
    return {
      status: "withdrawn",
      buildingId: building.id,
      buildingName: building.name,
      buildingSlug: building.slug,
      residentEmail: normalizedEmail,
      message: "This resident request is no longer active.",
      hasActiveMembership: false,
      completedQuestionnaire: false,
      completedFriendshipQuestionnaire: false,
      needsSurveyCompletion: false,
      isPaused: false,
    }
  }

  await ensureProfileData(user, building.id, joinRequest)
  await ensureBuildingMembership(user.id, building.id)
  const completion = await getProfileCompletionState(user.id)

  return {
    status: "active",
    buildingId: building.id,
    buildingName: building.name,
    buildingSlug: building.slug,
    residentEmail: normalizedEmail,
    message: completion.needsSurveyCompletion
      ? `Your Resident Concierge access is live for ${building.name}. Complete your profile to unlock better introductions and event matching.`
      : `Your Resident Concierge account is active for ${building.name}.`,
    hasActiveMembership: true,
    completedQuestionnaire: completion.completedQuestionnaire,
    completedFriendshipQuestionnaire: completion.completedFriendshipQuestionnaire,
    needsSurveyCompletion: completion.needsSurveyCompletion,
    isPaused: completion.isPaused,
  }
}
