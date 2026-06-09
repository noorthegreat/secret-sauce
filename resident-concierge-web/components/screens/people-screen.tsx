"use client"

import { Check, Clock, Loader2, PauseCircle, Sparkles, UserRoundCheck, X } from "lucide-react"

import { ScreenHeader } from "@/components/screen-header"
import type { Resident } from "@/lib/concierge-data"
import type { ResidentIntroductionCard } from "@/lib/resident-introduction-ui"
import { canScheduleIntroduction } from "@/lib/resident-introduction-ui"

function isPositiveDecision(decision: ResidentIntroductionCard["currentResidentDecision"]) {
  return decision === "accepted" || decision === "requested"
}

function canRespond(card: ResidentIntroductionCard) {
  if (!card.introductionId) {
    return false
  }

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
          : "You both said yes. Schedule the meetup when you are ready.",
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
  onSchedule: (resident: Resident) => void
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
    <div className="h-full overflow-y-auto pb-28">
      <div className="pt-3">
        <ScreenHeader eyebrow="Chosen for you" title="Neighbors worth meeting" />
        <p className="mt-2 px-6 text-sm leading-relaxed text-muted-foreground">
          A short, considered list, not a directory. Private details stay hidden until there is mutual interest.
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
        {introductions.map((card) => {
          const statusCopy = getStatusCopy(card)
          const isActionLoading = actionResidentId === card.resident.id

          return (
            <article key={card.resident.id} className="overflow-hidden rounded-3xl border border-border bg-card">
              <div className="flex gap-4 p-4">
                <img
                  src={card.resident.photo || "/placeholder.svg"}
                  alt={card.resident.name}
                  className="size-20 shrink-0 rounded-2xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-muted-foreground">{card.resident.unit}</p>
                  <h3 className="font-serif text-xl leading-tight text-foreground">{card.resident.name}</h3>
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-0.5 text-[11px] text-gold-foreground">
                    <Sparkles className="size-3 text-gold" /> {card.resident.goal}
                  </span>
                </div>
              </div>

              <p className="px-4 text-sm leading-relaxed text-foreground/75">
                {card.compatibilitySummary || card.resident.tagline}
              </p>

              <div className="flex flex-wrap gap-2 px-4 pt-3">
                {card.resident.interests.slice(0, 4).map((interest) => (
                  <span
                    key={interest}
                    className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground"
                  >
                    {interest}
                  </span>
                ))}
              </div>

              <div className="px-4 pt-4">
                <div
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    statusCopy.tone === "success"
                      ? "bg-gold/15 text-gold-foreground"
                      : statusCopy.tone === "attention"
                        ? "bg-secondary text-foreground"
                        : statusCopy.tone === "pending"
                          ? "bg-secondary text-muted-foreground"
                          : statusCopy.tone === "muted"
                            ? "bg-muted text-muted-foreground"
                            : "bg-secondary text-foreground"
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
              </div>

              <div className="p-4">
                {card.status === "suggested" && !card.introductionId ? (
                  <button
                    type="button"
                    onClick={() => onRequestIntroduction(card.resident.id)}
                    disabled={isActionLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-foreground py-3.5 text-sm font-medium tracking-wide text-background transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isActionLoading ? <Loader2 className="size-4 animate-spin" /> : null}
                    Request Introduction
                  </button>
                ) : canRespond(card) && card.introductionId ? (
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={() => onRespondToIntroduction(card.resident.id, card.introductionId!, "accepted")}
                      disabled={isActionLoading}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-foreground py-3.5 text-sm font-medium tracking-wide text-background transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isActionLoading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                      Accept Introduction
                    </button>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => onRespondToIntroduction(card.resident.id, card.introductionId!, "declined")}
                        disabled={isActionLoading}
                        className="flex items-center justify-center gap-2 rounded-full border border-border bg-card py-3 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        <X className="size-4" />
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => onRespondToIntroduction(card.resident.id, card.introductionId!, "paused")}
                        disabled={isActionLoading}
                        className="flex items-center justify-center gap-2 rounded-full border border-border bg-card py-3 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        <PauseCircle className="size-4" />
                        Pause
                      </button>
                    </div>
                  </div>
                ) : canScheduleIntroduction(card) ? (
                  <button
                    type="button"
                    onClick={() => onSchedule(card.resident)}
                    className="w-full rounded-full bg-foreground py-3.5 text-sm font-medium tracking-wide text-background transition-transform active:scale-[0.99]"
                  >
                    Schedule a meetup
                  </button>
                ) : (
                  <div className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-secondary py-3.5 text-sm font-medium text-muted-foreground">
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
