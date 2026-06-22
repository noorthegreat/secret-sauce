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
import { ScreenHeader, SectionLabel } from "@/components/screen-header"
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

function getMeetLoopState(card: ResidentIntroductionCard) {
  if (card.status === "completed") {
    return {
      label: "Meetup completed",
      description: "You met. The next step is simply reflecting on how it felt.",
      tone: "success" as const,
      icon: CheckCheck,
    }
  }

  if (card.status === "scheduled") {
    return {
      label: "Meetup confirmed",
      description:
        "A first meetup has been set. You can now simply show up and see how the conversation feels.",
      tone: "success" as const,
      icon: UserRoundCheck,
    }
  }

  if (card.status === "delivered") {
    return {
      label: "Concierge coordinating",
      description:
        "The introduction has been delivered privately. The next step is reviewing the suggested meetup and settling on a simple first plan.",
      tone: "pending" as const,
      icon: UserRoundCheck,
    }
  }

  if (card.status === "mutual") {
    return {
      label: "Mutual interest confirmed",
      description:
        "You both said yes. The concierge can now turn this into a real introduction and suggest a first meetup.",
      tone: "pending" as const,
      icon: Clock3,
    }
  }

  if (
    card.status === "accepted" ||
    (card.status === "requested" && isPositiveDecision(card.currentResidentDecision))
  ) {
    return {
      label: "Waiting on other resident",
      description:
        "You are in. We are waiting on the other resident before anything further is shared.",
      tone: "pending" as const,
      icon: Check,
    }
  }

  if (canRespond(card)) {
    return {
      label: "Introduction available",
      description:
        "This resident would like an introduction. Review the fit, then accept, pause, or decline.",
      tone: "attention" as const,
      icon: Sparkles,
    }
  }

  if (card.status === "paused") {
    return {
      label: "Paused",
      description: "This introduction is paused for now. Nothing is shared further.",
      tone: "muted" as const,
      icon: PauseCircle,
    }
  }

  if (card.status === "declined") {
    return {
      label: "Closed",
      description: "This introduction has been quietly closed.",
      tone: "muted" as const,
      icon: X,
    }
  }

  if (card.requestedByCurrentResident) {
    return {
      label: "Preparing introduction",
      description:
        "Your request is in motion. We will open the next step once there is mutual interest.",
      tone: "pending" as const,
      icon: Clock3,
    }
  }

  return {
    label: "Preparing introduction",
    description:
      "A private, building-scoped introduction shaped around shared goals, timing, and social fit.",
    tone: "suggested" as const,
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
    <div className="h-full overflow-y-auto bg-[#f6eee1] pb-28">
      <div className="pt-3">
        <ScreenHeader eyebrow="Chosen for you" title="Neighbors worth meeting." />
        <p className="mt-2 px-6 text-sm leading-relaxed text-[#726353]">
          A short, considered list, not a directory. Sensitive details stay private until mutual
          interest opens the next step.
        </p>
      </div>

      {actionError ? (
        <div className="mt-5 px-6">
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {actionError}
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-4 px-6">
        {!isLoading && introductions.length === 0 ? (
          <EmptyState
            icon={Users}
            title="We’re looking for thoughtful introductions for you."
            description="As more residents join the community, we’ll recommend people who share your interests, goals, and social rhythm."
          />
        ) : null}

        {introductions.map((card) => {
          const meetLoopState = getMeetLoopState(card)
          const isActionLoading = actionResidentId === card.resident.id
          const StatusIcon = meetLoopState.icon

          return (
            <article
              key={`${card.resident.id}-${card.status}-${card.introductionId ?? "suggested"}`}
              className="rounded-[1.9rem] border border-[#e1d5c3] bg-[#fbf6ee] p-4 shadow-[0_26px_60px_-48px_rgba(70,56,35,0.34)]"
            >
              <div className="flex items-start gap-3">
                <img
                  src={card.resident.photo || "/placeholder.svg"}
                  alt={card.resident.name}
                  className="size-14 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-xl leading-tight text-foreground">
                    {card.resident.name}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[#a28363]">
                    {card.resident.recognitionCue || card.resident.unit}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#655645]">
                    {card.resident.occupation
                      ? `${card.resident.occupation}. ${card.resident.tagline}`
                      : card.resident.tagline}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-[1.4rem] border border-[#e2d6c3] bg-[#f7f0e5] px-4 py-3">
                <div className="flex items-center gap-2 font-medium text-[#6f5938]">
                  <StatusIcon className="size-4" />
                  {meetLoopState.label}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-[#6f604f]">
                  {meetLoopState.description}
                </p>
              </div>

              <div className="mt-4">
                <SectionLabel>Why this fits</SectionLabel>
                <p className="text-sm leading-7 text-[#655645]">
                  {card.compatibilitySummary || card.resident.tagline}
                </p>
              </div>

              {card.resident.compatibilityDetails?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {card.resident.compatibilityDetails.slice(0, 4).map((detail) => (
                    <span
                      key={detail}
                      className="rounded-full border border-[#e2d6c3] px-3 py-1 text-[11px] text-[#846d53]"
                    >
                      {detail}
                    </span>
                  ))}
                </div>
              ) : null}

              {card.sharedConnectionStyles.length > 0 || card.sharedAvailability.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
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
                <div className="mt-4 rounded-[1.4rem] border border-[#e4d8c6] bg-[#f7f0e5] px-4 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-gold">
                    Suggested meetup
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {card.meetupRecommendation.title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-[#655645]">
                    {card.meetupRecommendation.amenityLabel}
                    {card.meetupRecommendation.timingLabel
                      ? ` · ${card.meetupRecommendation.timingLabel}`
                      : ""}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[#6f604f]">
                    {card.meetupRecommendation.reason}
                  </p>
                </div>
              ) : null}

              <div className="mt-4">
                {card.status === "suggested" && !card.introductionId ? (
                  <button
                    type="button"
                    onClick={() => onRequestIntroduction(card.resident.id)}
                    disabled={isActionLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-[#2b241d] bg-[#231d17] py-3 text-sm font-medium tracking-[0.18em] text-[#f3ebdc] disabled:opacity-70"
                  >
                    {isActionLoading ? <Loader2 className="size-4 animate-spin" /> : null}
                    Request introduction
                  </button>
                ) : canRespond(card) && card.introductionId ? (
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        onRespondToIntroduction(card.resident.id, card.introductionId!, "accepted")
                      }
                      disabled={isActionLoading}
                      className="flex w-full items-center justify-center gap-2 rounded-full border border-[#2b241d] bg-[#231d17] py-3 text-sm font-medium tracking-[0.18em] text-[#f3ebdc] disabled:opacity-70"
                    >
                      {isActionLoading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Check className="size-4" />
                      )}
                      Accept introduction
                    </button>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          onRespondToIntroduction(card.resident.id, card.introductionId!, "declined")
                        }
                        disabled={isActionLoading}
                        className="flex items-center justify-center gap-2 rounded-full border border-[#d7c9b4] bg-[#f6eee1] py-3 text-sm font-medium text-foreground disabled:opacity-70"
                      >
                        <X className="size-4" />
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onRespondToIntroduction(card.resident.id, card.introductionId!, "paused")
                        }
                        disabled={isActionLoading}
                        className="flex items-center justify-center gap-2 rounded-full border border-[#d7c9b4] bg-[#f6eee1] py-3 text-sm font-medium text-foreground disabled:opacity-70"
                      >
                        <PauseCircle className="size-4" />
                        Pause
                      </button>
                    </div>
                  </div>
                ) : canScheduleIntroduction(card) ? (
                  <button
                    type="button"
                    onClick={() => onSchedule(card.resident, card.meetupRecommendation)}
                    className="w-full rounded-full border border-[#2b241d] bg-[#231d17] py-3 text-sm font-medium tracking-[0.18em] text-[#f3ebdc]"
                  >
                    Review suggested meetup
                  </button>
                ) : card.status === "completed" ? (
                  <div className="flex w-full items-center justify-center gap-2 rounded-full border border-[#e1d5c3] bg-[#f5efe6] py-3 text-sm font-medium text-[#8a7b6a]">
                    <CheckCheck className="size-4" />
                    Meetup completed
                  </div>
                ) : (
                  <div className="flex w-full items-center justify-center gap-2 rounded-full border border-[#e1d5c3] bg-[#f5efe6] py-3 text-sm font-medium text-[#8a7b6a]">
                    {isLoading || isActionLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Clock3 className="size-4" />
                    )}
                    {card.requestedByCurrentResident ||
                    isPositiveDecision(card.currentResidentDecision)
                      ? `Waiting on ${card.resident.name.split(" ")[0]}`
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
