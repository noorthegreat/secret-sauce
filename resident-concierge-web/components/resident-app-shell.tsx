"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarDays, DoorOpen, House, Sparkles, UserRound, Users } from "lucide-react"

import { BottomNav, type ResidentTab } from "@/components/bottom-nav"
import { FifthCircleBrandMark } from "@/components/fifth-circle-brand-mark"
import { MeetupFlow } from "@/components/meetup-flow"
import { PhoneFrame, StatusBar } from "@/components/phone-frame"
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
  }, [accountLoading, hasActiveAccess, session?.access_token, sessionLoading, user, accountSnapshot?.buildingId])

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
      <main className="min-h-screen bg-[#201a15] px-6 py-16">
        <div className="mx-auto max-w-5xl rounded-[2.5rem] border border-white/10 bg-[#231d17] px-8 py-16 text-center">
          <p className="font-serif text-3xl text-[#f3ebdc]">Loading your building community...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#201a15] text-[#f3ebdc]">
      <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col px-4 py-4 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-0 lg:px-0 lg:py-0">
        <aside className="hidden border-r border-white/8 bg-[#1e1813] lg:flex lg:min-h-screen lg:flex-col lg:justify-between lg:px-8 lg:py-8">
          <div>
            <FifthCircleBrandMark
              theme="dark"
              align="left"
              caption="The circle closest to home."
              className="pt-2"
            />

            <nav className="mt-14 space-y-1">
              {desktopNav.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => router.push(getTabPath(item.id))}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-full px-4 py-3 text-left text-sm transition-colors",
                      isActive
                        ? "bg-[#f3ebdc] text-[#241e18]"
                        : "text-[#cbbca6] hover:bg-white/6 hover:text-[#f3ebdc]",
                    )}
                  >
                    <Icon className="size-4" strokeWidth={1.6} />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          <div className="rounded-[1.8rem] border border-white/8 bg-white/4 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-gold">
              {buildingName} Community
            </p>
            <p className="mt-3 font-serif text-2xl leading-tight text-[#f3ebdc]">
              Private introductions, gatherings, and calmer community life.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[#c8baa6]">
              Powered by Fifth Circle.
            </p>
          </div>
        </aside>

        <section className="relative overflow-hidden bg-[#efe6d8] lg:min-h-screen">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <img
              src="/building.png"
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover opacity-[0.12] blur-[2px]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(239,230,216,0.88),rgba(246,238,225,0.96))]" />
          </div>

          <div className="relative z-10 flex min-h-screen flex-col">
            <div className="border-b border-[#ded1bf] px-5 py-5 lg:hidden">
              <FifthCircleBrandMark
                caption={`${buildingName} Community`}
                theme="light"
                align="left"
                className="gap-2"
              />
            </div>

            <div className="flex flex-1 items-start justify-center px-4 py-8 sm:px-8 lg:px-14 lg:py-10">
              <div className="grid w-full max-w-[1080px] gap-8 xl:grid-cols-[minmax(0,1fr)_390px] xl:items-start">
                <div className="hidden xl:block">
                  <div className="rounded-[2.4rem] border border-[#dbcdb9] bg-[#f7f0e5]/95 p-8 shadow-[0_35px_80px_-52px_rgba(70,56,35,0.35)]">
                    <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-gold">
                      {buildingName} Community
                    </p>
                    <h1 className="mt-5 font-serif text-[3.4rem] leading-[0.92] text-foreground">
                      Private communities,
                      <br />
                      thoughtfully connected.
                    </h1>
                    <p className="mt-5 max-w-xl text-base leading-8 text-[#655646]">
                      Fifth Circle keeps introductions, gatherings, and shared spaces feeling warm,
                      private, and genuinely useful.
                    </p>
                    <div className="mt-10 grid grid-cols-3 gap-4">
                      <PreviewMetric value={liveIntroCount} label="Introductions in motion" />
                      <PreviewMetric
                        value={previewData?.events.length ?? 0}
                        label="Gatherings this month"
                      />
                      <PreviewMetric
                        value={previewData?.residents.length ?? 0}
                        label="Approved residents"
                      />
                    </div>
                  </div>
                </div>

                <div className="mx-auto w-full max-w-[390px]">
                  <PhoneFrame>
                    <div className="flex h-full flex-col bg-background">
                      <StatusBar />
                      <div className="flex-1 overflow-hidden">
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
                      <BottomNav active={activeTab} onChange={(tab) => router.push(getTabPath(tab))} />

                      {meetupContext ? (
                        <MeetupFlow
                          resident={meetupContext.resident}
                          meetupRecommendation={meetupContext.meetupRecommendation}
                          onClose={() => setMeetupContext(null)}
                        />
                      ) : null}
                    </div>
                  </PhoneFrame>
                </div>
              </div>
            </div>
          </div>
        </section>
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
    <div className="h-full overflow-y-auto bg-[#f6eee1] pb-28">
      <div className="pt-3">
        <ScreenHeader eyebrow="Private community" title={title} />
        <p className="mt-2 px-6 text-sm leading-relaxed text-[#726353]">{message}</p>
      </div>

      <div className="mt-6 px-6">
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

      <div className="mt-6 px-6">
        <div className="rounded-[1.9rem] border border-[#e1d5c3] bg-[#fbf6ee] p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full border border-gold/25 bg-gold/10 text-gold">
              {isSignedIn ? (
                <Users className="size-5" strokeWidth={1.5} />
              ) : (
                <DoorOpen className="size-5" strokeWidth={1.5} />
              )}
            </span>
            <div>
              <p className="font-serif text-xl text-foreground">
                {isSignedIn ? "Access is intentionally building-scoped." : "Sign in to see your neighbors."}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[#6f604f]">
                We only reveal live residents, introductions, and community activity after we confirm your approved building membership.
              </p>
            </div>
          </div>

          {actionLabel && onAction ? (
            <button
              type="button"
              onClick={onAction}
              className="mt-5 inline-flex items-center justify-center rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
            >
              {actionLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function PreviewMetric({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-[1.5rem] border border-[#e0d4c2] bg-[#fbf6ee] px-4 py-4">
      <p className="font-serif text-3xl text-foreground">{value}</p>
      <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#8b7c6a]">{label}</p>
    </div>
  )
}
