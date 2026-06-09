"use client"

import { useRouter } from "next/navigation"

import { Onboarding } from "@/components/onboarding"
import { PhoneFrame } from "@/components/phone-frame"

export default function ResidentOnboardingPage() {
  const router = useRouter()

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
            <Onboarding onComplete={() => router.push("/app")} />
          </PhoneFrame>
        </div>
      </div>
    </main>
  )
}
