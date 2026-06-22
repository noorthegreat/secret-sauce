"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarDays, DoorOpen, House, Sparkles, UserRound, Users } from "lucide-react"

import { BottomNav, type ResidentTab } from "@/components/bottom-nav"
import { FifthCircleBrandMark } from "@/components/fifth-circle-brand-mark"
import { MeetupFlow } from "@/components/meetup-flow"
import { ResidentAccessCard } from "@/components/resident-access-card"
import { CommunityScreen } from "@/components/screens/community-screen"
import { ConciergeScreen } from "@/components/screens/concierge-screen"
import { HomeScreen } from "@/components/screens/home-screen"
import { PeopleScreen } from "@/components/screens/people-screen"
import { ProfileScreen } from "@/components/screens/profile-screen"
import { ScreenHeader } from "@/components/screen-header"
import type { Resident } from "@/lib/concierge-data"
import { trackProductEvent } from "@/lib/product-analytics"
import type { IntroductionListResult, IntroductionPreview } from "@/lib/introduction-types"
import { useResidentAccount } from "@/lib/resident-account-browser"
import {
  buildResidentIntroductionCards,
  countVisibleIntroductions,
} from "@/lib/resident-introduction-ui"
import type { ResidentPreviewSnapshot } from "@/lib/resident-preview-live"
import { useResidentSession } from "@/lib/session-browser"
import { cn } from "@/lib/utils"

function getTabPath(tab: ResidentTab) {
  switch (tab) {
    case "home":
      return "/app"
    case "people":
      return "/app/people"
    case "concierge":
      return "/app/concierge"
    case "community":
      return "/app/community"
    case "profile":
      return "/app/profile"
  }
}

const desktopNav = [
  { id: "home", label: "Home", icon: House },
  { id: "people", label: "Neighbors", icon: Users },
  { id: "concierge", label: "Concierge", icon: Sparkles },
  { id: "community", label: "Gatherings", icon: CalendarDays },
  { id: "profile", label: "My profile", icon: UserRound },
] as const

