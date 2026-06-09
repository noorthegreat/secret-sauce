import { getSupabaseAdmin } from "@/lib/supabase-admin"
import {
  getManagerSupportRequestsForBuilding,
  type ManagerSupportRequestItem,
} from "@/lib/support-live"

type DashboardSeriesPoint = {
  month: string
  value: number
}

type DashboardBarItem = {
  label: string
  value: number
}

type DashboardStat = {
  label: string
  value: string
  accent?: boolean
  helper?: string
  isPlaceholder?: boolean
}

type DashboardListBlock = {
  items: DashboardBarItem[]
  emptyMessage?: string
}

export type ManagerIntroductionQueueItem = {
  id: string
  residentAFirstName: string
  residentBFirstName: string
  introType: "friendship" | "professional"
  status: string
  source: string
  suggestedAt: string
  mutualAt: string | null
  deliveredAt: string | null
  compatibilitySummary: string | null
}

export type ManagerEventItem = {
  id: string
  name: string
  description: string | null
  venueName: string | null
  startDate: string | null
  endDate: string | null
  state: "draft" | "published" | "closed"
  active: boolean
  attendeeCount: number
}

export type ManagerDashboardSnapshot = {
  buildingName: string
  pulseScore: number
  pulseDelta: number
  isLive: boolean
  stats: DashboardStat[]
  trend: DashboardSeriesPoint[]
  topInterests: DashboardListBlock
  eventInsights: DashboardListBlock
  requestStatus: DashboardListBlock
  introductionFunnel: DashboardListBlock
  mostRequestedEvents: DashboardListBlock
  amenityUsage: DashboardListBlock
  introductionQueue: ManagerIntroductionQueueItem[]
  managerEvents: ManagerEventItem[]
  supportCategoryBreakdown: DashboardListBlock
  supportQueue: ManagerSupportRequestItem[]
}

type BuildingRow = {
  id: string
  name: string
  slug: string
  timezone?: string
}

type EventRow = {
  id: string
  name: string
  slug: string | null
  description: string | null
  venue_name: string | null
  start_date: string | null
  end_date: string | null
  active: boolean
  metadata: Record<string, unknown> | null
}

type JoinRequestRow = {
  status: "pending_review" | "approved" | "rejected" | "withdrawn" | string
  interests: string[] | null
  looking_for: string[] | null
  created_at: string
}

type EnrollmentCountRow = {
  event_id: string
}

type BuildingIntroductionRow = {
  id: string
  resident_a_user_id: string
  resident_b_user_id: string
  intro_type: "friendship" | "professional"
  status: "suggested" | "requested" | "accepted" | "mutual" | "delivered" | "declined" | "paused"
  source: string
  suggested_at: string
  mutual_at: string | null
  delivered_at: string | null
  compatibility_summary: string | null
}

type ProfileNameRow = {
  id: string
  first_name: string
}

function normalizeBuildingSlug() {
  const slug = (process.env.RESIDENT_CONCIERGE_BUILDING_SLUG ?? "chorus-apartments").trim().toLowerCase()

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Invalid building slug configuration.")
  }

  return slug
}

function countValues(values: string[], limit = 5) {
  const counts = new Map<string, number>()

  for (const value of values) {
    const normalized = value.trim()
    if (!normalized) continue
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]
      return a[0].localeCompare(b[0])
    })
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }))
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
}

function toMonthLabel(date: Date) {
  return date.toLocaleString("en-US", {
    month: "short",
    timeZone: "UTC",
  })
}

function buildRequestTrend(requests: JoinRequestRow[]) {
  const now = new Date()
  const months: { key: string; label: string }[] = []

  for (let index = 5; index >= 0; index -= 1) {
    const monthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1))
    months.push({
      key: monthKey(monthDate),
      label: toMonthLabel(monthDate),
    })
  }

  const counts = new Map<string, number>(months.map((month) => [month.key, 0]))

  for (const request of requests) {
    const createdAt = new Date(request.created_at)
    const key = monthKey(new Date(Date.UTC(createdAt.getUTCFullYear(), createdAt.getUTCMonth(), 1)))

    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }

  return months.map((month) => ({
    month: month.label,
    value: counts.get(month.key) ?? 0,
  }))
}

