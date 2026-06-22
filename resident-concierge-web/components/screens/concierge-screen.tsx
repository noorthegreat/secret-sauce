"use client"

import { ArrowRight, CalendarDays, NotebookPen, Sparkles, Users } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { SectionLabel } from "@/components/screen-header"
import type { CommunityEvent } from "@/lib/community-live"
import type { ResidentIntroductionCard } from "@/lib/resident-introduction-ui"

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function ConciergeScreen({
  buildingName,
  welcomeName,
  introductions,
  events,
  onOpenPeople,
  onOpenCommunity,
  onRefineProfile,
}: {
  buildingName: string
  welcomeName: string
  introductions: ResidentIntroductionCard[]
  events: CommunityEvent[]
  onOpenPeople: () => void
  onOpenCommunity: () => void
  onRefineProfile: () => void
}) {
  const featuredIntroduction = introductions[0] ?? null
  const supportingIntroductions = introductions.slice(1, 3)
  const nextGathering = events[0] ?? null

  return (
    <div className="space-y-8">
      <section className="rounded-[2.25rem] border border-[#e0d5c6] bg-[#fbf6ee] px-6 py-8 shadow-[0_24px_70px_-54px_rgba(50,39,25,0.28)] sm:px-8 lg:px-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-gold">Concierge</p>
        <h1 className="mt-3 font-serif text-[2.7rem] leading-[0.94] text-foreground sm:text-[3.15rem]">
          A calmer way to meet your neighbors.
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-8 text-[#6e5d4a]">
          Fifth Circle shapes introductions, suggests the right first setting, and keeps your
          building community feeling warm, private, and genuinely useful.
        </p>
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-8">
          <section className="rounded-[2rem] bg-[#231d17] px-6 py-6 text-[#f3ebdc] shadow-[0_28px_80px_-58px_rgba(43,36,29,0.82)] sm:px-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#d5bb84]">
              Concierge note
            </p>
            <h2 className="mt-3 font-serif text-[2.1rem] leading-[0.98]">
              Good evening, <span className="text-[#d5bb84]">{welcomeName}</span>.
            </h2>
            <p className="mt-4 text-sm leading-8 text-[#ddd2c1]">
              {featuredIntroduction
                ? `${featuredIntroduction.resident.name} stands out because ${
                    featuredIntroduction.compatibilitySummary?.toLowerCase() ||
                    "the fit across interests, timing, and social style feels naturally strong."
                  }`
                : `We’re taking a thoughtful approach at ${buildingName}. As more residents complete onboarding, this view will surface the introductions and settings most likely to feel genuinely worthwhile.`}
            </p>

            {featuredIntroduction?.meetupRecommendation ? (
              <div className="mt-5 rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#d5bb84]">
                  Suggested first setting
                </p>
                <p className="mt-2 font-serif text-[1.25rem]">
                  {featuredIntroduction.meetupRecommendation.title}
                </p>
                <p className="mt-2 text-sm leading-7 text-[#ddd2c1]">
                  {featuredIntroduction.meetupRecommendation.amenityLabel}
                  {featuredIntroduction.meetupRecommendation.timingLabel
                    ? ` · ${featuredIntroduction.meetupRecommendation.timingLabel}`
                    : ""}
                  . {featuredIntroduction.meetupRecommendation.reason}
                </p>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onOpenPeople}
                className="inline-flex items-center gap-2 rounded-full bg-[#f3ebdc] px-4 py-2.5 text-sm font-medium text-[#231d17]"
              >
                Open introductions
              </button>
              <button
                type="button"
                onClick={onRefineProfile}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm font-medium text-[#f3ebdc]"
              >
                Refine profile
              </button>
            </div>
          </section>

          <section>
            <SectionLabel>Curated for you</SectionLabel>

            {featuredIntroduction ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {[featuredIntroduction, ...supportingIntroductions].map((introduction) => (
                  <article
                    key={`${introduction.resident.id}-${introduction.status}`}
                    className="rounded-[1.9rem] border border-[#e0d5c6] bg-white px-5 py-5 shadow-[0_22px_52px_-46px_rgba(63,50,34,0.18)]"
                  >
                    <div className="flex items-start gap-4">
                      <div className="relative shrink-0">
                        {introduction.resident.photo ? (
                          <img
                            src={introduction.resident.photo}
                            alt={introduction.resident.name}
                            className="size-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex size-12 items-center justify-center rounded-full border border-gold/30 bg-[#f3eadb] font-serif text-lg text-gold">
                            {getInitials(introduction.resident.name)}
                          </div>
                        )}
                        <div className="pointer-events-none absolute -inset-1 rounded-full border border-gold/25" />
                      </div>

                      <div className="min-w-0">
                        <p className="font-serif text-[1.4rem] leading-none text-foreground">
                          {introduction.resident.name}
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-[#97816a]">
                          {introduction.resident.recognitionCue || introduction.resident.unit}
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 font-serif text-[1.1rem] leading-8 text-[#5f513f]">
                      {introduction.compatibilitySummary || introduction.resident.tagline}
                    </p>

                    {introduction.resident.compatibilityDetails?.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {introduction.resident.compatibilityDetails.slice(0, 3).map((detail) => (
                          <span
                            key={detail}
                            className="rounded-full border border-[#e4d9ca] bg-[#f8f0e4] px-3 py-1 text-[11px] text-[#756656]"
                          >
                            {detail}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Sparkles}
                title="We’re preparing thoughtful recommendations."
                description="As more residents complete their profile and availability, this view will begin surfacing introductions, timing overlap, and first-meet suggestions."
                actionLabel="Refine your profile"
                onAction={onRefineProfile}
              />
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <div className="rounded-[1.9rem] border border-[#e0d5c6] bg-white px-5 py-5 shadow-[0_22px_52px_-46px_rgba(63,50,34,0.18)]">
            <SectionLabel>Profile refinement</SectionLabel>
            <h2 className="font-serif text-[1.75rem] leading-[1.02] text-foreground">
              Help us make the next introduction even better.
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#6c5c49]">
              Small updates to your availability, preferred connection style, or concierge note can
              sharpen match quality without making this feel like a survey.
            </p>
            <button
              type="button"
              onClick={onRefineProfile}
              className="mt-5 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-gold"
            >
              Continue refining profile
              <NotebookPen className="size-4" />
            </button>
          </div>

          <div className="rounded-[1.9rem] border border-[#e0d5c6] bg-white px-5 py-5 shadow-[0_22px_52px_-46px_rgba(63,50,34,0.18)]">
            <SectionLabel>Community guidance</SectionLabel>
            <h2 className="font-serif text-[1.75rem] leading-[1.02] text-foreground">
              The best first meetings feel easy, not forced.
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#6c5c49]">
              We prioritize one-on-one or small-group moments that match the rhythm residents
              already said yes to, then recommend a calm in-building setting to make the first hello
              feel natural.
            </p>
            <button
              type="button"
              onClick={onOpenPeople}
              className="mt-5 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-gold"
            >
              Review current introductions
              <ArrowRight className="size-4" />
            </button>
          </div>

          <div className="rounded-[1.9rem] border border-[#e0d5c6] bg-white px-5 py-5 shadow-[0_22px_52px_-46px_rgba(63,50,34,0.18)]">
            <SectionLabel>Gatherings</SectionLabel>
            {nextGathering ? (
              <>
                <h2 className="font-serif text-[1.75rem] leading-[1.02] text-foreground">
                  {nextGathering.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#6c5c49]">
                  {nextGathering.date} · {nextGathering.time} · {nextGathering.location}
                </p>
                <p className="mt-3 text-sm leading-7 text-[#6c5c49]">
                  A gathering can be the gentlest first entry point for residents who prefer meeting
                  through a shared moment before a one-on-one introduction.
                </p>
                <button
                  type="button"
                  onClick={onOpenCommunity}
                  className="mt-5 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-gold"
                >
                  Open gatherings
                  <CalendarDays className="size-4" />
                </button>
              </>
            ) : (
              <EmptyState
                icon={Users}
                title="Gatherings will appear here."
                description="As soon as the building team publishes the next community moment, your concierge will highlight the gatherings most likely to help you meet the right people."
                actionLabel="Open community"
                onAction={onOpenCommunity}
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
