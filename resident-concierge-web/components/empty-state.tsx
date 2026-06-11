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
    <div className="rounded-3xl border border-dashed border-border bg-card/70 px-5 py-8 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-gold/25 bg-gold/10">
        <Icon className="size-5 text-gold" strokeWidth={1.5} />
      </div>
      <h3 className="mt-4 font-serif text-2xl text-foreground">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-gold/40"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}
