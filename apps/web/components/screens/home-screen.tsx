"use client"

import { ScreenHeader, SectionLabel } from "@/components/screen-header"
import { residents, events } from "@/lib/concierge-data"
import { UserPlus, CalendarCheck, Lightbulb, ArrowUpRight } from "lucide-react"

export function HomeScreen({
  onRequestIntro,
  onGoPeople,
  onGoCommunity,
}: {
  onRequestIntro: (id: string) => void
  onGoPeople: () => void
  onGoCommunity: () => void
}) {
  const featured = residents[0]
  const event = events[0]

  return (
    <div className="h-full overflow-y-auto pb-28">
      <div className="pt-3">
        <ScreenHeader eyebrow="Tuesday · Good evening" title="Welcome home, Ava" />
        <p className="mt-2 px-6 text-sm leading-relaxed text-muted-foreground">
          Your concierge has three considered introductions for you this week.
        </p>
      </div>

      {/* Quick actions */}
      <div className="mt-6 grid grid-cols-3 gap-2.5 px-6">
        <QuickAction icon={UserPlus} label="Request Intro" onClick={onGoPeople} />
        <QuickAction icon={CalendarCheck} label="RSVP" onClick={onGoCommunity} />
        <QuickAction icon={Lightbulb} label="Suggest Event" onClick={onGoCommunity} />
      </div>

      {/* Top recommended neighbor */}
      <div className="mt-8 px-6">
        <SectionLabel>Tonight's introduction</SectionLabel>
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
            <h3 className="mt-0.5 font-serif text-2xl leading-tight text-foreground">
              {featured.name}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground/75">{featured.tagline}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {featured.interests.slice(0, 3).map((i) => (
                <span
                  key={i}
                  className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground"
                >
                  {i}
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

      {/* Upcoming event */}
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

      {/* Suggested meetup */}
      <div className="mt-8 px-6">
        <SectionLabel>A suggested meetup</SectionLabel>
        <div className="rounded-3xl border border-gold/40 bg-gold/10 p-5">
          <p className="text-sm leading-relaxed text-foreground/85">
            You and{" "}
            <span className="font-medium text-foreground">{residents[4].name}</span> both love early
            mornings and good coffee. A quiet coffee chat in the Resident Lounge could be lovely.
          </p>
          <button
            type="button"
            onClick={() => onRequestIntro(residents[4].id)}
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
