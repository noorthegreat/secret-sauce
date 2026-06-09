"use client"

import { useState } from "react"

import { BottomNav, type ResidentTab } from "@/components/bottom-nav"
import { MeetupFlow } from "@/components/meetup-flow"
import { Onboarding } from "@/components/onboarding"
import { PhoneFrame, StatusBar } from "@/components/phone-frame"
import { CommunityScreen } from "@/components/screens/community-screen"
import { HomeScreen } from "@/components/screens/home-screen"
import { ManagerDashboard } from "@/components/screens/manager-dashboard"
import { PeopleScreen } from "@/components/screens/people-screen"
import { ProfileScreen } from "@/components/screens/profile-screen"
import { residents, type Resident } from "@/lib/concierge-data"

type View = "onboarding" | "app" | "manager"

export default function PrototypePage() {
  const [view, setView] = useState<View>("onboarding")
  const [tab, setTab] = useState<ResidentTab>("home")
  const [meetupWith, setMeetupWith] = useState<Resident | null>(null)

  const requestIntro = (id: string) => {
    const resident = residents.find((item) => item.id === id)
    setTab("people")
    if (resident) {
      void resident
    }
  }

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
            Prototype
          </span>
          <h1 className="mt-3 text-balance font-serif text-4xl leading-tight text-foreground sm:text-5xl">
            Resident Concierge
          </h1>
          <p className="mx-auto mt-3 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
            The original all-in-one v0 prototype is still here for rapid review while the route-based app
            gets wired up.
          </p>
        </header>

        <div className="relative z-10">
          <PhoneFrame>
            {view === "onboarding" && <Onboarding onComplete={() => setView("app")} />}
            {view === "manager" && <ManagerDashboard onBack={() => setView("app")} />}
            {view === "app" && (
              <div className="flex h-full flex-col bg-background">
                <StatusBar />
                <div className="flex-1 overflow-hidden">
                  {tab === "home" && (
                    <HomeScreen
                      onRequestIntro={requestIntro}
                      onGoPeople={() => setTab("people")}
                      onGoCommunity={() => setTab("community")}
                    />
                  )}
                  {tab === "people" && <PeopleScreen onSchedule={setMeetupWith} />}
                  {tab === "community" && <CommunityScreen />}
                  {tab === "profile" && <ProfileScreen onOpenManager={() => setView("manager")} />}
                </div>
                <BottomNav active={tab} onChange={setTab} />
                {meetupWith && (
                  <MeetupFlow resident={meetupWith} onClose={() => setMeetupWith(null)} />
                )}
              </div>
            )}
          </PhoneFrame>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <ProtoButton active={view === "onboarding"} onClick={() => setView("onboarding")}>
              Onboarding
            </ProtoButton>
            <ProtoButton
              active={view === "app"}
              onClick={() => {
                setView("app")
                setTab("home")
              }}
            >
              Resident App
            </ProtoButton>
            <ProtoButton active={view === "manager"} onClick={() => setView("manager")}>
              Manager Dashboard
            </ProtoButton>
          </div>
        </div>
      </div>
    </main>
  )
}

function ProtoButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-5 py-2 text-xs font-medium tracking-wide transition-colors ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-card text-foreground hover:border-gold/50"
      }`}
    >
      {children}
    </button>
  )
}
