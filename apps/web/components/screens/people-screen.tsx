"use client"

import { useState } from "react"
import { ScreenHeader } from "@/components/screen-header"
import { residents, type Resident } from "@/lib/concierge-data"
import { Check, Clock, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

type Status = "idle" | "requested" | "matched"

export function PeopleScreen({
  onSchedule,
}: {
  onSchedule: (resident: Resident) => void
}) {
  const [statuses, setStatuses] = useState<Record<string, Status>>({})

  const setStatus = (id: string, s: Status) =>
    setStatuses((prev) => ({ ...prev, [id]: s }))

  const request = (id: string) => {
    setStatus(id, "requested")
    // Simulate the neighbor accepting — mutual match unlocks scheduling.
    setTimeout(() => setStatus(id, "matched"), 1400)
  }

  return (
    <div className="h-full overflow-y-auto pb-28">
      <div className="pt-3">
        <ScreenHeader eyebrow="Chosen for you" title="Neighbors worth meeting" />
        <p className="mt-2 px-6 text-sm leading-relaxed text-muted-foreground">
          A short, considered list — not a directory. Introductions open a meetup only once you both
          accept.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-4 px-6">
        {residents.slice(1).map((r) => {
          const status = statuses[r.id] ?? "idle"
          return (
            <article key={r.id} className="overflow-hidden rounded-3xl border border-border bg-card">
              <div className="flex gap-4 p-4">
                <img
                  src={r.photo || "/placeholder.svg"}
                  alt={r.name}
                  className="size-20 shrink-0 rounded-2xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-muted-foreground">{r.unit}</p>
                  <h3 className="font-serif text-xl leading-tight text-foreground">{r.name}</h3>
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-0.5 text-[11px] text-gold-foreground">
                    <Sparkles className="size-3 text-gold" /> {r.goal}
                  </span>
                </div>
              </div>
              <p className="px-4 text-sm leading-relaxed text-foreground/75">{r.tagline}</p>
              <div className="flex flex-wrap gap-2 px-4 pt-3">
                {r.interests.map((i) => (
                  <span
                    key={i}
                    className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground"
                  >
                    {i}
                  </span>
                ))}
              </div>

              <div className="p-4">
                {status === "idle" && (
                  <button
                    type="button"
                    onClick={() => request(r.id)}
                    className="w-full rounded-full bg-foreground py-3.5 text-sm font-medium tracking-wide text-background transition-transform active:scale-[0.99]"
                  >
                    Request Introduction
                  </button>
                )}
                {status === "requested" && (
                  <div className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-secondary py-3.5 text-sm font-medium text-muted-foreground">
                    <Clock className="size-4 animate-pulse" />
                    Awaiting {r.name.split(" ")[0]}&apos;s response
                  </div>
                )}
                {status === "matched" && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-center gap-2 rounded-full bg-gold/15 py-2 text-sm font-medium text-gold-foreground">
                      <Check className="size-4 text-gold" /> You&apos;re both interested
                    </div>
                    <button
                      type="button"
                      onClick={() => onSchedule(r)}
                      className="w-full rounded-full bg-foreground py-3.5 text-sm font-medium tracking-wide text-background transition-transform active:scale-[0.99]"
                    >
                      Schedule a meetup
                    </button>
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
