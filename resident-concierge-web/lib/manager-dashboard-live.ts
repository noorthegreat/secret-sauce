import { notifyIntroductionDelivered } from "@/lib/introduction-notifications"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { getEventEngagementSnapshotForBuilding } from "@/lib/event-engagements-server"
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
  managerCompatibilitySummary: string | null
  meetupRecommendation: {
    title: string
    amenityLabel: string
    timingLabel: string | null
    reason: string
  } | null
}

export type ManagerResidentItem = {
  id: string
  firstName: string
  stage:
    | "pending_review"
    | "approved_not_active"
    | "active_needs_onboarding"
    | "active_ready"
    | "active_paused"
  submittedAt: string | null
  joinedAt: string | null
  summary: string
}

export type ManagerIntroductionWatchItem = {
  id: string
  residentAFirstName: string
  residentBFirstName: string
  introType: "friendship" | "professional"
  status: "requested" | "accepted" | "mutual" | "delivered" | "paused" | "declined" | "suggested"
  source: string
  compatibilitySummary: string | null
  managerCompatibilitySummary: string | null
  meetupRecommendation: {
    title: string
    amenityLabel: string
    timingLabel: string | null
    reason: string
  } | null
  nextStep: string
  lastUpdatedAt: string
}

export type ManagerCommunicationCue = {
  id: string
  priority: "now" | "soon" | "watch"
  title: string
  description: string
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

export type ManagerRoiStat = {
  label: string
  value: string
  helper: string
}

export type ManagerDashboardSnapshot = {
  buildingName: string
  pulseScore: number
  pulseDelta: number
  isLive: boolean
  roiStats: ManagerRoiStat[]
  stats: DashboardStat[]
  trend: DashboardSeriesPoint[]
  topInterests: DashboardListBlock
  eventInsights: DashboardListBlock
  requestStatus: DashboardListBlock
  introductionFunnel: DashboardListBlock
  mostRequestedEvents: DashboardListBlock
  amenityUsage: DashboardListBlock
  residentRoster: ManagerResidentItem[]
  introductionWatchlist: ManagerIntroductionWatchItem[]
  communicationCues: ManagerCommunicationCue[]
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
  id: string
  first_name: string
  normalized_email: string
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
  shared_context: Record<string, unknown> | null
}

type ProfileNameRow = {
  id: string
  first_name: string
}

type ResidentProfileRow = {
  id: string
  first_name: string
  completed_questionnaire: boolean | null
  completed_friendship_questionnaire: boolean | null
  is_paused: boolean | null
  updated_at: string | null
}

type ActiveResidentMembershipRow = {
  user_id: string
  joined_at: string | null
}

type PrivateProfileEmailRow = {
  user_id: string
  email: string | null
}

function parseMeetupRecommendation(sharedContext: Record<string, unknown> | null) {
  if (!sharedContext) {
    return null
  }

  const rawRecommendation = sharedContext.meetup_recommendation
  if (!rawRecommendation || typeof rawRecommendation !== "object") {
    return null
  }

  const recommendation = rawRecommendation as Record<string, unknown>

  return {
    title:
      typeof recommendation.title === "string"
        ? recommendation.title
        : "Suggested meetup",
    amenityLabel:
      typeof recommendation.amenity_label === "string"
        ? recommendation.amenity_label
        : "Resident Lounge",
    timingLabel:
      typeof recommendation.timing_label === "string"
        ? recommendation.timing_label
        : null,
    reason:
      typeof recommendation.reason === "string"
        ? recommendation.reason
        : "A low-pressure, concierge-led first meetup.",
  }
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
      managerCompatibilitySummary:
        typeof introduction.shared_context?.manager_compatibility_summary === "string"
          ? introduction.shared_context.manager_compatibility_summary
          : null,
      meetupRecommendation: parseMeetupRecommendation(introduction.shared_context),
    }))
}

