"use client"

import { ArrowUpRight, CalendarCheck, Sparkles, UserPlus } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
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
  onGoConcierge,
  onSignIn,
  onCompleteProfile,
  onReturnToJoin,
  welcomeName,
  buildingName,
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
  onGoConcierge: () => void
  onSignIn: () => void
  onCompleteProfile: () => void
  onReturnToJoin: () => void
  welcomeName: string
  buildingName: string
  introCount: number
  introductionCards: ResidentIntroductionCard[]
  events: CommunityEvent[]
  isSignedIn: boolean
  sessionLoading: boolean
  accountSnapshot: ResidentAccountSnapshot | null
  accountLoading: boolean
}) {
  const featuredIntroduction = introductionCards[0] ?? null
  const secondaryIntroduction = introductionCards[1] ?? null
  const nextGathering = events[0] ?? null
  const supportingGatherings = events.slice(1, 3)

  return (
    <div className="h-full overflow-y-auto bg-[#f6eee1] pb-28">
      <div className="pt-3">
        <ScreenHeader eyebrow={`${buildingName} Community`} title="Good evening," accent={welcomeName} />
        <p className="mt-2 px-6 text-sm leading-relaxed text-[#726353]">
          Your community is beginning to take shape. We’re prioritizing thoughtful introductions
          first, with gatherings and concierge guidance close behind.
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

      <div className="mt-6 px-6">
        <div className="overflow-hidden rounded-[2rem] border border-[#2b241d] bg-[#231d17] text-[#f3ebdc] shadow-[0_34px_90px_-56px_rgba(43,36,29,0.82)]">
          <div className="border-b border-white/10 px-5 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-[#d5bb84]">
              Suggested introduction
            </p>
            <h2 className="mt-3 font-serif text-[1.9rem] leading-[1.02]">
              {featuredIntroduction
                ? `${featuredIntroduction.resident.name} feels worth meeting.`
                : "We’re preparing your first thoughtful introduction."}
            </h2>
          </div>

          <div className="px-5 py-5">
            {featuredIntroduction ? (
              <>
                <div className="flex items-center gap-3">
                  <img
                    src={featuredIntroduction.resident.photo || "/placeholder.svg"}
                    alt={featuredIntroduction.resident.name}
                    className="size-14 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-serif text-xl leading-tight">
                      {featuredIntroduction.resident.name}
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[#d5bb84]">
                      {featuredIntroduction.resident.goal}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-7 text-[#ddd2c1]">
                  {featuredIntroduction.compatibilitySummary || featuredIntroduction.resident.tagline}
                </p>

                {featuredIntroduction.resident.compatibilityDetails?.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {featuredIntroduction.resident.compatibilityDetails.slice(0, 3).map((detail) => (
                      <span
                        key={detail}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-[#e8dcc9]"
                      >
                        {detail}
                      </span>
                    ))}
                  </div>
                ) : null}

                {featuredIntroduction.meetupRecommendation ? (
                  <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#d5bb84]">
                      Concierge recommendation
                    </p>
                    <p className="mt-2 font-serif text-xl">
                      {featuredIntroduction.meetupRecommendation.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#d7ccb9]">
                      {featuredIntroduction.meetupRecommendation.amenityLabel}
                      {featuredIntroduction.meetupRecommendation.timingLabel
                        ? ` around ${featuredIntroduction.meetupRecommendation.timingLabel.toLowerCase()}`
                        : ""}
                      . {featuredIntroduction.meetupRecommendation.reason}
                    </p>
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-3">
                  {featuredIntroduction.status === "suggested" && !featuredIntroduction.introductionId ? (
                    <button
                      type="button"
                      onClick={() => onRequestIntro(featuredIntroduction.resident.id)}
                      className="inline-flex items-center justify-center rounded-full bg-[#f3ebdc] px-4 py-2.5 text-sm font-medium text-[#231d17]"
                    >
                      Request introduction
                    </button>
                  ) : canScheduleIntroduction(featuredIntroduction) ? (
                    <button
                      type="button"
                      onClick={onGoPeople}
                      className="inline-flex items-center justify-center rounded-full bg-[#f3ebdc] px-4 py-2.5 text-sm font-medium text-[#231d17]"
                    >
                      Coordinate meetup
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onGoPeople}
                      className="inline-flex items-center justify-center rounded-full bg-[#f3ebdc] px-4 py-2.5 text-sm font-medium text-[#231d17]"
                    >
                      Review introduction
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={onGoConcierge}
                    className="inline-flex items-center justify-center rounded-full border border-white/15 px-4 py-2.5 text-sm font-medium text-[#f3ebdc]"
                  >
                    Open concierge
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm leading-7 text-[#ddd2c1]">
                  As more approved residents complete onboarding, we’ll begin recommending neighbors
                  who share your goals, timing, and social rhythm.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={onCompleteProfile}
                    className="inline-flex items-center justify-center rounded-full bg-[#f3ebdc] px-4 py-2.5 text-sm font-medium text-[#231d17]"
                  >
                    Complete profile
                  </button>
                  <button
                    type="button"
                    onClick={onGoCommunity}
                    className="inline-flex items-center justify-center rounded-full border border-white/15 px-4 py-2.5 text-sm font-medium text-[#f3ebdc]"
                  >
                    Browse gatherings
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 px-6 md:grid-cols-2">
        <div className="rounded-[1.8rem] border border-[#e1d5c3] bg-[#fbf6ee] px-5 py-5 shadow-[0_24px_60px_-52px_rgba(70,56,35,0.3)]">
          <SectionLabel>Concierge note</SectionLabel>
          <h3 className="font-serif text-[1.6rem] leading-tight text-foreground">
            What happens next is always clear.
          </h3>
          <p className="mt-3 text-sm leading-7 text-[#675847]">
            Before mutual interest, introductions stay private and low-pressure. Once both residents
            say yes, we move into timing, setting, and a recommended first meetup.
          </p>
          <button
            type="button"
            onClick={onGoConcierge}
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#876f4c]"
          >
            View concierge guidance
            <ArrowUpRight className="size-4" />
          </button>
        </div>

        <div className="rounded-[1.8rem] border border-[#e1d5c3] bg-[#fbf6ee] px-5 py-5 shadow-[0_24px_60px_-52px_rgba(70,56,35,0.3)]">
          <SectionLabel>Community snapshot</SectionLabel>
          <div className="grid grid-cols-3 gap-3">
            <SnapshotMetric value={introCount} label="Introductions" />
            <SnapshotMetric value={events.length} label="Gatherings" />
            <SnapshotMetric value={introductionCards.length} label="Active fits" />
          </div>
        </div>
      </div>

      {secondaryIntroduction ? (
        <div className="mt-8 px-6">
          <SectionLabel>Also worth a look</SectionLabel>
          <div className="rounded-[1.8rem] border border-[#e1d5c3] bg-[#fbf6ee] px-5 py-5 shadow-[0_24px_60px_-52px_rgba(70,56,35,0.3)]">
            <div className="flex items-center gap-3">
              <img
                src={secondaryIntroduction.resident.photo || "/placeholder.svg"}
                alt={secondaryIntroduction.resident.name}
                className="size-12 rounded-full object-cover"
              />
              <div>
                <p className="font-serif text-[1.45rem] leading-tight text-foreground">
                  {secondaryIntroduction.resident.name}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[#9b8162]">
                  {secondaryIntroduction.resident.goal}
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-7 text-[#675847]">
              {secondaryIntroduction.compatibilitySummary || secondaryIntroduction.resident.tagline}
            </p>
            <button
              type="button"
              onClick={onGoPeople}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#876f4c]"
            >
              Open all introductions
              <ArrowUpRight className="size-4" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-8 px-6">
        <SectionLabel>Upcoming gatherings</SectionLabel>
        {nextGathering ? (
          <div className="grid gap-3">
            <button
              type="button"
              onClick={onGoCommunity}
              className="rounded-[1.8rem] border border-[#2b241d] bg-[#231d17] px-5 py-5 text-left text-[#f3ebdc] shadow-[0_28px_80px_-60px_rgba(43,36,29,0.8)]"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#d5bb84]">
                Next gathering
              </p>
              <h3 className="mt-3 font-serif text-[1.65rem] leading-tight">{nextGathering.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[#ddd2c1]">
                {nextGathering.date} · {nextGathering.time} · {nextGathering.location}
              </p>
              <p className="mt-3 text-sm leading-7 text-[#ddd2c1]">{nextGathering.description}</p>
            </button>

            {supportingGatherings.length ? (
              <div className="grid grid-cols-2 gap-3">
                {supportingGatherings.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={onGoCommunity}
                    className="rounded-[1.6rem] border border-[#e1d5c3] bg-[#fbf6ee] px-4 py-4 text-left"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#a28363]">
                      {event.date.split(",")[0]}
                    </p>
                    <h4 className="mt-3 font-serif text-xl leading-tight text-foreground">
                      {event.title}
                    </h4>
                    <p className="mt-2 text-sm leading-6 text-[#6f604f]">
                      {event.time} · {event.location}
                    </p>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState
            icon={CalendarCheck}
            title="Gatherings will appear here as soon as they’re announced."
            description="For now, your concierge will keep focusing on thoughtful introductions and the first few shared moments likely to feel worth joining."
            actionLabel="Open concierge"
            onAction={onGoConcierge}
          />
        )}
      </div>

      <div className="mt-8 grid grid-cols-3 gap-2.5 px-6">
        <QuickAction icon={UserPlus} label="Introductions" onClick={onGoPeople} />
        <QuickAction icon={Sparkles} label="Concierge" onClick={onGoConcierge} />
        <QuickAction icon={CalendarCheck} label="Gatherings" onClick={onGoCommunity} />
      </div>
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
      className="flex flex-col items-center gap-2 rounded-[1.4rem] border border-[#e2d6c3] bg-[#fbf6ee] px-2 py-4 transition-colors hover:border-gold/40"
    >
      <Icon className="size-5 text-gold" strokeWidth={1.5} />
      <span className="text-center text-[11px] leading-tight text-foreground/80">{label}</span>
    </button>
  )
}

function SnapshotMetric({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-[1.5rem] border border-[#e0d4c2] bg-[#f7f0e5] px-4 py-4">
      <p className="font-serif text-3xl text-foreground">{value}</p>
      <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#8b7c6a]">{label}</p>
    </div>
  )
}
