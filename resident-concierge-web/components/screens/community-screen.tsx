"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CalendarDays,
  Check,
  Clock3,
  Heart,
  Loader2,
  MapPin,
  MessageCircleHeart,
  Sparkles,
  Star,
  Users,
  X,
} from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { ResidentAccessCard } from "@/components/resident-access-card"
import { ScreenHeader, SectionLabel } from "@/components/screen-header"
import { ResidentEventSuggestions } from "@/components/screens/resident-event-suggestions"
import type { Resident } from "@/lib/concierge-data"
import type { CommunityEvent, CommunityPoll } from "@/lib/community-live"
import type { ResidentAccountSnapshot } from "@/lib/resident-account-server"
import { trackProductEvent } from "@/lib/product-analytics"
import { useResidentSession } from "@/lib/session-browser"
import { cn } from "@/lib/utils"

type CommunityTab = "gatherings" | "circles" | "suggestions"

type RsvpEligibilityState =
  | "not_eligible"
  | "needs_onboarding"
  | "can_rsvp"
  | "rsvp_confirmed"
  | "rsvp_canceled"
  | "closed"

type ResidentEventProposal = {
  id: string
  title: string
  detail: string | null
  status: "active" | "withdrawn" | "resolved"
  createdAt: string
}

type ResidentEventSignalState = {
  interest: boolean
  vote: boolean
  waitlist: boolean
  feedbackRating: number | null
  feedbackDetail: string | null
}

type ResidentEventEngagementState = {
  proposals: ResidentEventProposal[]
  signalsByEventId: Record<string, ResidentEventSignalState>
  attendingEventIds: string[]
}

type CirclePreview = {
  id: string
  title: string
  subtitle: string
  statusLabel: string
  statusTone: "forming" | "ready" | "waitlist"
  typeLabel: string
  membersLabel: string
  memberNames: string[]
  reason: string
  bestFor: string
  nextStep: string
  privacyNote: string
  suggestedMoment: string
}

const supportToneByHost: Record<CommunityEvent["host"], string> = {
  Building: "Hosted by the building",
  Resident: "Proposed by a resident",
}

const defaultEngagementState: ResidentEventEngagementState = {
  proposals: [],
  signalsByEventId: {},
  attendingEventIds: [],
}

function formatDateLabel(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
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
        helper: "You're on the guest list for this gathering.",
      }
    case "rsvp_canceled":
      return {
        button: "RSVP canceled",
        helper: "Your place was released. You can opt back in while the list remains open.",
      }
    case "closed":
      return {
        button: "RSVP unavailable",
        helper: "This gathering is not currently accepting new RSVPs.",
      }
    case "needs_onboarding":
      return {
        button: "Complete profile to RSVP",
        helper: "Finish onboarding first so the right introductions and gatherings stay thoughtfully matched.",
      }
    case "not_eligible":
      return {
        button: "Not eligible yet",
        helper: "Gatherings open only to approved, active residents in this building.",
      }
    case "can_rsvp":
      return {
        button: "RSVP",
        helper: "Your access is active and this gathering is open to you now.",
      }
  }
}

function buildCirclePreviews(residents: Resident[], events: CommunityEvent[]): CirclePreview[] {
  const byKeyword = [
    {
      id: "coffee-circle",
      title: "Coffee and conversation",
      keywords: ["Coffee", "Books", "Current events", "Design", "Food"],
      defaultMoment: "A weekday coffee hour in the resident lounge",
    },
    {
      id: "wellness-circle",
      title: "Wellness mornings",
      keywords: ["Wellness", "Yoga", "Running", "Walking", "Fitness"],
      defaultMoment: "A weekend morning reset before the building gets busy",
    },
    {
      id: "ideas-circle",
      title: "Ideas and introductions",
      keywords: ["Technology", "Startups", "Entrepreneurship", "Coworking", "Travel"],
      defaultMoment: "An early-evening lounge conversation after work",
    },
  ]

  return byKeyword
    .map((circle) => {
      const members = residents.filter((resident) =>
        resident.interests.some((interest) => circle.keywords.includes(interest)),
      )

      if (members.length === 0) {
        return null
      }

      const nextEvent = events.find((event) =>
        members.some((resident) =>
          resident.interests.some((interest) => event.title.toLowerCase().includes(interest.toLowerCase())),
        ),
      )

      return {
        id: circle.id,
        title: circle.title,
        subtitle:
          members.length >= 5
            ? "Strong resident signal"
            : members.length >= 3
              ? "Circle taking shape"
              : "Early overlap emerging",
        statusLabel:
          members.length >= 5
            ? "Good candidate for concierge review"
            : members.length >= 3
              ? "Ready for a first small-group pass"
              : "Still gathering the right residents",
        statusTone:
          members.length >= 5 ? "waitlist" : members.length >= 3 ? "ready" : "forming",
        typeLabel:
          circle.id === "coffee-circle"
            ? "Conversation circle"
            : circle.id === "wellness-circle"
              ? "Activity circle"
              : "Ideas circle",
        membersLabel: `${members.length} residents currently fit this rhythm`,
        memberNames: members.slice(0, 3).map((resident) => resident.name),
        reason:
          members.length >= 3
            ? "Shared interests, timing, and social pace suggest this could become a gentle small-group moment rather than a louder open event."
            : "This overlap feels better suited to a quieter first introduction before expanding into a wider group rhythm.",
        bestFor:
          circle.id === "coffee-circle"
            ? "Residents who prefer easier conversation, recurring coffee, and a low-pressure first hello."
            : circle.id === "wellness-circle"
              ? "Residents who would rather meet through movement, routine, and a calmer shared pace."
              : "Residents who enjoy ideas, work-adjacent conversation, and a more thoughtful evening exchange.",
        nextStep:
          members.length >= 5
            ? "This is a strong pilot signal. If the fit remains real, the concierge can shape a first small-group moment."
            : members.length >= 3
              ? "A few strong matches are already visible here. The next step would be a quiet concierge review, not an automatic group launch."
              : "This circle needs one or two more aligned residents before it becomes a real introduction path.",
        privacyNote:
          "Residents do not see a full roster here. Circles are still concierge-reviewed pilot signals, not live public memberships.",
        suggestedMoment: nextEvent
          ? `${nextEvent.title} or ${circle.defaultMoment.toLowerCase()}`
          : circle.defaultMoment,
      }
    })
    .filter((circle): circle is CirclePreview => Boolean(circle))
}

