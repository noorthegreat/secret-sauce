import type { User } from "@supabase/supabase-js"

import type {
  IntroductionDecision,
  IntroductionListResult,
  IntroductionPreview,
  IntroductionStatus,
  IntroductionType,
} from "@/lib/introduction-types"
import { syncResidentAccountForUser } from "@/lib/resident-account-server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

type BuildingIntroductionRow = {
  id: string
  building_id: string
  resident_a_user_id: string
  resident_b_user_id: string
  intro_type: IntroductionType
  status: IntroductionStatus
  source: string
  requested_by_user_id: string | null
  resident_a_decision: IntroductionDecision
  resident_b_decision: IntroductionDecision
  suggested_at: string
  mutual_at: string | null
  delivered_at: string | null
  compatibility_summary: string | null
  shared_context: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

type MembershipRow = {
  user_id: string
}

type ProfileRow = {
  id: string
  first_name: string
  bio: string | null
  photo_url: string | null
  is_paused: boolean | null
}

type PrivateProfileRow = {
  user_id: string
  email: string | null
}

type JoinRequestRow = {
  normalized_email: string
  interests: string[] | null
  looking_for: string[] | null
  connection_styles: string[] | null
}

type ResidentDirectoryEntry = {
  userId: string
  firstName: string
  bio: string | null
  photoUrl: string | null
  isPaused: boolean
  interests: string[]
  lookingFor: string[]
  connectionStyles: string[]
}


function normalizeResidentPair(userIdA: string, userIdB: string) {
  if (userIdA === userIdB) {
    throw new Error("Residents cannot introduce themselves.")
  }

  return userIdA < userIdB
    ? { residentAUserId: userIdA, residentBUserId: userIdB }
    : { residentAUserId: userIdB, residentBUserId: userIdA }
}

function isIntroductionType(value: string): value is IntroductionType {
  return value === "friendship" || value === "professional"
}

function isPositiveDecision(decision: IntroductionDecision) {
  return decision === "accepted" || decision === "requested"
}

function uniqueValues(values: string[] | null | undefined) {
  return Array.from(
    new Set(
      (values ?? [])
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  )
}

function intersection(left: string[], right: string[]) {
  const rightSet = new Set(right)
  return left.filter((value) => rightSet.has(value))
}

function getCurrentDecisionColumn(currentUserId: string, row: BuildingIntroductionRow) {
  return currentUserId === row.resident_a_user_id ? "resident_a_decision" : "resident_b_decision"
}

function getOtherResidentId(currentUserId: string, row: BuildingIntroductionRow) {
  return currentUserId === row.resident_a_user_id
    ? row.resident_b_user_id
    : row.resident_a_user_id
}

function getCurrentDecision(currentUserId: string, row: BuildingIntroductionRow) {
  return currentUserId === row.resident_a_user_id
    ? row.resident_a_decision
    : row.resident_b_decision
}

function getOtherDecision(currentUserId: string, row: BuildingIntroductionRow) {
  return currentUserId === row.resident_a_user_id
    ? row.resident_b_decision
    : row.resident_a_decision
}

function buildCompatibilitySummary(
  currentResident: ResidentDirectoryEntry,
  otherResident: ResidentDirectoryEntry,
  rowSummary: string | null,
) {
  if (rowSummary?.trim()) {
    return rowSummary.trim()
  }

  const sharedInterests = intersection(currentResident.interests, otherResident.interests)
  if (sharedInterests.length >= 2) {
    return `You both share ${sharedInterests.slice(0, 2).join(" and ")}.`
  }

  if (sharedInterests.length === 1) {
    return `You both share an interest in ${sharedInterests[0]}.`
  }

  const sharedGoals = intersection(currentResident.lookingFor, otherResident.lookingFor)
  if (sharedGoals.length > 0) {
    return `You are both here for ${sharedGoals[0].toLowerCase()}.`
  }

  return "A thoughtful introduction inside your building community."
}

function buildSharedContext(
  currentResident: ResidentDirectoryEntry,
  otherResident: ResidentDirectoryEntry,
) {
  const sharedInterests = intersection(currentResident.interests, otherResident.interests).slice(0, 4)
  const sharedGoals = intersection(currentResident.lookingFor, otherResident.lookingFor).slice(0, 3)
  const sharedStyles = intersection(
    currentResident.connectionStyles,
    otherResident.connectionStyles,
  ).slice(0, 3)

  return {
    shared_interests: sharedInterests,
    shared_goals: sharedGoals,
    shared_connection_styles: sharedStyles,
  }
}

async function getActiveResidentContext(user: User) {
  const snapshot = await syncResidentAccountForUser(user)

  if (snapshot.status !== "active" || !snapshot.hasActiveMembership) {
    throw new Error(snapshot.message)
  }

  const supabase = getSupabaseAdmin()
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, first_name, bio, photo_url, is_paused")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>()

  if (error || !profile) {
    throw new Error("Unable to load the resident profile.")
  }

  if (profile.is_paused) {
    throw new Error("Your Resident Concierge account is currently paused.")
  }

  return {
    userId: user.id,
    email: user.email?.trim().toLowerCase() ?? "",
    buildingId: snapshot.buildingId,
    buildingName: snapshot.buildingName,
  }
}

async function getActiveResidentDirectory(buildingId: string, userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, ResidentDirectoryEntry>()
  }

  const supabase = getSupabaseAdmin()
  const [{ data: profiles, error: profileError }, { data: privateProfiles, error: privateError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, first_name, bio, photo_url, is_paused")
        .in("id", userIds)
        .returns<ProfileRow[]>(),
      supabase
        .from("private_profile_data")
        .select("user_id, email")
        .in("user_id", userIds)
        .returns<PrivateProfileRow[]>(),
    ])

  if (profileError || privateError) {
    throw new Error("Unable to load resident directory.")
  }

  const emailByUserId = new Map<string, string>()
  for (const privateProfile of privateProfiles ?? []) {
    const normalizedEmail = privateProfile.email?.trim().toLowerCase()
    if (normalizedEmail) {
      emailByUserId.set(privateProfile.user_id, normalizedEmail)
    }
  }

  const normalizedEmails = Array.from(new Set(emailByUserId.values()))
  const joinRequests =
    normalizedEmails.length > 0
      ? await supabase
          .from("resident_join_requests")
          .select("normalized_email, interests, looking_for, connection_styles")
          .eq("building_id", buildingId)
          .in("normalized_email", normalizedEmails)
          .returns<JoinRequestRow[]>()
      : { data: [] as JoinRequestRow[], error: null }

  if (joinRequests.error) {
    throw new Error("Unable to load resident introduction preferences.")
  }

  const joinRequestByEmail = new Map<string, JoinRequestRow>()
  for (const joinRequest of joinRequests.data ?? []) {
    joinRequestByEmail.set(joinRequest.normalized_email, joinRequest)
  }

  const directory = new Map<string, ResidentDirectoryEntry>()
  for (const profile of profiles ?? []) {
    const normalizedEmail = emailByUserId.get(profile.id)
    const joinRequest = normalizedEmail ? joinRequestByEmail.get(normalizedEmail) : undefined

    directory.set(profile.id, {
      userId: profile.id,
      firstName: profile.first_name?.trim() || "Resident",
      bio: profile.bio?.trim() || null,
      photoUrl: profile.photo_url?.trim() || null,
      isPaused: Boolean(profile.is_paused),
      interests: uniqueValues(joinRequest?.interests),
      lookingFor: uniqueValues(joinRequest?.looking_for),
      connectionStyles: uniqueValues(joinRequest?.connection_styles),
    })
  }

  return directory
}

async function getActiveResidentTarget(
  buildingId: string,
  currentUserId: string,
  targetUserId: string,
) {
  if (currentUserId === targetUserId) {
    throw new Error("Residents cannot introduce themselves.")
  }

  const supabase = getSupabaseAdmin()
  const { data: membership, error } = await supabase
    .from("building_memberships")
    .select("user_id")
    .eq("building_id", buildingId)
    .eq("user_id", targetUserId)
    .eq("role", "resident")
    .eq("status", "active")
    .maybeSingle<MembershipRow>()

  if (error) {
    throw new Error("Unable to verify the target resident.")
  }

  if (!membership) {
    throw new Error("That resident is not an active member of this building.")
  }

  const directory = await getActiveResidentDirectory(buildingId, [currentUserId, targetUserId])
  const target = directory.get(targetUserId)
  if (!target) {
    throw new Error("Unable to load the target resident.")
  }

  if (target.isPaused) {
    throw new Error("That resident is not currently available for introductions.")
  }

  return {
    target,
    currentResident: directory.get(currentUserId) ?? null,
  }
}

async function getIntroductionByPair(
  buildingId: string,
  residentAUserId: string,
  residentBUserId: string,
  introType: IntroductionType,
) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("building_introductions")
    .select(
      "id, building_id, resident_a_user_id, resident_b_user_id, intro_type, status, source, requested_by_user_id, resident_a_decision, resident_b_decision, suggested_at, mutual_at, delivered_at, compatibility_summary, shared_context, created_at, updated_at",
    )
    .eq("building_id", buildingId)
    .eq("resident_a_user_id", residentAUserId)
    .eq("resident_b_user_id", residentBUserId)
    .eq("intro_type", introType)
    .maybeSingle<BuildingIntroductionRow>()

  if (error) {
    throw new Error("Unable to load the introduction record.")
  }

  return data
}

