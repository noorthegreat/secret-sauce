import Link from "next/link"

import { PreviewLinkCard } from "@/components/preview-link-card"

export default function Page() {
  return (
    <main className="min-h-screen bg-background">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(191,151,85,0.12),_transparent_42%)]" />
        <div className="mx-auto max-w-6xl px-6 py-10 sm:px-8 lg:px-10 lg:py-14">
          <header className="rounded-[2.5rem] border border-border bg-card px-8 py-10 shadow-[0_32px_70px_-42px_rgba(70,56,35,0.35)]">
            <p className="font-mono text-[11px] uppercase tracking-[0.42em] text-gold">
              Resident Concierge
            </p>
            <h1 className="mt-6 max-w-4xl text-balance font-serif text-5xl leading-[0.98] text-foreground sm:text-6xl lg:text-7xl">
              A private community experience for luxury residential buildings.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Buildings subscribe. Residents opt in. Curated introductions, building events, and
              thoughtful community insights all live in one polished layer.
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
                Request pilot
              </Link>
              <Link
                href="/prototype"
                className="rounded-full border border-border bg-card px-6 py-3 text-sm font-medium tracking-wide text-muted-foreground"
              >
                Open prototype controls
              </Link>
            </div>
          </header>

          <section className="mt-8 grid gap-5 lg:grid-cols-3">
            <PreviewLinkCard
              href="/join-community?invite=CHORUS"
              eyebrow="Resident"
              title="Live join flow"
              description="A real resident intake form connected to the secure Supabase join-request function."
            />
            <PreviewLinkCard
              href="/app"
              eyebrow="Resident"
              title="Community app"
              description="Direct access to home, people, community, and profile previews with real navigation."
            />
            <PreviewLinkCard
              href="/for-buildings"
              eyebrow="Building"
              title="Manager request flow"
              description="A real building-manager pilot request form connected to the existing secure lead intake backend."
            />
          </section>

          <section className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[2rem] border border-border bg-card p-7">
              <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold">
                What is connected now
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-border bg-background p-5">
                  <h2 className="font-serif text-2xl text-foreground">Shared backend foundation</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    This frontend is aligned to the existing `secret-sauce` Supabase schema rather than
                    creating a duplicate backend.
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-border bg-background p-5">
                  <h2 className="font-serif text-2xl text-foreground">Live-ready server routes</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Manager dashboard data and community feed routes can read real building data once the
                    service key is present.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-border bg-card p-7">
              <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold">
                Product path
              </p>
              <ol className="mt-5 space-y-3 text-sm leading-relaxed text-muted-foreground">
                <li>1. Resident joins through a polished concierge onboarding flow.</li>
                <li>2. Building staff reviews community demand and event traction.</li>
                <li>3. Residents discover introductions and building-hosted gatherings.</li>
                <li>4. We keep wiring live Supabase data route by route without losing the v0 design.</li>
              </ol>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
