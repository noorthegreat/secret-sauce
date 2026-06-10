"use client"

import { ArrowUpRight, Clock3, FileText, LifeBuoy, ShieldCheck, Sparkles } from "lucide-react"

import type { ResidentAccountSnapshot } from "@/lib/resident-account-server"

type ResidentFacingState = "active" | "pending" | "survey_incomplete" | "missing_membership"

export function ResidentAccessCard({
  snapshot,
  isLoading,
  isSignedIn,
  onSignIn,
  onCompleteProfile,
  onReturnToJoin,
  onViewCommunity,
}: {
  snapshot: ResidentAccountSnapshot | null
  isLoading: boolean
  isSignedIn: boolean
  onSignIn: () => void
  onCompleteProfile: () => void
  onReturnToJoin: () => void
  onViewCommunity: () => void
}) {
  if (!isSignedIn) {
    return (
      <CardFrame
        icon={ShieldCheck}
        eyebrow="Private resident access"
        title="Sign in to unlock your building community."
        description="Use the same email address you used for your resident request so we can quietly connect you to the correct building membership."
        tone="gold"
        primaryAction={{
          label: "Sign in",
          onClick: onSignIn,
        }}
        secondaryAction={{
          label: "Return to join flow",
          onClick: onReturnToJoin,
          variant: "secondary",
        }}
      />
    )
  }

  if (isLoading) {
    return (
      <CardFrame
        icon={Clock3}
        eyebrow="Syncing access"
        title="Confirming your resident status."
        description="We’re checking your approved request, membership, and onboarding readiness."
        tone="neutral"
      />
    )
  }

  const state = getResidentFacingState(snapshot)

  if (state === "active") {
    return (
      <CardFrame
        icon={Sparkles}
        eyebrow={snapshot?.buildingName || "Resident Concierge"}
        title="Your private community is now open."
        description={
          snapshot?.message ||
          "Your building membership is active. You can now view introductions, gatherings, and private resident experiences."
        }
        tone="success"
        primaryAction={{
          label: "View community",
          onClick: onViewCommunity,
        }}
      />
    )
  }

  if (state === "survey_incomplete") {
    return (
      <CardFrame
        icon={FileText}
        eyebrow={snapshot?.buildingName || "Profile incomplete"}
        title="Complete your profile before introductions begin."
        description={
          snapshot?.message ||
          "Your access is active, but your onboarding is still incomplete. Finish it so Resident Concierge can tailor introductions and gathering recommendations."
        }
        tone="gold"
        primaryAction={{
          label: "Complete profile",
          onClick: onCompleteProfile,
        }}
        secondaryAction={{
          label: "View community",
          onClick: onViewCommunity,
          variant: "secondary",
        }}
      />
    )
  }

  if (state === "pending") {
    return (
      <CardFrame
        icon={Clock3}
        eyebrow={snapshot?.buildingName || "Pending approval"}
        title="Your resident request is still under review."
        description={
          snapshot?.message ||
          "Your building team has your request. We’ll unlock access as soon as approval is complete."
        }
        tone="neutral"
        primaryAction={{
          label: "Return to join flow",
          onClick: onReturnToJoin,
        }}
        secondaryAction={{
          label: "Contact building manager/support",
          href: "mailto:hello@residentconcierge.co?subject=Resident%20Concierge%20Approval%20Help",
          variant: "secondary",
        }}
      />
    )
  }

  return (
    <CardFrame
      icon={LifeBuoy}
      eyebrow={snapshot?.buildingName || "Membership not found"}
      title="We couldn’t find an active building membership yet."
      description={
        snapshot?.message ||
        "This account is not yet connected to an active resident membership for the current building."
      }
      tone="neutral"
      primaryAction={{
        label: "Return to join flow",
        onClick: onReturnToJoin,
      }}
      secondaryAction={{
        label: "Contact building manager/support",
        href: "mailto:hello@residentconcierge.co?subject=Resident%20Concierge%20Membership%20Help",
        variant: "secondary",
      }}
    />
  )
}

function getResidentFacingState(snapshot: ResidentAccountSnapshot | null): ResidentFacingState {
  if (snapshot?.status === "active" && snapshot.needsSurveyCompletion) {
    return "survey_incomplete"
  }

  if (snapshot?.status === "active") {
    return "active"
  }

  if (snapshot?.status === "pending_review") {
    return "pending"
  }

  return "missing_membership"
}

function CardFrame({
  icon: Icon,
  eyebrow,
  title,
  description,
  tone,
  primaryAction,
  secondaryAction,
}: {
  icon: typeof Sparkles
  eyebrow: string
  title: string
  description: string
  tone: "gold" | "success" | "neutral"
  primaryAction?: { label: string; onClick: () => void; href?: never }
  secondaryAction?: { label: string; onClick?: () => void; href?: string; variant: "secondary" }
}) {
  const toneClasses =
    tone === "success"
      ? "border-gold/35 bg-[linear-gradient(135deg,rgba(193,154,81,0.12),rgba(255,255,255,0.92))]"
      : tone === "gold"
        ? "border-gold/30 bg-gold/10"
        : "border-border bg-card"

  return (
    <div className={`overflow-hidden rounded-[2rem] border p-5 shadow-[0_24px_60px_-42px_rgba(74,56,32,0.45)] ${toneClasses}`}>
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-background/85 text-gold shadow-[0_10px_20px_-16px_rgba(60,46,24,0.4)]">
          <Icon className="size-5" strokeWidth={1.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold">{eyebrow}</p>
          <h3 className="mt-2 font-serif text-[1.7rem] leading-tight text-foreground">{title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-foreground/75">{description}</p>
        </div>
      </div>

      {primaryAction || secondaryAction ? (
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          {primaryAction ? (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
            >
              {primaryAction.label}
              <ArrowUpRight className="size-4" />
            </button>
          ) : null}

          {secondaryAction ? (
            secondaryAction.href ? (
              <a
                href={secondaryAction.href}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-5 py-3 text-sm font-medium text-foreground transition-colors hover:border-gold/40"
              >
                {secondaryAction.label}
              </a>
            ) : (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-5 py-3 text-sm font-medium text-foreground transition-colors hover:border-gold/40"
              >
                {secondaryAction.label}
              </button>
            )
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
