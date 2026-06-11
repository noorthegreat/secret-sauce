"use client"

import { useEffect, useState } from "react"
import { CalendarCheck, Check, Lightbulb, Loader2, Plus, Users } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { ResidentAccessCard } from "@/components/resident-access-card"
import { ScreenHeader } from "@/components/screen-header"
import type { CommunityEvent, CommunityPoll } from "@/lib/community-live"
import type { ResidentAccountSnapshot } from "@/lib/resident-account-server"
import { trackProductEvent } from "@/lib/product-analytics"
import { useResidentSession } from "@/lib/session-browser"
import { cn } from "@/lib/utils"

type RsvpEligibilityState =
  | "not_eligible"
  | "needs_onboarding"
  | "can_rsvp"
  | "rsvp_confirmed"
  | "rsvp_canceled"
  | "closed"

export function CommunityScreen({
  events,
  eventPolls,
  isSignedIn,
  accountSnapshot,
  accountLoading,
  accountErrorMessage,
  onSignIn,
  onCompleteProfile,
  onReturnToJoin,
  onViewCommunity,
}: {
  events: CommunityEvent[]
  eventPolls: CommunityPoll[]
  isSignedIn: boolean
  accountSnapshot: ResidentAccountSnapshot | null
  accountLoading: boolean
  accountErrorMessage: string | null
  onSignIn: () => void
  onCompleteProfile: () => void
  onReturnToJoin: () => void
  onViewCommunity: () => void
}) {
  const [tab, setTab] = useState<"events" | "vote">("events")

  return (
    <div className="h-full overflow-y-auto pb-28">
      <div className="pt-3">
        <ScreenHeader eyebrow="Gatherings" title="Community" />
      </div>

      <div className="mt-5 px-6">
        <ResidentAccessCard
          snapshot={accountSnapshot}
          isLoading={accountLoading}
          isSignedIn={isSignedIn}
          onSignIn={onSignIn}
          onCompleteProfile={onCompleteProfile}
          onReturnToJoin={onReturnToJoin}
          onViewCommunity={onViewCommunity}
        />
        {accountErrorMessage ? (
          <p className="mt-3 text-sm text-destructive">{accountErrorMessage}</p>
        ) : null}
      </div>

      <div className="mt-5 px-6">
        <div className="flex rounded-full border border-border bg-secondary p-1">
          {(["events", "vote"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={cn(
                "flex-1 rounded-full py-2.5 text-sm font-medium tracking-wide transition-colors",
                tab === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              {value === "events" ? "Gatherings" : "Shape next month"}
            </button>
          ))}
        </div>
      </div>

      {tab === "events" ? (
        <EventsList
          events={events}
          isSignedIn={isSignedIn}
          accountSnapshot={accountSnapshot}
          accountLoading={accountLoading}
          onSignIn={onSignIn}
          onCompleteProfile={onCompleteProfile}
        />
      ) : (
        <VotingList eventPolls={eventPolls} />
      )}
    </div>
  )
}

function getEligibilityState({
  event,
  isSignedIn,
  accountLoading,
  accountSnapshot,
  isAttending,
  justCanceled,
}: {
  event: CommunityEvent
  isSignedIn: boolean
  accountLoading: boolean
  accountSnapshot: ResidentAccountSnapshot | null
  isAttending: boolean
  justCanceled: boolean
}): RsvpEligibilityState {
  if (isAttending) return "rsvp_confirmed"
  if (justCanceled) return "rsvp_canceled"
  if (event.enrollmentStatus === "upcoming" || event.enrollmentStatus === "closed") return "closed"

  if (
    !isSignedIn ||
    accountLoading ||
    accountSnapshot?.status !== "active" ||
    !accountSnapshot?.hasActiveMembership
  ) {
    return "not_eligible"
  }

  if (accountSnapshot.needsSurveyCompletion) return "needs_onboarding"

  return "can_rsvp"
}

function getEligibilityCopy(state: RsvpEligibilityState) {
  switch (state) {
    case "rsvp_confirmed":
      return {
        button: "RSVP confirmed",
        helper: "You’re on the list for this building gathering.",
      }
    case "rsvp_canceled":
      return {
        button: "RSVP canceled",
        helper: "Your RSVP was removed. You can opt back in while the guest list is still open.",
      }
    case "closed":
      return {
        button: "RSVP unavailable",
        helper: "This gathering is not currently accepting RSVPs.",
      }
    case "needs_onboarding":
      return {
        button: "Complete profile to RSVP",
        helper: "Finish onboarding first so we can keep participation thoughtful and building-safe.",
      }
    case "not_eligible":
      return {
        button: "Not eligible yet",
        helper: "RSVP opens only for approved, active residents in this building.",
      }
    case "can_rsvp":
      return {
        button: "RSVP",
        helper: "Your access is active and you can RSVP now.",
      }
  }
}

function EventsList({
  events,
  isSignedIn,
  accountSnapshot,
  accountLoading,
  onSignIn,
  onCompleteProfile,
}: {
  events: CommunityEvent[]
  isSignedIn: boolean
  accountSnapshot: ResidentAccountSnapshot | null
  accountLoading: boolean
  onSignIn: () => void
  onCompleteProfile: () => void
}) {
  const { session, isLoading: sessionLoading } = useResidentSession()
  const [rsvps, setRsvps] = useState<Record<string, boolean>>({})
  const [recentlyCanceled, setRecentlyCanceled] = useState<Record<string, boolean>>({})
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const building = events.filter((event) => event.host === "Building")
  const resident = events.filter((event) => event.host === "Resident")

  useEffect(() => {
    const accessToken = session?.access_token
    if (!accessToken || events.length === 0 || accountSnapshot?.status !== "active") {
      setRsvps({})
      return
    }

    let isMounted = true

    const loadRsvps = async () => {
      try {
        const eventIds = events.map((event) => event.id).join(",")
        const response = await fetch(`/api/event-rsvp?eventIds=${encodeURIComponent(eventIds)}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        })

        const payload = (await response.json()) as { attending?: string[]; error?: string }
        if (!response.ok) {
          throw new Error(payload.error || "Unable to load RSVP state.")
        }

        if (!isMounted) return

        const nextState = Object.fromEntries((payload.attending ?? []).map((id) => [id, true]))
        setRsvps(nextState)
      } catch (error) {
        if (!isMounted) return
        setErrorMessage(error instanceof Error ? error.message : "Unable to load RSVP state.")
      }
    }

    void loadRsvps()

    return () => {
      isMounted = false
    }
  }, [events, session?.access_token, accountSnapshot?.status])

  async function toggleRsvp(event: CommunityEvent) {
    const accessToken = session?.access_token

    if (!accessToken) {
      onSignIn()
      return
    }

    if (accountSnapshot?.needsSurveyCompletion) {
      onCompleteProfile()
      return
    }

    setSubmittingId(event.id)
    setErrorMessage(null)

    try {
      const nextAttending = !rsvps[event.id]
      const response = await fetch("/api/event-rsvp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          eventId: event.id,
          attending: nextAttending,
        }),
      })

      const payload = (await response.json()) as { attending?: boolean; error?: string }
      if (!response.ok) {
        throw new Error(payload.error || "Unable to update your RSVP.")
      }

      setRsvps((previous) => ({
        ...previous,
        [event.id]: Boolean(payload.attending),
      }))

      if (payload.attending) {
        trackProductEvent("event_rsvp")
      }

      setRecentlyCanceled((previous) => ({
        ...previous,
        [event.id]: !payload.attending,
      }))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update your RSVP.")
    } finally {
      setSubmittingId(null)
    }
  }

  if (events.length === 0) {
    return (
      <div className="mt-6 px-6">
        <EmptyState
          icon={CalendarCheck}
          title="No gatherings scheduled yet"
          description="Your building team will publish the first event soon. Check back for RSVPs and resident meetups."
        />
      </div>
    )
  }

  return (
    <div className="mt-6 flex flex-col gap-7 px-6">
      {!sessionLoading && !session ? (
        <div className="rounded-3xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-foreground">
          Sign in to RSVP and keep your gathering activity synced to your building profile.
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-3xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      <EventGroup
        title="Hosted by the building"
        items={building}
        rsvps={rsvps}
        recentlyCanceled={recentlyCanceled}
        submittingId={submittingId}
        accountSnapshot={accountSnapshot}
        accountLoading={accountLoading}
        isSignedIn={isSignedIn}
        onToggleRsvp={toggleRsvp}
        onSignIn={onSignIn}
        onCompleteProfile={onCompleteProfile}
      />
      <EventGroup
        title="Resident suggestions"
        items={resident}
        rsvps={rsvps}
        recentlyCanceled={recentlyCanceled}
        submittingId={submittingId}
        accountSnapshot={accountSnapshot}
        accountLoading={accountLoading}
        isSignedIn={isSignedIn}
        onToggleRsvp={toggleRsvp}
        onSignIn={onSignIn}
        onCompleteProfile={onCompleteProfile}
      />
    </div>
  )
}

function EventGroup({
  title,
  items,
  rsvps,
  recentlyCanceled,
  submittingId,
  accountSnapshot,
  accountLoading,
  isSignedIn,
  onToggleRsvp,
  onSignIn,
  onCompleteProfile,
}: {
  title: string
  items: CommunityEvent[]
  rsvps: Record<string, boolean>
  recentlyCanceled: Record<string, boolean>
  submittingId: string | null
  accountSnapshot: ResidentAccountSnapshot | null
  accountLoading: boolean
  isSignedIn: boolean
  onToggleRsvp: (event: CommunityEvent) => Promise<void>
  onSignIn: () => void
  onCompleteProfile: () => void
}) {
  if (items.length === 0) return null

  return (
    <div>
      <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
        {title}
      </h2>
      <div className="flex flex-col gap-4">
        {items.map((event) => {
          const going = rsvps[event.id]
          const isSubmitting = submittingId === event.id
          const eligibilityState = getEligibilityState({
            event,
            isSignedIn,
            accountLoading,
            accountSnapshot,
            isAttending: Boolean(going),
            justCanceled: Boolean(recentlyCanceled[event.id]),
          })
          const eligibilityCopy = getEligibilityCopy(eligibilityState)
          const canToggle =
            eligibilityState === "can_rsvp" || eligibilityState === "rsvp_confirmed"

          return (
            <article
              key={event.id}
              className="overflow-hidden rounded-3xl border border-border bg-card shadow-[0_26px_60px_-46px_rgba(70,56,35,0.42)]"
            >
              <img
                src={event.image || "/placeholder.svg"}
                alt={event.title}
                className="h-40 w-full object-cover"
              />
              <div className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
                    {event.date} · {event.time}
                  </p>
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {event.enrollmentLabel}
                  </span>
                </div>
                <h3 className="mt-1.5 font-serif text-2xl leading-tight text-foreground">
                  {event.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/75">
                  {event.description}
                </p>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="size-3.5" />
                  {event.attendees} attending · {event.location}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{eligibilityCopy.helper}</p>
                <div className="mt-4 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (eligibilityState === "not_eligible") {
                        onSignIn()
                        return
                      }

                      if (eligibilityState === "needs_onboarding") {
                        onCompleteProfile()
                        return
                      }

                      if (canToggle) {
                        void onToggleRsvp(event)
                      }
                    }}
                    disabled={
                      isSubmitting ||
                      (eligibilityState !== "not_eligible" &&
                        eligibilityState !== "needs_onboarding" &&
                        !canToggle)
                    }
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-medium tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-70",
                      eligibilityState === "rsvp_confirmed"
                        ? "bg-gold/15 text-gold-foreground"
                        : canToggle ||
                            eligibilityState === "not_eligible" ||
                            eligibilityState === "needs_onboarding"
                          ? "bg-foreground text-background"
                          : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Saving
                      </>
                    ) : eligibilityState === "rsvp_confirmed" ? (
                      <>
                        <Check className="size-4 text-gold" />
                        {eligibilityCopy.button}
                      </>
                    ) : (
                      eligibilityCopy.button
                    )}
                  </button>
                </div>
                {eligibilityState === "rsvp_confirmed" ? (
                  <button
                    type="button"
                    onClick={() => void onToggleRsvp(event)}
                    disabled={isSubmitting}
                    className="mt-2.5 w-full rounded-full border border-border py-3 text-sm font-medium text-foreground/80 transition-colors hover:border-gold/40 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Cancel RSVP
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="mt-2.5 w-full rounded-full border border-border py-3 text-sm font-medium text-foreground/80 opacity-70 transition-colors disabled:cursor-not-allowed"
                  >
                    Resident introductions unlock after RSVP
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

function VotingList({ eventPolls }: { eventPolls: CommunityPoll[] }) {
  const [voted, setVoted] = useState<Record<string, boolean>>({})

  if (eventPolls.length === 0) {
    return (
      <div className="mt-6 px-6">
        <EmptyState
          icon={Lightbulb}
          title="Event ideas coming soon"
          description="Your building team will open voting when it is time to shape next month’s gatherings."
        />
      </div>
    )
  }

  return (
    <div className="mt-6 px-6">
      <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
        Help shape next month. Add your interest to the gatherings you’d be most likely to attend.
      </p>
      <div className="flex flex-col gap-3.5">
        {eventPolls.map((poll) => {
          const isVoted = voted[poll.id]
          const votes = poll.votes + (isVoted ? 1 : 0)
          const percent = Math.min(100, poll.percent + (isVoted ? 2 : 0))

          return (
            <div
              key={poll.id}
              className="overflow-hidden rounded-3xl border border-border bg-card shadow-[0_22px_50px_-42px_rgba(70,56,35,0.38)]"
            >
              <div className="flex items-center gap-4 p-3.5">
                <img
                  src={poll.image || "/placeholder.svg"}
                  alt={poll.title}
                  className="size-16 shrink-0 rounded-2xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-serif text-lg leading-tight text-foreground">{poll.title}</h3>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-gold transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {votes} residents interested
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setVoted((previous) => ({ ...previous, [poll.id]: !previous[poll.id] }))
                  }
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-full border transition-colors",
                    isVoted
                      ? "border-gold bg-gold text-gold-foreground"
                      : "border-border text-foreground hover:border-gold/50",
                  )}
                  aria-label={`Vote for ${poll.title}`}
                >
                  {isVoted ? <Check className="size-5" /> : <Plus className="size-5" />}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
