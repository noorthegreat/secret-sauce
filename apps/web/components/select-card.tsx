"use client"

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

export function SelectCard({
  label,
  note,
  selected,
  onClick,
}: {
  label: string
  note?: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-left transition-all",
        selected
          ? "border-gold/60 bg-gold/10 shadow-[0_8px_24px_-16px_rgba(170,140,80,0.6)]"
          : "border-border bg-card hover:border-gold/40",
      )}
    >
      <span>
        <span className="block font-serif text-lg leading-tight text-foreground">{label}</span>
        {note ? <span className="mt-0.5 block text-sm text-muted-foreground">{note}</span> : null}
      </span>
      <span
        className={cn(
          "ml-3 flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
          selected ? "border-gold bg-gold text-gold-foreground" : "border-border text-transparent",
        )}
      >
        <Check className="size-3.5" strokeWidth={2.5} />
      </span>
    </button>
  )
}

export function Chip({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-sm transition-all",
        selected
          ? "border-gold bg-foreground text-background"
          : "border-border bg-card text-foreground hover:border-gold/50",
      )}
    >
      {label}
    </button>
  )
}
