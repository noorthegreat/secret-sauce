import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

export function PreviewLinkCard({
  href,
  eyebrow,
  title,
  description,
}: {
  href: string
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-[2rem] border border-border bg-card/95 p-6 shadow-[0_28px_60px_-46px_rgba(65,52,33,0.55)] transition-all hover:-translate-y-0.5 hover:border-gold/40"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[linear-gradient(180deg,rgba(191,151,85,0.08),transparent)]" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-gold">{eyebrow}</p>
          <h3 className="mt-3 font-serif text-[1.75rem] leading-tight text-foreground">{title}</h3>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-background/70 text-foreground transition-colors group-hover:border-gold/40">
          <ArrowUpRight className="size-4" />
        </span>
      </div>
    </Link>
  )
}
