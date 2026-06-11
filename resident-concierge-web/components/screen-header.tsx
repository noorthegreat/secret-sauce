import { cn } from "@/lib/utils"

export function ScreenHeader({
  eyebrow,
  title,
  className,
  accent,
}: {
  eyebrow: string
  title: string
  className?: string
  accent?: string
}) {
  return (
    <header className={cn("px-6 pt-3", className)}>
      <span className="font-mono text-[10px] uppercase tracking-[0.34em] text-gold">{eyebrow}</span>
      <h1 className="mt-2 text-balance font-serif text-[2rem] leading-[1.02] text-foreground">
        {title}
        {accent ? <span className="italic text-gold"> {accent}</span> : null}
      </h1>
    </header>
  )
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.32em] text-gold">
      {children}
    </h2>
  )
}