async function getIntroductionById(buildingId: string, introductionId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("building_introductions")
    .select(
      "id, building_id, resident_a_user_id, resident_b_user_id, intro_type, status, source, requested_by_user_id, resident_a_decision, resident_b_decision, suggested_at, mutual_at, delivered_at, compatibility_summary, shared_context, created_at, updated_at",
    )
    .eq("building_id", buildingId)
    .eq("id", introductionId)
    .maybeSingle<BuildingIntroductionRow>()

  if (error) {
    throw new Error("Unable to load the introduction record.")
  }

  return data
}

function toPreview(
  row: BuildingIntroductionRow,
  currentUserId: string,
  currentResident: ResidentDirectoryEntry,
  residentDirectory: Map<string, ResidentDirectoryEntry>,
): IntroductionPreview {
  const otherResidentId = getOtherResidentId(currentUserId, row)
  const otherResident = residentDirectory.get(otherResidentId)

  if (!otherResident) {
    throw new Error("Unable to load the introduction resident.")
  }

  const sharedInterests = intersection(currentResident.interests, otherResident.interests).slice(0, 4)
  const sharedGoals = intersection(currentResident.lookingFor, otherResident.lookingFor).slice(0, 3)

  return {
    introductionId: row.id,
    status: row.status,
    introType: row.intro_type,
    source: row.source,
    suggestedAt: row.suggested_at,
    mutualAt: row.mutual_at,
    deliveredAt: row.delivered_at,
    requestedByCurrentResident: row.requested_by_user_id === currentUserId,
    currentResidentDecision: getCurrentDecision(currentUserId, row),
    otherResidentDecision: getOtherDecision(currentUserId, row),
    resident: {
      userId: otherResident.userId,
      firstName: otherResident.firstName,
      photoUrl: otherResident.photoUrl,
      bio: otherResident.bio,
      sharedInterests,
      sharedGoals,
      compatibilitySummary: buildCompatibilitySummary(currentResident, otherResident, row.compatibility_summary),
    },
  }
}

