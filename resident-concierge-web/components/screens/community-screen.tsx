"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, Plus, Users } from "lucide-react"

import { ResidentAccessCard } from "@/components/resident-access-card"
import { ScreenHeader } from "@/components/screen-header"
import type { CommunityEvent, CommunityPoll } from "@/lib/community-live"
import type { ResidentAccountSnapshot } from "@/lib/resident-account-server"
import { useResidentSession } from "@/lib/session-browser"
import { cn } from "@/lib/utils"

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
  const shouldGateFeed =
    !isSignedIn ||
    accountLoading ||
    (accountSnapshot?.status !== "active") ||
    Boolean(accountSnapshot?.needsSurveyCompletion)

  return (
    <div className="h-full overflow-y-auto pb-28">
      <div className="pt-3">
        <ScreenHeader eyebrow="Within these walls" title="Community" />
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

      {shouldGateFeed ? (
        <div className="mt-6 px-6">
          <div className="rounded-3xl border border-border bg-card p-5">
            <p className="font-serif text-2xl text-foreground">Community unlocks once your access is ready.</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              As soon as your membership is active and your profile is complete, you&apos;ll be able to RSVP,
              discover gatherings, and shape what happens in the building next.
            </p>
          </div>
        </div>
      ) : (
        <>
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
                  {value === "events" ? "Events" : "Vote on next month"}
                </button>
              ))}
            </div>
          </div>

          {tab === "events" ? <EventsList events={events} /> : <VotingList eventPolls={eventPolls} />}
        </>
      )}
    </div>
  )
}

function EventsList({ events }: { events: CommunityEvent[] }) {
  const router = useRouter()
  const { session, isLoading: sessionLoading } = useResidentSession()
  const [rsvps, setRsvps] = useState<Record<string, boolean>>({})
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const building = events.filter((event) => event.host === "Building")
  const resident = events.filter((event) => event.host === "Resident")

  useEffect(() => {
    const accessToken = session?.access_token
    if (!accessToken || events.length === 0) {
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

        if (!isMounted) {
          return
        }

        const nextState = Object.fromEntries((payload.attending ?? []).map((id) => [id, true]))
        setRsvps(nextState)
      } catch (error) {
        if (!isMounted) {
          return
        }

        setErrorMessage(error instanceof Error ? error.message : "Unable to load RSVP state.")
      }
    }

    void loadRsvps()

    return () => {
      isMounted = false
    }
  }, [events, session?.access_token])

  async function toggleRsvp(eventId: string) {
    const accessToken = session?.access_token

    if (!accessToken) {
      router.push("/auth?next=%2Fapp%2Fcommunity")
      return
    }

    setSubmittingId(eventId)
    setErrorMessage(null)

    try {
      const response = await fetch("/api/event-rsvp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          eventId,
          attending: !rsvps[eventId],
        }),
      })

      const payload = (await response.json()) as { attending?: boolean; error?: string }
      if (!response.ok) {
        throw new Error(payload.error || "Unable to update your RSVP.")
      }

      setRsvps((previous) => ({
        ...previous,
        [eventId]: Boolean(payload.attending),
      }))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update your RSVP.")
    } finally {
      setSubmittingId(null)
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-7 px-6">
      {!sessionLoading && !session ? (
        <div className="rounded-3xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-foreground">
          Sign in to RSVP and keep your event activity synced to your building profile.
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
        submittingId={submittingId}
        onToggleRsvp={toggleRsvp}
      />
      <EventGroup
        title="Suggested by residents"
        items={resident}
        rsvps={rsvps}
        submittingId={submittingId}
        onToggleRsvp={toggleRsvp}
      />
    </div>
  )
}

function EventGroup({
  title,
  items,
  rsvps,
  submittingId,
  onToggleRsvp,
}: {
  title: string
  items: CommunityEvent[]
  rsvps: Record<string, boolean>
  submittingId: string | null
  onToggleRsvp: (eventId: string) => Promise<void>
}) {
  if (items.length === 0) return null

  return (
    <div>
      <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">{title}</h2>
      <div className="flex flex-col gap-4">
        {items.map((event) => {
          const going = rsvps[event.id]
          const isSubmitting = submittingId === event.id

          return (
            <article key={event.id} className="overflow-hidden rounded-3xl border border-border bg-card">
              <img
                src={event.image || "/placeholder.svg"}
                alt={event.title}
                className="h-40 w-full object-cover"
              />
              <div className="p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
                  {event.date} - {event.time}
                </p>
                <h3 className="mt-1.5 font-serif text-2xl leading-tight text-foreground">{event.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/75">{event.description}</p>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="size-3.5" />
                  {event.attendees} attending - {event.location}
                </div>
                <div className="mt-4 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => void onToggleRsvp(event.id)}
                    disabled={isSubmitting}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-medium tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-70",
                      going ? "bg-gold/15 text-gold-foreground" : "bg-foreground text-background",
                    )}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Saving
                      </>
                    ) : going ? (
                      <>
                        <Check className="size-4 text-gold" />
                        Attending
                      </>
                    ) : (
                      "RSVP"
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  className="mt-2.5 w-full rounded-full border border-border py-3 text-sm font-medium text-foreground/80 transition-colors hover:border-gold/40"
                >
                  Introduce me to people attending
                </button>
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

  return (
    <div className="mt-6 px-6">
      <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
        Help shape next month. Add your interest to the gatherings you&apos;d attend.
      </p>
      <div className="flex flex-col gap-3.5">
        {eventPolls.map((poll) => {
          const isVoted = voted[poll.id]
          const votes = poll.votes + (isVoted ? 1 : 0)
          const percent = Math.min(100, poll.percent + (isVoted ? 2 : 0))

          return (
            <div key={poll.id} className="overflow-hidden rounded-3xl border border-border bg-card">
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
                  <p className="mt-1.5 text-[11px] text-muted-foreground">{votes} residents interested</p>
                </div>
                <button
                  type="button"
                  onClick={() => setVoted((previous) => ({ ...previous, [poll.id]: !previous[poll.id] }))}
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
