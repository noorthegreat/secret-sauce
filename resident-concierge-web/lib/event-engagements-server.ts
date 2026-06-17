import { getSupabaseAdmin } from "@/lib/supabase-admin"

type EventEngagementType = "proposal" | "vote" | "interest" | "waitlist" | "feedback"

type EventEngagementRow = {
  id: string
  event_id: string | null
  engagement_type: EventEngagementType
  status: "active" | "withdrawn" | "resolved"
  title: string | null
  detail: string | null
  value: string | null
  rating: number | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

type EventRow = {
  id: string
  name: string
  building_id: string
  active: boolean
  enrollment_opens_at: string | null
  enrollment_closes_at: string | null
  capacity: number | null
  waitlist_enabled: boolean | null
  feedback_enabled: boolean | null
}

type ProfileRow = {
  completed_questionnaire: boolean | null
  completed_friendship_questionnaire: boolean | null
}

export type EventRequestInsight = {
  label: string
  value: number
}

export type EventEngagementSnapshot = {
  mostRequestedEvents: EventRequestInsight[]
  eventFeedbackSignals: EventRequestInsight[]
}

export type ResidentEventProposal = {
  id: string
  title: string
  detail: string | null
  status: "active" | "withdrawn" | "resolved"
  createdAt: string
}

export type ResidentEventSignalState = {
  interest: boolean
  vote: boolean
  waitlist: boolean
  feedbackRating: number | null
  feedbackDetail: string | null
}

export type ResidentEventEngagementState = {
  proposals: ResidentEventProposal[]
  signalsByEventId: Record<string, ResidentEventSignalState>
  attendingEventIds: string[]
}

function increment(counts: Map<string, number>, label: string) {
  const normalizedLabel = label.trim()
  if (!normalizedLabel) {
    return
  }

  counts.set(normalizedLabel, (counts.get(normalizedLabel) ?? 0) + 1)
}

function toSortedInsights(counts: Map<string, number>, limit = 5) {
  return [...counts.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1]
      }

      return left[0].localeCompare(right[0])
    })
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }))
}

async function getScopedEventForBuilding(eventId: string, buildingId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, name, building_id, active, enrollment_opens_at, enrollment_closes_at, capacity, waitlist_enabled, feedback_enabled",
    )
    .eq("id", eventId)
    .eq("building_id", buildingId)
    .maybeSingle<EventRow>()

  if (error || !data) {
    throw new Error("That gathering is unavailable.")
  }

  return data
}

async function assertActiveResidentMembership(userId: string, buildingId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("building_memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("building_id", buildingId)
    .eq("role", "resident")
    .eq("status", "active")
    .maybeSingle<{ id: string }>()

  if (error || !data) {
    throw new Error("Only active building members can participate in gatherings.")
  }
}

async function assertSurveyEligibility(userId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("profiles")
    .select("completed_questionnaire, completed_friendship_questionnaire")
    .eq("id", userId)
    .maybeSingle<ProfileRow>()

  if (error || !data) {
    throw new Error("Complete your resident profile before signing up for gatherings.")
  }

  const eligible =
    Boolean(data.completed_friendship_questionnaire) || Boolean(data.completed_questionnaire)

  if (!eligible) {
    throw new Error("Complete your onboarding before RSVPing to gatherings.")
  }
}

function assertEnrollmentWindow(event: EventRow) {
  const now = Date.now()
  const opensAt = event.enrollment_opens_at ? new Date(event.enrollment_opens_at).getTime() : null
  const closesAt = event.enrollment_closes_at ? new Date(event.enrollment_closes_at).getTime() : null

  if (opensAt && opensAt > now) {
    throw new Error("RSVP opens soon for this gathering.")
  }

  if (closesAt && closesAt < now) {
    throw new Error("RSVP is closed for this gathering.")
  }
}

async function getActiveEngagementRow({
  buildingId,
  userId,
  engagementType,
  eventId,
}: {
  buildingId: string
  userId: string
  engagementType: EventEngagementType
  eventId: string | null
}) {
  const supabase = getSupabaseAdmin()
  let query = supabase
    .from("building_event_engagements")
    .select("id, event_id, engagement_type, status, title, detail, value, rating, metadata, created_at, updated_at")
    .eq("building_id", buildingId)
    .eq("user_id", userId)
    .eq("engagement_type", engagementType)
    .order("created_at", { ascending: false })
    .limit(1)

  query = eventId ? query.eq("event_id", eventId) : query.is("event_id", null)

  const { data, error } = await query.returns<EventEngagementRow[]>()

  if (error) {
    throw new Error("Unable to update event engagement.")
  }

  return data?.[0] ?? null
}

async function countEventEnrollments(eventId: string) {
  const supabase = getSupabaseAdmin()
  const { count, error } = await supabase
    .from("event_enrollments")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)

  if (error) {
    throw new Error("Unable to load gathering capacity.")
  }

  return count ?? 0
}