function getAcceptedTransition(
  row: BuildingIntroductionRow,
  currentUserId: string,
  nextStatusIfSingleAcceptance: IntroductionStatus,
) {
  const currentDecisionColumn = getCurrentDecisionColumn(currentUserId, row)
  const otherDecision = getOtherDecision(currentUserId, row)
  const nowIso = new Date().toISOString()

  if (isPositiveDecision(otherDecision)) {
    return {
      [currentDecisionColumn]: "accepted",
      status: "mutual" as const,
      mutual_at: row.mutual_at ?? nowIso,
      updated_at: nowIso,
    }
  }

  return {
    [currentDecisionColumn]: "accepted",
    status: nextStatusIfSingleAcceptance,
    updated_at: nowIso,
  }
}

async function updateIntroduction(
  introductionId: string,
  updates: Record<string, unknown>,
) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("building_introductions")
    .update(updates)
    .eq("id", introductionId)
    .select(
      "id, building_id, resident_a_user_id, resident_b_user_id, intro_type, status, source, requested_by_user_id, resident_a_decision, resident_b_decision, suggested_at, mutual_at, delivered_at, compatibility_summary, shared_context, created_at, updated_at",
    )
    .maybeSingle<BuildingIntroductionRow>()

  if (error || !data) {
    throw new Error("Unable to update the introduction.")
  }

  return data
}

