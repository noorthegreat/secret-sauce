"use client"

import { useState } from "react"
import { ScreenHeader } from "@/components/screen-header"
import { events, eventPolls } from "@/lib/concierge-data"
import { cn } from "@/lib/utils"
import { Users, Check, Plus } from "lucide-react"

export function CommunityScreen() {
  const [tab, setTab] = useState<"events" | "vote">("events")

  return (
    <div className="h-full overflow-y-auto pb-28">
      <div className="pt-3">
        <ScreenHeader eyebrow="Within these walls" title="Community" />
      </div>

      <div className="mt-5 px-6">
        <div className="flex rounded-full border border-border bg-secondary p-1">
          {(["events", "vote"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 rounded-full py-2.5 text-sm font-medium tracking-wide transition-colors",
                tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              {t === "events" ? "Events" : "Vote on next month"}
            </button>
          ))}
        </div>
      </div>

      {tab === "events" ? <EventsList /> : <VotingList />}
    </div>
  )
}

function EventsList() {
  const [rsvps, setRsvps] = useState<Record<string, boolean>>({})
  const building = events.filter((e) => e.host === "Building")
  const resident = events.filter((e) => e.host === "Resident")

  return (
    <div className="mt-6 flex flex-col gap-7 px-6">
      <EventGroup title="Hosted by the building" items={building} rsvps={rsvps} setRsvps={setRsvps} />
      <EventGroup title="Suggested by residents" items={resident} rsvps={rsvps} setRsvps={setRsvps} />
    </div>
  )
}

function EventGroup({
  title,
  items,
  rsvps,
  setRsvps,
}: {
  title: string
  items: typeof events
  rsvps: Record<string, boolean>
  setRsvps: (fn: (p: Record<string, boolean>) => Record<string, boolean>) => void
}) {
  if (items.length === 0) return null
  return (
    <div>
      <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
        {title}
      </h2>
      <div className="flex flex-col gap-4">
        {items.map((e) => {
          const going = rsvps[e.id]
          return (
            <article key={e.id} className="overflow-hidden rounded-3xl border border-border bg-card">
              <img
                src={e.image || "/placeholder.svg"}
                alt={e.title}
                className="h-40 w-full object-cover"
              />
              <div className="p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
                  {e.date} · {e.time}
                </p>
                <h3 className="mt-1.5 font-serif text-2xl leading-tight text-foreground">{e.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/75">{e.description}</p>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="size-3.5" />
                  {e.attendees} attending · {e.location}
                </div>
                <div className="mt-4 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRsvps((p) => ({ ...p, [e.id]: !p[e.id] }))}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-medium tracking-wide transition-colors",
                      going
                        ? "bg-gold/15 text-gold-foreground"
                        : "bg-foreground text-background",
                    )}
                  >
                    {going ? (
                      <>
                        <Check className="size-4 text-gold" /> Attending
                      </>
                    ) : (
                      "RSVP"
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  className="mt-2.5 w-full rounded-full border border-border py-3 text-sm font-medium text-foreground/80 transition-colors hover:border-gold/40"
                >
                  Introduce me to people attending
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

function VotingList() {
  const [voted, setVoted] = useState<Record<string, boolean>>({})

  return (
    <div className="mt-6 px-6">
      <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
        Help shape next month. Add your interest to the gatherings you&apos;d attend.
      </p>
      <div className="flex flex-col gap-3.5">
        {eventPolls.map((p) => {
          const isVoted = voted[p.id]
          const votes = p.votes + (isVoted ? 1 : 0)
          const pct = Math.min(100, p.percent + (isVoted ? 2 : 0))
          return (
            <div key={p.id} className="overflow-hidden rounded-3xl border border-border bg-card">
              <div className="flex items-center gap-4 p-3.5">
                <img
                  src={p.image || "/placeholder.svg"}
                  alt={p.title}
                  className="size-16 shrink-0 rounded-2xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-serif text-lg leading-tight text-foreground">{p.title}</h3>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-gold transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">{votes} residents interested</p>
                </div>
                <button
                  type="button"
                  onClick={() => setVoted((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-full border transition-colors",
                    isVoted
                      ? "border-gold bg-gold text-gold-foreground"
                      : "border-border text-foreground hover:border-gold/50",
                  )}
                  aria-label={`Vote for ${p.title}`}
                >
                  {isVoted ? <Check className="size-5" /> : <Plus className="size-5" />}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
