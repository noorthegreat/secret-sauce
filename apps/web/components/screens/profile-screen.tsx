"use client"

import { ScreenHeader, SectionLabel } from "@/components/screen-header"
import { LayoutDashboard, ChevronRight, Bell, ShieldCheck } from "lucide-react"

const myInterests = ["Wellness", "Food", "Books", "Art", "Travel"]

export function ProfileScreen({ onOpenManager }: { onOpenManager: () => void }) {
  return (
    <div className="h-full overflow-y-auto pb-28">
      <div className="pt-3">
        <ScreenHeader eyebrow="Your profile" title="Ava Bennett" />
      </div>

      <div className="mt-6 px-6">
        <div className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5">
          <div className="flex size-16 items-center justify-center rounded-full bg-foreground font-serif text-2xl text-background">
            AB
          </div>
          <div>
            <p className="font-serif text-xl leading-tight text-foreground">Residence 14E</p>
            <p className="text-sm text-muted-foreground">Member since 2024</p>
          </div>
        </div>
      </div>

      <div className="mt-8 px-6">
        <SectionLabel>Your interests</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {myInterests.map((i) => (
            <span
              key={i}
              className="rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-sm text-foreground"
            >
              {i}
            </span>
          ))}
          <button
            type="button"
            className="rounded-full border border-dashed border-border px-4 py-1.5 text-sm text-muted-foreground"
          >
            Edit
          </button>
        </div>
      </div>

      <div className="mt-8 px-6">
        <SectionLabel>Preferences</SectionLabel>
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <Row icon={Bell} label="Introduction frequency" value="Considered" />
          <Row icon={ShieldCheck} label="Visibility" value="Neighbors only" />
        </div>
      </div>

      <div className="mt-8 px-6">
        <SectionLabel>Building team</SectionLabel>
        <button
          type="button"
          onClick={onOpenManager}
          className="flex w-full items-center gap-4 rounded-3xl border border-border bg-card p-5 text-left transition-colors hover:border-gold/40"
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-foreground text-background">
            <LayoutDashboard className="size-5" strokeWidth={1.5} />
          </span>
          <span className="flex-1">
            <span className="block font-serif text-lg leading-tight text-foreground">
              Property Manager Dashboard
            </span>
            <span className="text-xs text-muted-foreground">Engagement & amenity insights</span>
          </span>
          <ChevronRight className="size-5 text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Bell
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border/60 px-5 py-4 last:border-0">
      <Icon className="size-[18px] text-gold" strokeWidth={1.5} />
      <span className="flex-1 text-sm text-foreground">{label}</span>
      <span className="text-sm text-muted-foreground">{value}</span>
    </div>
  )
}