async function setEngagementRow({
  buildingId,
  userId,
  engagementType,
  eventId,
  title,
  detail,
  value,
  rating,
  metadata,
  status,
}: {
  buildingId: string
  userId: string
  engagementType: EventEngagementType
  eventId: string | null
  title: string | null
  detail: string | null
  value: string | null
  rating: number | null
  metadata: Record<string, unknown>
  status: "active" | "withdrawn" | "resolved"
}) {
  const supabase = getSupabaseAdmin()
  const existing = await getActiveEngagementRow({
    buildingId,
    userId,
    engagementType,
    eventId,
  })
  const nowIso = new Date().toISOString()

  if (existing) {
    const { error } = await supabase
      .from("building_event_engagements")
      .update({
        status,
        title,
        detail,
        value,
        rating,
        metadata,
        updated_at: nowIso,
      })
      .eq("id", existing.id)

    if (error) {
      throw new Error("Unable to update event engagement.")
    }

    return {
      id: existing.id,
      status,
    }
  }

  const { data, error } = await supabase
    .from("building_event_engagements")
    .insert({
      building_id: buildingId,
      event_id: eventId,
      user_id: userId,
      engagement_type: engagementType,
      status,
      title,
      detail,
      value,
      rating,
      metadata,
      updated_at: nowIso,
    })
    .select("id")
    .maybeSingle<{ id: string }>()

  if (error || !data) {
    throw new Error("Unable to save event engagement.")
  }

  return {
    id: data.id,
    status,
  }
}

export async function listResidentEventRsvps({
  userId,
  buildingId,
  eventIds,
}: {
  userId: string
  buildingId: string
  eventIds?: string[]
}) {
  const supabase = getSupabaseAdmin()
  let enrollmentQuery = supabase
    .from("event_enrollments")
    .select("event_id")
    .eq("user_id", userId)
    .not("event_id", "is", null)

  if (eventIds && eventIds.length > 0) {
    enrollmentQuery = enrollmentQuery.in("event_id", eventIds)
  }

  const { data: enrollments, error: enrollmentError } = await enrollmentQuery.returns<
    Array<{ event_id: string | null }>
  >()

  if (enrollmentError) {
    throw new Error("Unable to load RSVP state.")
  }

  const enrolledEventIds = (enrollments ?? [])
    .map((row) => row.event_id)
    .filter((value): value is string => Boolean(value))

  if (enrolledEventIds.length === 0) {
    return []
  }

  const { data: scopedEvents, error: scopedError } = await supabase
    .from("events")
    .select("id")
    .eq("building_id", buildingId)
    .in("id", enrolledEventIds)
    .returns<Array<{ id: string }>>()

  if (scopedError) {
    throw new Error("Unable to load RSVP state.")
  }

  const allowedEventIds = new Set((scopedEvents ?? []).map((event) => event.id))
  return enrolledEventIds.filter((eventId) => allowedEventIds.has(eventId))
}