function buildEventInsights(events: EventRow[], enrollments: EnrollmentCountRow[]) {
  const counts = new Map<string, number>()

  for (const enrollment of enrollments) {
    counts.set(enrollment.event_id, (counts.get(enrollment.event_id) ?? 0) + 1)
  }

  return events
    .map((event) => ({
      label: event.name,
      value: counts.get(event.id) ?? 0,
      sortDate: event.start_date ?? "",
    }))
    .sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value
      return a.sortDate.localeCompare(b.sortDate)
    })
    .slice(0, 5)
    .map(({ label, value }) => ({ label, value }))
}

function getManagerEventState(event: EventRow): "draft" | "published" | "closed" {
  const managerState = typeof event.metadata?.manager_state === "string" ? event.metadata.manager_state : null

  if (managerState === "draft" || managerState === "published" || managerState === "closed") {
    return managerState
  }

  return event.active ? "published" : "draft"
}

function buildManagerEvents(events: EventRow[], enrollments: EnrollmentCountRow[]): ManagerEventItem[] {
  const attendeeCounts = new Map<string, number>()

  for (const enrollment of enrollments) {
    attendeeCounts.set(enrollment.event_id, (attendeeCounts.get(enrollment.event_id) ?? 0) + 1)
  }

  return events
    .slice()
    .sort((left, right) => {
      const leftDate = left.start_date ?? ""
      const rightDate = right.start_date ?? ""
      return rightDate.localeCompare(leftDate)
    })
    .slice(0, 8)
    .map((event) => ({
      id: event.id,
      name: event.name,
      description: event.description ?? null,
      venueName: event.venue_name ?? null,
      startDate: event.start_date,
      endDate: event.end_date,
      state: getManagerEventState(event),
      active: event.active,
      attendeeCount: attendeeCounts.get(event.id) ?? 0,
    }))
}

function buildRequestStatus(requests: JoinRequestRow[]) {
  const summary = new Map<string, number>([
    ["Pending", 0],
    ["Approved", 0],
    ["Rejected", 0],
    ["Withdrawn", 0],
  ])

  for (const request of requests) {
    switch (request.status) {
      case "pending_review":
        summary.set("Pending", (summary.get("Pending") ?? 0) + 1)
        break
      case "approved":
        summary.set("Approved", (summary.get("Approved") ?? 0) + 1)
        break
      case "rejected":
        summary.set("Rejected", (summary.get("Rejected") ?? 0) + 1)
        break
      case "withdrawn":
        summary.set("Withdrawn", (summary.get("Withdrawn") ?? 0) + 1)
        break
    }
  }

  return [...summary.entries()].map(([label, value]) => ({ label, value }))
}

function percentageLabel(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return "Not enough data yet"
  }

  return `${Math.round((numerator / denominator) * 100)}%`
}

function fallbackAmenityUsage(): DashboardListBlock {
  return {
    items: [],
    emptyMessage: "Coming soon once amenity usage is tracked in dedicated building tables.",
  }
}

function buildIntroductionFunnel(introductions: BuildingIntroductionRow[]) {
  const summary = new Map<string, number>([
    ["Suggested", 0],
    ["Requested", 0],
    ["Accepted", 0],
    ["Mutual", 0],
    ["Delivered", 0],
    ["Declined", 0],
    ["Paused", 0],
  ])

  for (const introduction of introductions) {
    switch (introduction.status) {
      case "suggested":
        summary.set("Suggested", (summary.get("Suggested") ?? 0) + 1)
        break
      case "requested":
        summary.set("Requested", (summary.get("Requested") ?? 0) + 1)
        break
      case "accepted":
        summary.set("Accepted", (summary.get("Accepted") ?? 0) + 1)
        break
      case "mutual":
        summary.set("Mutual", (summary.get("Mutual") ?? 0) + 1)
        break
      case "delivered":
        summary.set("Delivered", (summary.get("Delivered") ?? 0) + 1)
        break
      case "declined":
        summary.set("Declined", (summary.get("Declined") ?? 0) + 1)
        break
      case "paused":
        summary.set("Paused", (summary.get("Paused") ?? 0) + 1)
        break
    }
  }

  return [...summary.entries()].map(([label, value]) => ({ label, value }))
}

