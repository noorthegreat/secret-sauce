import Link from "next/link"

import { PreviewLinkCard } from "@/components/preview-link-card"

export default function Page() {
  return (
    <main className="min-h-screen bg-background">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(191,151,85,0.16),_transparent_42%)]" />
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.12]">
          <img src="/building.png" alt="" aria-hidden="true" className="h-full w-full object-cover blur-[2px]" />
        </div>
        <div className="mx-auto max-w-6xl px-6 py-10 sm:px-8 lg:px-10 lg:py-14">
          <header className="relative overflow-hidden rounded-[2.75rem] border border-border bg-card/95 px-8 py-10 shadow-[0_32px_70px_-42px_rgba(70,56,35,0.35)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(191,151,85,0.1),transparent)]" />
            <p className="font-mono text-[11px] uppercase tracking-[0.42em] text-gold">
              Resident Concierge
            </p>
            <h1 className="mt-6 max-w-4xl text-balance font-serif text-5xl leading-[0.98] text-foreground sm:text-6xl lg:text-7xl">
              A private resident community, shaped with the care of a concierge.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Resident Concierge helps luxury residential buildings quietly bring the right neighbors
              together through curated introductions, thoughtful gatherings, and a calm operational
              view for the building team.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/join-community?invite=CHORUS"
                className="rounded-full bg-foreground px-6 py-3 text-sm font-medium tracking-wide text-background"
              >
                Join a community
              </Link>
              <Link
                href="/for-buildings"
                className="rounded-full border border-border bg-background px-6 py-3 text-sm font-medium tracking-wide text-foreground"
              >
                Request a building pilot
              </Link>
              <Link
                href="/prototype"
                className="rounded-full border border-border bg-card px-6 py-3 text-sm font-medium tracking-wide text-muted-foreground"
              >
                Open preview controls
              </Link>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                "Private access for one building at a time",
                "Concierge-led introductions, never noisy discovery",
                "Community Pulse for demand, events, and resident traction",
              ].map((item) => (
                <div key={item} className="rounded-[1.4rem] border border-border/70 bg-background/75 px-4 py-3 text-sm text-foreground/80 backdrop-blur-sm">
                  {item}
                </div>
              ))}
            </div>
          </header>

          <section className="mt-8 grid gap-5 lg:grid-cols-3">
            <PreviewLinkCard
              href="/join-community?invite=CHORUS"
              eyebrow="Resident"
              title="Live join flow"
              description="A calm, private intake experience for residents requesting access to their building community."
            />
            <PreviewLinkCard
              href="/app"
              eyebrow="Resident"
              title="Community app"
              description="A concierge-style resident experience for introductions, gatherings, and profile access."
            />
            <PreviewLinkCard
              href="/for-buildings"
              eyebrow="Building"
              title="Manager request flow"
              description="A building-facing pilot request flow designed for property teams, not generic lead capture."
            />
          </section>

          <section className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[2rem] border border-border bg-card/95 p-7">
              <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold">
                What is already in place
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-border bg-background p-5">
                  <h2 className="font-serif text-2xl text-foreground">One shared backend foundation</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    The web experience is wired to the existing `secret-sauce` Supabase foundation instead
                    of creating a second resident system behind the scenes.
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-border bg-background p-5">
                  <h2 className="font-serif text-2xl text-foreground">Live-ready secure routes</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Building-scoped manager and resident APIs are already in place, ready to read live
                    data when the production environment is configured.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-border bg-card/95 p-7">
              <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold">
                Pilot journey
              </p>
              <ol className="mt-5 space-y-3 text-sm leading-relaxed text-muted-foreground">
                <li>1. The building team requests a pilot and receives a private launch path.</li>
                <li>2. Residents request access, complete onboarding, and quietly enter the community.</li>
                <li>3. Introductions and gatherings begin with privacy, context, and building scope built in.</li>
                <li>4. Community Pulse gives the property team a clear read on traction without becoming a noisy portal.</li>
              </ol>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