export async function setResidentEventRsvp({
  userId,
  buildingId,
  eventId,
  attending,
  needsSurveyCompletion,
}: {
  userId: string
  buildingId: string
  eventId: string
  attending: boolean
  needsSurveyCompletion: boolean
}) {
  const supabase = getSupabaseAdmin()
  const event = await getScopedEventForBuilding(eventId, buildingId)

  if (!event.active) {
    throw new Error("That gathering is unavailable.")
  }

  await assertActiveResidentMembership(userId, buildingId)

  if (attending) {
    if (needsSurveyCompletion) {
      throw new Error("Complete your onboarding before RSVPing to gatherings.")
    }

    assertEnrollmentWindow(event)
    await assertSurveyEligibility(userId)

    const currentEnrollmentCount = await countEventEnrollments(event.id)

    if (event.capacity && currentEnrollmentCount >= event.capacity) {
      if (event.waitlist_enabled) {
        await setEngagementRow({
          buildingId,
          userId,
          engagementType: "waitlist",
          eventId: event.id,
          title: event.name,
          detail: null,
          value: event.name,
          rating: null,
          metadata: {
            event_title: event.name,
            source: "resident_rsvp_waitlist",
          },
          status: "active",
        })

        return {
          attending: false,
          waitlisted: true,
        }
      }

      throw new Error("This gathering is currently at capacity.")
    }

    const { error } = await supabase.from("event_enrollments").upsert(
      {
        user_id: userId,
        event_id: event.id,
        event_name: event.name,
      },
      {
        onConflict: "user_id,event_id",
      },
    )

    if (error) {
      throw new Error("Unable to save your RSVP.")
    }

    if (event.waitlist_enabled) {
      await setEngagementRow({
        buildingId,
        userId,
        engagementType: "waitlist",
        eventId: event.id,
        title: event.name,
        detail: null,
        value: event.name,
        rating: null,
        metadata: {
          event_title: event.name,
          source: "resident_rsvp_waitlist",
        },
        status: "withdrawn",
      })
    }

    return {
      attending: true,
      waitlisted: false,
    }
  }

  const { error } = await supabase
    .from("event_enrollments")
    .delete()
    .eq("user_id", userId)
    .eq("event_id", event.id)

  if (error) {
    throw new Error("Unable to update your RSVP.")
  }

  return {
    attending: false,
    waitlisted: false,
  }
}

export async function saveResidentEventProposal({
  userId,
  buildingId,
  title,
  detail,
}: {
  userId: string
  buildingId: string
  title: string
  detail: string | null
}) {
  await assertActiveResidentMembership(userId, buildingId)

  return setEngagementRow({
    buildingId,
    userId,
    engagementType: "proposal",
    eventId: null,
    title,
    detail,
    value: title,
    rating: null,
    metadata: {
      source: "resident_proposal",
    },
    status: "active",
  })
}

export async function setResidentEventSignal({
  userId,
  buildingId,
  eventId,
  engagementType,
  active,
}: {
  userId: string
  buildingId: string
  eventId: string
  engagementType: "vote" | "interest" | "waitlist"
  active: boolean
}) {
  await assertActiveResidentMembership(userId, buildingId)
  const event = await getScopedEventForBuilding(eventId, buildingId)

  if (engagementType === "waitlist" && active && !event.waitlist_enabled) {
    throw new Error("This gathering is not collecting waitlist requests right now.")
  }

  return setEngagementRow({
    buildingId,
    userId,
    engagementType,
    eventId: event.id,
    title: event.name,
    detail: null,
    value: event.name,
    rating: null,
    metadata: {
      event_title: event.name,
      source: "resident_event_signal",
    },
    status: active ? "active" : "withdrawn",
  })
}

export async function saveResidentEventFeedback({
  userId,
  buildingId,
  eventId,
  rating,
  detail,
}: {
  userId: string
  buildingId: string
  eventId: string
  rating: number
  detail: string | null
}) {
  await assertActiveResidentMembership(userId, buildingId)
  const event = await getScopedEventForBuilding(eventId, buildingId)

  if (!event.feedback_enabled) {
    throw new Error("This gathering is not collecting feedback yet.")
  }

  return setEngagementRow({
    buildingId,
    userId,
    engagementType: "feedback",
    eventId: event.id,
    title: event.name,
    detail,
    value: event.name,
    rating,
    metadata: {
      event_title: event.name,
      source: "resident_event_feedback",
    },
    status: "active",
  })
}

