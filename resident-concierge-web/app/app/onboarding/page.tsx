"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

import { Onboarding, type OnboardingSubmission } from "@/components/onboarding"
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
    <main className="min-h-screen bg-[#1f1a15]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-8">
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
          <div className="rounded-[2.4rem] border border-[#3d3328] bg-[#1f1a15] shadow-[0_35px_100px_-40px_rgba(0,0,0,0.65)]">
            <Onboarding onComplete={handleComplete} />
          </div>
        )}
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
    <div className="rounded-[2.4rem] border border-[#3d3328] bg-[#1f1a15] px-8 py-10 text-center text-[#f3ebdc]">
      <p className="font-serif text-3xl leading-tight">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-[#b8ab97]">{description}</p>
      {ctaLabel && ctaHref ? (
        <Link
          href={ctaHref}
          className="mt-6 inline-flex rounded-full border border-[#43392f] bg-[#231d17] px-5 py-3 text-sm font-medium text-[#f3ebdc]"
        >
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  )
}