function buildIntroductionQueue(
  introductions: BuildingIntroductionRow[],
  profilesById: Map<string, string>,
): ManagerIntroductionQueueItem[] {
  return introductions
    .filter((introduction) => introduction.status === "mutual" || introduction.status === "delivered")
    .sort((left, right) => {
      const leftDate = left.delivered_at ?? left.mutual_at ?? left.suggested_at
      const rightDate = right.delivered_at ?? right.mutual_at ?? right.suggested_at
      return rightDate.localeCompare(leftDate)
    })
    .slice(0, 8)
    .map((introduction) => ({
      id: introduction.id,
      residentAFirstName: profilesById.get(introduction.resident_a_user_id) ?? "Resident",
      residentBFirstName: profilesById.get(introduction.resident_b_user_id) ?? "Resident",
      introType: introduction.intro_type,
      status: introduction.status,
      source: introduction.source,
      suggestedAt: introduction.suggested_at,
      mutualAt: introduction.mutual_at,
      deliveredAt: introduction.delivered_at,
      compatibilitySummary: introduction.compatibility_summary?.trim() || null,
    }))
}

export function getMockManagerDashboardSnapshot(): ManagerDashboardSnapshot {
  return {
    buildingName: "Chorus Apartments",
    pulseScore: 72,
    pulseDelta: 9,
    isLive: false,
    stats: [
      { label: "Residents invited", value: "Coming soon", helper: "Invitation tracking not wired yet.", isPlaceholder: true },
      { label: "Residents approved", value: "35" },
      { label: "Residents activated", value: "18", accent: true },
      { label: "Active memberships", value: "22" },
      { label: "Survey completion", value: "67%" },
      { label: "Event RSVPs", value: "57" },
      { label: "Event attendance", value: "Coming soon", helper: "Attendance check-ins are not stored yet.", isPlaceholder: true },
      { label: "Intro requests", value: "14" },
      { label: "Mutual intros", value: "8", accent: true },
      { label: "Introductions delivered", value: "5" },
    ],
    trend: [
      { month: "Jan", value: 38 },
      { month: "Feb", value: 44 },
      { month: "Mar", value: 51 },
      { month: "Apr", value: 49 },
      { month: "May", value: 63 },
      { month: "Jun", value: 72 },
    ],
    topInterests: {
      items: [
        { label: "Wellness", value: 84 },
        { label: "Food", value: 76 },
        { label: "Travel", value: 61 },
        { label: "Books", value: 48 },
        { label: "Running", value: 39 },
      ],
    },
    eventInsights: {
      items: [
        { label: "Rooftop Wine Night", value: 42 },
        { label: "Sunrise Running Club", value: 31 },
        { label: "Women's Brunch", value: 27 },
        { label: "Book Club", value: 23 },
      ],
    },
    requestStatus: {
      items: [
        { label: "Pending", value: 12 },
        { label: "Approved", value: 35 },
        { label: "Rejected", value: 4 },
        { label: "Withdrawn", value: 2 },
      ],
    },
    introductionFunnel: {
      items: [
        { label: "Suggested", value: 18 },
        { label: "Requested", value: 14 },
        { label: "Accepted", value: 9 },
        { label: "Mutual", value: 8 },
        { label: "Delivered", value: 5 },
        { label: "Declined", value: 3 },
        { label: "Paused", value: 2 },
      ],
    },
    mostRequestedEvents: {
      items: [],
      emptyMessage: "Coming soon once resident event-request voting is stored in Supabase.",
    },
    amenityUsage: fallbackAmenityUsage(),
    introductionQueue: [
      {
        id: "intro-1",
        residentAFirstName: "Ava",
        residentBFirstName: "Marcus",
        introType: "friendship",
        status: "mutual",
        source: "resident_request",
        suggestedAt: new Date().toISOString(),
        mutualAt: new Date().toISOString(),
        deliveredAt: null,
        compatibilitySummary: "They both share wellness interests and enjoy intentional one-on-one conversations.",
      },
      {
        id: "intro-2",
        residentAFirstName: "Elena",
        residentBFirstName: "Priya",
        introType: "friendship",
        status: "delivered",
        source: "system",
        suggestedAt: new Date().toISOString(),
        mutualAt: new Date().toISOString(),
        deliveredAt: new Date().toISOString(),
        compatibilitySummary: "They both value design, food, and community events in the building.",
      },
    ],
    managerEvents: [
      {
        id: "event-1",
        name: "Rooftop Social",
        description: "A hosted social hour for residents.",
        venueName: "Sky Deck",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        state: "published",
        active: true,
        attendeeCount: 18,
      },
      {
        id: "event-2",
        name: "Wellness Morning",
        description: "Draft event for the next resident wellness session.",
        venueName: "Fitness Studio",
        startDate: null,
        endDate: null,
        state: "draft",
        active: false,
        attendeeCount: 0,
      },
    ],
    supportCategoryBreakdown: {
      items: [
        { label: "support request", value: 3 },
        { label: "bug", value: 2 },
        { label: "safety concern", value: 1 },
      ],
    },
    supportQueue: [
      {
        id: "support-1",
        category: "support_request",
        status: "open",
        subject: "Need help updating unit details",
        messagePreview: "Resident asked for help updating their unit details after a recent move within the building.",
        submittedAt: new Date().toISOString(),
        residentFirstName: "Ava",
        reportedResidentFirstName: null,
      },
      {
        id: "support-2",
        category: "bug",
        status: "open",
        subject: "RSVP issue",
        messagePreview: "Resident could view the event but the RSVP button stayed disabled after sign-in.",
        submittedAt: new Date().toISOString(),
        residentFirstName: "Marcus",
        reportedResidentFirstName: null,
      },
    ],
  }
}

