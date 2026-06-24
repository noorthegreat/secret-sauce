import {
  eventPolls as mockPolls,
  events as mockEvents,
  formatConnectionStyleLabel,
  formatIntentLabel,
  formatInterestLabel,
  formatPlanningStyleLabel,
  formatSocialEnergyLabel,
  type AvailabilityGrid,
  type PlanningStyleId,
  type Resident,
  type SocialEnergyId,
} from "@/lib/concierge-data"
import { getCommunityFeed, type CommunityEvent, type CommunityPoll } from "@/lib/community-live"
import {
  compareMatchInsightsByStrength,
  compareResidents,
  meetsCuratedIntroductionThreshold,
  type MatchInsights,
} from "@/lib/matching-engine"
import { getPrivateProfileEmailsByUserIds } from "@/lib/private-profile-fallback"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export type ResidentPreviewSnapshot = {
  buildingName: string
  isLive: boolean
  welcomeName: string
  introCount: number
  residents: Resident[]
  events: CommunityEvent[]
  polls: CommunityPoll[]
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

type JoinRequestRow = {
  normalized_email: string
  introduction: string | null
  interests: string[] | null
  looking_for: string[] | null
  connection_styles: string[] | null
  availability: string[] | null
  availability_grid: AvailabilityGrid | null
  onboarding_profile?: Record<string, unknown> | null
  compatibility_prompts?: Record<string, unknown> | null
  activity_preferences?: string[] | null
  networking_preferences?: Record<string, unknown> | null
  intro_preferences?: Record<string, unknown> | null
}

type ResidentProfileCandidate = {
  profile: ProfileRow
  joinRequest: JoinRequestRow | null
  match: MatchInsights
  matchScore: number
  compatibilitySummary: string
  compatibilityDetails: string[]
  sharedInterests: string[]
  goal: string
  occupation: string | null
  recognitionCue: string | null
  socialEnergy: string | null
  planningStyle: string | null
  connectionPreference: string | null
  conciergeSnippet: string | null
  meetupReason: string | null
}

function toTitleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function uniqueValues(values: string[] | null | undefined) {
  return Array.from(new Set((values ?? []).map((value) => value.trim()).filter(Boolean)))
}

function readObjectString(
  value: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  const raw = value?.[key]
  return typeof raw === "string" && raw.trim() ? raw.trim() : null
}

function readObjectBoolean(
  value: Record<string, unknown> | null | undefined,
  key: string,
) {
  return value?.[key] === true
}

function getSocialEnergyLabel(joinRequest: JoinRequestRow | null) {
  const socialEnergy =
    readObjectString(joinRequest?.compatibility_prompts, "socialEnergy") ??
    readObjectString(joinRequest?.intro_preferences, "socialEnergy")

  return socialEnergy ? formatSocialEnergyLabel(socialEnergy as SocialEnergyId) : null
}

function getPlanningStyleLabel(joinRequest: JoinRequestRow | null) {
  const planningStyle =
    readObjectString(joinRequest?.compatibility_prompts, "planningStyle") ??
    readObjectString(joinRequest?.intro_preferences, "planningStyle")

  return planningStyle ? formatPlanningStyleLabel(planningStyle as PlanningStyleId) : null
}

function buildResidentFromCandidate(candidate: ResidentProfileCandidate, index: number): Resident {
  const palette = [
    "/residents/elena.png",
    "/residents/marcus.png",
    "/residents/sophie.png",
    "/residents/james.png",
    "/residents/priya.png",
    "/residents/daniel.png",
  ]

  const fallbackInterests = uniqueValues(candidate.joinRequest?.interests)
    .slice(0, 4)
    .map(formatInterestLabel)

  return {
    id: candidate.profile.id,
    name: toTitleCase(candidate.profile.first_name),
    unit: `Resident ${index + 1}`,
    photo:
      candidate.profile.photo_url?.trim() || palette[index % palette.length] || "/placeholder.svg",
    tagline: candidate.compatibilitySummary,
    goal: candidate.goal,
    interests: candidate.sharedInterests.length
      ? candidate.sharedInterests.map(formatInterestLabel)
      : fallbackInterests.length
        ? fallbackInterests
        : ["Conversation", "Community"],
    shared: candidate.sharedInterests.length,
    matchScore: candidate.matchScore,
    occupation: candidate.occupation,
    recognitionCue: candidate.recognitionCue,
    socialEnergy: candidate.socialEnergy,
    planningStyle: candidate.planningStyle,
    connectionPreference: candidate.connectionPreference,
    compatibilityDetails: candidate.compatibilityDetails,
    conciergeSnippet: candidate.conciergeSnippet,
    meetupReason: candidate.meetupReason,
  }
}

function fallbackWelcomeName(email: string) {
  const localPart = email.split("@")[0] ?? "resident"
  const firstSegment = localPart.split(/[.\-_]/).find(Boolean) ?? localPart
  return toTitleCase(firstSegment)
}

export function getMockResidentPreviewSnapshot(): ResidentPreviewSnapshot {
  return {
    buildingName: "Chorus Apartments",
    isLive: false,
    welcomeName: "Ava",
    introCount: 3,
    residents: mockResidents,
    events: mockEvents.map((event) => ({
      ...event,
      slug: event.id,
    })),
    polls: mockPolls,
  }
}

const mockResidents = [
  {
    id: "elena",
    name: "Elena Marchetti",
    unit: "Residence 18B",
    photo: "/residents/elena.png",
    tagline: "You both value quiet friendships and share interests in art, books, and wellness.",
    goal: "Friendships",
    interests: ["Art", "Wellness", "Travel", "Books"],
    shared: 4,
    matchScore: 78,
  },
  {
    id: "marcus",
    name: "Marcus Bell",
    unit: "Residence 12A",
    photo: "/residents/marcus.png",
    tagline: "You both like active routines and easy coffee-led introductions after work.",
    goal: "Activity partners",
    interests: ["Running", "Technology", "Coffee", "Food"],
    shared: 3,
    matchScore: 72,
  },
  {
    id: "sophie",
    name: "Sophie Laurent",
    unit: "Residence 21C",
    photo: "/residents/sophie.png",
    tagline:
      "A one-on-one introduction feels natural here, especially around books and slower weekends.",
    goal: "Friendships",
    interests: ["Books", "Art", "Wellness", "Walking"],
    shared: 3,
    matchScore: 69,
  },
] satisfies Resident[]

export async function getResidentPreviewSnapshot({
  userId,
  residentEmail,
  buildingId,
  buildingName,
}: {
  userId: string
  residentEmail: string
  buildingId: string
  buildingName: string
}): Promise<ResidentPreviewSnapshot> {
  const supabase = getSupabaseAdmin()

  const [{ data: activeMemberships, error: membershipError }, communityFeed, currentProfileResult] =
    await Promise.all([
      supabase
        .from("building_memberships")
        .select("user_id")
        .eq("building_id", buildingId)
        .eq("role", "resident")
        .eq("status", "active")
        .neq("user_id", userId)
        .limit(8)
        .returns<MembershipRow[]>(),
      getCommunityFeed(),
      supabase
        .from("profiles")
        .select("id, first_name, bio, photo_url, is_paused")
        .eq("id", userId)
        .maybeSingle<ProfileRow>(),
    ])

  if (membershipError || currentProfileResult.error) {
    throw new Error("Unable to load resident preview.")
  }

  const residentIds = (activeMemberships ?? []).map((membership) => membership.user_id)
  let residents: Resident[] = []
  const currentJoinRequestResult = await supabase
    .from("resident_join_requests")
    .select(
      "normalized_email, introduction, interests, looking_for, connection_styles, availability, availability_grid, onboarding_profile, compatibility_prompts, activity_preferences, networking_preferences, intro_preferences",
    )
    .eq("building_id", buildingId)
    .eq("normalized_email", residentEmail)
    .maybeSingle<JoinRequestRow>()

  if (residentIds.length > 0 && currentJoinRequestResult.data) {
    const [
      { data: profiles, error: profileError },
      emailByUserId,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, first_name, bio, photo_url, is_paused")
        .in("id", residentIds)
        .limit(8)
        .returns<ProfileRow[]>(),
      getPrivateProfileEmailsByUserIds(supabase, residentIds),
    ])

    if (profileError) {
      throw new Error("Unable to load resident preview.")
    }

    const visibleProfiles = (profiles ?? []).filter((profile) => !profile.is_paused)

    const residentEmails = Array.from(new Set(emailByUserId.values()))
    const { data: joinRequests, error: joinRequestError } = residentEmails.length
      ? await supabase
          .from("resident_join_requests")
          .select(
            "normalized_email, introduction, interests, looking_for, connection_styles, availability, availability_grid, onboarding_profile, compatibility_prompts, activity_preferences, networking_preferences, intro_preferences",
          )
          .eq("building_id", buildingId)
          .in("normalized_email", residentEmails)
          .returns<JoinRequestRow[]>()
      : { data: [] as JoinRequestRow[], error: null }

    if (joinRequestError) {
      throw new Error("Unable to load resident preview.")
    }

    const joinRequestByEmail = new Map<string, JoinRequestRow>()
    for (const joinRequest of joinRequests ?? []) {
      joinRequestByEmail.set(joinRequest.normalized_email, joinRequest)
    }

    const currentResident = {
      interests: uniqueValues(currentJoinRequestResult.data.interests),
      lookingFor: uniqueValues(currentJoinRequestResult.data.looking_for),
      connectionStyles: uniqueValues(currentJoinRequestResult.data.connection_styles),
      availability: uniqueValues(currentJoinRequestResult.data.availability),
      availabilityGrid: currentJoinRequestResult.data.availability_grid,
      conciergeNote: currentJoinRequestResult.data.introduction?.trim() || null,
      occupation:
        readObjectString(currentJoinRequestResult.data.onboarding_profile, "occupation") ??
        readObjectString(currentJoinRequestResult.data.networking_preferences, "occupation"),
      socialEnergy:
        (readObjectString(currentJoinRequestResult.data.compatibility_prompts, "socialEnergy") ??
          readObjectString(currentJoinRequestResult.data.intro_preferences, "socialEnergy")) as
          | SocialEnergyId
          | null,
      planningStyle:
        (readObjectString(currentJoinRequestResult.data.compatibility_prompts, "planningStyle") ??
          readObjectString(currentJoinRequestResult.data.intro_preferences, "planningStyle")) as
          | PlanningStyleId
          | null,
      openToNetworking: readObjectBoolean(
        currentJoinRequestResult.data.networking_preferences,
        "openToNetworking",
      ),
      openToMentoring: readObjectBoolean(
        currentJoinRequestResult.data.networking_preferences,
        "openToMentoring",
      ),
      lookingForMentorship: readObjectBoolean(
        currentJoinRequestResult.data.networking_preferences,
        "lookingForMentorship",
      ),
      activityPreferences: uniqueValues(currentJoinRequestResult.data.activity_preferences),
    }

    const rankedCandidates: ResidentProfileCandidate[] = visibleProfiles
      .map((profile) => {
        const normalizedEmail = emailByUserId.get(profile.id)
        const joinRequest = normalizedEmail ? joinRequestByEmail.get(normalizedEmail) ?? null : null

        const match = compareResidents(currentResident, {
          interests: uniqueValues(joinRequest?.interests),
          lookingFor: uniqueValues(joinRequest?.looking_for),
          connectionStyles: uniqueValues(joinRequest?.connection_styles),
          availability: uniqueValues(joinRequest?.availability),
          availabilityGrid: joinRequest?.availability_grid ?? null,
          conciergeNote: joinRequest?.introduction?.trim() || profile.bio?.trim() || null,
          occupation:
            readObjectString(joinRequest?.onboarding_profile, "occupation") ??
            readObjectString(joinRequest?.networking_preferences, "occupation"),
          socialEnergy:
            (readObjectString(joinRequest?.compatibility_prompts, "socialEnergy") ??
              readObjectString(joinRequest?.intro_preferences, "socialEnergy")) as
              | SocialEnergyId
              | null,
          planningStyle:
            (readObjectString(joinRequest?.compatibility_prompts, "planningStyle") ??
              readObjectString(joinRequest?.intro_preferences, "planningStyle")) as
              | PlanningStyleId
              | null,
          openToNetworking: readObjectBoolean(
            joinRequest?.networking_preferences,
            "openToNetworking",
          ),
          openToMentoring: readObjectBoolean(
            joinRequest?.networking_preferences,
            "openToMentoring",
          ),
          lookingForMentorship: readObjectBoolean(
            joinRequest?.networking_preferences,
            "lookingForMentorship",
          ),
          activityPreferences: uniqueValues(joinRequest?.activity_preferences),
        })

        return {
          profile,
          joinRequest,
          match,
          matchScore: match.score,
          compatibilitySummary: match.compatibilitySummary,
          compatibilityDetails: match.compatibilityDetails,
          sharedInterests: match.sharedInterests,
          goal: formatIntentLabel(
            match.sharedGoals[0] || uniqueValues(joinRequest?.looking_for)[0] || "friendships",
          ),
          occupation:
            readObjectString(joinRequest?.onboarding_profile, "occupation") ??
            readObjectString(joinRequest?.networking_preferences, "occupation"),
          recognitionCue: readObjectString(joinRequest?.onboarding_profile, "recognitionCue"),
          socialEnergy: getSocialEnergyLabel(joinRequest),
          planningStyle: getPlanningStyleLabel(joinRequest),
          connectionPreference: match.sharedConnectionStyles[0]
            ? `${formatIntentLabel(match.sharedGoals[0] || "friendships")} · ${formatConnectionStyleLabel(match.sharedConnectionStyles[0])}`
            : formatIntentLabel(match.sharedGoals[0] || "friendships"),
          conciergeSnippet:
            match.compatibilityDetails[0] ??
            joinRequest?.introduction?.trim() ??
            profile.bio?.trim() ??
            null,
          meetupReason: match.meetupRecommendation.reason,
        }
      })
      .filter((candidate) => meetsCuratedIntroductionThreshold(candidate.match))
      .sort((left, right) => compareMatchInsightsByStrength(left.match, right.match))
      .map(({ match, ...candidate }) => candidate)

    residents = rankedCandidates.map((candidate, index) =>
      buildResidentFromCandidate(candidate, index),
    )
  }

  const currentProfile = currentProfileResult.data ?? null
  const welcomeName = currentProfile?.first_name?.trim()
    ? toTitleCase(currentProfile.first_name)
    : fallbackWelcomeName(residentEmail)

  return {
    buildingName,
    isLive: true,
    welcomeName,
    introCount: Math.min(3, residents.length),
    residents,
    events: communityFeed.events,
    polls: communityFeed.polls,
  }
}