function buildResidentRoster({
  requests,
  activeMemberships,
  activeProfiles,
  activeEmails,
}: {
  requests: JoinRequestRow[]
  activeMemberships: ActiveResidentMembershipRow[]
  activeProfiles: ResidentProfileRow[]
  activeEmails: Map<string, string>
}): ManagerResidentItem[] {
  const roster: ManagerResidentItem[] = []
  const activeUserIds = new Set(activeMemberships.map((membership) => membership.user_id))
  const joinedAtByUserId = new Map(activeMemberships.map((membership) => [membership.user_id, membership.joined_at]))
  const activatedEmails = new Set(
    [...activeEmails.values()]
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  )

  for (const request of requests) {
    if (request.status === "pending_review") {
      roster.push({
        id: `request-${request.id}`,
        firstName: request.first_name?.trim() || "Resident",
        stage: "pending_review",
        submittedAt: request.created_at,
        joinedAt: null,
        summary: "Awaiting building-team review before resident access is approved.",
      })
      continue
    }

    if (request.status === "approved" && !activatedEmails.has(request.normalized_email.trim().toLowerCase())) {
      roster.push({
        id: `request-${request.id}`,
        firstName: request.first_name?.trim() || "Resident",
        stage: "approved_not_active",
        submittedAt: request.created_at,
        joinedAt: null,
        summary: "Approved for access, but they have not finished claiming their account yet.",
      })
    }
  }

  for (const profile of activeProfiles) {
    if (!activeUserIds.has(profile.id)) {
      continue
    }

    const completed =
      Boolean(profile.completed_questionnaire) || Boolean(profile.completed_friendship_questionnaire)
    const paused = Boolean(profile.is_paused)
    const stage: ManagerResidentItem["stage"] = paused
      ? "active_paused"
      : completed
        ? "active_ready"
        : "active_needs_onboarding"

    roster.push({
      id: profile.id,
      firstName: profile.first_name?.trim() || "Resident",
      stage,
      submittedAt: null,
      joinedAt: joinedAtByUserId.get(profile.id) ?? null,
      summary:
        stage === "active_ready"
          ? "Ready for thoughtful introductions, circles, and gathering RSVPs."
          : stage === "active_paused"
            ? "Participation is currently paused until the resident opts back in."
            : "Activated, but still missing the onboarding signals needed for strong matching.",
    })
  }

  const stageRank: Record<ManagerResidentItem["stage"], number> = {
    pending_review: 0,
    approved_not_active: 1,
    active_needs_onboarding: 2,
    active_paused: 3,
    active_ready: 4,
  }

  return roster
    .sort((left, right) => {
      if (stageRank[left.stage] !== stageRank[right.stage]) {
        return stageRank[left.stage] - stageRank[right.stage]
      }

      const leftDate = left.submittedAt ?? left.joinedAt ?? ""
      const rightDate = right.submittedAt ?? right.joinedAt ?? ""
      return rightDate.localeCompare(leftDate)
    })
    .slice(0, 12)
}

function getIntroductionNextStep(status: BuildingIntroductionRow["status"]) {
  switch (status) {
    case "requested":
      return "Waiting on the second resident to review the introduction."
    case "accepted":
      return "One resident said yes. Hold until the second resident responds."
    case "mutual":
      return "Mutual interest confirmed. Concierge can now deliver the introduction."
    case "delivered":
      return "Introduction has been delivered. Watch for meetup follow-through or resident feedback."
    case "paused":
      return "The introduction is paused. No outreach is needed unless a resident asks to resume."
    case "declined":
      return "The introduction was declined and can remain quietly closed."
    default:
      return "Review resident readiness before moving this introduction forward."
  }
}

