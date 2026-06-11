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
  const event = events[0] ?? null

  return (
    <div className="h-full overflow-y-auto bg-[#f6eee1] pb-28">
      <div className="pt-3">
        <ScreenHeader eyebrow="Resident home" title="Good evening," accent={welcomeName} />
        <p className="mt-2 px-6 text-sm leading-relaxed text-[#726353]">
          Your community is warming up. There {introCount === 1 ? "is" : "are"}{" "}
          {introCount} thoughtful introduction{introCount === 1 ? "" : "s"} in motion this week.
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
        <QuickAction icon={UserPlus} label="Neighbors" onClick={onGoPeople} />
        <QuickAction icon={CalendarCheck} label="Gatherings" onClick={onGoCommunity} />
        <QuickAction icon={Sparkles} label="Concierge note" onClick={onGoPeople} />
      </div>

      {featured ? (
        <div className="mt-8 px-6">
          <SectionLabel>You might like to be introduced to</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            {introductionCards.slice(0, 2).map((card) => (
              <article
                key={card.resident.id}
                className="rounded-[1.8rem] border border-[#e1d5c3] bg-[#fbf6ee] p-4 shadow-[0_26px_60px_-50px_rgba(70,56,35,0.4)]"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={card.resident.photo || "/placeholder.svg"}
                    alt={card.resident.name}
                    className="size-12 rounded-full object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-serif text-lg leading-tight text-foreground">
                      {card.resident.name}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#99836a]">
                      {card.resident.goal}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-xs leading-6 text-[#6f604f]">
                  {card.compatibilitySummary || card.resident.tagline}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {card.resident.interests.slice(0, 2).map((interest) => (
                    <span
                      key={interest}
                      className="rounded-full border border-[#e2d6c3] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-[#866f54]"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    card.status === "suggested" && !card.introductionId
                      ? onRequestIntro(card.resident.id)
                      : onGoPeople()
                  }
                  className="mt-5 w-full rounded-full border border-[#2b241d] bg-[#231d17] py-2.5 text-[11px] font-medium tracking-[0.22em] text-[#f3ebdc]"
                >
                  {canScheduleIntroduction(card) ? "Schedule" : "Request intro"}
                </button>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-8 px-6">
          <EmptyState
            icon={Sparkles}
            title="We’re looking for thoughtful introductions for you."
            description="As more residents join the community, we’ll recommend people who share your interests and goals."
            actionLabel={isSignedIn ? "Browse gatherings" : undefined}
            onAction={isSignedIn ? onGoCommunity : undefined}
          />
        </div>
      )}

      <div className="mt-8 px-6">
        <SectionLabel>New gatherings we think you’ll enjoy</SectionLabel>
        <div className="grid grid-cols-3 gap-3">
          {events.slice(0, 3).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={onGoCommunity}
              className={`overflow-hidden rounded-[1.8rem] border px-3 py-4 text-left ${
                item.id === event?.id
                  ? "border-[#2b241d] bg-[#231d17] text-[#f3ebdc]"
                  : "border-[#e1d5c3] bg-[#fbf6ee] text-foreground"
              }`}
            >
              <p className={`font-mono text-[10px] uppercase tracking-[0.18em] ${item.id === event?.id ? "text-[#d8c392]" : "text-[#9c8367]"}`}>
                {item.date.split(",")[0]}
              </p>
              <h3 className="mt-3 font-serif text-lg leading-tight">{item.title}</h3>
              <p className={`mt-3 text-xs leading-5 ${item.id === event?.id ? "text-[#d9cfbf]" : "text-[#726353]"}`}>
                {item.time} · {item.location}
              </p>
            </button>
          ))}
        </div>
      </div>

      {featured?.meetupRecommendation ? (
        <div className="mt-8 px-6">
          <SectionLabel>Concierge note</SectionLabel>
          <div className="rounded-[1.8rem] border border-[#dccfb7] bg-[#fbf6ee] p-5">
            <p className="text-sm leading-7 text-[#5f5142]">
              {featured.resident.name} feels like a strong fit. A{" "}
              <span className="font-medium text-foreground">
                {featured.meetupRecommendation.title.toLowerCase()}
              </span>{" "}
              at {featured.meetupRecommendation.amenityLabel.toLowerCase()}
              {featured.meetupRecommendation.timingLabel
                ? ` around ${featured.meetupRecommendation.timingLabel.toLowerCase()}`
                : ""}{" "}
              would be a natural first introduction.
            </p>
            <button
              type="button"
              onClick={onGoPeople}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#866b46]"
            >
              Open introductions
              <ArrowUpRight className="size-4" />
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
      className="flex flex-col items-center gap-2 rounded-[1.4rem] border border-[#e2d6c3] bg-[#fbf6ee] px-2 py-4 transition-colors hover:border-gold/40"
    >
      <Icon className="size-5 text-gold" strokeWidth={1.5} />
      <span className="text-center text-[11px] leading-tight text-foreground/80">{label}</span>
    </button>
  )
}