export async function getResidentEventEngagementState({
  userId,
  buildingId,
}: {
  userId: string
  buildingId: string
}): Promise<ResidentEventEngagementState> {
  await assertActiveResidentMembership(userId, buildingId)

  const supabase = getSupabaseAdmin()
  const [rows, attendingEventIds] = await Promise.all([
    supabase
      .from("building_event_engagements")
      .select("id, event_id, engagement_type, status, title, detail, value, rating, metadata, created_at, updated_at")
      .eq("building_id", buildingId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .returns<EventEngagementRow[]>(),
    listResidentEventRsvps({ userId, buildingId }),
  ])

  if (rows.error) {
    throw new Error("Unable to load event engagement state.")
  }

  const proposals: ResidentEventProposal[] = []
  const signalsByEventId: Record<string, ResidentEventSignalState> = {}

  for (const row of rows.data ?? []) {
    if (row.engagement_type === "proposal" && row.status === "active") {
      proposals.push({
        id: row.id,
        title: row.title?.trim() || "Resident proposal",
        detail: row.detail?.trim() || null,
        status: row.status,
        createdAt: row.created_at,
      })
      continue
    }

    if (!row.event_id) {
      continue
    }

    if (!signalsByEventId[row.event_id]) {
      signalsByEventId[row.event_id] = {
        interest: false,
        vote: false,
        waitlist: false,
        feedbackRating: null,
        feedbackDetail: null,
      }
    }

    const signal = signalsByEventId[row.event_id]

    if (row.engagement_type === "interest") {
      signal.interest = row.status === "active"
      continue
    }

    if (row.engagement_type === "vote") {
      signal.vote = row.status === "active"
      continue
    }

    if (row.engagement_type === "waitlist") {
      signal.waitlist = row.status === "active"
      continue
    }

    if (row.engagement_type === "feedback" && row.status === "active") {
      signal.feedbackRating = row.rating
      signal.feedbackDetail = row.detail?.trim() || null
    }
  }

  return {
    proposals,
    signalsByEventId,
    attendingEventIds,
  }
}

export async function getEventEngagementSnapshotForBuilding(
  buildingId: string,
): Promise<EventEngagementSnapshot> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("building_event_engagements")
    .select("id, event_id, engagement_type, status, title, detail, value, rating, metadata, created_at, updated_at")
    .eq("building_id", buildingId)
    .returns<EventEngagementRow[]>()

  if (error) {
    const message = error.message.toLowerCase()
    if (message.includes("building_event_engagements") || message.includes("does not exist")) {
      return {
        mostRequestedEvents: [],
        eventFeedbackSignals: [],
      }
    }

    throw new Error("Unable to load event engagement insights.")
  }

  const requestCounts = new Map<string, number>()
  const feedbackCounts = new Map<string, number>()

  for (const row of data ?? []) {
    if (row.status !== "active" && row.engagement_type !== "feedback") {
      continue
    }

    const label =
      row.title?.trim() ||
      row.value?.trim() ||
      (typeof row.metadata?.event_title === "string" ? row.metadata.event_title.trim() : "") ||
      ""

    if (
      row.engagement_type === "proposal" ||
      row.engagement_type === "vote" ||
      row.engagement_type === "interest" ||
      row.engagement_type === "waitlist"
    ) {
      increment(requestCounts, label)
      continue
    }

    if (row.engagement_type === "feedback") {
      increment(feedbackCounts, label || "Post-event feedback")
    }
  }

  return {
    mostRequestedEvents: toSortedInsights(requestCounts),
    eventFeedbackSignals: toSortedInsights(feedbackCounts),
  }
}