function buildIntroductionWatchlist(
  introductions: BuildingIntroductionRow[],
  profilesById: Map<string, string>,
): ManagerIntroductionWatchItem[] {
  return introductions
    .filter((introduction) =>
      ["requested", "accepted", "mutual", "delivered", "paused"].includes(introduction.status),
    )
    .sort((left, right) => {
      const leftDate = left.delivered_at ?? left.mutual_at ?? left.suggested_at
      const rightDate = right.delivered_at ?? right.mutual_at ?? right.suggested_at
      return rightDate.localeCompare(leftDate)
    })
    .slice(0, 10)
    .map((introduction) => ({
      id: introduction.id,
      residentAFirstName: profilesById.get(introduction.resident_a_user_id) ?? "Resident",
      residentBFirstName: profilesById.get(introduction.resident_b_user_id) ?? "Resident",
      introType: introduction.intro_type,
      status: introduction.status,
      source: introduction.source,
      compatibilitySummary: introduction.compatibility_summary?.trim() || null,
      managerCompatibilitySummary:
        typeof introduction.shared_context?.manager_compatibility_summary === "string"
          ? introduction.shared_context.manager_compatibility_summary
          : null,
      meetupRecommendation: parseMeetupRecommendation(introduction.shared_context),
      nextStep: getIntroductionNextStep(introduction.status),
      lastUpdatedAt: introduction.delivered_at ?? introduction.mutual_at ?? introduction.suggested_at,
    }))
}

function buildCommunicationCues({
  residentRoster,
  introductionWatchlist,
  supportQueueCount,
  publishedEventCount,
}: {
  residentRoster: ManagerResidentItem[]
  introductionWatchlist: ManagerIntroductionWatchItem[]
  supportQueueCount: number
  publishedEventCount: number
}) {
  const cues: ManagerCommunicationCue[] = []
  const pendingReview = residentRoster.filter((resident) => resident.stage === "pending_review").length
  const approvedNotActive = residentRoster.filter((resident) => resident.stage === "approved_not_active").length
  const needsOnboarding = residentRoster.filter((resident) => resident.stage === "active_needs_onboarding").length
  const mutualReady = introductionWatchlist.filter((item) => item.status === "mutual").length
  const waitingSecondResponse = introductionWatchlist.filter(
    (item) => item.status === "requested" || item.status === "accepted",
  ).length

  if (pendingReview > 0) {
    cues.push({
      id: "review-pending-residents",
      priority: "now",
      title: `Review ${pendingReview} pending resident request${pendingReview === 1 ? "" : "s"}`,
      description: "The fastest way to create early momentum is to move qualified residents into approved status quickly.",
    })
  }

  if (approvedNotActive > 0) {
    cues.push({
      id: "activate-approved-residents",
      priority: "now",
      title: `Nudge ${approvedNotActive} approved resident${approvedNotActive === 1 ? "" : "s"} to activate`,
      description: "These residents are approved but have not yet claimed access. A short concierge follow-up can unblock the building launch.",
    })
  }

  if (needsOnboarding > 0) {
    cues.push({
      id: "complete-onboarding",
      priority: "soon",
      title: `Guide ${needsOnboarding} active resident${needsOnboarding === 1 ? "" : "s"} through onboarding`,
      description: "Introductions improve quickly once residents finish the concierge questionnaire and share their availability.",
    })
  }

  if (mutualReady > 0) {
    cues.push({
      id: "deliver-mutual-introductions",
      priority: "now",
      title: `${mutualReady} mutual introduction${mutualReady === 1 ? "" : "s"} ready for concierge delivery`,
      description: "These residents have both said yes. Move them into a thoughtful handoff while momentum is warm.",
    })
  }

  if (waitingSecondResponse > 0) {
    cues.push({
      id: "watch-pending-intros",
      priority: "watch",
      title: `${waitingSecondResponse} introduction${waitingSecondResponse === 1 ? "" : "s"} waiting on a second response`,
      description: "No outreach is usually needed yet, but this queue helps you spot where interest is building.",
    })
  }

  if (publishedEventCount === 0 && residentRoster.length > 0) {
    cues.push({
      id: "publish-first-gathering",
      priority: "soon",
      title: "Publish the first gathering",
      description: "Residents already have enough context to engage. A first gathering gives the building an early shared rhythm.",
    })
  }

  if (supportQueueCount > 0) {
    cues.push({
      id: "follow-up-support",
      priority: "now",
      title: `Review ${supportQueueCount} resident support request${supportQueueCount === 1 ? "" : "s"}`,
      description: "Fast follow-through reinforces that the community feels private, responsive, and well cared for.",
    })
  }

  if (cues.length === 0) {
    cues.push({
      id: "steady-pilot",
      priority: "watch",
      title: "The pilot is in a steady state",
      description: "There are no urgent manager follow-ups right now. Use this moment to watch resident demand and refine the next gathering.",
    })
  }

  const priorityRank: Record<ManagerCommunicationCue["priority"], number> = {
    now: 0,
    soon: 1,
    watch: 2,
  }

  return cues.sort((left, right) => priorityRank[left.priority] - priorityRank[right.priority])
}