export async function listIntroductionsForResident(user: User): Promise<IntroductionListResult> {
  const context = await getActiveResidentContext(user)
  const supabase = getSupabaseAdmin()

  const { data: rows, error } = await supabase
    .from("building_introductions")
    .select(
      "id, building_id, resident_a_user_id, resident_b_user_id, intro_type, status, source, requested_by_user_id, resident_a_decision, resident_b_decision, suggested_at, mutual_at, delivered_at, compatibility_summary, shared_context, created_at, updated_at",
    )
    .eq("building_id", context.buildingId)
    .or(`resident_a_user_id.eq.${context.userId},resident_b_user_id.eq.${context.userId}`)
    .order("updated_at", { ascending: false })
    .returns<BuildingIntroductionRow[]>()

  if (error) {
    throw new Error("Unable to load introductions.")
  }

  const participantIds = Array.from(
    new Set(
      [context.userId].concat(
        (rows ?? []).flatMap((row) => [row.resident_a_user_id, row.resident_b_user_id]),
      ),
    ),
  )

  const residentDirectory = await getActiveResidentDirectory(context.buildingId, participantIds)
  const currentResident = residentDirectory.get(context.userId)

  if (!currentResident) {
    throw new Error("Unable to load your resident preferences.")
  }

  return {
    buildingId: context.buildingId,
    buildingName: context.buildingName,
    introductions: (rows ?? []).map((row) =>
      toPreview(row, context.userId, currentResident, residentDirectory),
    ),
  }
}

