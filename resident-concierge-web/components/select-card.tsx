"use client"

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

export function SelectCard({
  label,
  note,
  selected,
  onClick,
  tone = "light",
}: {
  label: string
  note?: string
  selected: boolean
  onClick: () => void
  tone?: "light" | "dark"
}) {
  const isDark = tone === "dark"

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-left transition-all",
        selected
          ? isDark
            ? "border-[#b89655] bg-[#2c251d] shadow-[0_8px_24px_-16px_rgba(170,140,80,0.38)]"
            : "border-gold/60 bg-gold/10 shadow-[0_8px_24px_-16px_rgba(170,140,80,0.6)]"
          : isDark
            ? "border-[#42382d] bg-[#251f19] hover:border-[#b89655]/70"
            : "border-border bg-card hover:border-gold/40",
      )}
    >
      <span>
        <span
          className={cn(
            "block font-serif text-lg leading-tight",
            isDark ? "text-[#f3ebdc]" : "text-foreground",
          )}
        >
          {label}
        </span>
        {note ? (
          <span
            className={cn(
              "mt-0.5 block text-sm",
              isDark ? "text-[#a79883]" : "text-muted-foreground",
            )}
          >
            {note}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          "ml-3 flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
          selected
            ? isDark
              ? "border-[#b89655] bg-[#b89655] text-[#251f19]"
              : "border-gold bg-gold text-gold-foreground"
            : isDark
              ? "border-[#4a4034] text-transparent"
              : "border-border text-transparent",
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
  tone = "light",
}: {
  label: string
  selected: boolean
  onClick: () => void
  tone?: "light" | "dark"
}) {
  const isDark = tone === "dark"

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-sm transition-all",
        selected
          ? isDark
            ? "border-[#b89655] bg-[#b89655]/18 text-[#f3ebdc]"
            : "border-gold bg-foreground text-background"
          : isDark
            ? "border-[#42382d] bg-[#251f19] text-[#f3ebdc] hover:border-[#b89655]/60"
            : "border-border bg-card text-foreground hover:border-gold/50",
      )}
    >
      {label}
    </button>
  )
}
