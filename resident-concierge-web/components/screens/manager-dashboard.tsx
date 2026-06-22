"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { trackProductEvent } from "@/lib/product-analytics"
import { ArrowLeft, CheckCircle2, Loader2, ShieldAlert } from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts"

import { ManagerEventPlanningSection } from "@/components/screens/manager-event-planning-section"

type ManagerAccessSnapshot = {
  state:
    | "authorized"
    | "provisioned"
    | "awaiting_provisioning"
    | "no_matching_lead"
    | "building_inactive"
    | "conflict"
  message: string
  buildingName: string | null
  buildingSlug: string | null
  isAdmin: boolean
  isManager: boolean
  provisionedNow: boolean
}

type DashboardStat = {
  label: string
  value: string
  accent?: boolean
  helper?: string
  isPlaceholder?: boolean
}

type DashboardBarItem = {
  label: string
  value: number
}

type DashboardListBlock = {
  items: DashboardBarItem[]
  emptyMessage?: string
}

type ManagerIntroductionQueueItem = {
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

type ManagerResidentItem = {
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

type ManagerIntroductionWatchItem = {
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

type ManagerCommunicationCue = {
  id: string
  priority: "now" | "soon" | "watch"
  title: string
  description: string
}

type ManagerEventItem = {
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

type ManagerSupportRequestItem = {
  id: string
  category:
    | "harassment"
    | "inappropriate_behavior"
    | "bug"
    | "safety_concern"
    | "support_request"
    | "other"
  status: "open" | "reviewed" | "closed"
  subject: string | null
  messagePreview: string
  submittedAt: string
  residentFirstName: string
  reportedResidentFirstName: string | null
}

type DashboardTrendPoint = {
  month: string
  value: number
}

type ManagerRoiStat = {
  label: string
  value: string
  helper: string
}

type ManagerDashboardSnapshot = {
  buildingName: string
  pulseScore: number
  pulseDelta: number
  isLive: boolean
  roiStats: ManagerRoiStat[]
  stats: DashboardStat[]
  trend: DashboardTrendPoint[]
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

const emptySnapshot: ManagerDashboardSnapshot = {
  buildingName: "Fifth Circle",
  pulseScore: 0,
  pulseDelta: 0,
  isLive: false,
  roiStats: [],
  stats: [],
  trend: [],
  topInterests: { items: [] },
  eventInsights: { items: [] },
  requestStatus: { items: [] },
  introductionFunnel: { items: [] },
  mostRequestedEvents: { items: [] },
  amenityUsage: { items: [] },
  residentRoster: [],
  introductionWatchlist: [],
  communicationCues: [],
  introductionQueue: [],
  managerEvents: [],
  supportCategoryBreakdown: { items: [] },
  supportQueue: [],
}

export function ManagerDashboard({
  accessToken,
  onBack,
  access,
}: {
  accessToken: string
  onBack: () => void
  access: ManagerAccessSnapshot
}) {
  const [snapshot, setSnapshot] = useState<ManagerDashboardSnapshot>(emptySnapshot)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [errorStatus, setErrorStatus] = useState<number | null>(null)
  const [deliveryActionId, setDeliveryActionId] = useState<string | null>(null)
  const [deliveryError, setDeliveryError] = useState<string | null>(null)
  const [eventActionId, setEventActionId] = useState<string | null>(null)
  const [eventError, setEventError] = useState<string | null>(null)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [eventForm, setEventForm] = useState({
    name: "",
    description: "",
    venueName: "",
    startDate: "",
    endDate: "",
  })

  const loadDashboard = async () => {
    setIsLoading(true)
    setLoadError(null)
    setErrorStatus(null)

    try {
      const response = await fetch("/api/manager-dashboard", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      })

      const payload = (await response.json()) as ManagerDashboardSnapshot & { error?: string }

      if (!response.ok) {
        const message =
          payload.error ||
          (response.status === 403
            ? "Only authenticated building managers or admins can access Community Pulse."
            : "Unable to load the manager dashboard.")
        const error = new Error(message) as Error & { status?: number }
        error.status = response.status
        throw error
      }

      setSnapshot(payload)
    } catch (error) {
      const status = typeof error === "object" && error && "status" in error ? Number(error.status) : null
      setErrorStatus(Number.isFinite(status) ? status : null)
      setLoadError(error instanceof Error ? error.message : "Unable to load the manager dashboard.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadDashboard()
  }, [accessToken])

  async function markDelivered(introductionId: string) {
    setDeliveryActionId(introductionId)
    setDeliveryError(null)

    try {
      const response = await fetch("/api/manager-introductions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        body: JSON.stringify({
          introductionId,
          action: "mark_delivered",
        }),
      })

      const payload = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(payload.error || "Unable to mark the introduction as delivered.")
      }

      trackProductEvent("manager_intro_delivered")
      await loadDashboard()
    } catch (error) {
      setDeliveryError(
        error instanceof Error ? error.message : "Unable to mark the introduction as delivered.",
      )
    } finally {
      setDeliveryActionId(null)
    }
  }

  function startEventDraft(event?: ManagerEventItem) {
    setEditingEventId(event?.id / null)
    setEventError(null)
    setEventForm({
      name: event?.name / "",
      description: event?.description / "",
      venueName: event?.venueName / "",
      startDate: event?.startDate ? new Date(event.startDate).toISOString().slice(0, 16) : "",
      endDate: event?.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : "",
    })
  }

  async function saveEvent() {
    setEventActionId(editingEventId / "new")
    setEventError(null)

    try {
      const response = await fetch("/api/manager-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        body: JSON.stringify({
          action: "save",
          eventId: editingEventId,
          name: eventForm.name,
          description: eventForm.description,
          venueName: eventForm.venueName,
          startDate: eventForm.startDate ? new Date(eventForm.startDate).toISOString() : null,
          endDate: eventForm.endDate ? new Date(eventForm.endDate).toISOString() : null,
        }),
      })

      const payload = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(payload.error || "Unable to save the event.")
      }

      setEditingEventId(null)
      setEventForm({
        name: "",
        description: "",
        venueName: "",
        startDate: "",
        endDate: "",
      })
      await loadDashboard()
    } catch (error) {
      setEventError(error instanceof Error ? error.message : "Unable to save the event.")
    } finally {
      setEventActionId(null)
    }
  }

  async function updateEventState(eventId: string, action: "publish" | "close") {
    setEventActionId(eventId)
    setEventError(null)

    try {
      const response = await fetch("/api/manager-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        body: JSON.stringify({
          action,
          eventId,
        }),
      })

      const payload = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(payload.error || "Unable to update the event.")
      }

      await loadDashboard()
    } catch (error) {
      setEventError(error instanceof Error ? error.message : "Unable to update the event.")
    } finally {
      setEventActionId(null)
    }
  }

  const invitedResidents = getNumericStat(snapshot.stats, "Residents invited")
  const approvedResidents = getNumericStat(snapshot.stats, "Residents approved")
  const activeResidents = getNumericStat(snapshot.stats, "Residents activated")
  const eventRsvps = getNumericStat(snapshot.stats, "Event RSVPs")
  const mutualIntroductions = getNumericStat(snapshot.stats, "Mutual intros")
  const deliveredIntroductions = getNumericStat(snapshot.stats, "Introductions delivered")

  const isPilotLaunch =
    !isLoading &&
    !loadError &&
    invitedResidents === 0 &&
    approvedResidents === 0 &&
    activeResidents === 0 &&
    snapshot.managerEvents.length === 0 &&
    snapshot.introductionQueue.length === 0

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border px-6 pb-4 pt-6">
        <button
          type="button"
          onClick={onBack}
          className="flex size-9 items-center justify-center rounded-full border border-border text-foreground"
          aria-label="Back to resident app"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
            Community Pulse
          </p>
          <h1 className="font-serif text-2xl leading-tight text-foreground">Manager Dashboard</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {access.buildingName / snapshot.buildingName}
            {!isLoading && !loadError ? ` / Pulse ${snapshot.pulseScore}` : ""}
            {!isLoading && !loadError && snapshot.pulseDelta !== 0
              ? ` / ${snapshot.pulseDelta > 0 ? "+" : ""}${snapshot.pulseDelta} vs last month`
              : ""}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-10 pt-6">
        {loadError ? (
          <section className="rounded-3xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 size-5 shrink-0" />
              <div>
                <p className="font-medium">
                  {errorStatus === 403 ? "Manager access required." : "Unable to load Community Pulse."}
                </p>
                <p className="mt-1 leading-relaxed">{loadError}</p>
                {errorStatus === 403 ? (
                  <>
                    <p className="mt-3 leading-relaxed">
                      Sign in with the same work email used for the building pilot request. If you still
                      cannot access Community Pulse, your building-team role likely has not been provisioned yet.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link
                        href="/auth?next=%2Fmanager%2Fdashboard"
                        className="rounded-full border border-destructive/25 bg-white/80 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-gold/40"
                      >
                        Try another sign-in
                      </Link>
                      <Link
                        href="/for-buildings"
                        className="rounded-full border border-destructive/15 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-gold/40"
                      >
                        Return to pilot request
                      </Link>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </section>
        ) : (
          <>
            {access.provisionedNow ? (
              <section className="mb-5 rounded-3xl border border-gold/30 bg-gold/10 p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold">
                  Building team access activated
                </p>
                <h2 className="mt-3 font-serif text-2xl leading-tight text-foreground">
                  Community Pulse is ready for {access.buildingName / snapshot.buildingName}.
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                  Your building-team role is active. Start by reviewing resident demand, shaping the
                  first gatherings, and watching for the first mutual introductions to move into
                  concierge delivery.
                </p>
              </section>
            ) : null}

            <section className="rounded-3xl border border-border bg-card p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold">
                    Operating view
                  </p>
                  <h2 className="mt-3 font-serif text-[2rem] leading-[1.02] text-foreground">
                    A quieter read on resident participation, introductions, gatherings, and support.
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    Community Pulse should make the first pilot weeks feel clear. It shows what has
                    momentum, what still needs residents, and where the building team should step in.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { href: "#community-snapshot", label: "Snapshot" },
                    { href: "#resident-activity", label: "Residents" },
                    { href: "#gatherings", label: "Gatherings" },
                    { href: "#concierge-ops", label: "Concierge ops" },
                  ].map((action) => (
                    <a
                      key={action.href}
                      href={action.href}
                      className="rounded-full border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-gold/30"
                    >
                      {action.label}
                    </a>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <LaunchSignalCard
                  label="Residents activated"
                  value={String(activeResidents)}
                  helper={
                    activeResidents > 0
                      ? "Residents can now receive introductions and RSVP to gatherings."
                      : "No residents are active yet. Launch begins with approvals and onboarding."
                  }
                />
                <LaunchSignalCard
                  label="Intro momentum"
                  value={String(mutualIntroductions)}
                  helper={
                    mutualIntroductions > 0
                      ? `${deliveredIntroductions} concierge deliveries completed so far.`
                      : "No mutual introductions yet. Strong matches will appear here first."
                  }
                />
                <LaunchSignalCard
                  label="Gathering traction"
                  value={String(eventRsvps)}
                  helper={
                    eventRsvps > 0
                      ? "Residents are already signaling interest in upcoming gatherings."
                      : "Demand appears once residents start RSVPing or supporting ideas."
                  }
                />
                <LaunchSignalCard
                  label="Support visibility"
                  value={String(snapshot.supportQueue.length)}
                  helper={
                    snapshot.supportQueue.length > 0
                      ? "Residents are actively using the support channel."
                      : "No resident requests yet. The support channel is ready."
                  }
                />
              </div>
            </section>

            {isPilotLaunch ? (
              <section className="mt-8">
                <SectionHeading
                  id="community-snapshot"
                  eyebrow="New pilot launch"
                  title="This building is ready for its first wave of participation."
                  description="Day 1 should still feel intentional. Once the first residents are approved and onboarded, Community Pulse will begin filling in naturally."
                />
                <div className="grid gap-4 lg:grid-cols-3">
                  <EmptyStateCard
                    title="No residents yet"
                    description="Approve the first building members so Community Pulse can begin tracking participation."
                  />
                  <EmptyStateCard
                    title="No gatherings yet"
                    description="Create the first hosted gathering or review resident suggestions once they start arriving."
                  />
                  <EmptyStateCard
                    title="No introductions yet"
                    description="Introductions begin once residents complete onboarding and share enough signals for thoughtful matching."
                  />
                </div>
              </section>
            ) : null}

            <section id="community-snapshot" className="mt-8">
              <SectionHeading
                eyebrow="Community Pulse"
                title="Snapshot"
                description="A concise read on activation, engagement, and introduction momentum."
              />
              <Panel title="Pilot ROI" caption="Outcomes building teams can report to ownership">
                <div className="grid grid-cols-2 gap-3">
                  {isLoading
                    ? [...Array.from({ length: 4 })].map((_, index) => (
                        <div
                          key={index}
                          className="h-[108px] animate-pulse rounded-3xl border border-border bg-card"
                        />
                      ))
                    : snapshot.roiStats.map((stat) => (
                        <div
                          key={stat.label}
                          className="rounded-3xl border border-gold/20 bg-gold/5 px-4 py-4"
                        >
                          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
                            {stat.label}
                          </p>
                          <p className="mt-2 font-serif text-3xl text-foreground">{stat.value}</p>
                          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                            {stat.helper}
                          </p>
                        </div>
                      ))}
                </div>
              </Panel>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {isLoading
                  ? [...Array.from({ length: 8 })].map((_, index) => (
                      <div
                        key={index}
                        className="h-[126px] animate-pulse rounded-3xl border border-border bg-card"
                      />
                    ))
                  : snapshot.stats.map((stat) => (
                      <Stat
                        key={stat.label}
                        value={stat.value}
                        label={stat.label}
                        accent={stat.accent}
                        helper={stat.helper}
                        isPlaceholder={stat.isPlaceholder}
                      />
                    ))}
              </div>

              <Panel title="Resident momentum" caption="Participation across the most recent six months">
                {snapshot.trend.every((point) => point.value === 0) ? (
                  <EmptyStateCard
                    title="No engagement data yet"
                    description="As residents join, complete onboarding, request introductions, and RSVP to gatherings, Community Pulse will begin showing momentum here."
                    compact
                  />
                ) : (
                  <div className="h-44 w-full">
                    {isLoading ? (
                      <div className="h-full animate-pulse rounded-2xl bg-secondary" />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={snapshot.trend} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                          <defs>
                            <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.35} />
                              <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="var(--border)" vertical={false} />
                          <XAxis
                            dataKey="month"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                          />
                          <Tooltip
                            cursor={{ stroke: "var(--gold)", strokeWidth: 1 }}
                            contentStyle={{
                              borderRadius: 12,
                              border: "1px solid var(--border)",
                              background: "var(--card)",
                              color: "var(--foreground)",
                              fontSize: 12,
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke="var(--gold)"
                            strokeWidth={2.5}
                            fill="url(#gold)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                )}
              </Panel>
            </section>

            <section id="resident-activity" className="mt-8">
              <SectionHeading
                eyebrow="Residents"
                title="Resident activity"
                description="See how the building is moving from approvals into onboarding, introductions, and early interest signals."
              />
              <div className="grid gap-4 xl:grid-cols-2">
                <Panel title="Resident pipeline" caption="How access requests are moving through the building">
                  <BarList
                    block={{
                      ...snapshot.requestStatus,
                      emptyMessage:
                        "No resident requests yet. Once the first residents apply, approvals and pending reviews will appear here.",
                    }}
                    suffix=""
                    isLoading={isLoading}
                  />
                </Panel>

                <Panel title="Resident interests" caption="What residents are asking for most often">
                  <BarList
                    block={{
                      ...snapshot.topInterests,
                      emptyMessage:
                        "No resident interest data yet. Top interests will appear once residents finish onboarding.",
                    }}
                    suffix=""
                    isLoading={isLoading}
                  />
                </Panel>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <Panel title="Introduction funnel" caption="How thoughtful introductions are progressing through the building">
                  <BarList
                    block={{
                      ...snapshot.introductionFunnel,
                      emptyMessage:
                        "No introduction activity yet. Mutual interest and concierge delivery will show up here once residents begin reviewing introductions.",
                    }}
                    suffix=""
                    isLoading={isLoading}
                  />
                </Panel>

                <Panel title="Resident roster" caption="Who still needs review, activation, onboarding, or closer care">
                  <ResidentRoster items={snapshot.residentRoster} isLoading={isLoading} />
                </Panel>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <Panel title="Recommended outreach" caption="The clearest manager follow-through moments for the current pilot week">
                  <CommunicationCueList items={snapshot.communicationCues} isLoading={isLoading} />
                </Panel>

                <Panel title="Requested gatherings" caption="Demand signals for what residents want next">
                  <BarList
                    block={{
                      ...snapshot.mostRequestedEvents,
                      emptyMessage:
                        "No gathering requests yet. This fills in once residents begin proposing or supporting future experiences.",
                    }}
                    suffix=""
                    isLoading={isLoading}
                  />
                </Panel>
              </div>
            </section>

            <section id="gatherings" className="mt-8">
              <SectionHeading
                eyebrow="Gatherings"
                title="Planning and traction"
                description="Create, shape, and monitor the gatherings that give the building its social rhythm."
              />

              <div className="mb-4 grid gap-3 lg:grid-cols-3">
                <LaunchSignalCard
                  label="Published gatherings"
                  value={String(snapshot.managerEvents.filter((event) => event.state === "published").length)}
                  helper="Hosted experiences residents can currently discover and RSVP to."
                />
                <LaunchSignalCard
                  label="Planning pipeline"
                  value={String(snapshot.managerEvents.filter((event) => event.state === "draft").length)}
                  helper="Gatherings still being shaped before they go live."
                />
                <LaunchSignalCard
                  label="Resident demand signals"
                  value={String(snapshot.mostRequestedEvents.items.reduce((sum, item) => sum + item.value, 0))}
                  helper="Signals showing what residents want next from the building."
                />
              </div>

              <Panel
                title="Planning workflow"
                caption="Move from resident demand into a calendar-ready gathering with clear budget, concept, and timing decisions"
              >
                <div className="grid gap-3 lg:grid-cols-3">
                  <WorkflowStep
                    step="01"
                    title="Listen for demand"
                    description="Review requested gatherings, suggestion support, and live RSVP traction before shaping the next experience."
                  />
                  <WorkflowStep
                    step="02"
                    title="Shape the concept"
                    description="Set budget guardrails, define the gathering, and shortlist the strongest recommendations for the building."
                  />
                  <WorkflowStep
                    step="03"
                    title="Move to calendar"
                    description="Publish only once the timing, venue, and resident demand are strong enough to support attendance."
                  />
                </div>
              </Panel>

              <div className="grid gap-4 xl:grid-cols-2">
                <Panel title="Gathering traction" caption="Live demand for current building gatherings">
                  <BarList
                    block={{
                      ...snapshot.eventInsights,
                      emptyMessage:
                        "No gathering demand yet. RSVPs will appear here once the first events are published.",
                    }}
                    suffix=" RSVPs"
                    isLoading={isLoading}
                  />
                </Panel>

                <Panel title="Amenity demand" caption="How shared spaces are showing up in resident demand">
                  <BarList block={snapshot.amenityUsage} suffix="%" isLoading={isLoading} />
                </Panel>
              </div>

              <Panel title="Gathering operations" caption="Create, edit, publish, and close building gatherings for the pilot">
                {eventError ? (
                  <div className="mb-4 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {eventError}
                  </div>
                ) : null}
                <EventEditor
                  form={eventForm}
                  onChange={setEventForm}
                  onSave={saveEvent}
                  onCancel={() => {
                    setEditingEventId(null)
                    setEventForm({
                      name: "",
                      description: "",
                      venueName: "",
                      startDate: "",
                      endDate: "",
                    })
                  }}
                  isSaving={eventActionId === (editingEventId / "new")}
                  isEditing={Boolean(editingEventId)}
                />
                <div className="mt-5">
                  <EventQueue
                    items={snapshot.managerEvents}
                    isLoading={isLoading}
                    eventActionId={eventActionId}
                    onCreate={() => startEventDraft()}
                    onEdit={startEventDraft}
                    onPublish={(eventId) => void updateEventState(eventId, "publish")}
                    onClose={(eventId) => void updateEventState(eventId, "close")}
                  />
                </div>
              </Panel>

              <Panel
                title="Event planning"
                caption="Pilot budget settings, recommendation drafts, and resident-suggested programming ideas"
              >
                <ManagerEventPlanningSection accessToken={accessToken} />
              </Panel>
            </section>

            <section id="concierge-ops" className="mt-8">
              <SectionHeading
                eyebrow="Concierge operations"
                title="Follow-through"
                description="The most important manager work happens after residents say yes: delivery, care, and support."
              />

              <Panel title="Introduction watchlist" caption="A broader view of introductions that need attention, patience, or delivery">
                <IntroductionWatchlist items={snapshot.introductionWatchlist} isLoading={isLoading} />
              </Panel>

              <Panel title="Concierge delivery queue" caption="Mutual introductions that are ready for follow-through">
                {deliveryError ? (
                  <div className="mb-4 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {deliveryError}
                  </div>
                ) : null}
                <IntroductionQueue
                  items={snapshot.introductionQueue}
                  isLoading={isLoading}
                  deliveryActionId={deliveryActionId}
                  onMarkDelivered={markDelivered}
                />
              </Panel>

              <Panel
                title="Support requests"
                caption="Private resident requests, bugs, and conduct concerns that need building-team awareness"
              >
                <div className="mb-5">
                  <BarList
                    block={{
                      ...snapshot.supportCategoryBreakdown,
                      emptyMessage:
                        "No resident requests yet. The support channel is live and ready for the first resident questions or concerns.",
                    }}
                    suffix=""
                    isLoading={isLoading}
                  />
                </div>
                <SupportQueue items={snapshot.supportQueue} isLoading={isLoading} />
              </Panel>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function getNumericStat(stats: DashboardStat[], label: string) {
  const stat = stats.find((item) => item.label === label)
  if (!stat) return 0

  const numericValue = Number.parseInt(stat.value.replace(/[^\d]/g, ""), 10)
  return Number.isFinite(numericValue) ? numericValue : 0
}

function WorkflowStep({
  step,
  title,
  description,
}: {
  step: string
  title: string
  description: string
}) {
  return (
    <div className="rounded-3xl border border-border bg-background/80 px-4 py-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold">{step}</p>
      <h3 className="mt-3 font-serif text-2xl text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">{description}</p>
    </div>
  )
}

function formatSupportCategory(category: ManagerSupportRequestItem["category"]) {
  return category.replaceAll("_", " ")
}

function formatQueueDate(value: string | null) {
  if (!value) {
    return "Not set"
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function formatLocalInput(value: string) {
  return value
}

function SectionHeading({
  id,
  eyebrow,
  title,
  description,
}: {
  id?: string
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div id={id} className="mb-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold">{eyebrow}</p>
      <h2 className="mt-2 font-serif text-[2rem] leading-[1.02] text-foreground">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">{description}</p>
    </div>
  )
}

function LaunchSignalCard({
  label,
  value,
  helper,
}: {
  label: string
  value: string
  helper: string
}) {
  return (
    <div className="rounded-3xl border border-border bg-background px-4 py-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold">{label}</p>
      <p className="mt-3 font-serif text-4xl leading-none text-foreground">{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{helper}</p>
    </div>
  )
}

function EmptyStateCard({
  title,
  description,
  compact = false,
}: {
  title: string
  description: string
  compact?: boolean
}) {
  return (
    <div
      className={`rounded-3xl border border-dashed border-gold/30 bg-gold/5 ${
        compact ? "px-5 py-5" : "px-5 py-6"
      }`}
    >
      <p className="font-serif text-xl text-foreground">{title}</p>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">{description}</p>
    </div>
  )
}

function Stat({
  value,
  label,
  accent,
  helper,
  isPlaceholder,
}: {
  value: string
  label: string
  accent?: boolean
  helper?: string
  isPlaceholder?: boolean
}) {
  return (
    <div
      className={`rounded-3xl border p-5 ${
        accent ? "border-gold/40 bg-gold/10" : "border-border bg-card"
      }`}
    >
      <p
        className={`font-serif leading-none ${
          isPlaceholder ? "text-2xl text-muted-foreground" : "text-4xl text-foreground"
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-xs leading-snug text-muted-foreground">{label}</p>
      {helper ? (
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/90">{helper}</p>
      ) : null}
    </div>
  )
}

function Panel({
  title,
  caption,
  children,
}: {
  title: string
  caption: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-4 rounded-3xl border border-border bg-card p-5">
      <h3 className="font-serif text-[1.35rem] leading-tight text-foreground">{title}</h3>
      <p className="mb-4 mt-0.5 text-xs text-muted-foreground">{caption}</p>
      {children}
    </section>
  )
}

function BarList({
  block,
  suffix,
  isLoading,
}: {
  block: DashboardListBlock
  suffix: string
  isLoading?: boolean
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3.5">
        {[...Array.from({ length: 4 })].map((_, index) => (
          <div key={index}>
            <div className="mb-1.5 h-4 w-28 animate-pulse rounded bg-secondary" />
            <div className="h-2 w-full animate-pulse rounded-full bg-secondary" />
          </div>
        ))}
      </div>
    )
  }

  const data = block.items

  if (data.length === 0) {
    return <p className="text-sm leading-7 text-muted-foreground">{block.emptyMessage || "No activity yet."}</p>
  }

  const max = Math.max(...data.map((item) => item.value), 1)

  return (
    <div className="flex flex-col gap-3.5">
      {data.map((item) => (
        <div key={item.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="text-sm text-foreground">{item.label}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {item.value}
              {suffix}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gold"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function formatResidentStage(stage: ManagerResidentItem["stage"]) {
  switch (stage) {
    case "pending_review":
      return "Pending review"
    case "approved_not_active":
      return "Approved, not active"
    case "active_needs_onboarding":
      return "Needs onboarding"
    case "active_ready":
      return "Ready for introductions"
    case "active_paused":
      return "Participation paused"
    default:
      return "Resident"
  }
}

function ResidentRoster({
  items,
  isLoading,
}: {
  items: ManagerResidentItem[]
  isLoading?: boolean
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3.5">
        {[...Array.from({ length: 4 })].map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-2xl bg-secondary" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <EmptyStateCard
        title="No resident activity yet"
        description="Once the first resident requests are submitted or activated, the roster will show exactly who needs review, activation, or onboarding support."
        compact
      />
    )
  }

  return (
    <div className="flex flex-col gap-3.5">
      {items.map((item) => (
        <div key={item.id} className="rounded-2xl border border-border bg-background px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-serif text-lg leading-tight text-foreground">{item.firstName}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-gold">
                {formatResidentStage(item.stage)}
              </p>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-medium text-foreground">
              {item.joinedAt ? `Joined ${formatQueueDate(item.joinedAt)}` : `Requested ${formatQueueDate(item.submittedAt)}`}
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.summary}</p>
        </div>
      ))}
    </div>
  )
}

function CommunicationCueList({
  items,
  isLoading,
}: {
  items: ManagerCommunicationCue[]
  isLoading?: boolean
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3.5">
        {[...Array.from({ length: 3 })].map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-2xl bg-secondary" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3.5">
      {items.map((item) => (
        <div key={item.id} className="rounded-2xl border border-border bg-background px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-serif text-lg leading-tight text-foreground">{item.title}</p>
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                item.priority === "now"
                  ? "bg-gold/15 text-gold-foreground"
                  : item.priority === "soon"
                    ? "bg-secondary text-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {item.priority}
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
        </div>
      ))}
    </div>
  )
}

function EventEditor({
  form,
  onChange,
  onSave,
  onCancel,
  isSaving,
  isEditing,
}: {
  form: {
    name: string
    description: string
    venueName: string
    startDate: string
    endDate: string
  }
  onChange: React.Dispatch<
    React.SetStateAction<{
      name: string
      description: string
      venueName: string
      startDate: string
      endDate: string
    }>
  >
  onSave: () => void
  onCancel: () => void
  isSaving: boolean
  isEditing: boolean
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-serif text-lg text-foreground">
          {isEditing ? "Edit gathering" : "Create new gathering"}
        </p>
        {isEditing ? (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-medium text-muted-foreground"
          >
            Cancel
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3">
        <input
          value={form.name}
          onChange={(event) => onChange((current) => ({ ...current, name: event.target.value }))}
          placeholder="Event name"
          className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none"
        />
        <textarea
          value={form.description}
          onChange={(event) => onChange((current) => ({ ...current, description: event.target.value }))}
          placeholder="Short description"
          className="min-h-24 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none"
        />
        <input
          value={form.venueName}
          onChange={(event) => onChange((current) => ({ ...current, venueName: event.target.value }))}
          placeholder="Venue or amenity"
          className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="datetime-local"
            value={formatLocalInput(form.startDate)}
            onChange={(event) => onChange((current) => ({ ...current, startDate: event.target.value }))}
            className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none"
          />
          <input
            type="datetime-local"
            value={formatLocalInput(form.endDate)}
            onChange={(event) => onChange((current) => ({ ...current, endDate: event.target.value }))}
            className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={isSaving || !form.name.trim()}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
        {isEditing ? "Save gathering" : "Create draft"}
      </button>
    </div>
  )
}

function EventQueue({
  items,
  isLoading,
  eventActionId,
  onCreate,
  onEdit,
  onPublish,
  onClose,
}: {
  items: ManagerEventItem[]
  isLoading?: boolean
  eventActionId: string | null
  onCreate: () => void
  onEdit: (event: ManagerEventItem) => void
  onPublish: (eventId: string) => void
  onClose: (eventId: string) => void
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3.5">
        {[...Array.from({ length: 3 })].map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-2xl bg-secondary" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Current building gatherings</p>
        <button
          type="button"
          onClick={onCreate}
          className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground"
        >
          New draft
        </button>
      </div>
      <div className="flex flex-col gap-3.5">
        {items.length === 0 ? (
          <EmptyStateCard
            title="No gatherings yet"
            description="Publish the first gathering to give residents an early reason to join and participate."
            compact
          />
        ) : (
          items.map((item) => {
            const isWorking = eventActionId === item.id
            return (
              <div key={item.id} className="rounded-2xl border border-border bg-background px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-serif text-lg leading-tight text-foreground">{item.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.venueName || "Venue TBD"} /{" "}
                      {item.startDate
                        ? new Date(item.startDate).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : "Schedule pending"}
                    </p>
                  </div>
                  <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-medium text-foreground">
                    {item.state}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {item.description || "No description yet."}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">{item.attendeeCount} RSVPs</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    className="rounded-full border border-border px-3 py-2 text-xs font-medium text-foreground"
                  >
                    Edit
                  </button>
                  {item.state !== "published" ? (
                    <button
                      type="button"
                      onClick={() => onPublish(item.id)}
                      disabled={isWorking}
                      className="inline-flex items-center gap-2 rounded-full bg-foreground px-3 py-2 text-xs font-medium text-background disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isWorking ? <Loader2 className="size-3 animate-spin" /> : null}
                      Publish
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onClose(item.id)}
                      disabled={isWorking}
                      className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-2 text-xs font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isWorking ? <Loader2 className="size-3 animate-spin" /> : null}
                      Close
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function IntroductionWatchlist({
  items,
  isLoading,
}: {
  items: ManagerIntroductionWatchItem[]
  isLoading?: boolean
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3.5">
        {[...Array.from({ length: 3 })].map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-2xl bg-secondary" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <EmptyStateCard
        title="No introductions in motion yet"
        description="Once residents begin reviewing introductions, this watchlist will show what needs patience, what needs delivery, and what is already moving."
        compact
      />
    )
  }

  return (
    <div className="flex flex-col gap-3.5">
      {items.map((item) => (
        <div key={item.id} className="rounded-2xl border border-border bg-background px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-serif text-lg leading-tight text-foreground">
                {item.residentAFirstName} + {item.residentBFirstName}
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-gold">
                {item.introType} / {item.status.replaceAll("_", " ")}
              </p>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-medium text-foreground">
              {formatQueueDate(item.lastUpdatedAt)}
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {item.managerCompatibilitySummary ||
              item.compatibilitySummary ||
              "A building-scoped introduction is moving through the concierge workflow."}
          </p>
          {item.meetupRecommendation ? (
            <p className="mt-2 text-xs leading-relaxed text-foreground/70">
              Suggested meetup: {item.meetupRecommendation.title} at {item.meetupRecommendation.amenityLabel}
              {item.meetupRecommendation.timingLabel ? ` / ${item.meetupRecommendation.timingLabel}` : ""}
            </p>
          ) : null}
          <div className="mt-3 rounded-2xl border border-gold/20 bg-gold/10 px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-gold">Next step</p>
            <p className="mt-2 text-sm leading-relaxed text-foreground/80">{item.nextStep}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function IntroductionQueue({
  items,
  isLoading,
  deliveryActionId,
  onMarkDelivered,
}: {
  items: ManagerIntroductionQueueItem[]
  isLoading?: boolean
  deliveryActionId: string | null
  onMarkDelivered: (introductionId: string) => void
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3.5">
        {[...Array.from({ length: 3 })].map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-2xl bg-secondary" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <EmptyStateCard
        title="No introductions ready for delivery"
        description="As residents accept thoughtful introductions and mutual interest is confirmed, concierge-ready pairings will appear here."
        compact
      />
    )
  }

  return (
    <div className="flex flex-col gap-3.5">
      {items.map((item) => {
        const isDelivered = item.status === "delivered"
        const isWorking = deliveryActionId === item.id

        return (
          <div key={item.id} className="rounded-2xl border border-border bg-background px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-serif text-lg leading-tight text-foreground">
                  {item.residentAFirstName} + {item.residentBFirstName}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-gold">
                  {item.introType} / {item.source.replaceAll("_", " ")}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                  isDelivered
                    ? "bg-gold/15 text-gold-foreground"
                    : "bg-secondary text-foreground"
                }`}
              >
                {isDelivered ? "Delivered" : "Mutual"}
              </span>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {item.managerCompatibilitySummary ||
                item.compatibilitySummary ||
                "A private building introduction is ready for concierge follow-through."}
            </p>

            {item.meetupRecommendation ? (
              <div className="mt-3 rounded-2xl border border-gold/20 bg-gold/10 px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-gold">
                  Suggested meetup
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {item.meetupRecommendation.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-foreground/75">
                  {item.meetupRecommendation.amenityLabel}
                  {item.meetupRecommendation.timingLabel
                    ? ` / ${item.meetupRecommendation.timingLabel}`
                    : ""}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.meetupRecommendation.reason}
                </p>
              </div>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Suggested {formatQueueDate(item.suggestedAt)}</span>
              <span>Mutual {formatQueueDate(item.mutualAt)}</span>
              {item.deliveredAt ? <span>Delivered {formatQueueDate(item.deliveredAt)}</span> : null}
            </div>

            <div className="mt-4">
              {isDelivered ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-gold/15 px-3 py-2 text-sm font-medium text-gold-foreground">
                  <CheckCircle2 className="size-4" />
                  Concierge delivery recorded
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onMarkDelivered(item.id)}
                  disabled={isWorking}
                  className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isWorking ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                  Mark delivered
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SupportQueue({
  items,
  isLoading,
}: {
  items: ManagerSupportRequestItem[]
  isLoading?: boolean
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3.5">
        {[...Array.from({ length: 3 })].map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-2xl bg-secondary" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <EmptyStateCard
        title="No resident support requests yet"
        description="The support channel is live. Questions, bug reports, and safety concerns will appear here when residents need follow-through."
        compact
      />
    )
  }

  return (
    <div className="flex flex-col gap-3.5">
      {items.map((item) => (
        <div key={item.id} className="rounded-2xl border border-border bg-background px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-serif text-lg leading-tight text-foreground">
                {item.subject || `${item.residentFirstName} submitted a ${formatSupportCategory(item.category)} request`}
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-gold">
                {formatSupportCategory(item.category)} / {item.status}
              </p>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-medium text-foreground">
              {formatQueueDate(item.submittedAt)}
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.messagePreview}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Submitted by {item.residentFirstName}</span>
            {item.reportedResidentFirstName ? <span>References {item.reportedResidentFirstName}</span> : null}
          </div>
        </div>
      ))}
    </div>
  )
}
