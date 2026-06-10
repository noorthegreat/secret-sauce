"use client"

import { ArrowUpRight, CalendarCheck, Lightbulb, UserPlus } from "lucide-react"

import { ResidentAccessCard } from "@/components/resident-access-card"
import { ScreenHeader, SectionLabel } from "@/components/screen-header"
import type { CommunityEvent } from "@/lib/community-live"
import type { ResidentAccountSnapshot } from "@/lib/resident-account-server"
import type { ResidentIntroductionCard } from "@/lib/resident-introduction-ui"
import { canScheduleIntroduction } from "@/lib/resident-introduction-ui"

export function HomeScreen({
  onRequestIntro,
  onGoPeople,
  onGoCommunity,
  onSignIn,
  onCompleteProfile,
  onReturnToJoin,
  welcomeName,
  introCount,
  introductionCards,
  events,
  isSignedIn,
  sessionLoading,
  accountSnapshot,
  accountLoading,
}: {
  onRequestIntro: (id: string) => void
  onGoPeople: () => void
  onGoCommunity: () => void
  onSignIn: () => void
  onCompleteProfile: () => void
  onReturnToJoin: () => void
  welcomeName: string
  introCount: number
  introductionCards: ResidentIntroductionCard[]
  events: CommunityEvent[]
  isSignedIn: boolean
  sessionLoading: boolean
  accountSnapshot: ResidentAccountSnapshot | null
  accountLoading: boolean
}) {
  const featured = introductionCards[0]
  const suggested =
    introductionCards.find((card) => card.status === "suggested") ??
    introductionCards.find((card) => !canScheduleIntroduction(card)) ??
    featured
  const event = events[0] ?? null

  return (
    <div className="h-full overflow-y-auto pb-28">
      <div className="pt-3">
        <ScreenHeader eyebrow="Good evening" title={`Welcome home, ${welcomeName}`} />
        <p className="mt-2 px-6 text-sm leading-relaxed text-muted-foreground">
          Your community is warming up. Your concierge has {introCount} considered
          introduction{introCount === 1 ? "" : "s"} for you this week.
        </p>
      </div>

      <div className="mt-6 px-6">
        <ResidentAccessCard
          snapshot={accountSnapshot}
          isLoading={sessionLoading || accountLoading}
          isSignedIn={isSignedIn}
          onSignIn={onSignIn}
          onCompleteProfile={onCompleteProfile}
          onReturnToJoin={onReturnToJoin}
          onViewCommunity={onGoCommunity}
        />
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2.5 px-6">
        <QuickAction icon={UserPlus} label="People" onClick={onGoPeople} />
        <QuickAction icon={CalendarCheck} label="RSVP" onClick={onGoCommunity} />
        <QuickAction icon={Lightbulb} label="Suggest Event" onClick={onGoCommunity} />
      </div>

      {featured ? (
        <div className="mt-8 px-6">
          <SectionLabel>Suggested introduction</SectionLabel>
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[0_26px_60px_-46px_rgba(70,56,35,0.48)]">
            <div className="relative">
              <img
                src={featured.resident.photo || "/placeholder.svg"}
                alt={featured.resident.name}
                className="h-56 w-full object-cover"
              />
              <span className="absolute left-4 top-4 rounded-full bg-background/85 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground backdrop-blur">
                {featured.resident.shared > 0
                  ? `${featured.resident.shared} shared interest${featured.resident.shared === 1 ? "" : "s"}`
                  : "Curated fit"}
              </span>
            </div>
            <div className="p-5">
              <p className="text-xs text-muted-foreground">{featured.resident.unit}</p>
              <h3 className="mt-0.5 font-serif text-2xl leading-tight text-foreground">
                {featured.resident.name}
              </h3>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
                Why this fits
              </p>
              <p className="mt-2 text-sm leading-relaxed text-foreground/75">
                {featured.compatibilitySummary || featured.resident.tagline}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {featured.resident.interests.slice(0, 3).map((interest) => (
                  <span
                    key={interest}
                    className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground"
                  >
                    {interest}
                  </span>
                ))}
              </div>
              {featured.meetupRecommendation ? (
                <div className="mt-4 rounded-2xl border border-gold/25 bg-gold/10 px-4 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-gold">
                    Suggested meetup
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {featured.meetupRecommendation.title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/75">
                    {featured.meetupRecommendation.amenityLabel}
                    {featured.meetupRecommendation.timingLabel
                      ? ` · ${featured.meetupRecommendation.timingLabel}`
                      : ""}
                  </p>
                </div>
              ) : null}
              <button
                type="button"
                onClick={() =>
                  featured.status === "suggested" && !featured.introductionId
                    ? onRequestIntro(featured.resident.id)
                    : onGoPeople()
                }
                className="mt-5 w-full rounded-full bg-foreground py-3.5 text-sm font-medium tracking-wide text-background transition-transform active:scale-[0.99]"
              >
                {canScheduleIntroduction(featured)
                  ? "Schedule a meetup"
                  : featured.status === "suggested"
                    ? "Request introduction"
                    : "Open introductions"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {event ? (
        <div className="mt-8 px-6">
          <SectionLabel>Upcoming gathering</SectionLabel>
          <button
            type="button"
            onClick={onGoCommunity}
            className="flex w-full items-center gap-4 overflow-hidden rounded-3xl border border-border bg-card p-3 text-left shadow-[0_26px_60px_-46px_rgba(70,56,35,0.42)]"
          >
            <img
              src={event.image || "/placeholder.svg"}
              alt={event.title}
              className="size-20 shrink-0 rounded-2xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
                {event.date}
              </p>
              <h3 className="mt-1 truncate font-serif text-xl leading-tight text-foreground">
                {event.title}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {event.time} · {event.location}
              </p>
            </div>
            <ArrowUpRight className="size-5 shrink-0 text-muted-foreground" />
          </button>
        </div>
      ) : null}

      {suggested ? (
        <div className="mt-8 px-6">
          <SectionLabel>Concierge note</SectionLabel>
          <div className="rounded-3xl border border-gold/40 bg-gold/10 p-5">
            <p className="text-sm leading-relaxed text-foreground/85">
              You and{" "}
              <span className="font-medium text-foreground">{suggested.resident.name}</span> share
              space, timing, and interests inside the building.
              {suggested.meetupRecommendation
                ? ` A ${suggested.meetupRecommendation.title.toLowerCase()} in the ${suggested.meetupRecommendation.amenityLabel.toLowerCase()} would be a natural first step.`
                : " Once there is mutual interest, your concierge can help suggest the right moment to meet."}
            </p>
            <button
              type="button"
              onClick={() =>
                suggested.status === "suggested" && !suggested.introductionId
                  ? onRequestIntro(suggested.resident.id)
                  : onGoPeople()
              }
              className="mt-4 w-full rounded-full border border-foreground/15 bg-card py-3 text-sm font-medium text-foreground transition-colors hover:border-foreground/30"
            >
              {suggested.status === "suggested"
                ? "Arrange an introduction"
                : "View introduction status"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof UserPlus
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-2 py-4 transition-colors hover:border-gold/40"
    >
      <Icon className="size-5 text-gold" strokeWidth={1.5} />
      <span className="text-center text-[11px] leading-tight text-foreground/80">{label}</span>
    </button>
  )
}
