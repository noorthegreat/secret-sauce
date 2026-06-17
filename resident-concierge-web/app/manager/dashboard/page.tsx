"use client"

import Link from "next/link"
import { ShieldCheck } from "lucide-react"
import { useRouter } from "next/navigation"

import { FifthCircleBrandMark } from "@/components/fifth-circle-brand-mark"
import { ManagerDashboard } from "@/components/screens/manager-dashboard"
import { useResidentSession } from "@/lib/session-browser"

export default function ManagerDashboardPage() {
  const router = useRouter()
  const { session, user, isLoading } = useResidentSession()

  return (
    <main className="min-h-screen bg-[#201a15] text-[#f3ebdc]">
      <div className="mx-auto grid min-h-screen max-w-[1440px] lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden border-r border-white/8 bg-[#1e1813] lg:flex lg:flex-col lg:justify-between lg:px-8 lg:py-8">
          <div>
            <FifthCircleBrandMark
              theme="dark"
              align="left"
              caption="Private communities, thoughtfully connected."
            />

            <div className="mt-14 rounded-[1.9rem] border border-white/8 bg-white/4 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
                Building team
              </p>
              <h1 className="mt-4 font-serif text-[2.4rem] leading-[0.96] text-[#f3ebdc]">
                Community Pulse
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-[#c8baa6]">
                An operating view for introductions, resident participation, gathering traction, and concierge follow-through.
              </p>
            </div>
          </div>

          <div>
            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-white/10 px-4 py-3 text-sm font-medium text-[#f3ebdc] transition-colors hover:bg-white/6"
            >
              Back to overview
            </Link>
          </div>
        </aside>

        <section className="relative overflow-hidden bg-[#efe6d8]">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <img
              src="/building.png"
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover opacity-[0.11] blur-[2px]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(239,230,216,0.9),rgba(246,238,225,0.98))]" />
          </div>

          <div className="relative z-10 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-10">
            <div className="mb-6 rounded-[2rem] border border-[#ded1bf] bg-[#fbf6ee]/95 p-5 lg:hidden">
              <FifthCircleBrandMark caption="Community Pulse" theme="light" align="left" />
            </div>

            <div className="overflow-hidden rounded-[2.4rem] border border-[#d8cab7] bg-[#fbf6ee]/96 shadow-[0_40px_90px_-50px_rgba(70,56,35,0.36)]">
              <div className="min-h-[860px]">
                {isLoading ? (
                  <CenteredState title="Checking secure manager access..." />
                ) : !user || !session?.access_token ? (
                  <CenteredState
                    title="Manager sign-in required."
                    description="Use the same work email submitted on your pilot request. Community Pulse is only available for approved building staff."
                    ctaLabel="Sign in"
                    ctaHref="/auth?next=%2Fmanager%2Fdashboard"
                  />
                ) : (
                  <ManagerDashboard accessToken={session.access_token} onBack={() => router.push("/")} />
                )}
              </div>
            </div>
          </div>
        </section>
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
    <div className="flex h-full flex-col items-center justify-center px-8 py-20 text-center">
      <span className="flex size-14 items-center justify-center rounded-full border border-gold/25 bg-gold/10 text-gold">
        <ShieldCheck className="size-6" strokeWidth={1.5} />
      </span>
      <p className="mt-5 font-serif text-3xl leading-tight text-foreground">{title}</p>
      {description ? (
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
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
