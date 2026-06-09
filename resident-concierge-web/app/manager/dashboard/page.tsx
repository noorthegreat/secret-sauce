"use client"

import Link from "next/link"
import { ShieldCheck } from "lucide-react"
import { useRouter } from "next/navigation"

import { ManagerDashboard } from "@/components/screens/manager-dashboard"
import { useResidentSession } from "@/lib/session-browser"

export default function ManagerDashboardPage() {
  const router = useRouter()
  const { session, user, isLoading } = useResidentSession()

  return (
    <main className="min-h-screen bg-background">
      <div className="relative flex min-h-screen flex-col items-center px-4 py-10 lg:py-16">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <img
            src="/building.png"
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover opacity-[0.06]"
          />
        </div>

        <header className="relative z-10 mb-10 text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.4em] text-gold">
            Building team
          </span>
          <h1 className="mt-3 text-balance font-serif text-4xl leading-tight text-foreground sm:text-5xl">
            Community Pulse dashboard
          </h1>
          <p className="mx-auto mt-3 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
            Secure manager-side access to resident demand, event traction, and the overall health of
            the building community.
          </p>
          <div className="mt-5">
            <Link
              href="/"
              className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground"
            >
              Back to overview
            </Link>
          </div>
        </header>

        <div className="relative z-10 w-full max-w-[390px]">
          <div className="relative overflow-hidden rounded-[2.75rem] border border-border bg-card shadow-[0_40px_80px_-32px_rgba(60,52,40,0.45)] ring-1 ring-black/5">
            <div className="pointer-events-none absolute left-1/2 top-0 z-30 h-7 w-36 -translate-x-1/2 rounded-b-2xl bg-foreground/90" />
            <div className="relative h-[760px] overflow-hidden">
              {isLoading ? (
                <CenteredState title="Checking secure manager access..." />
              ) : !user || !session?.access_token ? (
                <CenteredState
                  title="Manager sign-in required."
                  description="Community Pulse is only available after authentication for approved building staff."
                  ctaLabel="Sign in"
                  ctaHref="/auth?next=%2Fmanager%2Fdashboard"
                />
              ) : (
                <ManagerDashboard
                  accessToken={session.access_token}
                  onBack={() => router.push("/app/profile")}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function CenteredState({
  title,
  description,
  ctaLabel,
  ctaHref,
}: {
  title: string
  description?: string
  ctaLabel?: string
  ctaHref?: string
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <span className="flex size-14 items-center justify-center rounded-full border border-gold/25 bg-gold/10 text-gold">
        <ShieldCheck className="size-6" strokeWidth={1.5} />
      </span>
      <p className="mt-5 font-serif text-3xl leading-tight text-foreground">{title}</p>
      {description ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      {ctaLabel && ctaHref ? (
        <Link
          href={ctaHref}
          className="mt-6 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background"
        >
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  )
}