async function getConfiguredBuilding() {
  const supabase = getSupabaseAdmin()
  const buildingSlug = normalizeBuildingSlug()

  const { data: building, error } = await supabase
    .from("buildings")
    .select("id, name, slug, timezone")
    .eq("slug", buildingSlug)
    .maybeSingle<BuildingRow>()

  if (error) {
    throw new Error("Unable to load building dashboard.")
  }

  if (!building) {
    throw new Error("Configured building was not found.")
  }

  return building
}

async function isAdminUser(userId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  })

  if (error) {
    throw new Error("Unable to verify manager access.")
  }

  return Boolean(data)
}

async function hasActiveManagerMembership(userId: string, buildingId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("building_memberships")
    .select("building_id")
    .eq("user_id", userId)
    .eq("building_id", buildingId)
    .eq("role", "manager")
    .eq("status", "active")
    .maybeSingle<{ building_id: string }>()

  if (error) {
    throw new Error("Unable to verify manager access.")
  }

  return Boolean(data?.building_id)
}

export async function getAuthorizedManagerBuilding(userId: string) {
  const building = await getConfiguredBuilding()
  const [admin, managerMembership] = await Promise.all([
    isAdminUser(userId),
    hasActiveManagerMembership(userId, building.id),
  ])

  if (!admin && !managerMembership) {
    return null
  }

  return building
}

