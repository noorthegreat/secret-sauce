import type { Resident } from "@/lib/concierge-data"
import {
  eventPolls as mockPolls,
  events as mockEvents,
  residents as mockResidents,
} from "@/lib/concierge-data"
import { getCommunityFeed, type CommunityEvent, type CommunityPoll } from "@/lib/community-live"
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

type PrivateProfileRow = {
  user_id: string
  email: string | null
}

type JoinRequestRow = {
  normalized_email: string
  interests: string[] | null
  looking_for: string[] | null
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

function intersection(left: string[], right: string[]) {
  const rightSet = new Set(right)
  return left.filter((value) => rightSet.has(value))
}

function buildResidentFromProfile(
  profile: ProfileRow,
  index: number,
  sharedInterests: string[],
  goal: string,
): Resident {
  const palette = [
    "/residents/elena.png",
    "/residents/marcus.png",
    "/residents/sophie.png",
    "/residents/james.png",
    "/residents/priya.png",
    "/residents/daniel.png",
  ]

  return {
    id: profile.id,
    name: toTitleCase(profile.first_name),
    unit: `Resident ${index + 1}`,
    photo: profile.photo_url?.trim() || palette[index % palette.length] || "/placeholder.svg",
    tagline: profile.bio?.trim() || "An active member of the building community.",
    goal,
    interests: sharedInterests.length ? sharedInterests : ["Conversation", "Community"],
    shared: sharedInterests.length || 1,
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
    .select("normalized_email, interests, looking_for")
    .eq("building_id", buildingId)
    .eq("normalized_email", residentEmail)
    .maybeSingle<JoinRequestRow>()

  if (residentIds.length > 0) {
    const [{ data: profiles, error: profileError }, { data: privateProfiles, error: privateProfileError }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id, first_name, bio, photo_url, is_paused")
          .in("id", residentIds)
          .limit(8)
          .returns<ProfileRow[]>(),
        supabase
          .from("private_profile_data")
          .select("user_id, email")
          .in("user_id", residentIds)
          .returns<PrivateProfileRow[]>(),
      ])

    if (profileError || privateProfileError) {
      throw new Error("Unable to load resident preview.")
    }

    const visibleProfiles = (profiles ?? []).filter((profile) => !profile.is_paused)
    const emailByUserId = new Map<string, string>()
    for (const privateProfile of privateProfiles ?? []) {
      const normalizedEmail = privateProfile.email?.trim().toLowerCase()
      if (normalizedEmail) {
        emailByUserId.set(privateProfile.user_id, normalizedEmail)
      }
    }

    const residentEmails = Array.from(new Set(emailByUserId.values()))
    const currentResidentInterests = uniqueValues(currentJoinRequestResult.data?.interests)
    const { data: joinRequests, error: joinRequestError } = residentEmails.length
      ? await supabase
          .from("resident_join_requests")
          .select("normalized_email, interests, looking_for")
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

    residents = visibleProfiles.map((profile, index) => {
      const normalizedEmail = emailByUserId.get(profile.id)
      const joinRequest = normalizedEmail ? joinRequestByEmail.get(normalizedEmail) : undefined
      const profileInterests = uniqueValues(joinRequest?.interests)
      const sharedInterests = intersection(currentResidentInterests, profileInterests).slice(0, 4)
      const goal = uniqueValues(joinRequest?.looking_for)[0] || "Friendships"

      return buildResidentFromProfile(profile, index, sharedInterests, goal)
    })
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