export function getMockManagerDashboardSnapshot(): ManagerDashboardSnapshot {
  return {
    buildingName: "Chorus Apartments",
    pulseScore: 72,
    pulseDelta: 9,
    isLive: false,
    roiStats: [
      { label: "Resident opt-in rate", value: "14%", helper: "Activated residents vs. 250 estimated units." },
      { label: "Intro request to mutual", value: "57%", helper: "Share of requested introductions that reached mutual interest." },
      { label: "Mutual to delivered", value: "63%", helper: "Concierge handoffs completed after mutual interest." },
      { label: "Onboarding completion", value: "67%", helper: "Activated residents who finished the concierge questionnaire." },
    ],
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
    residentRoster: [
      {
        id: "resident-pending-1",
        firstName: "Maya",
        stage: "pending_review",
        submittedAt: new Date().toISOString(),
        joinedAt: null,
        summary: "Awaiting building-team review before resident access is approved.",
      },
      {
        id: "resident-onboarding-1",
        firstName: "Ava",
        stage: "active_needs_onboarding",
        submittedAt: null,
        joinedAt: new Date().toISOString(),
        summary: "Activated, but still missing the onboarding signals needed for strong matching.",
      },
      {
        id: "resident-ready-1",
        firstName: "Marcus",
        stage: "active_ready",
        submittedAt: null,
        joinedAt: new Date().toISOString(),
        summary: "Ready for thoughtful introductions, circles, and gathering RSVPs.",
      },
    ],
    introductionWatchlist: [
      {
        id: "intro-watch-1",
        residentAFirstName: "Ava",
        residentBFirstName: "Marcus",
        introType: "friendship",
        status: "mutual",
        source: "resident_request",
        compatibilitySummary: "They both enjoy wellness-oriented gatherings and intentional one-on-one conversations.",
        managerCompatibilitySummary: "Both residents are looking for a calm first introduction and have overlapping evening availability.",
        meetupRecommendation: {
          title: "Rooftop coffee",
          amenityLabel: "Sky Deck",
          timingLabel: "Wednesday evening",
          reason: "A short, low-pressure first meetup fits their shared pace and availability.",
        },
        nextStep: "Mutual interest confirmed. Concierge can now deliver the introduction.",
        lastUpdatedAt: new Date().toISOString(),
      },
    ],
    communicationCues: [
      {
        id: "cue-review",
        priority: "now",
        title: "Review the first resident requests",
        description: "The fastest way to create early pilot momentum is to move qualified residents into approved status quickly.",
      },
      {
        id: "cue-onboarding",
        priority: "soon",
        title: "Encourage onboarding completion",
        description: "Introductions get meaningfully stronger once active residents finish the concierge questionnaire and share availability.",
      },
    ],
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
        managerCompatibilitySummary: "Both residents prefer a calmer first introduction and have overlapping evening availability.",
        meetupRecommendation: {
          title: "Rooftop coffee",
          amenityLabel: "Sky Deck",
          timingLabel: "Wednesday evening",
          reason: "A short, low-pressure first meetup fits their shared pace and early friendship intent.",
        },
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
        managerCompatibilitySummary: "They share strong curiosity around design-minded gatherings and have already moved through concierge delivery.",
        meetupRecommendation: {
          title: "Resident club supper",
          amenityLabel: "Private Dining Room",
          timingLabel: "Saturday evening",
          reason: "A hosted meal gives them an easy first setting after the introduction has been delivered.",
        },
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
    requestsResult,
    eventsResult,
    introductionsResult,
    supportResult,
    eventEngagementResult,
  ] = await Promise.all([
    supabase
      .from("building_memberships")
      .select("*", { count: "exact", head: true })
      .eq("building_id", buildingId)
      .eq("role", "resident")
      .eq("status", "invited"),
    supabase
      .from("building_memberships")
      .select("user_id, joined_at")
      .eq("building_id", buildingId)
      .eq("role", "resident")
      .eq("status", "active")
      .returns<ActiveResidentMembershipRow[]>(),
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
      .select("id, first_name, completed_questionnaire, completed_friendship_questionnaire, is_paused, updated_at")
      .eq("building_id", buildingId)
      .returns<ResidentProfileRow[]>(),
    supabase
      .from("resident_join_requests")
      .select("id, first_name, normalized_email, status, interests, looking_for, created_at")
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
        "id, resident_a_user_id, resident_b_user_id, intro_type, status, source, suggested_at, mutual_at, delivered_at, compatibility_summary, shared_context",
      )
      .eq("building_id", buildingId)
      .returns<BuildingIntroductionRow[]>(),
    getManagerSupportRequestsForBuilding(buildingId),
    getEventEngagementSnapshotForBuilding(buildingId),
  ])

  const firstError = [
    residentInvitesResult.error,
    activeResidentMembershipsResult.error,
    activeManagerMembershipsResult.error,
    activeMembershipsResult.error,
    residentProfilesResult.error,
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
  const residentProfiles = residentProfilesResult.data ?? []
  const supportCategoryBreakdown = supportResult.supportCategoryBreakdown
  const supportQueue = supportResult.supportQueue
  const mostRequestedEvents = eventEngagementResult.mostRequestedEvents
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
  const activeResidentMembershipRows = activeResidentMembershipsResult.data ?? []
  const residentsActivated = residentProfiles.length
  const activeResidentMemberships = activeResidentMembershipRows.length
  const activeManagerMemberships = activeManagerMembershipsResult.count ?? 0
  const activeMemberships = activeMembershipsResult.count ?? 0
  const approvedResidents = requests.filter((request) => request.status === "approved").length
  const surveyCompletedResidents = residentProfiles.filter(
    (profile) => profile.completed_questionnaire || profile.completed_friendship_questionnaire,
  ).length
  const surveyCompletionRate = percentageLabel(surveyCompletedResidents, residentsActivated)
  const eventRsvps = enrollments.length
  const introRequests = introductions.filter((introduction) => introduction.status === "requested").length
  const introAccepted = introductions.filter((introduction) => introduction.status === "accepted").length
  const introMutual = introductions.filter((introduction) => introduction.status === "mutual").length
  const introDelivered = introductions.filter((introduction) => introduction.status === "delivered").length
  const introDeclinedOrPaused = introductions.filter(
    (introduction) => introduction.status === "declined" || introduction.status === "paused",
  ).length
  const introRequestedOrBeyond = introductions.filter((introduction) =>
    ["requested", "accepted", "mutual", "delivered"].includes(introduction.status),
  ).length
  const estimatedUnits = Math.max(approvedResidents + requests.filter((r) => r.status === "pending_review").length, 1)
  const optInRate = percentageLabel(residentsActivated, estimatedUnits)
  const requestToMutualRate = percentageLabel(introMutual + introDelivered, introRequestedOrBeyond)
  const mutualToDeliveredRate = percentageLabel(introDelivered, introMutual + introDelivered)
  const roiStats: ManagerRoiStat[] = [
    {
      label: "Resident opt-in rate",
      value: optInRate,
      helper: "Activated residents compared to approved + pending join demand.",
    },
    {
      label: "Intro request to mutual",
      value: requestToMutualRate,
      helper: "Requested introductions that reached mutual interest or delivery.",
    },
    {
      label: "Mutual to delivered",
      value: mutualToDeliveredRate,
      helper: "Mutual to delivered.",
    },
    {
      label: "Onboarding completion",
      value: surveyCompletionRate,
      helper: "Activated residents who completed the concierge questionnaire.",
    },
  ]
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

  const activeResidentUserIds = activeResidentMembershipRows.map((membership) => membership.user_id)
  const { data: activeResidentEmails, error: activeResidentEmailsError } = activeResidentUserIds.length
    ? await supabase
        .from("private_profile_data")
        .select("user_id, email")
        .in("user_id", activeResidentUserIds)
        .returns<PrivateProfileEmailRow[]>()
    : { data: [] as PrivateProfileEmailRow[], error: null }

  if (activeResidentEmailsError) {
    throw new Error("Unable to load building analytics.")
  }

  const activeEmailsByUserId = new Map<string, string>()
  for (const item of activeResidentEmails ?? []) {
    if (item.email?.trim()) {
      activeEmailsByUserId.set(item.user_id, item.email.trim().toLowerCase())
    }
  }

  const residentRoster = buildResidentRoster({
    requests,
    activeMemberships: activeResidentMembershipRows,
    activeProfiles: residentProfiles,
    activeEmails: activeEmailsByUserId,
  })
  const introductionWatchlist = buildIntroductionWatchlist(introductions, profilesById)
  const communicationCues = buildCommunicationCues({
    residentRoster,
    introductionWatchlist,
    supportQueueCount: supportQueue.length,
    publishedEventCount: events.filter((event) => getManagerEventState(event) === "published").length,
  })

  return {
    buildingName,
    pulseScore,
    pulseDelta,
    isLive: true,
    roiStats,
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
        helper: "Mutual to delivered.",
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
      items: mostRequestedEvents,
      emptyMessage:
        mostRequestedEvents.length > 0
          ? undefined
          : "No resident event requests, waitlist signals, or proposal votes have been captured yet.",
    },
    amenityUsage: fallbackAmenityUsage(),
    residentRoster,
    introductionWatchlist,
    communicationCues,
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
    .select(
      "id, building_id, resident_a_user_id, resident_b_user_id, status, delivered_at, requested_by_user_id, compatibility_summary",
    )
    .eq("building_id", buildingId)
    .eq("id", introductionId)
    .maybeSingle<{
      id: string
      building_id: string
      resident_a_user_id: string
      resident_b_user_id: string
      status: string
      delivered_at: string | null
      requested_by_user_id: string | null
      compatibility_summary: string | null
    }>()

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
      delivered_channel: "email",
      updated_at: new Date().toISOString(),
    })
    .eq("id", introductionId)

  if (updateError) {
    throw new Error("Unable to mark the introduction as delivered.")
  }

  if (existing.status !== "delivered") {
    void notifyIntroductionDelivered({
      id: existing.id,
      building_id: existing.building_id,
      resident_a_user_id: existing.resident_a_user_id,
      resident_b_user_id: existing.resident_b_user_id,
      status: "delivered",
      requested_by_user_id: existing.requested_by_user_id,
      compatibility_summary: existing.compatibility_summary,
    }).catch((notificationError) => {
      console.error("introduction delivered notification failed", notificationError)
    })
  }

  return {
    id: introductionId,
    deliveredAt,
  }
}