export function ResidentAppShell({
  activeTab,
}: {
  activeTab: ResidentTab
}) {
  const router = useRouter()
  const { user, session, isLoading: sessionLoading } = useResidentSession()
  const {
    snapshot: accountSnapshot,
    errorMessage: accountErrorMessage,
    isLoading: accountLoading,
    refresh: refreshResidentAccount,
  } = useResidentAccount()
  const [meetupContext, setMeetupContext] = useState<{
    resident: Resident
    meetupRecommendation?: {
      title: string
      amenityLabel: string
      timingLabel: string | null
    } | null
  } | null>(null)
  const [previewData, setPreviewData] = useState<ResidentPreviewSnapshot | null>(null)
  const [introductionData, setIntroductionData] = useState<IntroductionListResult | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [introError, setIntroError] = useState<string | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(true)
  const [isIntroLoading, setIsIntroLoading] = useState(true)
  const [introActionResidentId, setIntroActionResidentId] = useState<string | null>(null)
  const [introActionError, setIntroActionError] = useState<string | null>(null)

  const hasActiveAccess = Boolean(
    user &&
      session?.access_token &&
      accountSnapshot?.status === "active" &&
      accountSnapshot.hasActiveMembership,
  )

  useEffect(() => {
    const accessToken = session?.access_token

    if (sessionLoading || accountLoading) {
      setIsPreviewLoading(true)
      setIsIntroLoading(true)
      return
    }

    if (!user || !accessToken || !hasActiveAccess) {
      setPreviewData(null)
      setIntroductionData(null)
      setPreviewError(null)
      setIntroError(null)
      setIsPreviewLoading(false)
      setIsIntroLoading(false)
      return
    }

    let isMounted = true

    const loadPreview = async () => {
      setIsPreviewLoading(true)
      setIsIntroLoading(true)
      setPreviewError(null)
      setIntroError(null)

      try {
        const [previewResponse, introductionsResponse] = await Promise.all([
          fetch("/api/resident-preview", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            cache: "no-store",
          }),
          fetch("/api/introductions", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            cache: "no-store",
          }),
        ])

        const previewPayload = (await previewResponse.json()) as ResidentPreviewSnapshot & {
          error?: string
        }
        const introductionsPayload = (await introductionsResponse.json()) as IntroductionListResult & {
          error?: string
        }

        if (!previewResponse.ok) {
          throw new Error(previewPayload.error || "Unable to load your building community.")
        }

        if (!isMounted) {
          return
        }

        setPreviewData(previewPayload)
        setIsPreviewLoading(false)

        if (introductionsResponse.ok) {
          setIntroductionData(introductionsPayload)
          setIntroError(null)
        } else {
          setIntroductionData({
            buildingId: accountSnapshot?.buildingId ?? "resident-concierge",
            buildingName: previewPayload.buildingName,
            introductions: [],
          })
          setIntroError(introductionsPayload.error || "Unable to load live introductions.")
        }
      } catch (error) {
        if (!isMounted) {
          return
        }

        setPreviewData(null)
        setIntroductionData(null)
        setPreviewError(
          error instanceof Error ? error.message : "Unable to load your building community.",
        )
        setIntroError(null)
      } finally {
        if (isMounted) {
          setIsPreviewLoading(false)
          setIsIntroLoading(false)
        }
      }
    }

    void loadPreview()

    return () => {
      isMounted = false
    }
  }, [accountLoading, accountSnapshot?.buildingId, hasActiveAccess, session?.access_token, sessionLoading, user])

  async function requestIntroduction(targetUserId: string) {
    const accessToken = session?.access_token
    if (!accessToken) {
      router.push("/auth?next=%2Fapp%2Fpeople")
      return
    }

    setIntroActionResidentId(targetUserId)
    setIntroActionError(null)

    try {
      const response = await fetch("/api/introductions/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        body: JSON.stringify({
          targetUserId,
          introType: "friendship",
        }),
      })

      const payload = (await response.json()) as IntroductionPreview & { error?: string }

      if (!response.ok) {
        throw new Error(payload.error || "Unable to request the introduction.")
      }

      trackProductEvent("introduction_requested")

      setIntroductionData((current) => ({
        buildingId: current?.buildingId ?? accountSnapshot?.buildingId ?? "fifth-circle",
        buildingName:
          current?.buildingName ??
          previewData?.buildingName ??
          accountSnapshot?.buildingName ??
          "Fifth Circle",
        introductions: [
          payload,
          ...(current?.introductions ?? []).filter(
            (introduction) => introduction.resident.userId !== payload.resident.userId,
          ),
        ],
      }))
    } catch (error) {
      setIntroActionError(
        error instanceof Error ? error.message : "Unable to request the introduction.",
      )
    } finally {
      setIntroActionResidentId(null)
    }
  }

  async function respondToIntroduction(
    targetResidentId: string,
    introductionId: string,
    action: "accepted" | "declined" | "paused",
  ) {
    const accessToken = session?.access_token
    if (!accessToken) {
      router.push("/auth?next=%2Fapp%2Fpeople")
      return
    }

    setIntroActionResidentId(targetResidentId)
    setIntroActionError(null)

    try {
      const response = await fetch("/api/introductions/respond", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        body: JSON.stringify({
          introductionId,
          action,
        }),
      })

      const payload = (await response.json()) as IntroductionPreview & { error?: string }

      if (!response.ok) {
        throw new Error(payload.error || "Unable to update the introduction.")
      }

      trackProductEvent("introduction_responded", { action })

      setIntroductionData((current) => ({
        buildingId: current?.buildingId ?? accountSnapshot?.buildingId ?? "fifth-circle",
        buildingName:
          current?.buildingName ??
          previewData?.buildingName ??
          accountSnapshot?.buildingName ??
          "Fifth Circle",
        introductions: [
          payload,
          ...(current?.introductions ?? []).filter(
            (introduction) => introduction.resident.userId !== payload.resident.userId,
          ),
        ],
      }))
    } catch (error) {
      setIntroActionError(
        error instanceof Error ? error.message : "Unable to update the introduction.",
      )
    } finally {
      setIntroActionResidentId(null)
    }
  }

  const buildingName = previewData?.buildingName || accountSnapshot?.buildingName || "Fifth Circle"
  const introductionCards = buildResidentIntroductionCards(
    previewData?.residents ?? [],
    introductionData?.introductions ?? [],
  )
  const liveIntroCount = introductionCards.length
    ? countVisibleIntroductions(introductionCards)
    : previewData?.introCount ?? 0
  const residentPreviewUnavailable = hasActiveAccess && !previewData

  if ((sessionLoading || accountLoading || isPreviewLoading) && hasActiveAccess && !previewData) {
    return (
      <main className="min-h-screen bg-[#1d1813] px-6 py-16">
        <div className="mx-auto max-w-6xl rounded-[2.25rem] border border-white/10 bg-[#231d17] px-8 py-16 text-center">
          <p className="font-serif text-3xl text-[#f3ebdc]">Loading your building community...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#1d1813] text-[#f3ebdc]">
      <div className="mx-auto min-h-screen max-w-[1600px] lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden border-r border-white/8 bg-[#1d1813] lg:flex lg:min-h-screen lg:flex-col">
          <div className="px-7 py-8">
            <FifthCircleBrandMark
              theme="dark"
              align="left"
              caption="The circle closest to home."
              className="gap-4"
            />
          </div>

          <nav className="flex flex-1 flex-col gap-1 px-4 py-4">
            {desktopNav.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => router.push(getTabPath(item.id))}
                  className={cn(
                    "flex items-center gap-3 border-l px-4 py-3 text-left text-[11px] uppercase tracking-[0.22em] transition-colors",
                    isActive
                      ? "border-[#c19951] bg-white/5 text-[#f3ebdc]"
                      : "border-transparent text-[#a89a87] hover:bg-white/4 hover:text-[#f3ebdc]",
                  )}
                >
                  <Icon className="size-4" strokeWidth={1.5} />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>

          <div className="border-t border-white/8 px-7 py-6">
            <p className="text-sm text-[#d4c8b6]">{buildingName}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-[#8e816f]">
              Private Community
            </p>
          </div>
        </aside>

        <div className="relative min-h-screen overflow-hidden bg-[#f3ede2]">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <img
              src="/building.png"
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover opacity-[0.09] blur-[2px]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(243,237,226,0.9),rgba(243,237,226,0.97))]" />
          </div>

          <div className="relative z-10 min-h-screen pb-24 lg:pb-0">
            <div className="border-b border-[#e2d5c2] px-5 py-5 lg:hidden">
              <FifthCircleBrandMark
                theme="light"
                align="left"
                caption={`${buildingName} Community`}
                className="gap-2"
              />
            </div>

            <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
              {activeTab === "home" &&
                (previewData && !residentPreviewUnavailable ? (
                  <HomeScreen
                    onRequestIntro={requestIntroduction}
                    onGoPeople={() => router.push("/app/people")}
                    onGoCommunity={() => router.push("/app/community")}
                    onGoConcierge={() => router.push("/app/concierge")}
                    onSignIn={() => router.push("/auth?next=%2Fapp")}
                    onCompleteProfile={() => router.push("/app/onboarding")}
                    onReturnToJoin={() => router.push("/join-community")}
                    welcomeName={previewData.welcomeName}
                    buildingName={previewData.buildingName}
                    introCount={liveIntroCount}
                    introductionCards={introductionCards}
                    events={previewData.events}
                    isSignedIn={Boolean(user)}
                    sessionLoading={sessionLoading}
                    accountSnapshot={accountSnapshot}
                    accountLoading={accountLoading}
                  />
                ) : (
                  <ResidentCommunityState
                    isSignedIn={Boolean(user)}
                    accountSnapshot={accountSnapshot}
                    sessionLoading={sessionLoading}
                    accountLoading={accountLoading}
                    message={
                      previewError ||
                      (hasActiveAccess
                        ? "Your membership is active. We just need a little more live community activity before introductions appear here."
                        : "Sign in with your approved resident email to unlock your private building experience.")
                    }
                    title={
                      hasActiveAccess
                        ? "Your community is warming up."
                        : "Private building access only."
                    }
                    actionLabel={hasActiveAccess ? "Go to gatherings" : undefined}
                    onAction={hasActiveAccess ? () => router.push("/app/community") : undefined}
                    onSignIn={() => router.push("/auth?next=%2Fapp")}
                    onCompleteProfile={() => router.push("/app/onboarding")}
                    onReturnToJoin={() => router.push("/join-community")}
                  />
                ))}

              {activeTab === "people" &&
                (previewData && introductionCards.length > 0 ? (
                  <PeopleScreen
                    onSchedule={(resident, meetupRecommendation) =>
                      setMeetupContext({ resident, meetupRecommendation })
                    }
                    onRequestIntroduction={requestIntroduction}
                    onRespondToIntroduction={respondToIntroduction}
                    introductions={introductionCards}
                    isLoading={isIntroLoading}
                    actionResidentId={introActionResidentId}
                    actionError={introActionError ?? introError}
                  />
                ) : (
                  <ResidentCommunityState
                    isSignedIn={Boolean(user)}
                    accountSnapshot={accountSnapshot}
                    sessionLoading={sessionLoading}
                    accountLoading={accountLoading}
                    title={
                      hasActiveAccess
                        ? "Introductions will appear here."
                        : "Introductions unlock after approval."
                    }
                    message={
                      introError ||
                      previewError ||
                      (hasActiveAccess
                        ? "As more active residents join the building community, your concierge will surface a thoughtful set of introductions here."
                        : "We only show resident matches after your building membership is active.")
                    }
                    onSignIn={() => router.push("/auth?next=%2Fapp%2Fpeople")}
                    onCompleteProfile={() => router.push("/app/onboarding")}
                    onReturnToJoin={() => router.push("/join-community")}
                  />
                ))}

              {activeTab === "concierge" &&
                (previewData && !residentPreviewUnavailable ? (
                  <ConciergeScreen
                    buildingName={buildingName}
                    welcomeName={previewData.welcomeName}
                    introductions={introductionCards}
                    events={previewData.events}
                    onOpenPeople={() => router.push("/app/people")}
                    onOpenCommunity={() => router.push("/app/community")}
                    onRefineProfile={() => router.push("/app/onboarding")}
                  />
                ) : (
                  <ResidentCommunityState
                    isSignedIn={Boolean(user)}
                    accountSnapshot={accountSnapshot}
                    sessionLoading={sessionLoading}
                    accountLoading={accountLoading}
                    title={
                      hasActiveAccess
                        ? "Concierge recommendations are warming up."
                        : "Concierge opens after approval."
                    }
                    message={
                      previewError ||
                      (hasActiveAccess
                        ? "Once more approved residents complete their profile, your concierge view will begin surfacing introductions, meetup ideas, and community guidance here."
                        : "Your concierge view appears after we confirm your building membership and unlock your private resident access.")
                    }
                    actionLabel={hasActiveAccess ? "Browse gatherings" : undefined}
                    onAction={hasActiveAccess ? () => router.push("/app/community") : undefined}
                    onSignIn={() => router.push("/auth?next=%2Fapp%2Fconcierge")}
                    onCompleteProfile={() => router.push("/app/onboarding")}
                    onReturnToJoin={() => router.push("/join-community")}
                  />
                ))}

              {activeTab === "community" && (
                <CommunityScreen
                  buildingName={buildingName}
                  residents={previewData?.residents ?? []}
                  events={previewData?.events ?? []}
                  eventPolls={previewData?.polls ?? []}
                  isSignedIn={Boolean(user)}
                  accountSnapshot={accountSnapshot}
                  accountLoading={accountLoading}
                  accountErrorMessage={accountErrorMessage ?? previewError}
                  onSignIn={() => router.push("/auth?next=%2Fapp%2Fcommunity")}
                  onCompleteProfile={() => router.push("/app/onboarding")}
                  onReturnToJoin={() => router.push("/join-community")}
                  onViewCommunity={() => router.push("/app/community")}
                  onOpenPeople={() => router.push("/app/people")}
                />
              )}

              {activeTab === "profile" && (
                <ProfileScreen
                  onOpenManager={() => router.push("/manager/dashboard")}
                  isSignedIn={Boolean(user)}
                  residentEmail={user?.email ?? null}
                  accessToken={session?.access_token ?? null}
                  sessionLoading={sessionLoading}
                  accountSnapshot={accountSnapshot}
                  accountErrorMessage={accountErrorMessage}
                  accountLoading={accountLoading}
                  reportableResidents={previewData?.residents ?? []}
                  onSignIn={() => router.push("/auth?next=%2Fapp%2Fprofile")}
                  onCompleteProfile={() => router.push("/app/onboarding")}
                  onReturnToJoin={() => router.push("/join-community")}
                  onViewCommunity={() => router.push("/app/community")}
                  onAccountRefresh={refreshResidentAccount}
                />
              )}
            </div>

            <div className="lg:hidden">
              <BottomNav active={activeTab} onChange={(tab) => router.push(getTabPath(tab))} />
            </div>

            {meetupContext ? (
              <MeetupFlow
                resident={meetupContext.resident}
                meetupRecommendation={meetupContext.meetupRecommendation}
                onClose={() => setMeetupContext(null)}
              />
            ) : null}
          </div>
        </div>
      </div>
    </main>
  )
}