export function CommunityScreen({
  buildingName,
  residents,
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
  onOpenPeople,
}: {
  buildingName: string
  residents: Resident[]
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
  onOpenPeople: () => void
}) {
  const { session } = useResidentSession()
  const [tab, setTab] = useState<CommunityTab>("gatherings")
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [engagementState, setEngagementState] =
    useState<ResidentEventEngagementState>(defaultEngagementState)
  const [recentlyCanceled, setRecentlyCanceled] = useState<Record<string, boolean>>({})
  const [isLoadingEngagement, setIsLoadingEngagement] = useState(true)
  const [submittingKey, setSubmittingKey] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [proposalTitle, setProposalTitle] = useState("")
  const [proposalDetail, setProposalDetail] = useState("")
  const [feedbackDrafts, setFeedbackDrafts] = useState<
    Record<string, { rating: number; detail: string }>
  >({})
  const [localVotes, setLocalVotes] = useState<Record<string, boolean>>({})
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null)
  const [circleResponses, setCircleResponses] = useState<
    Record<string, "interested" | "waitlist" | "following">
  >({})

  const hasResidentAccess = Boolean(
    isSignedIn &&
      accountSnapshot?.status === "active" &&
      accountSnapshot.hasActiveMembership,
  )

  const circles = useMemo(() => buildCirclePreviews(residents, events), [events, residents])
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null
  const featuredEvent = events[0] ?? null
  const tabDescriptions: Record<CommunityTab, string> = {
    gatherings: "Published gatherings worth stepping out for, shaped around the building's real rhythm.",
    circles: "Smaller group moments beginning to form around shared timing, interests, and social style.",
    suggestions: "Resident ideas the concierge and building team can turn into something genuinely worth attending.",
  }

  useEffect(() => {
    if (circles.length === 0) {
      setSelectedCircleId(null)
      return
    }

    setSelectedCircleId((current) =>
      current && circles.some((circle) => circle.id === current) ? current : circles[0]?.id ?? null,
    )
  }, [circles])

  useEffect(() => {
    const accessToken = session?.access_token

    if (!accessToken || !hasResidentAccess) {
      setEngagementState(defaultEngagementState)
      setIsLoadingEngagement(false)
      return
    }

    let isMounted = true

    const loadEngagement = async () => {
      setIsLoadingEngagement(true)
      setErrorMessage(null)

      try {
        const response = await fetch("/api/event-engagements", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        })

        const payload = (await response.json()) as ResidentEventEngagementState & {
          error?: string
        }

        if (!response.ok) {
          throw new Error(payload.error || "Unable to load your resident event activity.")
        }

        if (!isMounted) {
          return
        }

        setEngagementState(payload)
        setFeedbackDrafts((current) => {
          const nextDrafts = { ...current }
          for (const [eventId, signal] of Object.entries(payload.signalsByEventId)) {
            if (signal.feedbackRating) {
              nextDrafts[eventId] = {
                rating: signal.feedbackRating,
                detail: signal.feedbackDetail ?? "",
              }
            }
          }
          return nextDrafts
        })
      } catch (error) {
        if (!isMounted) {
          return
        }
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load your resident event activity.",
        )
      } finally {
        if (isMounted) {
          setIsLoadingEngagement(false)
        }
      }
    }

    void loadEngagement()

    return () => {
      isMounted = false
    }
  }, [hasResidentAccess, session?.access_token])

  function updateSignalState(
    eventId: string,
    updates: Partial<ResidentEventSignalState>,
  ) {
    setEngagementState((current) => ({
      ...current,
      signalsByEventId: {
        ...current.signalsByEventId,
        [eventId]: {
          interest: false,
          vote: false,
          waitlist: false,
          feedbackRating: null,
          feedbackDetail: null,
          ...(current.signalsByEventId[eventId] ?? {}),
          ...updates,
        },
      },
    }))
  }

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

    const currentlyAttending = engagementState.attendingEventIds.includes(event.id)

    setSubmittingKey(`rsvp:${event.id}`)
    setErrorMessage(null)

    try {
      const response = await fetch("/api/event-engagements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        body: JSON.stringify({
          action: "rsvp",
          eventId: event.id,
          attending: !currentlyAttending,
        }),
      })

      const payload = (await response.json()) as {
        attending?: boolean
        waitlisted?: boolean
        error?: string
      }

      if (!response.ok) {
        throw new Error(payload.error || "Unable to update your RSVP.")
      }

      setEngagementState((current) => {
        const attendingIds = new Set(current.attendingEventIds)
        if (payload.attending) {
          attendingIds.add(event.id)
        } else {
          attendingIds.delete(event.id)
        }

        return {
          ...current,
          attendingEventIds: Array.from(attendingIds),
        }
      })

      setRecentlyCanceled((current) => ({
        ...current,
        [event.id]: !payload.attending,
      }))

      if (payload.waitlisted) {
        updateSignalState(event.id, { waitlist: true })
      }

      if (payload.attending) {
        trackProductEvent("event_rsvp")
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update your RSVP.")
    } finally {
      setSubmittingKey(null)
    }
  }

  async function toggleInterest(eventId: string, active: boolean) {
    const accessToken = session?.access_token

    if (!accessToken) {
      onSignIn()
      return
    }

    setSubmittingKey(`interest:${eventId}`)
    setErrorMessage(null)

    try {
      const response = await fetch("/api/event-engagements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        body: JSON.stringify({
          action: "interest",
          eventId,
          active,
        }),
      })

      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || "Unable to update your interest.")
      }

      updateSignalState(eventId, { interest: active })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update your interest.")
    } finally {
      setSubmittingKey(null)
    }
  }

  async function submitProposal() {
    const accessToken = session?.access_token

    if (!accessToken) {
      onSignIn()
      return
    }

    if (accountSnapshot?.needsSurveyCompletion) {
      onCompleteProfile()
      return
    }

    setSubmittingKey("proposal")
    setErrorMessage(null)

    try {
      const response = await fetch("/api/event-engagements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        body: JSON.stringify({
          action: "proposal",
          title: proposalTitle,
          detail: proposalDetail,
        }),
      })

      const payload = (await response.json()) as { id?: string; error?: string }
      if (!response.ok) {
        throw new Error(payload.error || "Unable to submit your gathering proposal.")
      }

      trackProductEvent("resident_gathering_proposed")

      setEngagementState((current) => ({
        ...current,
        proposals: [
          {
            id: payload.id ?? `proposal-${Date.now()}`,
            title: proposalTitle.trim(),
            detail: proposalDetail.trim() || null,
            status: "active",
            createdAt: new Date().toISOString(),
          },
          ...current.proposals.filter((proposal) => proposal.title !== proposalTitle.trim()),
        ],
      }))

      setProposalTitle("")
      setProposalDetail("")
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to submit your gathering proposal.",
      )
    } finally {
      setSubmittingKey(null)
    }
  }

  async function submitFeedback(eventId: string) {
    const accessToken = session?.access_token

    if (!accessToken) {
      onSignIn()
      return
    }

    const feedback = feedbackDrafts[eventId]
    if (!feedback?.rating) {
      setErrorMessage("Please choose a rating before sending feedback.")
      return
    }

    setSubmittingKey(`feedback:${eventId}`)
    setErrorMessage(null)

    try {
      const response = await fetch("/api/event-engagements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        body: JSON.stringify({
          action: "feedback",
          eventId,
          rating: feedback.rating,
          detail: feedback.detail,
        }),
      })

      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || "Unable to save your feedback.")
      }

      updateSignalState(eventId, {
        feedbackRating: feedback.rating,
        feedbackDetail: feedback.detail.trim() || null,
      })
      trackProductEvent("resident_event_feedback_submitted")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save your feedback.")
    } finally {
      setSubmittingKey(null)
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-[#f6eee1] pb-28">
      <div className="pt-3">
        <ScreenHeader eyebrow="Private community" title="Community" accent="life." />
        <p className="mt-2 px-6 text-sm leading-relaxed text-[#726353]">
          A quieter view of building life: published gatherings, emerging circles, and resident ideas the concierge can shape into something real.
        </p>
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

      {errorMessage ? (
        <div className="mt-5 px-6">
          <div className="rounded-[1.6rem] border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        </div>
      ) : null}

      <div className="mt-6 px-6">
        <div className="mb-4 rounded-[1.9rem] border border-[#e1d5c3] bg-[#fbf6ee] px-5 py-5 shadow-[0_20px_48px_-40px_rgba(70,56,35,0.28)]">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold">
            {buildingName} Community
          </p>
          <h2 className="mt-2 font-serif text-[1.9rem] leading-[1.02] text-foreground">
            Community life should feel curated, not crowded.
          </h2>
          <p className="mt-3 text-sm leading-7 text-[#6f604f]">
            Use this space to discover upcoming gatherings, quieter circles, and resident ideas that deserve real momentum. Fifth Circle keeps the experience calm, useful, and intentionally local to your building.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <CommunityMetric
              label="Building events"
              value={`${events.length}`}
              detail="Published moments currently on the calendar."
            />
            <CommunityMetric
              label="Curated circles"
              value={`${circles.length}`}
              detail="Smaller group rhythms beginning to take shape."
            />
            <CommunityMetric
              label="Resident ideas"
              value={`${eventPolls.length}`}
              detail="Ideas residents are already helping the concierge prioritize."
            />
          </div>
        </div>

        <div className="flex rounded-full border border-[#ded1bf] bg-[#efe6d8] p-1">
          {([
            ["gatherings", "Gatherings"],
            ["circles", "Circles"],
            ["suggestions", "Ideas"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={cn(
                "flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition-colors",
                tab === value ? "bg-[#fbf6ee] text-foreground shadow-sm" : "text-[#7d6e5e]",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-3 px-1 text-sm leading-6 text-[#7a6b5b]">{tabDescriptions[tab]}</p>
      </div>

      {tab === "gatherings" ? (
        <GatheringsView
          buildingName={buildingName}
          events={events}
          engagementState={engagementState}
          recentlyCanceled={recentlyCanceled}
          submittingKey={submittingKey}
          featuredEvent={featuredEvent}
          selectedEvent={selectedEvent}
          isSignedIn={isSignedIn}
          accountSnapshot={accountSnapshot}
          accountLoading={accountLoading}
          feedbackDrafts={feedbackDrafts}
          isLoadingEngagement={isLoadingEngagement}
          onSelectEvent={setSelectedEventId}
          onCloseEvent={() => setSelectedEventId(null)}
          onToggleRsvp={toggleRsvp}
          onToggleInterest={toggleInterest}
          onFeedbackChange={(eventId, updates) =>
            setFeedbackDrafts((current) => ({
              ...current,
              [eventId]: {
                rating: current[eventId]?.rating ?? 0,
                detail: current[eventId]?.detail ?? "",
                ...updates,
              },
            }))
          }
          onSubmitFeedback={submitFeedback}
          onSignIn={onSignIn}
          onCompleteProfile={onCompleteProfile}
        />
      ) : null}

      {tab === "circles" ? (
        <CirclesView
          circles={circles}
          selectedCircleId={selectedCircleId}
          circleResponses={circleResponses}
          isSignedIn={isSignedIn}
          accountSnapshot={accountSnapshot}
          accountLoading={accountLoading}
          onSelectCircle={setSelectedCircleId}
          onRespondToCircle={(circleId, response) => {
            setCircleResponses((current) => ({ ...current, [circleId]: response }))
            trackProductEvent("resident_circle_interest_recorded")
          }}
          onSignIn={onSignIn}
          onCompleteProfile={onCompleteProfile}
          onOpenPeople={onOpenPeople}
        />
      ) : null}

      {tab === "suggestions" ? (
        <SuggestionsView
          isEligible={hasResidentAccess}
          proposals={engagementState.proposals}
          proposalTitle={proposalTitle}
          proposalDetail={proposalDetail}
          eventPolls={eventPolls}
          localVotes={localVotes}
          submittingKey={submittingKey}
          isSignedIn={isSignedIn}
          accountSnapshot={accountSnapshot}
          accountLoading={accountLoading}
          onProposalTitleChange={setProposalTitle}
          onProposalDetailChange={setProposalDetail}
          onSubmitProposal={submitProposal}
          onToggleVote={(pollId) =>
            setLocalVotes((current) => ({ ...current, [pollId]: !current[pollId] }))
          }
          onSignIn={onSignIn}
          onCompleteProfile={onCompleteProfile}
        />
      ) : null}
    </div>
  )
}

function GatheringsView({
  buildingName,
  events,
  engagementState,
  recentlyCanceled,
  submittingKey,
  featuredEvent,
  selectedEvent,
  isSignedIn,
  accountSnapshot,
  accountLoading,
  feedbackDrafts,
  isLoadingEngagement,
  onSelectEvent,
  onCloseEvent,
  onToggleRsvp,
  onToggleInterest,
  onFeedbackChange,
  onSubmitFeedback,
  onSignIn,
  onCompleteProfile,
}: {
  buildingName: string
  events: CommunityEvent[]
  engagementState: ResidentEventEngagementState
  recentlyCanceled: Record<string, boolean>
  submittingKey: string | null
  featuredEvent: CommunityEvent | null
  selectedEvent: CommunityEvent | null
  isSignedIn: boolean
  accountSnapshot: ResidentAccountSnapshot | null
  accountLoading: boolean
  feedbackDrafts: Record<string, { rating: number; detail: string }>
  isLoadingEngagement: boolean
  onSelectEvent: (eventId: string | null) => void
  onCloseEvent: () => void
  onToggleRsvp: (event: CommunityEvent) => Promise<void>
  onToggleInterest: (eventId: string, active: boolean) => Promise<void>
  onFeedbackChange: (
    eventId: string,
    updates: Partial<{ rating: number; detail: string }>,
  ) => void
  onSubmitFeedback: (eventId: string) => Promise<void>
  onSignIn: () => void
  onCompleteProfile: () => void
}) {
  if (events.length === 0) {
    return (
      <div className="mt-6 px-6">
        <EmptyState
          icon={CalendarDays}
          title="The calendar is still warming up."
          description="The first published gatherings for this building are still being shaped. As soon as something worth stepping out for is confirmed, it will appear here."
        />
      </div>
    )
  }

  return (
    <div className="mt-6 px-6">
      {featuredEvent ? (
        <FeaturedGatheringCard
          event={featuredEvent}
          buildingName={buildingName}
          engagementState={engagementState}
          recentlyCanceled={recentlyCanceled}
          submittingKey={submittingKey}
          isSignedIn={isSignedIn}
          accountSnapshot={accountSnapshot}
          accountLoading={accountLoading}
          onOpenDetail={() => onSelectEvent(featuredEvent.id)}
          onToggleRsvp={onToggleRsvp}
          onSignIn={onSignIn}
          onCompleteProfile={onCompleteProfile}
        />
      ) : null}

      <div className="mt-7">
        <SectionLabel>Coming up</SectionLabel>
        <div className="space-y-3">
          {events.map((event) => {
            const isAttending = engagementState.attendingEventIds.includes(event.id)
            const signal = engagementState.signalsByEventId[event.id]
            return (
              <button
                key={event.id}
                type="button"
                onClick={() => onSelectEvent(event.id)}
                className="flex w-full items-center gap-4 rounded-[1.8rem] border border-[#e1d5c3] bg-[#fbf6ee] px-4 py-4 text-left shadow-[0_20px_48px_-42px_rgba(70,56,35,0.3)] transition-transform hover:-translate-y-0.5"
              >
                <img
                  src={event.image || "/placeholder.svg"}
                  alt={event.title}
                  className="size-20 rounded-[1.3rem] object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
                    {event.date} - {event.time}
                  </p>
                  <h3 className="mt-2 font-serif text-2xl leading-tight text-foreground">
                    {event.title}
                  </h3>
                  <p className="mt-1 text-sm text-[#6f604f]">
                    {supportToneByHost[event.host]} - {event.location}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {isAttending ? (
                      <span className="rounded-full bg-gold/15 px-2.5 py-1 text-[11px] text-foreground">
                        You're attending
                      </span>
                    ) : null}
                    {signal?.interest ? (
                      <span className="rounded-full bg-[#efe6d8] px-2.5 py-1 text-[11px] text-[#7b6b59]">
                        Interested
                      </span>
                    ) : null}
                    {signal?.feedbackRating ? (
                      <span className="rounded-full bg-[#efe6d8] px-2.5 py-1 text-[11px] text-[#7b6b59]">
                        Feedback saved
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {selectedEvent ? (
        <EventDetailSheet
          event={selectedEvent}
          isLoadingEngagement={isLoadingEngagement}
          engagementState={engagementState}
          recentlyCanceled={recentlyCanceled}
          submittingKey={submittingKey}
          isSignedIn={isSignedIn}
          accountSnapshot={accountSnapshot}
          accountLoading={accountLoading}
          feedbackDraft={feedbackDrafts[selectedEvent.id] ?? { rating: 0, detail: "" }}
          onClose={onCloseEvent}
          onToggleRsvp={onToggleRsvp}
          onToggleInterest={onToggleInterest}
          onFeedbackChange={onFeedbackChange}
          onSubmitFeedback={onSubmitFeedback}
          onSignIn={onSignIn}
          onCompleteProfile={onCompleteProfile}
        />
      ) : null}
    </div>
  )
}

function FeaturedGatheringCard({
  event,
  buildingName,
  engagementState,
  recentlyCanceled,
  submittingKey,
  isSignedIn,
  accountSnapshot,
  accountLoading,
  onOpenDetail,
  onToggleRsvp,
  onSignIn,
  onCompleteProfile,
}: {
  event: CommunityEvent
  buildingName: string
  engagementState: ResidentEventEngagementState
  recentlyCanceled: Record<string, boolean>
  submittingKey: string | null
  isSignedIn: boolean
  accountSnapshot: ResidentAccountSnapshot | null
  accountLoading: boolean
  onOpenDetail: () => void
  onToggleRsvp: (event: CommunityEvent) => Promise<void>
  onSignIn: () => void
  onCompleteProfile: () => void
}) {
  const isAttending = engagementState.attendingEventIds.includes(event.id)
  const eligibilityState = getEligibilityState({
    event,
    isSignedIn,
    accountLoading,
    accountSnapshot,
    isAttending,
    justCanceled: Boolean(recentlyCanceled[event.id]),
  })
  const eligibilityCopy = getEligibilityCopy(eligibilityState)
  const canToggle = eligibilityState === "can_rsvp" || eligibilityState === "rsvp_confirmed"

  return (
    <article className="overflow-hidden rounded-[2rem] border border-[#2a231d] bg-[#231d17] text-[#f3ebdc] shadow-[0_32px_90px_-56px_rgba(35,29,23,0.85)]">
      <img
        src={event.image || "/placeholder.svg"}
        alt={event.title}
        className="h-48 w-full object-cover opacity-90"
      />
      <div className="px-5 py-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#d5bb84]">
          {buildingName} Community
        </p>
        <h2 className="mt-3 font-serif text-[2rem] leading-[1.02]">{event.title}</h2>
        <p className="mt-3 text-sm leading-7 text-[#ddd2c1]">{event.description}</p>
        <div className="mt-4 grid gap-2 text-sm text-[#d8ccb8]">
          <div className="flex items-center gap-2">
            <Clock3 className="size-4 text-[#d5bb84]" />
            <span>
              {event.date} at {event.time}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-[#d5bb84]" />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="size-4 text-[#d5bb84]" />
            <span>{event.attendees} residents attending so far</span>
          </div>
        </div>
        <p className="mt-4 text-sm text-[#d8ccb8]">{eligibilityCopy.helper}</p>
        <div className="mt-5 flex gap-3">
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
            disabled={submittingKey === `rsvp:${event.id}` || (!canToggle && eligibilityState !== "not_eligible" && eligibilityState !== "needs_onboarding")}
            className="inline-flex flex-1 items-center justify-center rounded-full bg-[#f3ebdc] px-4 py-3 text-sm font-medium text-[#231d17] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submittingKey === `rsvp:${event.id}` ? (
              <Loader2 className="size-4 animate-spin" />
            ) : eligibilityCopy.button}
          </button>
          <button
            type="button"
            onClick={onOpenDetail}
            className="inline-flex flex-1 items-center justify-center rounded-full border border-white/12 px-4 py-3 text-sm font-medium text-[#f3ebdc]"
          >
            View details
          </button>
        </div>
      </div>
    </article>
  )
}

function EventDetailSheet({
  event,
  isLoadingEngagement,
  engagementState,
  recentlyCanceled,
  submittingKey,
  isSignedIn,
  accountSnapshot,
  accountLoading,
  feedbackDraft,
  onClose,
  onToggleRsvp,
  onToggleInterest,
  onFeedbackChange,
  onSubmitFeedback,
  onSignIn,
  onCompleteProfile,
}: {
  event: CommunityEvent
  isLoadingEngagement: boolean
  engagementState: ResidentEventEngagementState
  recentlyCanceled: Record<string, boolean>
  submittingKey: string | null
  isSignedIn: boolean
  accountSnapshot: ResidentAccountSnapshot | null
  accountLoading: boolean
  feedbackDraft: { rating: number; detail: string }
  onClose: () => void
  onToggleRsvp: (event: CommunityEvent) => Promise<void>
  onToggleInterest: (eventId: string, active: boolean) => Promise<void>
  onFeedbackChange: (
    eventId: string,
    updates: Partial<{ rating: number; detail: string }>,
  ) => void
  onSubmitFeedback: (eventId: string) => Promise<void>
  onSignIn: () => void
  onCompleteProfile: () => void
}) {
  const isAttending = engagementState.attendingEventIds.includes(event.id)
  const signal = engagementState.signalsByEventId[event.id]
  const eligibilityState = getEligibilityState({
    event,
    isSignedIn,
    accountLoading,
    accountSnapshot,
    isAttending,
    justCanceled: Boolean(recentlyCanceled[event.id]),
  })
  const eligibilityCopy = getEligibilityCopy(eligibilityState)
  const canToggle = eligibilityState === "can_rsvp" || eligibilityState === "rsvp_confirmed"

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/30 p-3 backdrop-blur-sm">
      <div className="max-h-[86vh] w-full max-w-[360px] overflow-y-auto rounded-[2rem] border border-[#dbcdb9] bg-[#fbf6ee] shadow-[0_40px_110px_-56px_rgba(35,29,23,0.8)]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e7dccb] bg-[#fbf6ee]/95 px-5 py-4 backdrop-blur">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold">
              Gathering detail
            </p>
            <h3 className="mt-1 font-serif text-[1.8rem] leading-none text-foreground">
              {event.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-full border border-[#e1d5c3] text-[#6d5d4d]"
          >
            <X className="size-4" />
          </button>
        </div>

        <img
          src={event.image || "/placeholder.svg"}
          alt={event.title}
          className="h-44 w-full object-cover"
        />

        <div className="space-y-5 px-5 py-5">
          <div className="grid gap-2 text-sm text-[#6f604f]">
            <div className="flex items-center gap-2">
              <Clock3 className="size-4 text-gold" />
              <span>
                {event.date} at {event.time}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-gold" />
              <span>{event.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="size-4 text-gold" />
              <span>{event.attendees} residents already planning to attend</span>
            </div>
          </div>

          <p className="text-sm leading-7 text-[#6f604f]">{event.description}</p>

          <div className="rounded-[1.5rem] border border-[#e1d5c3] bg-[#f6eee1] px-4 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
              What happens next
            </p>
            <p className="mt-2 text-sm leading-7 text-[#6f604f]">
              RSVP if you would like to attend. Once you're on the guest list, Fifth Circle can
              use the gathering as a softer first entry point for introductions that fit your rhythm.
            </p>
          </div>

          <div className="flex gap-3">
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
              disabled={submittingKey === `rsvp:${event.id}` || (!canToggle && eligibilityState !== "not_eligible" && eligibilityState !== "needs_onboarding")}
              className="inline-flex flex-1 items-center justify-center rounded-full bg-foreground px-4 py-3 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submittingKey === `rsvp:${event.id}` ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                eligibilityCopy.button
              )}
            </button>
            <button
              type="button"
              onClick={() => void onToggleInterest(event.id, !(signal?.interest ?? false))}
              disabled={submittingKey === `interest:${event.id}` || isLoadingEngagement}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-70",
                signal?.interest
                  ? "border-gold bg-gold/10 text-foreground"
                  : "border-[#e1d5c3] text-foreground",
              )}
            >
              {submittingKey === `interest:${event.id}` ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Heart className="size-4" />
                  {signal?.interest ? "Saved" : "Interested"}
                </>
              )}
            </button>
          </div>

          {isAttending ? (
            <div className="rounded-[1.6rem] border border-[#e1d5c3] bg-white px-4 py-4">
              <p className="font-serif text-xl text-foreground">After the gathering</p>
              <p className="mt-2 text-sm leading-7 text-[#6f604f]">
                Help the concierge understand what kinds of gatherings feel worth repeating.
              </p>
              <div className="mt-4 flex gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => onFeedbackChange(event.id, { rating })}
                    className={cn(
                      "flex size-10 items-center justify-center rounded-full border text-sm font-medium",
                      feedbackDraft.rating === rating
                        ? "border-gold bg-gold text-gold-foreground"
                        : "border-[#e1d5c3] text-foreground",
                    )}
                  >
                    {rating}
                  </button>
                ))}
              </div>
              <textarea
                value={feedbackDraft.detail}
                onChange={(currentEvent) =>
                  onFeedbackChange(event.id, { detail: currentEvent.target.value })
                }
                placeholder="A short note for the building team or concierge..."
                className="mt-4 min-h-24 w-full rounded-[1.4rem] border border-[#e1d5c3] bg-[#fbf6ee] px-4 py-3 text-sm text-foreground outline-none"
              />
              <button
                type="button"
                onClick={() => void onSubmitFeedback(event.id)}
                disabled={submittingKey === `feedback:${event.id}` || !feedbackDraft.rating}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submittingKey === `feedback:${event.id}` ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                Save feedback
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function CirclesView({
  circles,
  selectedCircleId,
  circleResponses,
  isSignedIn,
  accountSnapshot,
  accountLoading,
  onSelectCircle,
  onRespondToCircle,
  onSignIn,
  onCompleteProfile,
  onOpenPeople,
}: {
  circles: CirclePreview[]
  selectedCircleId: string | null
  circleResponses: Record<string, "interested" | "waitlist" | "following">
  isSignedIn: boolean
  accountSnapshot: ResidentAccountSnapshot | null
  accountLoading: boolean
  onSelectCircle: (circleId: string) => void
  onRespondToCircle: (circleId: string, response: "interested" | "waitlist" | "following") => void
  onSignIn: () => void
  onCompleteProfile: () => void
  onOpenPeople: () => void
}) {
  const selectedCircle = circles.find((circle) => circle.id === selectedCircleId) ?? circles[0] ?? null
  const needsOnboarding = Boolean(accountSnapshot?.needsSurveyCompletion)
  const hasResidentAccess = Boolean(
    isSignedIn && accountSnapshot?.status === "active" && accountSnapshot.hasActiveMembership,
  )

  function renderCircleAction(circle: CirclePreview) {
    const response = circleResponses[circle.id]

    if (!isSignedIn) {
      return (
        <button
          type="button"
          onClick={onSignIn}
          className="inline-flex items-center justify-center rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background"
        >
          Sign in to join circles
        </button>
      )
    }

    if (accountLoading) {
      return (
        <div className="inline-flex items-center gap-2 rounded-full border border-[#ded1bf] bg-white px-4 py-2.5 text-sm text-[#7b6b59]">
          <Loader2 className="size-4 animate-spin" />
          Checking access
        </div>
      )
    }

    if (!hasResidentAccess) {
      return (
        <div className="inline-flex items-center rounded-full border border-[#ded1bf] bg-white px-4 py-2.5 text-sm text-[#7b6b59]">
          Building access required first
        </div>
      )
    }

    if (needsOnboarding) {
      return (
        <button
          type="button"
          onClick={onCompleteProfile}
          className="inline-flex items-center justify-center rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background"
        >
          Complete profile for better circle fit
        </button>
      )
    }

    if (response === "interested") {
      return (
        <div className="rounded-[1.3rem] border border-gold/35 bg-[#f6ecdf] px-4 py-3 text-sm text-[#6a5847]">
          <div className="inline-flex items-center gap-2 font-medium">
            <Check className="size-4 text-gold" />
            Marked in this preview
          </div>
          <p className="mt-1 leading-6 text-[#756452]">
            This helps you keep track of circles that feel promising. It does not create a saved membership yet.
          </p>
        </div>
      )
    }

    if (response === "waitlist") {
      return (
        <div className="rounded-[1.3rem] border border-gold/35 bg-[#f6ecdf] px-4 py-3 text-sm text-[#6a5847]">
          <div className="inline-flex items-center gap-2 font-medium">
            <Clock3 className="size-4 text-gold" />
            Strong future-circle signal
          </div>
          <p className="mt-1 leading-6 text-[#756452]">
            This is still a pilot preview. Fifth Circle has not created a live waitlist or group membership here.
          </p>
        </div>
      )
    }

    if (response === "following") {
      return (
        <div className="rounded-[1.3rem] border border-[#ded1bf] bg-white px-4 py-3 text-sm text-[#7b6b59]">
          <div className="inline-flex items-center gap-2 font-medium">
            <Heart className="size-4 text-gold" />
            Saved as a circle to watch
          </div>
          <p className="mt-1 leading-6 text-[#756452]">
            This is only held inside your current preview session while circles remain an emerging pilot experience.
          </p>
        </div>
      )
    }

    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onRespondToCircle(circle.id, "interested")}
          className="inline-flex items-center justify-center rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background"
        >
          Mark as a likely fit
        </button>
        <button
          type="button"
          onClick={() => onOpenPeople()}
          className="inline-flex items-center justify-center rounded-full border border-[#e1d5c3] bg-white px-4 py-2.5 text-sm font-medium text-foreground"
        >
          Compare with introductions
        </button>
      </div>
    )
  }

  return (
    <div className="mt-6 space-y-5 px-6">
      <div className="rounded-[1.9rem] border border-[#e1d5c3] bg-[#fbf6ee] px-5 py-5 shadow-[0_20px_48px_-40px_rgba(70,56,35,0.28)]">
        <SectionLabel>Small group moments</SectionLabel>
        <h2 className="font-serif text-[1.8rem] leading-[1.02] text-foreground">
          Circles are where a few right people begin to feel obvious.
        </h2>
        <p className="mt-3 text-sm leading-7 text-[#6f604f]">
          Unlike a published gathering or a one-to-one introduction, circles are the quieter middle ground: a few residents who seem likely to enjoy the same rhythm, conversation, or recurring activity.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <CircleSignal
            label="How circles begin"
            value="Shared rhythm"
            detail="We look for overlap in interests, timing, and how residents prefer to connect."
          />
          <CircleSignal
            label="How they feel"
            value="Small and intentional"
            detail="Circles should feel low-pressure, warm, and easy to say yes to."
          />
          <CircleSignal
            label="What happens next"
            value="Concierge-led review"
            detail="The strongest circles can become introductions, private meetups, or later gatherings."
          />
        </div>
      </div>

      <div className="rounded-[1.7rem] border border-[#eadfce] bg-[linear-gradient(135deg,#fbf6ee_0%,#f6ecdf_100%)] px-5 py-5 shadow-[0_20px_48px_-44px_rgba(70,56,35,0.26)]">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">Circle guidance</p>
        <p className="mt-2 font-serif text-[1.35rem] leading-tight text-foreground">
          The best circles begin with a shared mood, not a crowded group.
        </p>
        <p className="mt-3 text-sm leading-7 text-[#6f604f]">
          We use these early signals to notice where a few residents may genuinely enjoy the same kind of conversation, timing, or recurring activity. Nothing public happens automatically. The concierge still shapes what becomes real.
        </p>
      </div>

      {!isSignedIn || !hasResidentAccess || needsOnboarding ? (
        <div className="rounded-[1.7rem] border border-[#eadfce] bg-[#f8f1e7] px-5 py-5 shadow-[0_18px_40px_-40px_rgba(70,56,35,0.26)]">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">Before circles open up</p>
          <p className="mt-2 font-serif text-[1.35rem] leading-tight text-foreground">
            Circles get better when your profile is complete and your access is active.
          </p>
          <p className="mt-3 text-sm leading-7 text-[#6f604f]">
            {needsOnboarding
              ? "Finish onboarding so Fifth Circle can shape small groups around your real interests, timing, and social style."
              : !hasResidentAccess && isSignedIn
                ? "Once your building access is fully active, you will be able to raise your hand for the circles that feel most natural."
                : "Sign in with your building email to see which smaller group moments are beginning to form around you."}
          </p>
        </div>
      ) : null}

      <div className="mt-5 space-y-4">
        {circles.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Circles are still forming."
            description={
              needsOnboarding
                ? "Complete your profile first and we will begin looking for smaller circles shaped by your pace, interests, and the kind of people you would genuinely enjoy meeting."
                : "We are still looking for the right small-group signal. As more residents complete onboarding, Fifth Circle will begin suggesting circles built around shared timing, interests, and social style."
            }
            actionLabel={needsOnboarding ? "Complete profile" : "Open introductions"}
            onAction={needsOnboarding ? onCompleteProfile : onOpenPeople}
          />
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                {circles.map((circle) => {
                  const isSelected = selectedCircle?.id === circle.id

                  return (
                    <article
                      key={circle.id}
                      className={cn(
                        "rounded-[1.9rem] border bg-[#fbf6ee] px-5 py-5 shadow-[0_22px_50px_-42px_rgba(70,56,35,0.28)] transition-colors",
                        isSelected ? "border-gold/45" : "border-[#e1d5c3]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
                            {circle.subtitle}
                          </p>
                          <h3 className="mt-2 font-serif text-[1.9rem] leading-[1.02] text-foreground">
                            {circle.title}
                          </h3>
                          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#8a7966]">
                            {circle.typeLabel}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-3 py-1 text-[11px]",
                            circle.statusTone === "waitlist"
                              ? "bg-[#efe2cd] text-[#816743]"
                              : circle.statusTone === "ready"
                                ? "bg-[#ece5d7] text-[#6f604f]"
                                : "bg-white text-[#7b6b59]",
                          )}
                        >
                          {circle.membersLabel}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-[#6f604f]">{circle.reason}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full border border-[#e3d8c7] bg-white px-3 py-1 text-[11px] text-[#756656]">
                          {circle.statusLabel}
                        </span>
                        <span className="rounded-full border border-[#e3d8c7] bg-white px-3 py-1 text-[11px] text-[#756656]">
                          {circle.typeLabel}
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectCircle(circle.id)}
                          className="inline-flex items-center justify-center rounded-full border border-[#e1d5c3] bg-white px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-gold/40"
                        >
                          {isSelected ? "Circle in focus" : "Review circle"}
                        </button>
                        <button
                          type="button"
                          onClick={onOpenPeople}
                          className="inline-flex items-center justify-center rounded-full border border-[#e1d5c3] bg-transparent px-4 py-2.5 text-sm font-medium text-[#6f604f] transition-colors hover:border-gold/40"
                        >
                          Compare with introductions
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>

              {selectedCircle ? (
                <div className="rounded-[1.9rem] border border-[#e1d5c3] bg-[#fbf6ee] px-5 py-5 shadow-[0_22px_50px_-42px_rgba(70,56,35,0.28)] lg:sticky lg:top-5 lg:self-start">
                  <SectionLabel>Circle in focus</SectionLabel>
                  <h3 className="font-serif text-[1.9rem] leading-[1.02] text-foreground">
                    {selectedCircle.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[#6f604f]">{selectedCircle.bestFor}</p>

                  <div className="mt-4 rounded-[1.4rem] border border-[#e9dece] bg-[#f7f0e5] px-4 py-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">Suggested first moment</p>
                    <p className="mt-2 text-sm leading-7 text-[#6f604f]">{selectedCircle.suggestedMoment}</p>
                  </div>

                  <div className="mt-4 rounded-[1.4rem] border border-[#e9dece] bg-white px-4 py-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">What happens next</p>
                    <p className="mt-2 text-sm leading-7 text-[#6f604f]">{selectedCircle.nextStep}</p>
                  </div>

                  <div className="mt-4 rounded-[1.4rem] border border-[#e9dece] bg-white px-4 py-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">Privacy note</p>
                    <p className="mt-2 text-sm leading-7 text-[#6f604f]">{selectedCircle.privacyNote}</p>
                  </div>

                  <div className="mt-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
                      Likely fit
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedCircle.memberNames.map((name) => (
                        <span
                          key={name}
                          className="rounded-full border border-[#e3d8c7] bg-white px-3 py-1 text-[11px] text-[#756656]"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5">{renderCircleAction(selectedCircle)}</div>
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function SuggestionsView({
  isEligible,
  proposals,
  proposalTitle,
  proposalDetail,
  eventPolls,
  localVotes,
  submittingKey,
  isSignedIn,
  accountSnapshot,
  accountLoading,
  onProposalTitleChange,
  onProposalDetailChange,
  onSubmitProposal,
  onToggleVote,
  onSignIn,
  onCompleteProfile,
}: {
  isEligible: boolean
  proposals: ResidentEventProposal[]
  proposalTitle: string
  proposalDetail: string
  eventPolls: CommunityPoll[]
  localVotes: Record<string, boolean>
  submittingKey: string | null
  isSignedIn: boolean
  accountSnapshot: ResidentAccountSnapshot | null
  accountLoading: boolean
  onProposalTitleChange: (value: string) => void
  onProposalDetailChange: (value: string) => void
  onSubmitProposal: () => Promise<void>
  onToggleVote: (pollId: string) => void
  onSignIn: () => void
  onCompleteProfile: () => void
}) {
  return (
    <div className="mt-6 space-y-6 px-6">
      <div className="rounded-[1.9rem] border border-[#e1d5c3] bg-[#fbf6ee] px-5 py-5 shadow-[0_22px_50px_-42px_rgba(70,56,35,0.28)]">
        <SectionLabel>Community ideas</SectionLabel>
        <h2 className="font-serif text-[1.9rem] leading-[1.02] text-foreground">
          Good building culture is shaped in small suggestions.
        </h2>
        <p className="mt-3 text-sm leading-7 text-[#6f604f]">
          This is where resident energy turns into actual programming. Some ideas stay quietly between you and management. Others become visible signals the community can help strengthen.
        </p>
      </div>

      <div className="rounded-[1.9rem] border border-[#e1d5c3] bg-[#fbf6ee] px-5 py-5 shadow-[0_22px_50px_-42px_rgba(70,56,35,0.28)]">
        <SectionLabel>Suggest a gathering</SectionLabel>
        <h2 className="font-serif text-[1.9rem] leading-[1.02] text-foreground">
          What should this community gather around next?
        </h2>
        <p className="mt-3 text-sm leading-7 text-[#6f604f]">
          Share a simple idea and let the concierge or building team shape it into something residents would genuinely want to attend.
        </p>
        <div className="mt-4 rounded-[1.5rem] border border-[#e9dece] bg-[#f7f0e5] px-4 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
            How ideas move
          </p>
          <p className="mt-2 text-sm leading-7 text-[#6f604f]">
            Residents suggest an idea, the community adds support if it feels exciting, and the building team or concierge can turn the strongest signals into real programming.
          </p>
        </div>

        {!isEligible ? (
          <div className="mt-4 rounded-[1.5rem] border border-[#ded1bf] bg-[#efe6d8] px-4 py-4 text-sm text-[#6f604f]">
            {accountLoading
              ? "Checking resident access..."
              : "Once your building access is active, you can suggest gatherings and help shape the next calendar."}
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          <input
            value={proposalTitle}
            onChange={(event) => onProposalTitleChange(event.target.value)}
            placeholder="Rooftop coffee hour, tennis meet-up, founder breakfast..."
            className="w-full rounded-[1.4rem] border border-[#e1d5c3] bg-white px-4 py-3 text-sm text-foreground outline-none"
          />
          <textarea
            value={proposalDetail}
            onChange={(event) => onProposalDetailChange(event.target.value)}
            placeholder="A quick note on why this would feel worthwhile for residents."
            className="min-h-24 w-full rounded-[1.4rem] border border-[#e1d5c3] bg-white px-4 py-3 text-sm text-foreground outline-none"
          />
        </div>

        <button
          type="button"
          onClick={() => void onSubmitProposal()}
          disabled={submittingKey === "proposal" || !proposalTitle.trim() || !isEligible}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submittingKey === "proposal" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <MessageCircleHeart className="size-4" />
          )}
          Submit proposal
        </button>
      </div>

      <div className="rounded-[1.9rem] border border-[#e1d5c3] bg-[#fbf6ee] px-5 py-5 shadow-[0_22px_50px_-42px_rgba(70,56,35,0.28)]">
        <SectionLabel>Your proposed gatherings</SectionLabel>
        {proposals.length === 0 ? (
          <p className="text-sm leading-7 text-[#6f604f]">
            Nothing proposed yet. A strong resident idea can be as simple as a recurring coffee hour,
            a tennis meetup, or a quieter conversation night in the lounge.
          </p>
        ) : (
          <div className="space-y-3">
            {proposals.map((proposal) => (
              <div
                key={proposal.id}
                className="rounded-[1.4rem] border border-[#e9dece] bg-[#f7f0e5] px-4 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-serif text-xl text-foreground">{proposal.title}</p>
                    <p className="mt-1 text-xs text-[#8b7c6a]">
                      Submitted {formatDateLabel(proposal.createdAt)}
                    </p>
                  </div>
                  <span className="rounded-full bg-gold/10 px-3 py-1 text-[11px] text-foreground">
                    {proposal.status}
                  </span>
                </div>
                {proposal.detail ? (
                  <p className="mt-3 text-sm leading-7 text-[#6f604f]">{proposal.detail}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-[1.9rem] border border-[#e1d5c3] bg-[#fbf6ee] px-5 py-5 shadow-[0_22px_50px_-42px_rgba(70,56,35,0.28)]">
        <SectionLabel>Community interest board</SectionLabel>
        <p className="mb-4 text-sm leading-7 text-[#6f604f]">
          Add your signal to the kinds of gatherings you would actually step out for.
        </p>
        <div className="space-y-3">
          {eventPolls.map((poll) => {
            const isVoted = localVotes[poll.id]
            const votes = poll.votes + (isVoted ? 1 : 0)
            const percent = Math.min(100, poll.percent + (isVoted ? 2 : 0))
            return (
              <div
                key={poll.id}
                className="flex items-center gap-4 rounded-[1.5rem] border border-[#e9dece] bg-[#f7f0e5] px-4 py-4"
              >
                <img
                  src={poll.image || "/placeholder.svg"}
                  alt={poll.title}
                  className="size-14 rounded-[1rem] object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-xl text-foreground">{poll.title}</p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#e9dcc9]">
                    <div
                      className="h-full rounded-full bg-gold transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-[#7d6e5e]">{votes} residents interested</p>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleVote(poll.id)}
                  className={cn(
                    "rounded-full border px-3 py-2 text-xs font-medium",
                    isVoted
                      ? "border-gold bg-gold text-gold-foreground"
                      : "border-[#e1d5c3] text-foreground",
                  )}
                >
                  {isVoted ? "Added" : "Support"}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <ResidentEventSuggestions
        isSignedIn={isSignedIn}
        accountSnapshot={accountSnapshot}
        accountLoading={accountLoading}
        onSignIn={onSignIn}
        onCompleteProfile={onCompleteProfile}
      />
    </div>
  )
}

function CircleSignal({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="rounded-[1.3rem] border border-[#e7dccd] bg-[#f7f0e5] px-4 py-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">{label}</p>
      <p className="mt-2 font-serif text-xl text-foreground">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[#6f604f]">{detail}</p>
    </div>
  )
}

function CommunityMetric({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="rounded-[1.35rem] border border-[#e8ddce] bg-[#f7f0e5] px-4 py-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">{label}</p>
      <p className="mt-2 font-serif text-[1.6rem] leading-none text-foreground">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[#6f604f]">{detail}</p>
    </div>
  )
}
