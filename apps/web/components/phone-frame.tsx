import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function PhoneFrame({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("relative mx-auto w-full max-w-[390px]", className)}>
      <div className="relative overflow-hidden rounded-[2.75rem] border border-border bg-card shadow-[0_40px_80px_-32px_rgba(60,52,40,0.45)] ring-1 ring-black/5">
        {/* status notch */}
        <div className="pointer-events-none absolute left-1/2 top-0 z-30 h-7 w-36 -translate-x-1/2 rounded-b-2xl bg-foreground/90" />
        <div className="relative h-[760px] overflow-hidden">{children}</div>
      </div>
    </div>
  )
}

export function StatusBar({ dark = false }: { dark?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-7 pb-1 pt-3 text-[11px] font-medium tracking-wide",
        dark ? "text-background/80" : "text-foreground/70",
      )}
    >
      <span>9:41</span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-4 rounded-[3px] border border-current opacity-70" />
        <span className="inline-block h-2.5 w-2.5 rounded-full border border-current opacity-70" />
        <span className="inline-block h-2.5 w-6 rounded-[3px] border border-current opacity-70" />
      </span>
    </div>
  )
}
