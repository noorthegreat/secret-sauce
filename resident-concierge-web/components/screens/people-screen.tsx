"use client"

import { Check, Clock, Loader2, PauseCircle, Sparkles, UserRoundCheck, Users, X } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { ScreenHeader } from "@/components/screen-header"
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
  if (card.status === "delivered" || card.status === "mutual" || card.status === "declined" || card.status === "paused") {
    return false
  }
  return !isPositiveDecision(card.currentResidentDecision) && isPositiveDecision(card.otherResidentDecision)
}

function getStatusCopy(card: ResidentIntroductionCard) {
  if (canScheduleIntroduction(card)) {
    return {
      label: card.status === "delivered" ? "Concierge intro sent" : "Mutual interest",
      tone: "success" as const,
      description:
        card.status === "delivered"
          ? "Your concierge has shared the introduction. You can now arrange the meetup."
          : "You both said yes. The next step is choosing the right first meetup.",
    }
  }

  if (card.status === "declined") {
    return {
      label: "Declined",
      tone: "muted" as const,
      description: "This introduction has been quietly closed.",
    }
  }

  if (card.status === "paused") {
    return {
      label: "Paused",
      tone: "muted" as const,
      description: "This introduction is paused for now.",
    }
  }

  if (canRespond(card)) {
    return {
      label: "Requested you",
      tone: "attention" as const,
      description: "This resident would like an introduction. You can accept, decline, or pause it.",
    }
  }

  if (card.status === "requested" || card.status === "accepted") {
    return {
      label: card.requestedByCurrentResident ? "Awaiting response" : "Accepted by you",
      tone: "pending" as const,
      description: card.requestedByCurrentResident
        ? "Your request has been sent. We will unlock the meetup once they accept."
        : "You are in. We are waiting for the other resident to confirm.",
    }
  }

  return {
    label: "Suggested for you",
    tone: "suggested" as const,
    description: "A private, building-scoped introduction based on shared interests and goals.",
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
        <ScreenHeader eyebrow="Introductions" title="Activity" accent="Matches." />
        <p className="mt-2 px-6 text-sm leading-relaxed text-[#726353]">
          A short, considered list of neighbors. Private details stay hidden until there is mutual interest.
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
            description="As more residents join the community, we’ll recommend people who share your interests and goals."
          />
        ) : null}

        {introductions.map((card) => {
          const statusCopy = getStatusCopy(card)
          const isActionLoading = actionResidentId === card.resident.id

          return (
            <article
              key={card.resident.id}
              className="rounded-[1.8rem] border border-[#e1d5c3] bg-[#fbf6ee] p-4 shadow-[0_26px_60px_-48px_rgba(70,56,35,0.34)]"
            >
              <div className="flex items-center gap-3">
                <img
                  src={card.resident.photo || "/placeholder.svg"}
                  alt={card.resident.name}
                  className="size-14 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-xl leading-tight text-foreground">{card.resident.name}</p>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#a28363]">
                    {card.resident.goal}
                  </p>
                </div>
              </div>

              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
                Why this fits
              </p>
              <p className="mt-2 text-sm leading-7 text-[#655645]">
                {card.compatibilitySummary || card.resident.tagline}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {card.resident.interests.slice(0, 4).map((interest) => (
                  <span
                    key={interest}
                    className="rounded-full border border-[#e2d6c3] px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-[#846d53]"
                  >
                    {interest}
                  </span>
                ))}
              </div>

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
                </div>
              ) : null}

              <div
                className={`mt-4 rounded-[1.4rem] px-4 py-3 text-sm ${
                  statusCopy.tone === "success"
                    ? "bg-[#ece0c4] text-[#6f5938]"
                    : statusCopy.tone === "attention"
                      ? "bg-[#f3eadc] text-foreground"
                      : statusCopy.tone === "pending"
                        ? "bg-[#f5efe6] text-[#7c6c5a]"
                        : statusCopy.tone === "muted"
                          ? "bg-[#efe7db] text-[#8c7c6b]"
                          : "bg-[#f3eadc] text-foreground"
                }`}
              >
                <div className="flex items-center gap-2 font-medium">
                  {statusCopy.tone === "success" ? (
                    <UserRoundCheck className="size-4" />
                  ) : statusCopy.tone === "pending" ? (
                    <Clock className="size-4" />
                  ) : statusCopy.tone === "muted" ? (
                    <PauseCircle className="size-4" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  {statusCopy.label}
                </div>
                <p className="mt-1 leading-relaxed">{statusCopy.description}</p>
              </div>

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
                      onClick={() => onRespondToIntroduction(card.resident.id, card.introductionId!, "accepted")}
                      disabled={isActionLoading}
                      className="flex w-full items-center justify-center gap-2 rounded-full border border-[#2b241d] bg-[#231d17] py-3 text-sm font-medium tracking-[0.18em] text-[#f3ebdc] disabled:opacity-70"
                    >
                      {isActionLoading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                      Accept introduction
                    </button>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => onRespondToIntroduction(card.resident.id, card.introductionId!, "declined")}
                        disabled={isActionLoading}
                        className="flex items-center justify-center gap-2 rounded-full border border-[#d7c9b4] bg-[#f6eee1] py-3 text-sm font-medium text-foreground disabled:opacity-70"
                      >
                        <X className="size-4" />
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => onRespondToIntroduction(card.resident.id, card.introductionId!, "paused")}
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
                    Schedule a meetup
                  </button>
                ) : (
                  <div className="flex w-full items-center justify-center gap-2 rounded-full border border-[#e1d5c3] bg-[#f5efe6] py-3 text-sm font-medium text-[#8a7b6a]">
                    {isLoading || isActionLoading ? <Loader2 className="size-4 animate-spin" /> : <Clock className="size-4" />}
                    {card.requestedByCurrentResident || isPositiveDecision(card.currentResidentDecision)
                      ? `Awaiting ${card.resident.name.split(" ")[0]}'s response`
                      : "Waiting for the right moment"}
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
