"use client"

import { useMemo, useState } from "react"
import {
  Bell,
  ChevronRight,
  LayoutDashboard,
  LifeBuoy,
  Loader2,
  LogIn,
  LogOut,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react"

import { ResidentAccessCard } from "@/components/resident-access-card"
import { ScreenHeader, SectionLabel } from "@/components/screen-header"
import type { Resident } from "@/lib/concierge-data"
import type { ResidentAccountSnapshot } from "@/lib/resident-account-server"
import { getSupabaseBrowser } from "@/lib/supabase-browser"

const myInterests = ["Wellness", "Food", "Books", "Art", "Travel"]
const supportCategories = [
  { value: "harassment", label: "Harassment" },
  { value: "inappropriate_behavior", label: "Inappropriate behavior" },
  { value: "bug", label: "Bug report" },
  { value: "safety_concern", label: "Safety concern" },
  { value: "support_request", label: "Support request" },
  { value: "other", label: "Other" },
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
  const [supportCategory, setSupportCategory] = useState<(typeof supportCategories)[number]["value"]>("support_request")
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
  const initials = useMemo(() => {
    const email = residentEmail?.trim()
    if (!email) {
      return "RC"
    }

    return email
      .split("@")[0]
      .split(/[.\-_]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("")
  }, [residentEmail])
  const pauseLabel = accountSnapshot?.isPaused ? "Resume introductions" : "Pause introductions"

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
      setSupportSuccess("Your request was shared with the concierge team.")
    } catch (error) {
      setSupportError(error instanceof Error ? error.message : "Unable to send your request right now.")
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
          ? "Introductions are paused. You can resume anytime from this page."
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
    <div className="h-full overflow-y-auto pb-28">
      <div className="pt-3">
        <ScreenHeader eyebrow="Your profile" title={residentEmail ? "Your resident account" : "Guest preview"} />
      </div>

      <div className="mt-6 px-6">
        <div className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5">
          <div className="flex size-16 items-center justify-center rounded-full bg-foreground font-serif text-2xl text-background">
            {initials || "RC"}
          </div>
          <div>
            <p className="font-serif text-xl leading-tight text-foreground">
              {residentEmail || "Resident preview mode"}
            </p>
            <p className="text-sm text-muted-foreground">
              {sessionLoading
                ? "Checking your access..."
                : isSignedIn
                  ? "Signed in to your resident account"
                  : "Sign in to RSVP and access your live building profile"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 px-6">
        {isSignedIn ? (
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={isSigningOut}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card py-3 text-sm font-medium text-foreground transition-colors hover:border-gold/40 disabled:opacity-70"
          >
            <LogOut className="size-4" />
            {isSigningOut ? "Signing out..." : "Sign out"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onSignIn}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-foreground py-3 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
          >
            <LogIn className="size-4" />
            Sign in or create account
          </button>
        )}
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
        {accountErrorMessage ? (
          <p className="mt-3 text-sm text-destructive">{accountErrorMessage}</p>
        ) : null}
      </div>

      <div className="mt-8 px-6">
        <SectionLabel>Your community profile</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {myInterests.map((interest) => (
            <span
              key={interest}
              className="rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-sm text-foreground"
            >
              {interest}
            </span>
          ))}
          <button
            type="button"
            className="rounded-full border border-dashed border-border px-4 py-1.5 text-sm text-muted-foreground"
          >
            Update later
          </button>
        </div>
      </div>

      <div className="mt-8 px-6">
        <SectionLabel>Resident settings</SectionLabel>
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <Row icon={Bell} label="Introduction frequency" value="Considered" />
          <Row icon={ShieldCheck} label="Visibility" value="Neighbors only" />
          <Row icon={LifeBuoy} label="Intro availability" value={accountSnapshot?.isPaused ? "Paused" : "Available"} />
        </div>
      </div>

      <div className="mt-8 px-6">
        <SectionLabel>Safety & support</SectionLabel>
        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-gold/10 text-gold">
              <ShieldAlert className="size-5" strokeWidth={1.5} />
            </span>
            <div>
              <p className="font-serif text-xl leading-tight text-foreground">Tell us what needs attention.</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Share a private concern, report a bug, or ask for help from the building concierge team.
              </p>
            </div>
          </div>

          {!canSubmitSupport ? (
            <div className="mt-5 rounded-2xl border border-border bg-background px-4 py-4 text-sm text-muted-foreground">
              Support submissions open once your resident membership is active. For urgent help in the meantime, contact your building team directly.
            </div>
          ) : (
            <>
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
                  className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none"
                >
                  {supportCategories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>

                {conductCategorySelected ? (
                  <select
                    value={reportedResidentUserId}
                    onChange={(event) => setReportedResidentUserId(event.target.value)}
                    className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none"
                  >
                    <option value="">Resident involved (optional)</option>
                    {reportableResidents.map((resident) => (
                      <option key={resident.id} value={resident.id}>
                        {resident.name}
                      </option>
                    ))}
                  </select>
                ) : null}

                <input
                  value={supportSubject}
                  onChange={(event) => setSupportSubject(event.target.value)}
                  placeholder="Short subject (optional)"
                  maxLength={120}
                  className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none"
                />
                <textarea
                  value={supportMessage}
                  onChange={(event) => setSupportMessage(event.target.value)}
                  placeholder="What happened, what you need help with, or what we should look into."
                  className="min-h-28 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none"
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
                  href="mailto:hello@residentconcierge.co?subject=Resident%20Concierge%20Support"
                  className="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-3 text-sm font-medium text-foreground transition-colors hover:border-gold/40"
                >
                  Email support instead
                </a>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-8 px-6">
        <SectionLabel>Introduction controls</SectionLabel>
        <div className="rounded-3xl border border-border bg-card p-5">
          <p className="font-serif text-xl leading-tight text-foreground">Control when you are available.</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Pause new introductions if you want a quieter stretch. Your membership stays active and you can resume anytime.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handlePauseToggle()}
              disabled={!canSubmitSupport || isUpdatingPause}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isUpdatingPause ? <Loader2 className="size-4 animate-spin" /> : null}
              {pauseLabel}
            </button>
            <span className="inline-flex items-center rounded-full border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
              {accountSnapshot?.isPaused ? "Currently paused" : "Currently available"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8 px-6">
        <SectionLabel>Building team</SectionLabel>
        <button
          type="button"
          onClick={onOpenManager}
          className="flex w-full items-center gap-4 rounded-3xl border border-border bg-card p-5 text-left transition-colors hover:border-gold/40"
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-foreground text-background">
            <LayoutDashboard className="size-5" strokeWidth={1.5} />
          </span>
          <span className="flex-1">
            <span className="block font-serif text-lg leading-tight text-foreground">
              Community Pulse
            </span>
            <span className="text-xs text-muted-foreground">Manager-side operating view</span>
          </span>
          <ChevronRight className="size-5 text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Bell
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border/60 px-5 py-4 last:border-0">
      <Icon className="size-[18px] text-gold" strokeWidth={1.5} />
      <span className="flex-1 text-sm text-foreground">{label}</span>
      <span className="text-sm text-muted-foreground">{value}</span>
    </div>
  )
}
