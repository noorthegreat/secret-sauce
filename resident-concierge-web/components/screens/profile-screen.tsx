"use client"

import { useMemo, useState } from "react"
import { Bell, ChevronRight, LayoutDashboard, LogIn, LogOut, ShieldCheck } from "lucide-react"

import { ResidentAccessCard } from "@/components/resident-access-card"
import { ScreenHeader, SectionLabel } from "@/components/screen-header"
import type { ResidentAccountSnapshot } from "@/lib/resident-account-server"
import { getSupabaseBrowser } from "@/lib/supabase-browser"

const myInterests = ["Wellness", "Food", "Books", "Art", "Travel"]

export function ProfileScreen({
  onOpenManager,
  isSignedIn,
  residentEmail,
  sessionLoading,
  accountSnapshot,
  accountErrorMessage,
  accountLoading,
  onSignIn,
  onCompleteProfile,
  onReturnToJoin,
  onViewCommunity,
}: {
  onOpenManager: () => void
  isSignedIn: boolean
  residentEmail: string | null
  sessionLoading: boolean
  accountSnapshot: ResidentAccountSnapshot | null
  accountErrorMessage: string | null
  accountLoading: boolean
  onSignIn: () => void
  onCompleteProfile: () => void
  onReturnToJoin: () => void
  onViewCommunity: () => void
}) {
  const [isSigningOut, setIsSigningOut] = useState(false)
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
        <ScreenHeader eyebrow="Your profile" title={residentEmail ? "Your account" : "Guest preview"} />
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
        <SectionLabel>Your interests</SectionLabel>
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
            Edit
          </button>
        </div>
      </div>

      <div className="mt-8 px-6">
        <SectionLabel>Preferences</SectionLabel>
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <Row icon={Bell} label="Introduction frequency" value="Considered" />
          <Row icon={ShieldCheck} label="Visibility" value="Neighbors only" />
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
              Property Manager Dashboard
            </span>
            <span className="text-xs text-muted-foreground">Engagement & amenity insights</span>
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
