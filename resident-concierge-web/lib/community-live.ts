import { eventPolls as mockPolls, events as mockEvents } from "@/lib/concierge-data"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export type CommunityEvent = {
  id: string
  slug: string
  title: string
  host: "Building" | "Resident"
  date: string
  time: string
  location: string
  image: string
  attendees: number
  description: string
  enrollmentStatus: "open" | "upcoming" | "closed"
  enrollmentLabel: string
  startDateIso: string | null
  enrollmentOpensAtIso: string | null
  enrollmentClosesAtIso: string | null
}

export type CommunityPoll = {
  id: string
  title: string
  image: string
  votes: number
  percent: number
}

export type CommunityFeedSnapshot = {
  buildingName: string
  isLive: boolean
  events: CommunityEvent[]
  polls: CommunityPoll[]
}

type BuildingRow = {
  id: string
  name: string
}

type EventRow = {
  id: string
  name: string
  slug: string | null
  start_date: string | null
  end_date: string | null
  enrollment_opens_at: string | null
  enrollment_closes_at: string | null
  venue_name: string | null
  city: string | null
  description: string | null
  active: boolean
}

type EnrollmentRow = {
  event_id: string
}

function getBuildingSlug() {
  return (process.env.RESIDENT_CONCIERGE_BUILDING_SLUG ?? "chorus-apartments").trim().toLowerCase()
}

function formatDateLabel(value: string | null) {
  if (!value) return "Coming soon"

  const date = new Date(value)
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
}

function formatTimeLabel(value: string | null) {
  if (!value) return "TBD"

  const date = new Date(value)
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
}

function getEventImage(index: number) {
  const fallback = mockEvents[index % mockEvents.length]
  return fallback?.image ?? "/events/wine.png"
}

function getEnrollmentStatus(event: EventRow) {
  const now = Date.now()
  const opensAt = event.enrollment_opens_at ? new Date(event.enrollment_opens_at).getTime() : null
  const closesAt = event.enrollment_closes_at ? new Date(event.enrollment_closes_at).getTime() : null

  if (opensAt && opensAt > now) {
    return {
      status: "upcoming" as const,
      label: "RSVP opens soon",
    }
  }

  if (closesAt && closesAt < now) {
    return {
      status: "closed" as const,
      label: "RSVP closed",
    }
  }

  return {
    status: "open" as const,
    label: "RSVP open",
  }
}

function buildPolls(events: CommunityEvent[]) {
  if (events.length === 0) {
    return []
  }

  const baseVotes = [42, 31, 27, 23, 19]
  return events.slice(0, 5).map((event, index) => ({
    id: event.id,
    title: event.title,
    image: event.image,
    votes: baseVotes[index] ?? 18,
    percent: Math.max(28, 84 - index * 11),
  }))
}

export function getMockCommunityFeed(): CommunityFeedSnapshot {
  return {
    buildingName: "Chorus Apartments",
    isLive: false,
    events: mockEvents.map((event) => ({
      ...event,
      slug: event.id,
      enrollmentStatus: "open",
      enrollmentLabel: "RSVP open",
      startDateIso: null,
      enrollmentOpensAtIso: null,
      enrollmentClosesAtIso: null,
    })),
    polls: mockPolls,
  }
}

export function getEmptyCommunityFeed(buildingName = "Fifth Circle"): CommunityFeedSnapshot {
  return {
    buildingName,
    isLive: false,
    events: [],
    polls: [],
  }
}

export async function getCommunityFeed(): Promise<CommunityFeedSnapshot> {
  const supabase = getSupabaseAdmin()
  const slug = getBuildingSlug()

  const { data: building, error: buildingError } = await supabase
    .from("buildings")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle<BuildingRow>()

  if (buildingError || !building) {
    throw new Error("Unable to load building feed.")
  }

  const { data: eventRows, error: eventError } = await supabase
    .from("events")
    .select("id, name, slug, start_date, end_date, enrollment_opens_at, enrollment_closes_at, venue_name, city, description, active")
    .eq("building_id", building.id)
    .eq("active", true)
    .order("start_date", { ascending: true })
    .returns<EventRow[]>()

  if (eventError) {
    throw new Error("Unable to load community feed.")
  }

  const eventIds = (eventRows ?? []).map((event) => event.id)
  let enrollments: EnrollmentRow[] = []

  if (eventIds.length > 0) {
    const { data: enrollmentRows, error: enrollmentError } = await supabase
      .from("event_enrollments")
      .select("event_id")
      .in("event_id", eventIds)
      .returns<EnrollmentRow[]>()

    if (enrollmentError) {
      throw new Error("Unable to load community feed.")
    }

    enrollments = enrollmentRows ?? []
  }

  const attendeeCounts = new Map<string, number>()
  for (const enrollment of enrollments) {
    attendeeCounts.set(enrollment.event_id, (attendeeCounts.get(enrollment.event_id) ?? 0) + 1)
  }

  const liveEvents: CommunityEvent[] = (eventRows ?? []).slice(0, 6).map((event, index) => ({
    ...getEnrollmentStatus(event),
    id: event.id,
    slug: event.slug?.trim() || event.id,
    title: event.name,
    host: "Building",
    date: formatDateLabel(event.start_date),
    time: formatTimeLabel(event.start_date),
    location: event.venue_name ?? event.city ?? "Building amenity",
    image: getEventImage(index),
    attendees: attendeeCounts.get(event.id) ?? 0,
    description: event.description ?? "A curated gathering within your building community.",
    startDateIso: event.start_date,
    enrollmentOpensAtIso: event.enrollment_opens_at,
    enrollmentClosesAtIso: event.enrollment_closes_at,
  }))

  return {
    buildingName: building.name,
    isLive: liveEvents.length > 0,
    events: liveEvents,
    polls: buildPolls(liveEvents),
  }
}
