"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"

import { FifthCircleBrandMark } from "@/components/fifth-circle-brand-mark"
import { ManagerDashboard } from "@/components/screens/manager-dashboard"
import { useResidentSession } from "@/lib/session-browser"
import { getSupabaseBrowser } from "@/lib/supabase-browser"

type ManagerAccessSnapshot = {
  state:
    | "authorized"
    | "provisioned"
    | "awaiting_provisioning"
    | "no_matching_lead"
    | "building_inactive"
    | "conflict"
  message: string
  buildingName: string | null
  buildingSlug: string | null
  isAdmin: boolean
  isManager: boolean
  provisionedNow: boolean
}

export default function ManagerDashboardPage() {
  const router = useRouter()
  const { session, user, isLoading } = useResidentSession()
  const [access, setAccess] = useState<ManagerAccessSnapshot | null>(null)
  const [accessLoading, setAccessLoading] = useState(false)
  const [accessError, setAccessError] = useState<string | null>(null)

  useEffect(() => {
    if (!session?.access_token || !user) {
      setAccess(null)
      setAccessError(null)
      setAccessLoading(false)
      return
    }

    let isMounted = true

    async function loadAccess() {
      setAccessLoading(true)
      setAccessError(null)

      try {
        const response = await fetch("/api/manager-access", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        })

        const payload = (await response.json()) as ManagerAccessSnapshot & { error?: string }

        if (!response.ok) {
          throw new Error(payload.error || "Unable to verify manager access.")
        }

        if (!isMounted) return
        setAccess(payload)
      } catch (error) {
        if (!isMounted) return
        setAccess(null)
        setAccessError(
          error instanceof Error ? error.message : "Unable to verify manager access.",
        )
      } finally {
        if (!isMounted) return
        setAccessLoading(false)
      }
    }

    void loadAccess()

    return () => {
      isMounted = false
    }
  }, [session?.access_token, user])

  const canOpenDashboard = access?.state === "authorized" || access?.state === "provisioned"

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
                ) : accessLoading ? (
                  <CenteredState
                    title="Preparing Community Pulse..."
                    description="We’re checking your building-team access and launch status."
                    icon={<Loader2 className="size-6 animate-spin" strokeWidth={1.5} />}
                  />
                ) : accessError ? (
                  <CenteredState
                    title="We couldn’t confirm manager access yet."
                    description={accessError}
                    ctaLabel="Return to pilot request"
                    ctaHref="/for-buildings"
                    tone="alert"
                  />
                ) : access && canOpenDashboard ? (
                  <ManagerDashboard
                    accessToken={session.access_token}
                    onBack={() => router.push("/")}
                    access={access}
                  />
                ) : (
                  <ManagerAccessState
                    access={access}
                    onSignOut={async () => {
                      await getSupabaseBrowser().auth.signOut()
                      router.replace("/auth?next=%2Fmanager%2Fdashboard")
                      router.refresh()
                    }}
                  />
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
  icon,
  tone = "default",
}: {
  title: string
  description?: string
  ctaLabel?: string
  ctaHref?: string
  icon?: React.ReactNode
  tone?: "default" | "alert"
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 py-20 text-center">
      <span
        className={`flex size-14 items-center justify-center rounded-full ${
          tone === "alert"
            ? "border border-destructive/20 bg-destructive/5 text-destructive"
            : "border border-gold/25 bg-gold/10 text-gold"
        }`}
      >
        {icon ?? <ShieldCheck className="size-6" strokeWidth={1.5} />}
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

function ManagerAccessState({
  access,
  onSignOut,
}: {
  access: ManagerAccessSnapshot | null
  onSignOut: () => Promise<void>
}) {
  const titleByState: Record<ManagerAccessSnapshot["state"], string> = {
    authorized: "Manager access is ready.",
    provisioned: "Community Pulse is ready.",
    awaiting_provisioning: "Your building team sign-in is almost ready.",
    no_matching_lead: "We couldn't find a building-team pilot request for this account.",
    building_inactive: "Your building is not live yet.",
    conflict: "We need to confirm which building this account should manage.",
  }

  const eyebrowByState: Record<ManagerAccessSnapshot["state"], string> = {
    authorized: "Building team access",
    provisioned: "Access activated",
    awaiting_provisioning: "Pending manager activation",
    no_matching_lead: "No active pilot request found",
    building_inactive: "Pilot not launched yet",
    conflict: "Access needs review",
  }

  if (!access) {
    return null
  }

  const waiting = access.state === "awaiting_provisioning" || access.state === "building_inactive"
  const conflict = access.state === "conflict" || access.state === "no_matching_lead"

  return (
    <div className="flex h-full items-center justify-center px-6 py-14">
      <div className="w-full max-w-3xl rounded-[2rem] border border-[#d8cab7] bg-[#fffaf2]/96 p-8 shadow-[0_40px_90px_-50px_rgba(70,56,35,0.28)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-gold">
              {eyebrowByState[access.state]}
            </p>
            <h2 className="mt-4 font-serif text-4xl leading-[1.02] text-foreground">
              {titleByState[access.state]}
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">{access.message}</p>
            {access.buildingName ? (
              <p className="mt-4 inline-flex rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-xs font-medium text-gold-foreground">
                {access.buildingName}
              </p>
            ) : null}
          </div>

          <div className="rounded-[1.7rem] border border-border bg-white/70 p-5 lg:max-w-[290px]">
            <div className="flex items-center gap-3">
              <span
                className={`flex size-10 items-center justify-center rounded-full ${
                  waiting
                    ? "border border-gold/25 bg-gold/10 text-gold"
                    : "border border-destructive/20 bg-destructive/5 text-destructive"
                }`}
              >
                {waiting ? <Sparkles className="size-4" /> : <ShieldAlert className="size-4" />}
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {waiting ? "What happens next" : "How to unblock access"}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Fifth Circle keeps manager access explicit and building-scoped during the pilot.
                </p>
              </div>
            </div>
            <ol className="mt-4 space-y-2 text-sm leading-relaxed text-muted-foreground">
              <li>1. Use the same work email submitted on your building pilot request.</li>
              <li>2. Wait for Fifth Circle to provision your building-team role.</li>
              <li>3. Return here to open Community Pulse once access is active.</li>
            </ol>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {waiting ? (
            <>
              <Link
                href="/for-buildings"
                className="rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background"
              >
                Review pilot request
              </Link>
              <button
                type="button"
                onClick={() => void onSignOut()}
                className="rounded-full border border-border px-5 py-3 text-sm font-medium text-foreground"
              >
                Sign out and try another account
              </button>
            </>
          ) : conflict ? (
            <>
              <Link
                href="/for-buildings"
                className="rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background"
              >
                Start or review pilot request
              </Link>
              <button
                type="button"
                onClick={() => void onSignOut()}
                className="rounded-full border border-border px-5 py-3 text-sm font-medium text-foreground"
              >
                Sign out
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