export async function getManagerDashboardSnapshotForBuilding({
  buildingId,
  buildingName,
}: {
  buildingId: string
  buildingName: string
}): Promise<ManagerDashboardSnapshot> {
  const supabase = getSupabaseAdmin()

  const [
    residentInvitesResult,
    activeResidentMembershipsResult,
    activeManagerMembershipsResult,
    activeMembershipsResult,
    residentProfilesResult,
    surveyCompletedProfilesResult,
    requestsResult,
    eventsResult,
    introductionsResult,
    supportResult,
  ] = await Promise.all([
    supabase
      .from("building_memberships")
      .select("*", { count: "exact", head: true })
      .eq("building_id", buildingId)
      .eq("role", "resident")
      .eq("status", "invited"),
    supabase
      .from("building_memberships")
      .select("*", { count: "exact", head: true })
      .eq("building_id", buildingId)
      .eq("role", "resident")
      .eq("status", "active"),
    supabase
      .from("building_memberships")
      .select("*", { count: "exact", head: true })
      .eq("building_id", buildingId)
      .eq("role", "manager")
      .eq("status", "active"),
    supabase
      .from("building_memberships")
      .select("*", { count: "exact", head: true })
      .eq("building_id", buildingId)
      .eq("status", "active"),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("building_id", buildingId),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("building_id", buildingId)
      .or("completed_questionnaire.eq.true,completed_friendship_questionnaire.eq.true"),
    supabase
      .from("resident_join_requests")
      .select("status, interests, looking_for, created_at")
      .eq("building_id", buildingId)
      .order("created_at", { ascending: false })
      .returns<JoinRequestRow[]>(),
    supabase
      .from("events")
      .select("id, name, slug, description, venue_name, start_date, end_date, active, metadata")
      .eq("building_id", buildingId)
      .order("start_date", { ascending: true })
      .returns<EventRow[]>(),
    supabase
      .from("building_introductions")
      .select(
        "id, resident_a_user_id, resident_b_user_id, intro_type, status, source, suggested_at, mutual_at, delivered_at, compatibility_summary",
      )
      .eq("building_id", buildingId)
      .returns<BuildingIntroductionRow[]>(),
    getManagerSupportRequestsForBuilding(buildingId),
  ])

  const firstError = [
    residentInvitesResult.error,
    activeResidentMembershipsResult.error,
    activeManagerMembershipsResult.error,
    activeMembershipsResult.error,
    residentProfilesResult.error,
    surveyCompletedProfilesResult.error,
    requestsResult.error,
    eventsResult.error,
    introductionsResult.error,
  ].find(Boolean)

  if (firstError) {
    throw new Error("Unable to load building analytics.")
  }

  const requests = requestsResult.data ?? []
  const events = eventsResult.data ?? []
  const introductions = introductionsResult.data ?? []
  const supportCategoryBreakdown = supportResult.supportCategoryBreakdown
  const supportQueue = supportResult.supportQueue
  const eventIds = events.map((event) => event.id)
  let enrollments: EnrollmentCountRow[] = []

  if (eventIds.length > 0) {
    const { data: enrollmentRows, error: enrollmentsError } = await supabase
      .from("event_enrollments")
      .select("event_id")
      .in("event_id", eventIds)
      .returns<EnrollmentCountRow[]>()

    if (enrollmentsError) {
      throw new Error("Unable to load building analytics.")
    }

    enrollments = enrollmentRows ?? []
  }

  const residentsInvited = residentInvitesResult.count ?? 0
  const residentsActivated = residentProfilesResult.count ?? 0
  const activeResidentMemberships = activeResidentMembershipsResult.count ?? 0
  const activeManagerMemberships = activeManagerMembershipsResult.count ?? 0
  const activeMemberships = activeMembershipsResult.count ?? 0
  const approvedResidents = requests.filter((request) => request.status === "approved").length
  const surveyCompletedResidents = surveyCompletedProfilesResult.count ?? 0
  const surveyCompletionRate = percentageLabel(surveyCompletedResidents, residentsActivated)
  const eventRsvps = enrollments.length
  const introRequests = introductions.filter((introduction) => introduction.status === "requested").length
  const introAccepted = introductions.filter((introduction) => introduction.status === "accepted").length
  const introMutual = introductions.filter((introduction) => introduction.status === "mutual").length
  const introDelivered = introductions.filter((introduction) => introduction.status === "delivered").length
  const introDeclinedOrPaused = introductions.filter(
    (introduction) => introduction.status === "declined" || introduction.status === "paused",
  ).length
  const pulseBase =
    activeResidentMemberships * 2 +
    approvedResidents +
    surveyCompletedResidents +
    Math.min(eventRsvps, 24) +
    Math.min(events.length * 2, 14) +
    Math.min(introMutual * 2 + introDelivered, 18)
  const pulseScore = Math.max(12, Math.min(99, pulseBase))
  const trend = buildRequestTrend(requests)
  const latestMonth = trend[trend.length - 1]?.value ?? 0
  const priorMonth = trend[trend.length - 2]?.value ?? 0
  const pulseDelta = latestMonth - priorMonth
  const activeDemandRequests = requests.filter(
    (request) => request.status === "approved" || request.status === "pending_review",
  )
  const introductionParticipantIds = Array.from(
    new Set(
      introductions.flatMap((introduction) => [
        introduction.resident_a_user_id,
        introduction.resident_b_user_id,
      ]),
    ),
  )
  const { data: introProfiles, error: introProfilesError } = introductionParticipantIds.length
    ? await supabase
        .from("profiles")
        .select("id, first_name")
        .in("id", introductionParticipantIds)
        .returns<ProfileNameRow[]>()
    : { data: [] as ProfileNameRow[], error: null }

  if (introProfilesError) {
    throw new Error("Unable to load building analytics.")
  }

  const profilesById = new Map<string, string>()
  for (const profile of introProfiles ?? []) {
    profilesById.set(profile.id, profile.first_name?.trim() || "Resident")
  }

  return {
    buildingName,
    pulseScore,
    pulseDelta,
    isLive: true,
    stats: [
      {
        label: "Residents invited",
        value: String(residentsInvited),
        helper: "Resident invite memberships in queued or manual invite state.",
      },
      {
        label: "Residents approved",
        value: String(approvedResidents),
        helper: "Approved join requests for this building.",
      },
      {
        label: "Residents activated",
        value: String(residentsActivated),
        accent: true,
        helper: "Residents who have claimed an account and were provisioned into the building.",
      },
      {
        label: "Active memberships",
        value: String(activeMemberships),
        helper: `${activeResidentMemberships} residents + ${activeManagerMemberships} managers`,
      },
      {
        label: "Survey completion",
        value: surveyCompletionRate,
        helper: "Residents with at least one completed concierge questionnaire.",
        isPlaceholder: residentsActivated === 0,
      },
      {
        label: "Event RSVPs",
        value: String(eventRsvps),
        helper: "Live building-scoped enrollments across active events.",
      },
      {
        label: "Event attendance",
        value: "Coming soon",
        helper: "Attendance check-ins are not stored in the beta schema yet.",
        isPlaceholder: true,
      },
      {
        label: "Intro requests",
        value: String(introRequests),
        helper: "Mutual-interest pipeline currently waiting on the second resident.",
      },
      {
        label: "Accepted introductions",
        value: String(introAccepted),
        helper: "One resident has accepted and the second response is still pending.",
      },
      {
        label: "Mutual intros",
        value: String(introMutual),
        accent: true,
        helper: "Introductions where both residents have said yes and are ready for concierge delivery.",
      },
      {
        label: "Introductions delivered",
        value: String(introDelivered),
        helper: "Mutual intros that the concierge team has marked as delivered.",
      },
      {
        label: "Declined or paused",
        value: String(introDeclinedOrPaused),
        helper: "Introductions that were quietly closed or paused.",
      },
    ],
    trend,
    topInterests: {
      items: countValues(activeDemandRequests.flatMap((request) => request.interests ?? [])),
      emptyMessage: "Not enough resident interest data yet.",
    },
    eventInsights: {
      items: buildEventInsights(events, enrollments),
      emptyMessage: "No active event RSVP data yet.",
    },
    requestStatus: {
      items: buildRequestStatus(requests),
      emptyMessage: "No resident requests yet.",
    },
    introductionFunnel: {
      items: buildIntroductionFunnel(introductions),
      emptyMessage: "No introduction activity yet.",
    },
    mostRequestedEvents: {
      items: [],
      emptyMessage: "Coming soon once resident event suggestions or event voting are stored in Supabase.",
    },
    amenityUsage: fallbackAmenityUsage(),
    introductionQueue: buildIntroductionQueue(introductions, profilesById),
    managerEvents: buildManagerEvents(events, enrollments),
    supportCategoryBreakdown: {
      items: supportCategoryBreakdown,
      emptyMessage: "No support or safety requests yet.",
    },
    supportQueue,
  }
}

