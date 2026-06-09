"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, CheckCircle2, Loader2, ShieldAlert } from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts"

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

type ManagerDashboardSnapshot = {
  buildingName: string
  pulseScore: number
  pulseDelta: number
  isLive: boolean
  stats: DashboardStat[]
  trend: DashboardTrendPoint[]
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

const emptySnapshot: ManagerDashboardSnapshot = {
  buildingName: "Resident Concierge",
  pulseScore: 0,
  pulseDelta: 0,
  isLive: false,
  stats: [],
  trend: [],
  topInterests: { items: [] },
  eventInsights: { items: [] },
  requestStatus: { items: [] },
  introductionFunnel: { items: [] },
  mostRequestedEvents: { items: [] },
  amenityUsage: { items: [] },
  introductionQueue: [],
  managerEvents: [],
  supportCategoryBreakdown: { items: [] },
  supportQueue: [],
}

export function ManagerDashboard({
  accessToken,
  onBack,
}: {
  accessToken: string
  onBack: () => void
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
    setEditingEventId(event?.id ?? null)
    setEventError(null)
    setEventForm({
      name: event?.name ?? "",
      description: event?.description ?? "",
      venueName: event?.venueName ?? "",
      startDate: event?.startDate ? new Date(event.startDate).toISOString().slice(0, 16) : "",
      endDate: event?.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : "",
    })
  }

  async function saveEvent() {
    setEventActionId(editingEventId ?? "new")
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
            {snapshot.buildingName}
            {!isLoading && !loadError && ` · Pulse ${snapshot.pulseScore}`}
            {!isLoading &&
              !loadError &&
              snapshot.pulseDelta !== 0 &&
              ` · ${snapshot.pulseDelta > 0 ? "+" : ""}${snapshot.pulseDelta} vs last month`}
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
              </div>
            </div>
          </section>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
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

            <Panel title="Engagement trend" caption="Resident demand, last 6 months">
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
            </Panel>

            <Panel title="Top interests" caption="Based on resident join requests">
              <BarList block={snapshot.topInterests} suffix="" isLoading={isLoading} />
            </Panel>

            <Panel title="Event traction" caption="Live from current building activity">
              <BarList block={snapshot.eventInsights} suffix=" RSVPs" isLoading={isLoading} />
            </Panel>

            <Panel title="Join request status" caption="Current pipeline health">
              <BarList block={snapshot.requestStatus} suffix="" isLoading={isLoading} />
            </Panel>

            <Panel title="Event operations" caption="Create, edit, publish, and close building events for the pilot">
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
                isSaving={eventActionId === (editingEventId ?? "new")}
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

            <Panel title="Introduction funnel" caption="How concierge introductions are moving through the building">
              <BarList block={snapshot.introductionFunnel} suffix="" isLoading={isLoading} />
            </Panel>

            <Panel title="Ready to deliver" caption="Mutual introductions that are ready for concierge follow-through">
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
              title="Resident support & safety"
              caption="Private building-scoped requests, bug reports, and conduct concerns that need concierge awareness"
            >
              <div className="mb-5">
                <BarList block={snapshot.supportCategoryBreakdown} suffix="" isLoading={isLoading} />
              </div>
              <SupportQueue items={snapshot.supportQueue} isLoading={isLoading} />
            </Panel>

            <Panel title="Most requested events" caption="Resident demand signal for future programming">
              <BarList block={snapshot.mostRequestedEvents} suffix="" isLoading={isLoading} />
            </Panel>

            <Panel title="Amenity usage" caption="Building amenity insights">
              <BarList block={snapshot.amenityUsage} suffix="%" isLoading={isLoading} />
            </Panel>
          </>
        )}
      </div>
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
      <h2 className="font-serif text-xl leading-tight text-foreground">{title}</h2>
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
    return <p className="text-sm text-muted-foreground">{block.emptyMessage ?? "No activity yet."}</p>
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
          {isEditing ? "Edit event" : "Create new event"}
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
        {isEditing ? "Save event" : "Create draft"}
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
        <p className="text-sm text-muted-foreground">Current building events</p>
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
          <p className="text-sm text-muted-foreground">No events yet for this building.</p>
        ) : (
          items.map((item) => {
            const isWorking = eventActionId === item.id
            return (
              <div key={item.id} className="rounded-2xl border border-border bg-background px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-serif text-lg leading-tight text-foreground">{item.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.venueName || "Venue TBD"} · {item.startDate ? new Date(item.startDate).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Schedule pending"}
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
    return <p className="text-sm text-muted-foreground">No mutual or delivered introductions yet.</p>
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
                  {item.introType} · {item.source.replaceAll("_", " ")}
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
              {item.compatibilitySummary || "A private building introduction is ready for concierge follow-through."}
            </p>

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
    return <p className="text-sm text-muted-foreground">No resident support requests yet.</p>
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
                {formatSupportCategory(item.category)} Â· {item.status}
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
