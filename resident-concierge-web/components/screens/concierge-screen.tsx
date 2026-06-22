"use client"

import { ArrowUpRight, CalendarDays, NotebookPen, Sparkles, Users } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { ScreenHeader, SectionLabel } from "@/components/screen-header"
import type { CommunityEvent } from "@/lib/community-live"
import type { ResidentIntroductionCard } from "@/lib/resident-introduction-ui"

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
    <div className="h-full overflow-y-auto bg-[#f6eee1] pb-28">
      <div className="pt-3">
        <ScreenHeader eyebrow="Concierge" title="A calmer way to meet your neighbors." />
        <p className="mt-2 px-6 text-sm leading-relaxed text-[#726353]">
          Fifth Circle curates introductions, suggests the right first setting, and keeps your
          building community feeling warm, private, and genuinely useful.
        </p>
      </div>

      <div className="mt-6 px-6">
        <div className="overflow-hidden rounded-[2rem] border border-[#2b241d] bg-[#231d17] text-[#f3ebdc] shadow-[0_30px_80px_-56px_rgba(43,36,29,0.85)]">
          <div className="border-b border-white/10 px-5 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-[#d5bb84]">
              Concierge note
            </p>
            <h2 className="mt-3 font-serif text-[1.9rem] leading-[1.02]">
              Good evening, <span className="italic text-[#d5bb84]">{welcomeName}</span>
            </h2>
          </div>
          <div className="px-5 py-5">
            <p className="text-sm leading-7 text-[#ddd2c1]">
              {featuredIntroduction
                ? `${featuredIntroduction.resident.name} stands out because ${
                    featuredIntroduction.compatibilitySummary?.replace(
                      /^You('| a)?re /i,
                      "you’re ",
                    ) ?? "your interests, rhythm, and goals naturally line up."
                  }`
                : `We’re taking a quieter, more thoughtful approach at ${buildingName}. As more residents complete onboarding, we’ll shape introductions around shared goals, timing, and social style.`}
            </p>

            {featuredIntroduction?.meetupRecommendation ? (
              <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#d5bb84]">
                  Suggested first setting
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
              <button
                type="button"
                onClick={onOpenPeople}
                className="inline-flex items-center justify-center rounded-full bg-[#f3ebdc] px-4 py-2.5 text-sm font-medium text-[#231d17]"
              >
                Open introductions
              </button>
              <button
                type="button"
                onClick={onRefineProfile}
                className="inline-flex items-center justify-center rounded-full border border-white/15 px-4 py-2.5 text-sm font-medium text-[#f3ebdc]"
              >
                Refine profile
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 px-6">
        <SectionLabel>Curated for this week</SectionLabel>
        {featuredIntroduction ? (
          <div className="space-y-3">
            {[featuredIntroduction, ...supportingIntroductions].map((introduction) => (
              <article
                key={`${introduction.resident.id}-${introduction.status}`}
                className="rounded-[1.8rem] border border-[#e1d5c3] bg-[#fbf6ee] px-4 py-4 shadow-[0_26px_60px_-48px_rgba(70,56,35,0.26)]"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={introduction.resident.photo || "/placeholder.svg"}
                    alt={introduction.resident.name}
                    className="size-12 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-xl leading-tight text-foreground">
                      {introduction.resident.name}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#9b8162]">
                      {introduction.resident.goal}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-sm leading-7 text-[#655645]">
                  {introduction.compatibilitySummary || introduction.resident.tagline}
                </p>

                {introduction.resident.compatibilityDetails?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {introduction.resident.compatibilityDetails.slice(0, 3).map((detail) => (
                      <span
                        key={detail}
                        className="rounded-full border border-[#e3d8c7] bg-[#f7f0e5] px-3 py-1 text-[11px] text-[#766654]"
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
      </div>

      <div className="mt-8 grid gap-4 px-6">
        <div className="rounded-[1.8rem] border border-[#e1d5c3] bg-[#fbf6ee] px-5 py-5">
          <SectionLabel>Profile refinement</SectionLabel>
          <h3 className="font-serif text-[1.6rem] leading-tight text-foreground">
            Help us make the next introduction even better.
          </h3>
          <p className="mt-3 text-sm leading-7 text-[#6d5d4d]">
            Small updates to your availability, preferred connection style, or concierge note can
            sharpen match quality without making the experience feel like a survey.
          </p>
          <button
            type="button"
            onClick={onRefineProfile}
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#876f4c]"
          >
            Continue refining profile
            <NotebookPen className="size-4" />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.8rem] border border-[#e1d5c3] bg-[#fbf6ee] px-5 py-5">
            <SectionLabel>Community guidance</SectionLabel>
            <h3 className="font-serif text-[1.5rem] leading-tight text-foreground">
              Introductions work best when the next step feels easy.
            </h3>
            <p className="mt-3 text-sm leading-7 text-[#6d5d4d]">
              We prioritize one-on-one or small-group moments that fit the rhythm residents already
              said yes to, then suggest a calm in-building setting to make the first meetup feel
              natural.
            </p>
            <button
              type="button"
              onClick={onOpenPeople}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#876f4c]"
            >
              Review current introductions
              <ArrowUpRight className="size-4" />
            </button>
          </div>

          <div className="rounded-[1.8rem] border border-[#e1d5c3] bg-[#fbf6ee] px-5 py-5">
            <SectionLabel>Gatherings</SectionLabel>
            {nextGathering ? (
              <>
                <h3 className="font-serif text-[1.5rem] leading-tight text-foreground">
                  {nextGathering.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#6d5d4d]">
                  {nextGathering.date} · {nextGathering.time} · {nextGathering.location}
                </p>
                <p className="mt-3 text-sm leading-7 text-[#6d5d4d]">
                  A gathering can be the gentlest first entry point for residents who prefer meeting
                  through a shared moment before a one-on-one introduction.
                </p>
                <button
                  type="button"
                  onClick={onOpenCommunity}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#876f4c]"
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
        </div>
      </div>
    </div>
  )
}
