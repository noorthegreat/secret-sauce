"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DoorOpen, Loader2, Users } from "lucide-react"

import { BottomNav, type ResidentTab } from "@/components/bottom-nav"
import { MeetupFlow } from "@/components/meetup-flow"
import { PhoneFrame, StatusBar } from "@/components/phone-frame"
import { ResidentAccessCard } from "@/components/resident-access-card"
import { CommunityScreen } from "@/components/screens/community-screen"
import { HomeScreen } from "@/components/screens/home-screen"
import { PeopleScreen } from "@/components/screens/people-screen"
import { ProfileScreen } from "@/components/screens/profile-screen"
import { ScreenHeader } from "@/components/screen-header"
import type { Resident } from "@/lib/concierge-data"
import { useResidentAccount } from "@/lib/resident-account-browser"
import type { ResidentPreviewSnapshot } from "@/lib/resident-preview-live"
import { useResidentSession } from "@/lib/session-browser"

function getTabPath(tab: ResidentTab) {
  switch (tab) {
    case "home":
      return "/app"
    case "people":
      return "/app/people"
    case "community":
      return "/app/community"
    case "profile":
      return "/app/profile"
  }
}

export function ResidentAppShell({
  activeTab,
}: {
  activeTab: ResidentTab
}) {
  const router = useRouter()
  const { user, session, isLoading: sessionLoading } = useResidentSession()
  const { snapshot: accountSnapshot, errorMessage: accountErrorMessage, isLoading: accountLoading } =
    useResidentAccount()
  const [meetupWith, setMeetupWith] = useState<Resident | null>(null)
  const [previewData, setPreviewData] = useState<ResidentPreviewSnapshot | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(true)

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
      return
    }

    if (!user || !accessToken || !hasActiveAccess) {
      setPreviewData(null)
      setPreviewError(null)
      setIsPreviewLoading(false)
      return
    }

    let isMounted = true

    const loadPreview = async () => {
      setIsPreviewLoading(true)
      setPreviewError(null)

      try {
        const response = await fetch("/api/resident-preview", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        })

        const payload = (await response.json()) as ResidentPreviewSnapshot & { error?: string }

        if (!response.ok) {
          throw new Error(payload.error || "Unable to load your building community.")
        }

        if (!isMounted) {
          return
        }

        setPreviewData(payload)
      } catch (error) {
        if (!isMounted) {
          return
        }

        setPreviewData(null)
        setPreviewError(
          error instanceof Error ? error.message : "Unable to load your building community.",
        )
      } finally {
        if (isMounted) {
          setIsPreviewLoading(false)
        }
      }
    }

    void loadPreview()

    return () => {
      isMounted = false
    }
  }, [accountLoading, hasActiveAccess, session?.access_token, sessionLoading, user])

  const buildingName = previewData?.buildingName || accountSnapshot?.buildingName || "Resident Concierge"
  const residentPreviewUnavailable =
    hasActiveAccess && (!previewData || previewData.residents.length === 0 || previewData.events.length === 0)

  if ((sessionLoading || accountLoading || isPreviewLoading) && hasActiveAccess && !previewData) {
    return (
      <main className="min-h-screen bg-background">
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="rounded-[2rem] border border-border bg-card px-8 py-6 text-center">
            <p className="font-serif text-2xl text-foreground">Loading your building community...</p>
          </div>
        </div>
      </main>
    )
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
            {buildingName}
          </span>
          <h1 className="mt-3 text-balance font-serif text-4xl leading-tight text-foreground sm:text-5xl">
            Resident Concierge
          </h1>
          <p className="mx-auto mt-3 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
            A private members&apos; experience for one building community, with curated introductions,
            intentional gatherings, and beautiful shared spaces.
          </p>
        </header>

        <div className="relative z-10">
          <PhoneFrame>
            <div className="flex h-full flex-col bg-background">
              <StatusBar />
              <div className="flex-1 overflow-hidden">
                {activeTab === "home" &&
                  (previewData && !residentPreviewUnavailable ? (
                    <HomeScreen
                      onRequestIntro={() => router.push("/app/people")}
                      onGoPeople={() => router.push("/app/people")}
                      onGoCommunity={() => router.push("/app/community")}
                      onSignIn={() => router.push("/auth?next=%2Fapp")}
                      onCompleteProfile={() => router.push("/app/onboarding")}
                      onReturnToJoin={() => router.push("/join-community")}
                      welcomeName={previewData.welcomeName}
                      introCount={previewData.introCount}
                      residents={previewData.residents}
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
                      title={hasActiveAccess ? "Your community is warming up." : "Private building access only."}
                      actionLabel={hasActiveAccess ? "Go to events" : undefined}
                      onAction={hasActiveAccess ? () => router.push("/app/community") : undefined}
                      onSignIn={() => router.push("/auth?next=%2Fapp")}
                      onCompleteProfile={() => router.push("/app/onboarding")}
                      onReturnToJoin={() => router.push("/join-community")}
                    />
                  ))}

                {activeTab === "people" &&
                  (previewData && previewData.residents.length > 0 ? (
                    <PeopleScreen onSchedule={setMeetupWith} residents={previewData.residents} />
                  ) : (
                    <ResidentCommunityState
                      isSignedIn={Boolean(user)}
                      accountSnapshot={accountSnapshot}
                      sessionLoading={sessionLoading}
                      accountLoading={accountLoading}
                      title={hasActiveAccess ? "Introductions will appear here." : "Introductions unlock after approval."}
                      message={
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

                {activeTab === "community" && (
                  <CommunityScreen
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
                  />
                )}

                {activeTab === "profile" && (
                  <ProfileScreen
                    onOpenManager={() => router.push("/manager/dashboard")}
                    isSignedIn={Boolean(user)}
                    residentEmail={user?.email ?? null}
                    sessionLoading={sessionLoading}
                    accountSnapshot={accountSnapshot}
                    accountErrorMessage={accountErrorMessage}
                    accountLoading={accountLoading}
                    onSignIn={() => router.push("/auth?next=%2Fapp%2Fprofile")}
                    onCompleteProfile={() => router.push("/app/onboarding")}
                    onReturnToJoin={() => router.push("/join-community")}
                    onViewCommunity={() => router.push("/app/community")}
                  />
                )}
              </div>
              <BottomNav active={activeTab} onChange={(tab) => router.push(getTabPath(tab))} />

              {meetupWith && (
                <MeetupFlow resident={meetupWith} onClose={() => setMeetupWith(null)} />
              )}
            </div>
          </PhoneFrame>
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
    <div className="h-full overflow-y-auto pb-28">
      <div className="pt-3">
        <ScreenHeader eyebrow="Private community" title={title} />
        <p className="mt-2 px-6 text-sm leading-relaxed text-muted-foreground">{message}</p>
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
        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full border border-gold/25 bg-gold/10 text-gold">
              {isSignedIn ? <Users className="size-5" strokeWidth={1.5} /> : <DoorOpen className="size-5" strokeWidth={1.5} />}
            </span>
            <div>
              <p className="font-serif text-xl text-foreground">
                {isSignedIn ? "Access is intentionally building-scoped." : "Sign in to see your neighbors."}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
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
