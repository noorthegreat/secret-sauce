"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

import { Onboarding, type OnboardingSubmission } from "@/components/onboarding"
import { PhoneFrame } from "@/components/phone-frame"
import { useResidentAccount } from "@/lib/resident-account-browser"
import { useResidentSession } from "@/lib/session-browser"

export default function ResidentOnboardingPage() {
  const router = useRouter()
  const { session, user, isLoading: sessionLoading } = useResidentSession()
  const { snapshot, errorMessage, isLoading: accountLoading } = useResidentAccount()

  async function handleComplete(submission: OnboardingSubmission) {
    const accessToken = session?.access_token
    if (!accessToken) {
      throw new Error("Sign in before completing onboarding.")
    }

    const response = await fetch("/api/resident-account", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
      body: JSON.stringify(submission),
    })

    const payload = (await response.json()) as { error?: string }

    if (!response.ok) {
      throw new Error(payload.error || "Unable to save your onboarding.")
    }

    router.replace("/app")
    router.refresh()
  }

  const shouldBlockSubmission =
    !user ||
    !snapshot ||
    snapshot.status !== "active" ||
    !snapshot.hasActiveMembership

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
            Resident onboarding
          </span>
          <h1 className="mt-3 text-balance font-serif text-4xl leading-tight text-foreground sm:text-5xl">
            Private opt-in for one building community
          </h1>
        </header>

        <div className="relative z-10">
          <PhoneFrame>
            {sessionLoading || accountLoading ? (
              <CenteredState
                title="Checking your resident access..."
                description="We are confirming your active building membership before saving your onboarding."
              />
            ) : shouldBlockSubmission ? (
              <CenteredState
                title="Resident onboarding unlocks after approval."
                description={
                  errorMessage ||
                  snapshot?.message ||
                  "Sign in with your approved resident account to complete your onboarding."
                }
                ctaLabel={user ? "Back to profile" : "Sign in"}
                ctaHref={user ? "/app/profile" : "/auth?next=%2Fapp%2Fonboarding"}
              />
            ) : (
              <Onboarding onComplete={handleComplete} />
            )}
          </PhoneFrame>
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
  description: string
  ctaLabel?: string
  ctaHref?: string
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <p className="font-serif text-3xl leading-tight text-foreground">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
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