export async function requestIntroductionForResident(
  user: User,
  targetUserId: string,
  introType: IntroductionType,
) {
  if (!isIntroductionType(introType)) {
    throw new Error("Unsupported introduction type.")
  }

  const context = await getActiveResidentContext(user)
  const { target, currentResident } = await getActiveResidentTarget(
    context.buildingId,
    context.userId,
    targetUserId,
  )

  if (!currentResident) {
    throw new Error("Unable to load your resident preferences.")
  }

  const pair = normalizeResidentPair(context.userId, targetUserId)
  const existing = await getIntroductionByPair(
    context.buildingId,
    pair.residentAUserId,
    pair.residentBUserId,
    introType,
  )

  const nowIso = new Date().toISOString()

  if (!existing) {
    const currentDecisionColumn =
      context.userId === pair.residentAUserId ? "resident_a_decision" : "resident_b_decision"
    const sharedContext = buildSharedContext(currentResident, target)
    const compatibilitySummary = buildCompatibilitySummary(currentResident, target, null)
    const { data, error } = await getSupabaseAdmin()
      .from("building_introductions")
      .insert({
        building_id: context.buildingId,
        resident_a_user_id: pair.residentAUserId,
        resident_b_user_id: pair.residentBUserId,
        intro_type: introType,
        status: "requested",
        source: "resident_request",
        requested_by_user_id: context.userId,
        resident_a_decision: currentDecisionColumn === "resident_a_decision" ? "accepted" : null,
        resident_b_decision: currentDecisionColumn === "resident_b_decision" ? "accepted" : null,
        suggested_at: nowIso,
        compatibility_summary: compatibilitySummary,
        shared_context: sharedContext,
        updated_at: nowIso,
      })
      .select(
        "id, building_id, resident_a_user_id, resident_b_user_id, intro_type, status, source, requested_by_user_id, resident_a_decision, resident_b_decision, suggested_at, mutual_at, delivered_at, compatibility_summary, shared_context, created_at, updated_at",
      )
      .maybeSingle<BuildingIntroductionRow>()

    if (error || !data) {
      throw new Error("Unable to create the introduction request.")
    }

    const residentDirectory = new Map<string, ResidentDirectoryEntry>([
      [context.userId, currentResident],
      [target.userId, target],
    ])

    return toPreview(data, context.userId, currentResident, residentDirectory)
  }

  if (existing.status === "declined") {
    throw new Error("This introduction was declined and cannot be reopened yet.")
  }

  if (existing.status === "paused") {
    throw new Error("This introduction is paused right now.")
  }

  if (existing.status === "delivered" || existing.status === "mutual") {
    const residentDirectory = new Map<string, ResidentDirectoryEntry>([
      [context.userId, currentResident],
      [target.userId, target],
    ])
    return toPreview(existing, context.userId, currentResident, residentDirectory)
  }

  const updatedRow = await updateIntroduction(
    existing.id,
    existing.status === "requested" && existing.requested_by_user_id === context.userId
      ? {
          updated_at: nowIso,
        }
      : {
          ...getAcceptedTransition(existing, context.userId, "requested"),
          requested_by_user_id: existing.requested_by_user_id ?? context.userId,
        },
  )

  const residentDirectory = new Map<string, ResidentDirectoryEntry>([
    [context.userId, currentResident],
    [target.userId, target],
  ])

  return toPreview(updatedRow, context.userId, currentResident, residentDirectory)
}

export async function respondToIntroductionForResident(
  user: User,
  introductionId: string,
  action: "accepted" | "declined" | "paused",
) {
  const context = await getActiveResidentContext(user)
  const row = await getIntroductionById(context.buildingId, introductionId)

  if (!row) {
    throw new Error("Introduction not found.")
  }

  if (row.resident_a_user_id !== context.userId && row.resident_b_user_id !== context.userId) {
    throw new Error("You can only respond to your own introductions.")
  }

  if (row.status === "delivered") {
    throw new Error("This introduction has already been delivered.")
  }

  const participantIds = [context.userId, getOtherResidentId(context.userId, row)]
  const residentDirectory = await getActiveResidentDirectory(context.buildingId, participantIds)
  const currentResident = residentDirectory.get(context.userId)

  if (!currentResident) {
    throw new Error("Unable to load your resident preferences.")
  }

  const nowIso = new Date().toISOString()
  const currentDecisionColumn = getCurrentDecisionColumn(context.userId, row)

  let updatedRow: BuildingIntroductionRow

  if (action === "accepted") {
    updatedRow = await updateIntroduction(
      row.id,
      getAcceptedTransition(
        row,
        context.userId,
        row.status === "requested" ? "requested" : "accepted",
      ),
    )
  } else if (action === "declined") {
    updatedRow = await updateIntroduction(row.id, {
      [currentDecisionColumn]: "declined",
      status: "declined",
      declined_by_user_id: context.userId,
      updated_at: nowIso,
    })
  } else {
    updatedRow = await updateIntroduction(row.id, {
      [currentDecisionColumn]: "paused",
      status: "paused",
      paused_by_user_id: context.userId,
      updated_at: nowIso,
    })
  }

  return toPreview(updatedRow, context.userId, currentResident, residentDirectory)
}