function ResidentCommunityState({
  isSignedIn,
  accountSnapshot,
  sessionLoading,
  accountLoading,
  title,
  message,
  actionLabel,
  onAction,
  onSignIn,
  onCompleteProfile,
  onReturnToJoin,
}: {
  isSignedIn: boolean
  accountSnapshot: ReturnType<typeof useResidentAccount>["snapshot"]
  sessionLoading: boolean
  accountLoading: boolean
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
  onSignIn: () => void
  onCompleteProfile: () => void
  onReturnToJoin: () => void
}) {
  return (
    <div className="space-y-6">
      <header className="rounded-[2rem] border border-[#dfd1bd] bg-[#fbf6ee] px-8 py-10">
        <ScreenHeader eyebrow="Private community" title={title} className="px-0 pt-0" />
        <p className="mt-4 max-w-2xl text-sm leading-8 text-[#726353]">{message}</p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-[2rem] border border-[#dfd1bd] bg-[#fbf6ee] px-8 py-8">
          <div className="flex items-start gap-4">
            <span className="flex size-12 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold">
              {isSignedIn ? (
                <Users className="size-5" strokeWidth={1.5} />
              ) : (
                <DoorOpen className="size-5" strokeWidth={1.5} />
              )}
            </span>
            <div>
              <h2 className="font-serif text-[2rem] leading-none text-foreground">
                {isSignedIn
                  ? "Access stays intentionally building-scoped."
                  : "Sign in to see your neighbors."}
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-8 text-[#726353]">
                We only reveal live residents, introductions, and community activity after your
                approved building membership is confirmed.
              </p>
            </div>
          </div>

          {actionLabel && onAction ? (
            <button
              type="button"
              onClick={onAction}
              className="mt-8 inline-flex items-center justify-center rounded-full bg-[#231d17] px-6 py-3 text-[11px] uppercase tracking-[0.22em] text-[#f3ebdc] transition-colors hover:bg-[#2d261f]"
            >
              {actionLabel}
            </button>
          ) : null}
        </div>

        <ResidentAccessCard
          snapshot={accountSnapshot}
          isLoading={sessionLoading || accountLoading}
          isSignedIn={isSignedIn}
          onSignIn={onSignIn}
          onCompleteProfile={onCompleteProfile}
          onReturnToJoin={onReturnToJoin}
          onViewCommunity={onAction ?? onReturnToJoin}
        />
      </div>
    </div>
  )
}