export async function saveManagerEventForBuilding({
  buildingId,
  eventId,
  input,
}: {
  buildingId: string
  eventId?: string | null
  input: {
    name: string
    description?: string | null
    venueName?: string | null
    startDate?: string | null
    endDate?: string | null
  }
}) {
  const supabase = getSupabaseAdmin()
  const nowIso = new Date().toISOString()
  const payload = {
    building_id: buildingId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    venue_name: input.venueName?.trim() || null,
    start_date: input.startDate || null,
    end_date: input.endDate || null,
    active: false,
    is_public: false,
    metadata: {
      manager_state: "draft",
      updated_by_manager_at: nowIso,
    },
  }

  if (eventId) {
    const { error } = await supabase
      .from("events")
      .update(payload)
      .eq("id", eventId)
      .eq("building_id", buildingId)

    if (error) {
      throw new Error("Unable to update the event.")
    }

    return { id: eventId }
  }

  const slugBase = input.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "resident-event"

  const { data, error } = await supabase
    .from("events")
    .insert({
      ...payload,
      slug: `${slugBase}-${nowIso.slice(0, 10).replace(/-/g, "")}`,
      cta_label: "RSVP",
      matching_mode: "friendship",
      matchmaking_enabled: false,
      timezone: "America/Los_Angeles",
      short_description: input.description?.trim() || null,
      created_at: nowIso,
    })
    .select("id")
    .maybeSingle<{ id: string }>()

  if (error || !data) {
    throw new Error("Unable to create the event.")
  }

  return data
}

