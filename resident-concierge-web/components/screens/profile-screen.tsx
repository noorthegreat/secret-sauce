"use client"

import { useMemo, useState } from "react"
import {
  ArrowUpRight,
  BadgeCheck,
  Bell,
  ChevronRight,
  CirclePause,
  Compass,
  LayoutDashboard,
  LifeBuoy,
  Loader2,
  LockKeyhole,
  LogIn,
  LogOut,
  Mail,
  Play,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserRoundCog,
} from "lucide-react"

import { ResidentAccessCard } from "@/components/resident-access-card"
import { ScreenHeader, SectionLabel } from "@/components/screen-header"
import type { Resident } from "@/lib/concierge-data"
import type { ResidentAccountSnapshot } from "@/lib/resident-account-server"
import { getSupabaseBrowser } from "@/lib/supabase-browser"

const supportCategories = [
  { value: "harassment", label: "Harassment or boundary concern" },
  { value: "inappropriate_behavior", label: "Inappropriate resident behavior" },
  { value: "bug", label: "Something in the app is not working" },
  { value: "safety_concern", label: "Safety concern" },
  { value: "support_request", label: "Help from the concierge team" },
  { value: "other", label: "Something else" },
] as const

export function ProfileScreen({
  onOpenManager,
  isSignedIn,
  residentEmail,
  accessToken,
  sessionLoading,
  accountSnapshot,
  accountErrorMessage,
  accountLoading,
  reportableResidents,
  onSignIn,
  onCompleteProfile,
  onReturnToJoin,
  onViewCommunity,
  onAccountRefresh,
}: {
  onOpenManager: () => void
  isSignedIn: boolean
  residentEmail: string | null
  accessToken: string | null
  sessionLoading: boolean
  accountSnapshot: ResidentAccountSnapshot | null
  accountErrorMessage: string | null
  accountLoading: boolean
  reportableResidents: Resident[]
  onSignIn: () => void
  onCompleteProfile: () => void
  onReturnToJoin: () => void
  onViewCommunity: () => void
  onAccountRefresh: () => void
}) {
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [supportCategory, setSupportCategory] =
    useState<(typeof supportCategories)[number]["value"]>("support_request")
  const [supportSubject, setSupportSubject] = useState("")
  const [supportMessage, setSupportMessage] = useState("")
  const [reportedResidentUserId, setReportedResidentUserId] = useState("")
  const [supportError, setSupportError] = useState<string | null>(null)
  const [supportSuccess, setSupportSuccess] = useState<string | null>(null)
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false)
  const [isUpdatingPause, setIsUpdatingPause] = useState(false)

  const canSubmitSupport = Boolean(
    isSignedIn &&
      accessToken &&
      accountSnapshot?.status === "active" &&
      accountSnapshot.hasActiveMembership,
  )
  const conductCategorySelected =
    supportCategory === "harassment" || supportCategory === "inappropriate_behavior"
  const hasReportableResidents = reportableResidents.length > 0

  const firstName = useMemo(() => {
    const email = residentEmail?.trim()
    if (!email) {
      return "Resident"
    }

    const [localPart] = email.split("@")
    const cleaned = localPart
      .split(/[.\-_]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))

    return cleaned[0] || "Resident"
  }, [residentEmail])

  const initials = useMemo(() => {
    const email = residentEmail?.trim()
    if (!email) {
      return "FC"
    }

    return email
      .split("@")[0]
      .split(/[.\-_]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("")
  }, [residentEmail])

  const buildingLabel = accountSnapshot?.buildingName || "Fifth Circle Community"
  const membershipLabel = getMembershipLabel(accountSnapshot)
  const profileStateLabel = accountSnapshot?.needsSurveyCompletion
    ? "Profile still warming up"
    : "Profile ready"
  const pauseLabel = accountSnapshot?.isPaused ? "Resume introductions" : "Pause introductions"
  const conciergeReadiness = accountSnapshot?.needsSurveyCompletion
    ? "Complete onboarding so the concierge can make stronger introductions, circles, and gathering recommendations."
    : "Your profile is complete enough for thoughtful introductions, concierge notes, and community guidance."
  const privacyPromises = [
    "Only residents in your building community can view your profile preview.",
    "Contact details stay hidden until an introduction is mutually confirmed or concierge-delivered.",
    "Support, safety, and reporting notes remain private to the Fifth Circle team and building staff when relevant.",
  ]
  const introductionFlow = [
    "You appear through a private profile preview shaped by your onboarding and community preferences.",
    "Introductions stay quiet until there is a genuine fit and mutual interest is clear.",
    "Contact details remain protected until a real introduction is ready to be delivered.",
  ]
  const communityGuidelines = [
    "Introductions are consent-led and building-scoped.",
    "You can pause introductions at any time without leaving the community.",
    "Gatherings and recommendations stay intentionally quiet, not feed-like.",
  ]
  const supportExpectations = [
    "Concierge and safety notes are reviewed privately, not shown to other residents.",
    "You can report a concern, ask for help, or flag a resident interaction that felt off.",
    "Pausing participation never removes your building membership or gathering access.",
  ]
  const supportCategoryHelper =
    supportCategory === "harassment" || supportCategory === "inappropriate_behavior"
      ? "Use this for a resident interaction that crossed a line or felt uncomfortable. If you know who was involved, you can quietly identify them below."
      : supportCategory === "bug"
        ? "Tell us what broke, where it happened, and what you expected instead."
        : supportCategory === "safety_concern"
          ? "Use this when something feels unsafe, urgent, or important for the building team to know."
          : supportCategory === "support_request"
            ? "Ask for help with introductions, access, gatherings, or anything that needs concierge follow-through."
            : "Share anything else the Fifth Circle team should know."

  async function handleSupportSubmit() {
    if (!accessToken) {
      onSignIn()
      return
    }

    setIsSubmittingSupport(true)
    setSupportError(null)
    setSupportSuccess(null)

    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        body: JSON.stringify({
          action: "submit_request",
          category: supportCategory,
          subject: supportSubject,
          message: supportMessage,
          reportedResidentUserId: conductCategorySelected ? reportedResidentUserId || null : null,
        }),
      })

      const payload = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(payload.error || "Unable to send your request right now.")
      }

      setSupportSubject("")
      setSupportMessage("")
      setReportedResidentUserId("")
      setSupportSuccess("Your note has been shared privately with the Fifth Circle team.")
    } catch (error) {
      setSupportError(
        error instanceof Error ? error.message : "Unable to send your request right now.",
      )
    } finally {
      setIsSubmittingSupport(false)
    }
  }

  async function handlePauseToggle() {
    if (!accessToken) {
      onSignIn()
      return
    }

    setIsUpdatingPause(true)
    setSupportError(null)
    setSupportSuccess(null)

    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        body: JSON.stringify({
          action: "set_pause",
          paused: !accountSnapshot?.isPaused,
        }),
      })

      const payload = (await response.json()) as { error?: string; paused?: boolean }

      if (!response.ok) {
        throw new Error(payload.error || "Unable to update your introduction availability.")
      }

      onAccountRefresh()
      setSupportSuccess(
        payload.paused
          ? "Introductions are paused for now. You can resume any time from this page."
          : "Introductions are live again for your building community.",
      )
    } catch (error) {
      setSupportError(
        error instanceof Error
          ? error.message
          : "Unable to update your introduction availability.",
      )
    } finally {
      setIsUpdatingPause(false)
    }
  }

  async function handleSignOut() {
    setIsSigningOut(true)

    try {
      await getSupabaseBrowser().auth.signOut()
    } finally {
      setIsSigningOut(false)
      window.location.reload()
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-[#f6eee1] pb-28">
      <div className="pt-3">
        <ScreenHeader eyebrow="Resident profile" title="Your private place" accent="here." />
        <p className="mt-2 px-6 text-sm leading-relaxed text-[#726353]">
          Manage how you appear in the community, what the concierge knows about you, and how Fifth Circle supports you behind the scenes.
        </p>
      </div>

      <div className="mt-6 px-6">
        <div className="overflow-hidden rounded-[2rem] border border-[#e0d4c3] bg-[#fbf6ee] shadow-[0_28px_60px_-46px_rgba(70,56,35,0.34)]">
          <div className="border-b border-[#e8dccd] px-5 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold">
              {buildingLabel}
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#8e7d68]">
              Powered by Fifth Circle
            </p>
          </div>

          <div className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex size-20 items-center justify-center rounded-full border border-gold/35 bg-[#f4ece1] font-serif text-3xl text-gold">
                {initials || "FC"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-serif text-[1.95rem] leading-none text-foreground">{firstName}</p>
                <p className="mt-2 text-sm leading-relaxed text-[#6e5f4f]">
                  {sessionLoading
                    ? "Checking your private access..."
                    : isSignedIn
                      ? "Signed in to your resident account. This is where you refine your presence, control your introduction pace, and reach the concierge privately."
                      : "Sign in to manage your profile, RSVP to gatherings, and unlock your live building experience."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusPill icon={BadgeCheck} label={membershipLabel} />
                  <StatusPill icon={Sparkles} label={profileStateLabel} />
                  <StatusPill
                    icon={accountSnapshot?.isPaused ? CirclePause : Play}
                    label={accountSnapshot?.isPaused ? "Introductions paused" : "Introductions live"}
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-[#e6dacb] bg-[#f7f0e5] p-4">
              <p className="font-serif text-lg text-foreground">Concierge note</p>
              <p className="mt-2 text-sm leading-relaxed text-[#6f604f]">{conciergeReadiness}</p>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {isSignedIn ? (
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  disabled={isSigningOut}
                  className="flex items-center justify-center gap-2 rounded-full border border-[#d6cab9] bg-[#f7f0e5] px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-gold/40 disabled:opacity-70"
                >
                  <LogOut className="size-4" />
                  {isSigningOut ? "Signing out..." : "Sign out"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSignIn}
                  className="flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
                >
                  <LogIn className="size-4" />
                  Sign in or create account
                </button>
              )}

              {accountSnapshot?.needsSurveyCompletion ? (
                <button
                  type="button"
                  onClick={onCompleteProfile}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d6cab9] bg-[#f7f0e5] px-5 py-3 text-sm font-medium text-foreground transition-colors hover:border-gold/40"
                >
                  Complete profile
                  <ArrowUpRight className="size-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onViewCommunity}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d6cab9] bg-[#f7f0e5] px-5 py-3 text-sm font-medium text-foreground transition-colors hover:border-gold/40"
                >
                  View community
                  <ArrowUpRight className="size-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 px-6">
        <SectionLabel>Access status</SectionLabel>
        <ResidentAccessCard
          snapshot={accountSnapshot}
          isLoading={sessionLoading || accountLoading}
          isSignedIn={isSignedIn}
          onSignIn={onSignIn}
          onCompleteProfile={onCompleteProfile}
          onReturnToJoin={onReturnToJoin}
          onViewCommunity={onViewCommunity}
        />
        {accountErrorMessage ? <p className="mt-3 text-sm text-destructive">{accountErrorMessage}</p> : null}
      </div>

      <div className="mt-8 px-6">
        <SectionLabel>Profile and privacy</SectionLabel>
        <div className="grid gap-4">
          <InfoCard
            icon={Compass}
            title="How you appear in the community"
            description="Your profile is designed to be enough for a warm introduction, never an overexposed resident directory."
            items={[
              "First name, profile cues, and onboarding signals help shape thoughtful introductions.",
              "Compatibility notes focus on shared interests, rhythm, and community goals.",
              "You can refine your profile any time as your preferences evolve.",
            ]}
            actionLabel={accountSnapshot?.needsSurveyCompletion ? "Complete profile" : "Refine profile"}
            onAction={onCompleteProfile}
          />

          <InfoCard
            icon={Sparkles}
            title="How introductions work"
            description="Fifth Circle is designed to feel thoughtful, not transactional. Residents should always understand the pace and privacy of an introduction."
            items={introductionFlow}
          />

          <InfoCard
            icon={LockKeyhole}
            title="What stays private"
            description="Fifth Circle is intentionally conservative about what gets revealed and when."
            items={privacyPromises}
          />
        </div>
      </div>

      <div className="mt-8 px-6">
        <SectionLabel>Resident settings</SectionLabel>
        <div className="overflow-hidden rounded-[1.8rem] border border-[#e1d5c3] bg-[#fbf6ee]">
          <SettingRow
            icon={Bell}
            label="Introduction cadence"
            value={accountSnapshot?.isPaused ? "Paused for now" : "Thoughtful and active"}
            detail="Keep your pace calm. Pause new introductions any time without leaving the community."
            actionLabel={pauseLabel}
            onAction={() => void handlePauseToggle()}
            disabled={!canSubmitSupport || isUpdatingPause}
            isLoading={isUpdatingPause}
          />
          <SettingRow
            icon={UserRoundCog}
            label="Profile readiness"
            value={accountSnapshot?.needsSurveyCompletion ? "Needs completion" : "Ready"}
            detail="Richer profile signals lead to better introductions, circles, and concierge guidance."
            actionLabel={accountSnapshot?.needsSurveyCompletion ? "Complete now" : "Refine"}
            onAction={onCompleteProfile}
          />
          <SettingRow
            icon={ShieldCheck}
            label="Visibility"
            value="Building residents only"
            detail="Your live profile preview stays inside your approved building community."
          />
          <SettingRow
            icon={Mail}
            label="Notifications"
            value="Essential only"
            detail="During pilot, Fifth Circle keeps outreach light: key introduction updates, gathering activity, and important support follow-up."
          />
        </div>
      </div>

      <div className="mt-8 px-6">
        <SectionLabel>Trust and safety</SectionLabel>
        <div className="mb-4 rounded-[1.8rem] border border-[#e1d5c3] bg-[#fbf6ee] p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-gold/10 text-gold">
              <Shield className="size-5" strokeWidth={1.5} />
            </span>
            <div>
              <p className="font-serif text-xl leading-tight text-foreground">A calmer community depends on trust.</p>
              <p className="mt-1 text-sm leading-relaxed text-[#6f604f]">
                We keep introductions consent-led, building-scoped, and easy to pause. If anything feels off, you have a direct private line to the team.
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {communityGuidelines.map((guideline) => (
              <li key={guideline} className="flex items-start gap-2 text-sm leading-relaxed text-[#6f604f]">
                <span className="mt-1 text-gold">•</span>
                <span>{guideline}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mb-4 rounded-[1.8rem] border border-[#e1d5c3] bg-[#fbf6ee] p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-gold/10 text-gold">
              <ShieldCheck className="size-5" strokeWidth={1.5} />
            </span>
            <div>
              <p className="font-serif text-xl leading-tight text-foreground">What happens when you reach out</p>
              <p className="mt-1 text-sm leading-relaxed text-[#6f604f]">
                Support should feel responsive and private. We keep the process clear so you know what Fifth Circle does with a note once it is sent.
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {supportExpectations.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-[#6f604f]">
                <span className="mt-1 text-gold">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[1.9rem] border border-[#e1d5c3] bg-[#fbf6ee] p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-gold/10 text-gold">
              <ShieldAlert className="size-5" strokeWidth={1.5} />
            </span>
            <div>
              <p className="font-serif text-xl leading-tight text-foreground">Tell us what needs attention.</p>
              <p className="mt-1 text-sm leading-relaxed text-[#6f604f]">
                Share a private concern, report a bug, or ask for help from the Fifth Circle concierge team.
              </p>
            </div>
          </div>

          {!canSubmitSupport ? (
            <div className="mt-5 rounded-[1.4rem] border border-[#e1d5c3] bg-[#f7f0e5] px-4 py-4 text-sm text-[#7d6e5e]">
              Support submissions open once your resident membership is active. For urgent help in the meantime, contact your building team directly.
            </div>
          ) : (
            <>
              <div className="mt-5 rounded-[1.4rem] border border-[#e6dacb] bg-[#f7f0e5] px-4 py-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold">Private concierge channel</p>
                <p className="mt-2 text-sm leading-7 text-[#6f604f]">{supportCategoryHelper}</p>
              </div>

              <div className="mt-5 grid gap-3">
                <select
                  value={supportCategory}
                  onChange={(event) => {
                    const nextCategory = event.target.value as (typeof supportCategories)[number]["value"]
                    setSupportCategory(nextCategory)
                    if (nextCategory !== "harassment" && nextCategory !== "inappropriate_behavior") {
                      setReportedResidentUserId("")
                    }
                  }}
                  className="rounded-[1.2rem] border border-[#ded1bf] bg-[#f7f0e5] px-4 py-3 text-sm text-foreground outline-none"
                >
                  {supportCategories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>

                {conductCategorySelected ? (
                  hasReportableResidents ? (
                    <select
                      value={reportedResidentUserId}
                      onChange={(event) => setReportedResidentUserId(event.target.value)}
                      className="rounded-[1.2rem] border border-[#ded1bf] bg-[#f7f0e5] px-4 py-3 text-sm text-foreground outline-none"
                    >
                      <option value="">Resident involved (optional)</option>
                      {reportableResidents.map((resident) => (
                        <option key={resident.id} value={resident.id}>
                          {resident.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="rounded-[1.2rem] border border-[#ded1bf] bg-[#f7f0e5] px-4 py-3 text-sm text-[#7d6e5e]">
                      No other active residents are available to select yet. You can still send the report without naming someone.
                    </div>
                  )
                ) : null}

                <input
                  value={supportSubject}
                  onChange={(event) => setSupportSubject(event.target.value)}
                  placeholder="Short subject (optional)"
                  maxLength={120}
                  className="rounded-[1.2rem] border border-[#ded1bf] bg-[#f7f0e5] px-4 py-3 text-sm text-foreground outline-none"
                />
                <textarea
                  value={supportMessage}
                  onChange={(event) => setSupportMessage(event.target.value)}
                  placeholder="What happened, what you need help with, or what we should look into."
                  className="min-h-28 rounded-[1.2rem] border border-[#ded1bf] bg-[#f7f0e5] px-4 py-3 text-sm text-foreground outline-none"
                />
              </div>

              {supportError ? <p className="mt-4 text-sm text-destructive">{supportError}</p> : null}
              {supportSuccess ? <p className="mt-4 text-sm text-gold-foreground">{supportSuccess}</p> : null}

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleSupportSubmit()}
                  disabled={isSubmittingSupport || supportMessage.trim().length < 12}
                  className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmittingSupport ? <Loader2 className="size-4 animate-spin" /> : null}
                  Send request
                </button>
                <a
                  href="mailto:hello@residentconcierge.co?subject=Fifth%20Circle%20Support"
                  className="inline-flex items-center justify-center rounded-full border border-[#ded1bf] bg-[#f7f0e5] px-5 py-3 text-sm font-medium text-foreground transition-colors hover:border-gold/40"
                >
                  Email support instead
                </a>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-8 px-6">
        <SectionLabel>Account management</SectionLabel>
        <div className="grid gap-4">
          <div className="rounded-[1.9rem] border border-[#e1d5c3] bg-[#fbf6ee] p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-gold/10 text-gold">
                <Mail className="size-5" strokeWidth={1.5} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-serif text-xl leading-tight text-foreground">Account and building access</p>
                <p className="mt-1 break-all text-sm leading-relaxed text-[#6f604f]">
                  {residentEmail || "Not signed in"}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[#6f604f]">
                  Use the same email you used in your resident request so Fifth Circle can attach you to the correct building membership.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {isSignedIn ? (
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  disabled={isSigningOut}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-70"
                >
                  <LogOut className="size-4" />
                  {isSigningOut ? "Signing out..." : "Sign out"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSignIn}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
                >
                  <LogIn className="size-4" />
                  Sign in
                </button>
              )}

              <button
                type="button"
                onClick={onReturnToJoin}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#ded1bf] bg-[#f7f0e5] px-5 py-3 text-sm font-medium text-foreground transition-colors hover:border-gold/40"
              >
                Return to join flow
              </button>
            </div>
          </div>

          <div className="rounded-[1.9rem] border border-[#e1d5c3] bg-[#fbf6ee] p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-gold/10 text-gold">
                <LifeBuoy className="size-5" strokeWidth={1.5} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-serif text-xl leading-tight text-foreground">Need help with access or account changes?</p>
                <p className="mt-1 text-sm leading-relaxed text-[#6f604f]">
                  If your building access looks wrong, your invite details changed, or you need help as part of pilot testing, the concierge team can sort that out privately.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    href="mailto:hello@residentconcierge.co?subject=Fifth%20Circle%20Account%20Help"
                    className="inline-flex items-center justify-center rounded-full border border-[#ded1bf] bg-[#f7f0e5] px-5 py-3 text-sm font-medium text-foreground transition-colors hover:border-gold/40"
                  >
                    Contact concierge support
                  </a>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenManager}
            className="flex w-full items-center gap-4 rounded-[1.9rem] border border-dashed border-[#ddcfbb] bg-[#f7f0e5] p-5 text-left transition-colors hover:border-gold/40"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-foreground text-background">
              <LayoutDashboard className="size-5" strokeWidth={1.5} />
            </span>
            <span className="flex-1">
              <span className="block font-serif text-lg leading-tight text-foreground">Building team access</span>
              <span className="mt-1 block text-xs leading-relaxed text-[#7d6e5e]">
                This opens the Community Pulse operating view and is mainly useful for pilot setup, demos, or manager access checks.
              </span>
            </span>
            <ChevronRight className="size-5 text-[#8d7d6b]" />
          </button>
        </div>
      </div>
    </div>
  )
}

function StatusPill({
  icon: Icon,
  label,
}: {
  icon: typeof Sparkles
  label: string
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#dfd2bf] bg-[#f7f0e5] px-3 py-2 text-xs text-[#6b5b49]">
      <Icon className="size-3.5 text-gold" strokeWidth={1.7} />
      {label}
    </span>
  )
}

function InfoCard({
  icon: Icon,
  title,
  description,
  items,
  actionLabel,
  onAction,
}: {
  icon: typeof Compass
  title: string
  description: string
  items: string[]
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="rounded-[1.8rem] border border-[#e1d5c3] bg-[#fbf6ee] p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-11 items-center justify-center rounded-full bg-gold/10 text-gold">
          <Icon className="size-5" strokeWidth={1.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-serif text-xl leading-tight text-foreground">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-[#6f604f]">{description}</p>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-[#6f604f]">
            <span className="mt-1 text-gold">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-full border border-[#ded1bf] bg-[#f7f0e5] px-5 py-3 text-sm font-medium text-foreground transition-colors hover:border-gold/40"
        >
          {actionLabel}
          <ArrowUpRight className="size-4" />
        </button>
      ) : null}
    </div>
  )
}

function SettingRow({
  icon: Icon,
  label,
  value,
  detail,
  actionLabel,
  onAction,
  disabled,
  isLoading,
}: {
  icon: typeof Bell
  label: string
  value: string
  detail: string
  actionLabel?: string
  onAction?: () => void
  disabled?: boolean
  isLoading?: boolean
}) {
  return (
    <div className="border-b border-[#ece2d4] px-5 py-4 last:border-0">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-[18px] text-gold" strokeWidth={1.5} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-foreground">{label}</span>
            <span className="text-xs uppercase tracking-[0.14em] text-[#8a7a68]">{value}</span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-[#7d6e5e]">{detail}</p>

          {actionLabel && onAction ? (
            <button
              type="button"
              onClick={onAction}
              disabled={disabled}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#ded1bf] bg-[#f7f0e5] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-gold/40 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
              {actionLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function getMembershipLabel(snapshot: ResidentAccountSnapshot | null) {
  if (!snapshot) {
    return "Access checking"
  }

  if (snapshot.status === "active") {
    return "Active resident"
  }

  if (snapshot.status === "pending_review") {
    return "Pending approval"
  }

  if (snapshot.status === "rejected") {
    return "Access not approved"
  }

  return "Membership not connected"
}
