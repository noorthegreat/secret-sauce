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
      className="group rounded-[2rem] border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-gold/40"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">{eyebrow}</p>
          <h3 className="mt-3 font-serif text-2xl leading-tight text-foreground">{title}</h3>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition-colors group-hover:border-gold/40">
          <ArrowUpRight className="size-4" />
        </span>
      </div>
    </Link>
  )
}
