import { cn } from "@/lib/utils"

export function ScreenHeader({
  eyebrow,
  title,
  className,
}: {
  eyebrow: string
  title: string
  className?: string
}) {
  return (
    <header className={cn("px-6 pt-3", className)}>
      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">{eyebrow}</span>
      <h1 className="mt-1.5 text-balance font-serif text-3xl leading-tight text-foreground">{title}</h1>
    </header>
  )
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
      {children}
    </h2>
  )
}
