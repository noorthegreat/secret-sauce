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
}

function toTitleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function buildResidentFromProfile(profile: ProfileRow, index: number): Resident {
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
    goal: "Friendships",
    interests: ["Wellness", "Food", "Community", "Conversation"],
    shared: 3,
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
        .select("id, first_name, bio, photo_url")
        .eq("id", userId)
        .maybeSingle<ProfileRow>(),
    ])

  if (membershipError || currentProfileResult.error) {
    throw new Error("Unable to load resident preview.")
  }

  const residentIds = (activeMemberships ?? []).map((membership) => membership.user_id)
  let residents: Resident[] = []

  if (residentIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, first_name, bio, photo_url")
      .in("id", residentIds)
      .limit(8)
      .returns<ProfileRow[]>()

    if (profileError) {
      throw new Error("Unable to load resident preview.")
    }

    residents = (profiles ?? []).map((profile, index) => buildResidentFromProfile(profile, index))
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
