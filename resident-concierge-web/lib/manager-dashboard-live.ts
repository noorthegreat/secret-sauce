import { getSupabaseAdmin } from "@/lib/supabase-admin"

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
  mostRequestedEvents: DashboardListBlock
  amenityUsage: DashboardListBlock
}

type BuildingRow = {
  id: string
  name: string
  slug: string
}

type EventRow = {
  id: string
  name: string
  start_date: string | null
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
      { label: "Intro requests", value: "Coming soon", helper: "Resident intro request events are not stored yet.", isPlaceholder: true },
      { label: "Accepted introductions", value: "Coming soon", helper: "Acceptance tracking is not available yet.", isPlaceholder: true },
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
    mostRequestedEvents: {
      items: [],
      emptyMessage: "Coming soon once resident event-request voting is stored in Supabase.",
    },
    amenityUsage: fallbackAmenityUsage(),
  }
}

async function getConfiguredBuilding() {
  const supabase = getSupabaseAdmin()
  const buildingSlug = normalizeBuildingSlug()

  const { data: building, error } = await supabase
    .from("buildings")
    .select("id, name, slug")
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
      .select("id, name, start_date")
      .eq("building_id", buildingId)
      .eq("active", true)
      .order("start_date", { ascending: true })
      .returns<EventRow[]>(),
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
  ].find(Boolean)

  if (firstError) {
    throw new Error("Unable to load building analytics.")
  }

  const requests = requestsResult.data ?? []
  const events = eventsResult.data ?? []
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
  const pulseBase =
    activeResidentMemberships * 2 +
    approvedResidents +
    surveyCompletedResidents +
    Math.min(eventRsvps, 24) +
    Math.min(events.length * 2, 14)
  const pulseScore = Math.max(12, Math.min(99, pulseBase))
  const trend = buildRequestTrend(requests)
  const latestMonth = trend[trend.length - 1]?.value ?? 0
  const priorMonth = trend[trend.length - 2]?.value ?? 0
  const pulseDelta = latestMonth - priorMonth
  const activeDemandRequests = requests.filter(
    (request) => request.status === "approved" || request.status === "pending_review",
  )

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
        value: "Coming soon",
        helper: "Resident intro requests are not yet stored as a building-scoped metric.",
        isPlaceholder: true,
      },
      {
        label: "Accepted introductions",
        value: "Coming soon",
        helper: "Accepted intro tracking is not yet available in the beta-safe building flow.",
        isPlaceholder: true,
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
    mostRequestedEvents: {
      items: [],
      emptyMessage: "Coming soon once resident event suggestions or event voting are stored in Supabase.",
    },
    amenityUsage: fallbackAmenityUsage(),
  }
}
