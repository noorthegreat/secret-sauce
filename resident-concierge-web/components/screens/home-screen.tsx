"use client"

import { ArrowUpRight, CalendarCheck, Lightbulb, UserPlus } from "lucide-react"

import { ResidentAccessCard } from "@/components/resident-access-card"
import { ScreenHeader, SectionLabel } from "@/components/screen-header"
import type { Resident } from "@/lib/concierge-data"
import type { CommunityEvent } from "@/lib/community-live"
import type { ResidentAccountSnapshot } from "@/lib/resident-account-server"

export function HomeScreen({
  onRequestIntro,
  onGoPeople,
  onGoCommunity,
  onSignIn,
  onCompleteProfile,
  onReturnToJoin,
  welcomeName,
  introCount,
  residents,
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
  residents: Resident[]
  events: CommunityEvent[]
  isSignedIn: boolean
  sessionLoading: boolean
  accountSnapshot: ResidentAccountSnapshot | null
  accountLoading: boolean
}) {
  const featured = residents[0]
  const suggested = residents[Math.min(1, residents.length - 1)] ?? featured
  const event = events[0]

  if (!featured || !event || !suggested) {
    return null
  }

  return (
    <div className="h-full overflow-y-auto pb-28">
      <div className="pt-3">
        <ScreenHeader eyebrow="Tuesday · Good evening" title={`Welcome home, ${welcomeName}`} />
        <p className="mt-2 px-6 text-sm leading-relaxed text-muted-foreground">
          Your concierge has {introCount} considered introduction{introCount === 1 ? "" : "s"} for you this week.
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
        <QuickAction icon={UserPlus} label="Request Intro" onClick={onGoPeople} />
        <QuickAction icon={CalendarCheck} label="RSVP" onClick={onGoCommunity} />
        <QuickAction icon={Lightbulb} label="Suggest Event" onClick={onGoCommunity} />
      </div>

      <div className="mt-8 px-6">
        <SectionLabel>Tonight&apos;s introduction</SectionLabel>
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="relative">
            <img
              src={featured.photo || "/placeholder.svg"}
              alt={featured.name}
              className="h-56 w-full object-cover"
            />
            <span className="absolute left-4 top-4 rounded-full bg-background/85 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground backdrop-blur">
              {featured.shared} shared interests
            </span>
          </div>
          <div className="p-5">
            <p className="text-xs text-muted-foreground">{featured.unit}</p>
            <h3 className="mt-0.5 font-serif text-2xl leading-tight text-foreground">{featured.name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground/75">{featured.tagline}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {featured.interests.slice(0, 3).map((interest) => (
                <span
                  key={interest}
                  className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground"
                >
                  {interest}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onRequestIntro(featured.id)}
              className="mt-5 w-full rounded-full bg-foreground py-3.5 text-sm font-medium tracking-wide text-background transition-transform active:scale-[0.99]"
            >
              Request Introduction
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 px-6">
        <SectionLabel>Happening soon</SectionLabel>
        <button
          type="button"
          onClick={onGoCommunity}
          className="flex w-full items-center gap-4 overflow-hidden rounded-3xl border border-border bg-card p-3 text-left"
        >
          <img
            src={event.image || "/placeholder.svg"}
            alt={event.title}
            className="size-20 shrink-0 rounded-2xl object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">{event.date}</p>
            <h3 className="mt-1 truncate font-serif text-xl leading-tight text-foreground">{event.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {event.time} · {event.location}
            </p>
          </div>
          <ArrowUpRight className="size-5 shrink-0 text-muted-foreground" />
        </button>
      </div>

      <div className="mt-8 px-6">
        <SectionLabel>A suggested meetup</SectionLabel>
        <div className="rounded-3xl border border-gold/40 bg-gold/10 p-5">
          <p className="text-sm leading-relaxed text-foreground/85">
            You and <span className="font-medium text-foreground">{suggested.name}</span> both value intentional conversation and shared interests. A quiet coffee chat in the Resident Lounge could be lovely.
          </p>
          <button
            type="button"
            onClick={() => onRequestIntro(suggested.id)}
            className="mt-4 w-full rounded-full border border-foreground/15 bg-card py-3 text-sm font-medium text-foreground transition-colors hover:border-foreground/30"
          >
            Arrange a coffee chat
          </button>
        </div>
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
      className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-2 py-4 transition-colors hover:border-gold/40"
    >
      <Icon className="size-5 text-gold" strokeWidth={1.5} />
      <span className="text-center text-[11px] leading-tight text-foreground/80">{label}</span>
    </button>
  )
}