export async function setManagerEventStateForBuilding({
  buildingId,
  eventId,
  state,
}: {
  buildingId: string
  eventId: string
  state: "published" | "closed"
}) {
  const supabase = getSupabaseAdmin()
  const { data: existing, error: loadError } = await supabase
    .from("events")
    .select("id, metadata")
    .eq("id", eventId)
    .eq("building_id", buildingId)
    .maybeSingle<{ id: string; metadata: Record<string, unknown> | null }>()

  if (loadError || !existing) {
    throw new Error("Event not found.")
  }

  const metadata = {
    ...(existing.metadata ?? {}),
    manager_state: state,
    updated_by_manager_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from("events")
    .update({
      active: state === "published",
      is_public: false,
      metadata,
    })
    .eq("id", eventId)
    .eq("building_id", buildingId)

  if (error) {
    throw new Error(
      state === "published" ? "Unable to publish the event." : "Unable to close the event.",
    )
  }

  return {
    id: eventId,
    state,
  }
}

export async function markIntroductionDeliveredForBuilding({
  buildingId,
  introductionId,
}: {
  buildingId: string
  introductionId: string
}) {
  const supabase = getSupabaseAdmin()
  const { data: existing, error: loadError } = await supabase
    .from("building_introductions")
    .select("id, status, delivered_at")
    .eq("building_id", buildingId)
    .eq("id", introductionId)
    .maybeSingle<{ id: string; status: string; delivered_at: string | null }>()

  if (loadError || !existing) {
    throw new Error("Introduction not found.")
  }

  if (existing.status !== "mutual" && existing.status !== "delivered") {
    throw new Error("Only mutual introductions can be marked as delivered.")
  }

  const deliveredAt = existing.delivered_at ?? new Date().toISOString()
  const { error: updateError } = await supabase
    .from("building_introductions")
    .update({
      status: "delivered",
      delivered_at: deliveredAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", introductionId)

  if (updateError) {
    throw new Error("Unable to mark the introduction as delivered.")
  }

  return {
    id: introductionId,
    deliveredAt,
  }
}
