"use client"

import {
  Check,
  CheckCheck,
  Clock3,
  Loader2,
  PauseCircle,
  Sparkles,
  UserRoundCheck,
  Users,
  X,
} from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { SectionLabel } from "@/components/screen-header"
import {
  formatAvailabilitySummaryLabel,
  formatConnectionStyleLabel,
} from "@/lib/concierge-data"
import type { Resident } from "@/lib/concierge-data"
import type { ResidentIntroductionCard } from "@/lib/resident-introduction-ui"
import { canScheduleIntroduction } from "@/lib/resident-introduction-ui"

function isPositiveDecision(decision: ResidentIntroductionCard["currentResidentDecision"]) {
  return decision === "accepted" || decision === "requested"
}

function canRespond(card: ResidentIntroductionCard) {
  if (!card.introductionId) return false
  if (
    card.status === "delivered" ||
    card.status === "mutual" ||
    card.status === "scheduled" ||
    card.status === "completed" ||
    card.status === "declined" ||
    card.status === "paused"
  ) {
    return false
  }
  return (
    !isPositiveDecision(card.currentResidentDecision) &&
    isPositiveDecision(card.otherResidentDecision)
  )
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function getMeetLoopState(card: ResidentIntroductionCard) {
  if (card.status === "completed") {
    return {
      label: "Meetup completed",
      description: "You met. The next step is simply reflecting on how it felt.",
      icon: CheckCheck,
    }
  }

  if (card.status === "scheduled") {
    return {
      label: "Meetup confirmed",
      description: "A first meetup has been set. Now it is simply time to show up.",
      icon: UserRoundCheck,
    }
  }

  if (card.status === "delivered") {
    return {
      label: "Concierge coordinating",
      description:
        "The introduction has been delivered privately and the first meetup can now take shape.",
      icon: UserRoundCheck,
    }
  }

  if (card.status === "mutual") {
    return {
      label: "Mutual interest confirmed",
      description:
        "You both said yes. The concierge can now help turn this into a real first meeting.",
      icon: Sparkles,
    }
  }

  if (
    card.status === "accepted" ||
    (card.status === "requested" && isPositiveDecision(card.currentResidentDecision))
  ) {
    return {
      label: "Waiting on other resident",
      description: "You are in. We are quietly waiting on the other resident.",
      icon: Check,
    }
  }

  if (canRespond(card)) {
    return {
      label: "Introduction available",
      description:
        "This resident would like an introduction. Review the fit, then accept, pause, or decline.",
      icon: Sparkles,
    }
  }

  if (card.status === "paused") {
    return {
      label: "Paused",
      description: "This introduction is paused for now. Nothing further is shared.",
      icon: PauseCircle,
    }
  }

  if (card.status === "declined") {
    return {
      label: "Closed",
      description: "This introduction has been quietly closed.",
      icon: X,
    }
  }

  if (card.requestedByCurrentResident) {
    return {
      label: "Preparing introduction",
      description:
        "Your request is in motion. We will open the next step once there is mutual interest.",
      icon: Clock3,
    }
  }

  return {
    label: "Preparing introduction",
    description:
      "A thoughtful introduction shaped around shared goals, timing, and the kind of first interaction likely to feel natural.",
    icon: Sparkles,
  }
}

export function PeopleScreen({
  onSchedule,
  onRequestIntroduction,
  onRespondToIntroduction,
  introductions,
  isLoading,
  actionResidentId,
  actionError,
}: {
  onSchedule: (
    resident: Resident,
    meetupRecommendation?: ResidentIntroductionCard["meetupRecommendation"],
  ) => void
  onRequestIntroduction: (residentId: string) => void
  onRespondToIntroduction: (
    residentId: string,
    introductionId: string,
    action: "accepted" | "declined" | "paused",
  ) => void
  introductions: ResidentIntroductionCard[]
  isLoading: boolean
  actionResidentId: string | null
  actionError: string | null
}) {
  return (
    <div className="space-y-8">
      <section className="rounded-[2.25rem] border border-[#e0d5c6] bg-[#fbf6ee] px-6 py-8 shadow-[0_24px_70px_-54px_rgba(50,39,25,0.28)] sm:px-8 lg:px-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-gold">
          Chosen for you
        </p>
        <h1 className="mt-3 font-serif text-[2.7rem] leading-[0.94] text-foreground sm:text-[3.15rem]">
          Neighbors worth meeting.
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-8 text-[#6e5d4a]">
          A short, considered list, not a directory. Sensitive details stay private until there is
          mutual interest and the next step feels natural.
        </p>
      </section>

      {actionError ? (
        <div className="rounded-[1.6rem] border border-destructive/20 bg-destructive/5 px-5 py-4 text-sm text-destructive">
          {actionError}
        </div>
      ) : null}

      {!isLoading && introductions.length === 0 ? (
        <EmptyState
          icon={Users}
          title="We’re looking for thoughtful introductions for you."
          description="As more residents join the community, Fifth Circle will recommend people who share your interests, goals, and social rhythm."
        />
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        {introductions.map((card) => {
          const resident = card.resident
          const meetLoopState = getMeetLoopState(card)
          const StatusIcon = meetLoopState.icon
          const isActionLoading = actionResidentId === resident.id

          return (
            <article
              key={`${resident.id}-${card.status}-${card.introductionId ?? "suggested"}`}
              className="rounded-[1.9rem] border border-[#e0d5c6] bg-white px-5 py-5 shadow-[0_22px_52px_-46px_rgba(63,50,34,0.22)]"
            >
              <div className="flex items-start gap-4">
                <div className="relative shrink-0">
                  {resident.photo ? (
                    <img
                      src={resident.photo}
                      alt={resident.name}
                      className="size-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex size-14 items-center justify-center rounded-full border border-gold/30 bg-[#f3eadb] font-serif text-lg text-gold">
                      {getInitials(resident.name)}
                    </div>
                  )}
                  <div className="pointer-events-none absolute -inset-1 rounded-full border border-gold/25" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-serif text-[1.5rem] leading-none text-foreground">
                    {resident.name}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-[#9b8770]">
                    {resident.recognitionCue || resident.unit}
                    {resident.occupation ? ` · ${resident.occupation}` : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {resident.interests.slice(0, 3).map((interest) => (
                      <span
                        key={interest}
                        className="rounded-full border border-gold/25 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-gold"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-[1.35rem] border border-[#ece1d2] bg-[#f8f0e4] px-4 py-4">
                <div className="flex items-center gap-2 text-[#6f5938]">
                  <StatusIcon className="size-4" />
                  <p className="text-[11px] uppercase tracking-[0.22em]">{meetLoopState.label}</p>
                </div>
                <p className="mt-2 text-sm leading-7 text-[#6e5d4a]">
                  {meetLoopState.description}
                </p>
              </div>

              <div className="mt-5">
                <SectionLabel>Why this fits</SectionLabel>
                <p className="font-serif text-[1.18rem] leading-8 text-[#564939]">
                  {card.compatibilitySummary || resident.tagline}
                </p>
              </div>

              {resident.compatibilityDetails?.length ? (
                <ul className="mt-4 space-y-2 text-sm leading-7 text-[#6d5c49]">
                  {resident.compatibilityDetails.slice(0, 3).map((detail) => (
                    <li key={detail}>• {detail}</li>
                  ))}
                </ul>
              ) : null}

              {card.sharedConnectionStyles.length > 0 || card.sharedAvailability.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {card.sharedConnectionStyles.slice(0, 2).map((style) => (
                    <span
                      key={style}
                      className="rounded-full bg-[#f3eadc] px-3 py-1 text-[11px] text-[#8a7b6a]"
                    >
                      {formatConnectionStyleLabel(style)}
                    </span>
                  ))}
                  {card.sharedAvailability.slice(0, 2).map((availability) => (
                    <span
                      key={availability}
                      className="rounded-full bg-[#f3eadc] px-3 py-1 text-[11px] text-[#8a7b6a]"
                    >
                      {formatAvailabilitySummaryLabel(availability)}
                    </span>
                  ))}
                </div>
              ) : null}

              {card.meetupRecommendation ? (
                <div className="mt-4 rounded-[1.35rem] border border-[#ece1d2] bg-[#f7f0e5] px-4 py-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
                    Suggested meetup
                  </p>
                  <p className="mt-2 font-serif text-[1.2rem] text-foreground">
                    {card.meetupRecommendation.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#70604f]">
                    {card.meetupRecommendation.amenityLabel}
                    {card.meetupRecommendation.timingLabel
                      ? ` · ${card.meetupRecommendation.timingLabel}`
                      : ""}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[#6e5d4a]">
                    {card.meetupRecommendation.reason}
                  </p>
                </div>
              ) : null}

              <div className="mt-5 border-t border-[#eee4d6] pt-4">
                {card.status === "suggested" && !card.introductionId ? (
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => onRequestIntroduction(resident.id)}
                      disabled={isActionLoading}
                      className="text-[10px] uppercase tracking-[0.26em] text-foreground underline decoration-[#2b241d] underline-offset-4 disabled:opacity-70"
                    >
                      {isActionLoading ? "Preparing..." : "Accept introduction"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRequestIntroduction(resident.id)}
                      disabled={isActionLoading}
                      className="text-[10px] uppercase tracking-[0.22em] text-[#93806b] disabled:opacity-70"
                    >
                      Not now
                    </button>
                  </div>
                ) : canRespond(card) && card.introductionId ? (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() =>
                        onRespondToIntroduction(resident.id, card.introductionId!, "accepted")
                      }
                      disabled={isActionLoading}
                      className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.26em] text-foreground underline decoration-[#2b241d] underline-offset-4 disabled:opacity-70"
                    >
                      {isActionLoading ? <Loader2 className="size-4 animate-spin" /> : null}
                      Accept introduction
                    </button>

                    <div className="flex gap-5">
                      <button
                        type="button"
                        onClick={() =>
                          onRespondToIntroduction(resident.id, card.introductionId!, "paused")
                        }
                        disabled={isActionLoading}
                        className="text-[10px] uppercase tracking-[0.22em] text-[#93806b] disabled:opacity-70"
                      >
                        Pause
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onRespondToIntroduction(resident.id, card.introductionId!, "declined")
                        }
                        disabled={isActionLoading}
                        className="text-[10px] uppercase tracking-[0.22em] text-[#93806b] disabled:opacity-70"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ) : canScheduleIntroduction(card) ? (
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => onSchedule(resident, card.meetupRecommendation)}
                      className="text-[10px] uppercase tracking-[0.26em] text-foreground underline decoration-[#2b241d] underline-offset-4"
                    >
                      Review suggested meetup
                    </button>
                    <span className="text-[10px] uppercase tracking-[0.22em] text-[#93806b]">
                      Private introduction
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#93806b]">
                    {isLoading || isActionLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Clock3 className="size-4" />
                    )}
                    {card.requestedByCurrentResident ||
                    isPositiveDecision(card.currentResidentDecision)
                      ? `Waiting on ${resident.name.split(" ")[0]}`
                      : "Preparing the next step"}
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
