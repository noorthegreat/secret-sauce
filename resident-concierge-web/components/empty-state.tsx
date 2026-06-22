"use client"

import type { LucideIcon } from "lucide-react"

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="rounded-[1.9rem] border border-dashed border-[#ddcfba] bg-[linear-gradient(180deg,#fbf6ee_0%,#f7efe2_100%)] px-5 py-8 text-center shadow-[0_18px_48px_-42px_rgba(70,56,35,0.22)]">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-gold/25 bg-gold/10 shadow-[0_10px_24px_-18px_rgba(193,154,77,0.45)]">
        <Icon className="size-5 text-gold" strokeWidth={1.5} />
      </div>
      <h3 className="mt-4 font-serif text-[1.85rem] leading-tight text-foreground">{title}</h3>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-[#756656]">
        {description}
      </p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 rounded-full border border-[#ddcfba] bg-[#f6eee1] px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-gold/40"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}
