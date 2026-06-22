"use client"

import { ArrowRight, CalendarCheck, Sparkles, UserPlus } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { ResidentAccessCard } from "@/components/resident-access-card"
import { SectionLabel } from "@/components/screen-header"
import type { CommunityEvent } from "@/lib/community-live"
import type { ResidentAccountSnapshot } from "@/lib/resident-account-server"
import type { ResidentIntroductionCard } from "@/lib/resident-introduction-ui"
import { canScheduleIntroduction } from "@/lib/resident-introduction-ui"

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

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
  const featuredIntroductions = introductionCards.slice(0, 2)
  const featuredEvents = events.slice(0, 3)
  const topIntroduction = featuredIntroductions[0] ?? null

  return (
    <div className="space-y-8 lg:space-y-10">
      <section className="rounded-[2.25rem] border border-[#e0d5c6] bg-[#fbf6ee] px-6 py-8 shadow-[0_24px_70px_-54px_rgba(50,39,25,0.28)] sm:px-8 lg:px-10 lg:py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-gold">
              {buildingName} Community
            </p>
            <h1 className="mt-3 font-serif text-[2.7rem] leading-[0.94] text-foreground sm:text-[3.15rem]">
              Good evening, <em className="text-gold not-italic">{welcomeName}.</em>
            </h1>
            <p className="mt-3 text-sm uppercase tracking-[0.2em] text-[#8f7d68]">
              Private community · {buildingName}
            </p>
          </div>

          <div className="grid max-w-[430px] grid-cols-3 gap-3">
            <CommunityStat value={introCount} label="Introductions" />
            <CommunityStat value={events.length} label="Gatherings" />
            <CommunityStat
              value={featuredIntroductions.filter((card) => card.status !== "declined").length}
              label="Active fits"
            />
          </div>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-8">
          <section>
            <SectionLabel>We&apos;d love to introduce you to a few neighbors</SectionLabel>

            {featuredIntroductions.length > 0 ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {featuredIntroductions.map((introduction, index) => {
                  const resident = introduction.resident
                  const actionLabel =
                    introduction.status === "suggested" && !introduction.introductionId
                      ? "Accept introduction"
                      : canScheduleIntroduction(introduction)
                        ? "Review meetup"
                        : "Review introduction"

                  const action =
                    introduction.status === "suggested" && !introduction.introductionId
                      ? () => onRequestIntro(resident.id)
                      : onGoPeople

                  return (
                    <article
                      key={`${resident.id}-${introduction.status}-${introduction.introductionId ?? "suggested"}`}
                      className="rounded-[1.9rem] border border-[#e0d5c6] bg-white px-5 py-5 shadow-[0_22px_52px_-46px_rgba(63,50,34,0.24)]"
                    >
                      <div className="flex gap-4">
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

                        <div className="min-w-0">
                          <p className="font-serif text-[1.45rem] leading-none text-foreground">
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

                      <div className="mt-4 border-l border-gold/30 pl-4">
                        <p className="font-serif text-base italic leading-7 text-[#6d5b47]">
                          &quot;
                          {introduction.compatibilitySummary ||
                            resident.conciergeSnippet ||
                            resident.tagline}
                          &quot;
                        </p>
                      </div>

                      {introduction.meetupRecommendation ? (
                        <div className="mt-4 rounded-[1.35rem] border border-[#ece1d2] bg-[#f8f0e4] px-4 py-4">
                          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
                            Suggested first setting
                          </p>
                          <p className="mt-2 font-serif text-[1.2rem] text-foreground">
                            {introduction.meetupRecommendation.title}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[#70604f]">
                            {introduction.meetupRecommendation.amenityLabel}
                            {introduction.meetupRecommendation.timingLabel
                              ? ` · ${introduction.meetupRecommendation.timingLabel}`
                              : ""}
                          </p>
                        </div>
                      ) : null}

                      <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#eee4d6] pt-4">
                        <button
                          type="button"
                          onClick={action}
                          className="text-[10px] uppercase tracking-[0.26em] text-foreground underline decoration-[#2b241d] underline-offset-4"
                        >
                          {actionLabel}
                        </button>
                        <button
                          type="button"
                          onClick={index === 0 ? onGoConcierge : onGoPeople}
                          className="text-[10px] uppercase tracking-[0.22em] text-[#93806b]"
                        >
                          {index === 0 ? "Concierge note" : "Not now"}
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                icon={UserPlus}
                title="We’re preparing your first thoughtful introductions."
                description="As more residents complete their profile, Fifth Circle will recommend a short list of neighbors who share your interests, timing, and social pace."
                actionLabel="Complete profile"
                onAction={onCompleteProfile}
              />
            )}
          </section>

          <section>
            <SectionLabel>A few gatherings we think you&apos;ll enjoy</SectionLabel>

            {featuredEvents.length > 0 ? (
              <div className="grid gap-4 xl:grid-cols-3">
                {featuredEvents.map((event, index) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={onGoCommunity}
                    className={
                      index === 0
                        ? "rounded-[1.9rem] bg-[#231d17] px-5 py-6 text-left text-[#f3ebdc] shadow-[0_26px_70px_-52px_rgba(43,36,29,0.82)]"
                        : "rounded-[1.9rem] border border-[#e0d5c6] bg-white px-5 py-6 text-left shadow-[0_22px_52px_-46px_rgba(63,50,34,0.18)]"
                    }
                  >
                    <p
                      className={
                        index === 0
                          ? "font-mono text-[10px] uppercase tracking-[0.26em] text-[#d5bb84]"
                          : "font-mono text-[10px] uppercase tracking-[0.26em] text-gold"
                      }
                    >
                      {event.date} · {event.time}
                    </p>
                    <h3
                      className={
                        index === 0
                          ? "mt-3 font-serif text-[1.35rem] leading-[1.1]"
                          : "mt-3 font-serif text-[1.35rem] leading-[1.1] text-foreground"
                      }
                    >
                      {event.title}
                    </h3>
                    <p
                      className={
                        index === 0
                          ? "mt-2 text-sm text-[#d6ccb9]"
                          : "mt-2 text-sm text-[#756555]"
                      }
                    >
                      {event.attendees > 0
                        ? `${event.attendees} neighbors attending`
                        : event.enrollmentLabel}
                    </p>
                    <p
                      className={
                        index === 0
                          ? "mt-4 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#d5bb84]"
                          : "mt-4 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-foreground"
                      }
                    >
                      Join your neighbors <ArrowRight className="size-3.5" />
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CalendarCheck}
                title="Gatherings will appear here as they are announced."
                description="For now, your concierge is focusing on thoughtful introductions and the first shared moments most likely to feel worth saying yes to."
                actionLabel="Open concierge"
                onAction={onGoConcierge}
              />
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <ResidentAccessCard
            snapshot={accountSnapshot}
            isLoading={sessionLoading || accountLoading}
            isSignedIn={isSignedIn}
            onSignIn={onSignIn}
            onCompleteProfile={onCompleteProfile}
            onReturnToJoin={onReturnToJoin}
            onViewCommunity={onGoCommunity}
          />

          <div className="rounded-[1.9rem] border border-[#e0d5c6] bg-white px-5 py-5 shadow-[0_22px_52px_-46px_rgba(63,50,34,0.18)]">
            <SectionLabel>Concierge note</SectionLabel>
            <h2 className="font-serif text-[1.8rem] leading-[1.02] text-foreground">
              The next step should always feel easy.
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#6c5c49]">
              Before mutual interest, introductions stay private and low-pressure. Once both residents
              say yes, we suggest the right first setting and help turn a match into a real moment.
            </p>
            <button
              type="button"
              onClick={onGoConcierge}
              className="mt-5 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-gold"
            >
              Open concierge
              <Sparkles className="size-4" />
            </button>
          </div>

          {topIntroduction ? (
            <div className="rounded-[1.9rem] border border-[#e0d5c6] bg-[#f7f0e5] px-5 py-5 shadow-[0_22px_52px_-46px_rgba(63,50,34,0.12)]">
              <SectionLabel>Why this match works</SectionLabel>
              <p className="font-serif text-[1.45rem] leading-tight text-foreground">
                {topIntroduction.resident.name} feels like a strong first introduction.
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-[#6c5c49]">
                {(topIntroduction.resident.compatibilityDetails ?? [])
                  .slice(0, 3)
                  .map((detail) => (
                    <li key={detail}>• {detail}</li>
                  ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  )
}

function CommunityStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-[1.55rem] border border-[#e4d9ca] bg-[#f8f1e5] px-4 py-4 text-center">
      <p className="font-serif text-[2rem] leading-none text-foreground">{value}</p>
      <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-[#8f7d68]">{label}</p>
    </div>
  )
}
