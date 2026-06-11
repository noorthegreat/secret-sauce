"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { FifthCircleBrandMark } from "@/components/fifth-circle-brand-mark"
import { SelectCard } from "@/components/select-card"
import { intents, type MatchingGoalId } from "@/lib/concierge-data"
import { trackProductEvent } from "@/lib/product-analytics"
import { submitResidentJoinRequest } from "@/lib/public-intake"

function toggleValue<T extends string>(values: T[], nextValue: T) {
  return values.includes(nextValue)
    ? values.filter((value) => value !== nextValue)
    : [...values, nextValue]
}

export default function JoinCommunityPage() {
  const [step, setStep] = useState<0 | 1>(0)
  const [inviteCode, setInviteCode] = useState("CHORUS")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [unitNumber, setUnitNumber] = useState("")
  const [selectedLookingFor, setSelectedLookingFor] = useState<MatchingGoalId[]>(["friendships"])
  const [contactViaSms, setContactViaSms] = useState(true)
  const [contactViaEmail, setContactViaEmail] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    const invite = new URLSearchParams(window.location.search).get("invite")?.trim().toUpperCase()
    if (invite && invite.length >= 5) {
      setInviteCode(invite)
    }
  }, [])

  const canAdvanceStep0 =
    inviteCode.trim().length >= 5 &&
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 0 &&
    phone.trim().length > 0 &&
    unitNumber.trim().length > 0

  const canSubmit =
    canAdvanceStep0 &&
    selectedLookingFor.length > 0 &&
    (contactViaSms || contactViaEmail)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit || isSubmitting) return

    setIsSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const result = await submitResidentJoinRequest({
        inviteCode: inviteCode.trim().toUpperCase(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        unitNumber: unitNumber.trim(),
        lookingFor: selectedLookingFor,
        wantsFriendships: selectedLookingFor.some((value) =>
          ["friendships", "activity_partners", "community_involvement"].includes(value),
        ),
        wantsNetworking: selectedLookingFor.includes("professional_networking"),
        contactViaSms,
        contactViaEmail,
      })

      trackProductEvent("join_request_submitted", {
        goals: selectedLookingFor.length,
      })
      setSuccessMessage(result.message)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to submit your request.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="relative mx-auto max-w-5xl overflow-hidden px-6 py-10 sm:px-8 lg:py-14">
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.1]">
          <img src="/building.png" alt="" aria-hidden="true" className="h-full w-full object-cover blur-[3px]" />
        </div>
        <header className="relative overflow-hidden rounded-[2.5rem] border border-border bg-card/95 px-8 py-10 shadow-[0_32px_70px_-42px_rgba(70,56,35,0.35)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(191,151,85,0.1),transparent)]" />
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.42em] text-gold">
                Fifth Circle resident access
              </p>
              <h1 className="mt-6 max-w-3xl text-balance font-serif text-5xl leading-[0.98] text-foreground sm:text-6xl">
                Join your building&apos;s private community.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                A short request for access — about two minutes. Matching preferences come after
                approval during onboarding.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-muted-foreground">
                <TrustPill text="Reviewed privately by your building team" />
                <TrustPill text="Used only for introductions and gatherings" />
                <TrustPill text="Never posted publicly inside the building" />
              </div>
            </div>
            <FifthCircleBrandMark className="mx-auto w-full max-w-sm lg:max-w-none" />
          </div>
        </header>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="flex items-center gap-2">
            {[0, 1].map((value) => (
              <span
                key={value}
                className={`h-1 flex-1 rounded-full ${step >= value ? "bg-gold" : "bg-border"}`}
              />
            ))}
          </div>

          {step === 0 ? (
            <section className="rounded-[2rem] border border-border bg-card/95 p-7">
              <SectionHeader
                title="Confirm your residency"
                subtitle="We use this to verify access and contact you once approved."
              />
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Invite code">
                  <input
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    className={inputClassName}
                    required
                  />
                </Field>
                <Field label="Unit number">
                  <input
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    className={inputClassName}
                    required
                  />
                </Field>
                <Field label="First name">
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={inputClassName}
                    required
                  />
                </Field>
                <Field label="Last name">
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={inputClassName}
                    required
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClassName}
                    required
                  />
                </Field>
                <Field label="Phone">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputClassName}
                    placeholder="+14155551234"
                    required
                  />
                </Field>
              </div>
              <button
                type="button"
                disabled={!canAdvanceStep0}
                onClick={() => setStep(1)}
                className="mt-6 rounded-full bg-foreground px-6 py-3 text-sm font-medium tracking-wide text-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue
              </button>
            </section>
          ) : (
            <>
              <section className="rounded-[2rem] border border-border bg-card/95 p-7">
                <SectionHeader
                  title="What are you hoping to find?"
                  subtitle="Choose the kinds of introductions that would feel most valuable. You can refine interests and availability after approval."
                />
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {intents.map((option) => (
                    <SelectCard
                      key={option.id}
                      label={option.label}
                      note={option.note}
                      selected={selectedLookingFor.includes(option.id)}
                      onClick={() =>
                        setSelectedLookingFor((current) => toggleValue(current, option.id))
                      }
                    />
                  ))}
                </div>
              </section>

              <section className="rounded-[2rem] border border-border bg-card/95 p-7">
                <SectionHeader
                  title="Contact preferences"
                  subtitle="Tell us the best way to reach you once your access is approved."
                />
                <div className="mt-5 flex flex-wrap gap-3">
                  <ToggleCheck
                    label="Text me"
                    checked={contactViaSms}
                    onToggle={() => setContactViaSms((value) => !value)}
                  />
                  <ToggleCheck
                    label="Email me"
                    checked={contactViaEmail}
                    onToggle={() => setContactViaEmail((value) => !value)}
                  />
                </div>

                {errorMessage ? <p className="mt-5 text-sm text-destructive">{errorMessage}</p> : null}
                {successMessage ? (
                  <div className="mt-5 rounded-3xl border border-gold/30 bg-gold/10 p-4">
                    <p className="text-sm text-gold-foreground">{successMessage}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      After approval, complete onboarding to unlock introductions and gatherings.
                    </p>
                    <Link
                      href="/auth?next=%2Fapp%2Fonboarding"
                      className="mt-3 inline-flex rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-gold/40"
                    >
                      Sign in or create account
                    </Link>
                  </div>
                ) : null}

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(0)}
                    className="rounded-full border border-border bg-background px-6 py-3 text-sm font-medium tracking-wide text-foreground"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={!canSubmit || isSubmitting}
                    className="rounded-full bg-foreground px-6 py-3 text-sm font-medium tracking-wide text-background disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? "Submitting..." : "Request access"}
                  </button>
                </div>
              </section>
            </>
          )}
        </form>
      </div>
    </main>
  )
}

function TrustPill({ text }: { text: string }) {
  return (
    <span className="rounded-full border border-gold/20 bg-background px-4 py-2 text-sm">
      {text}
    </span>
  )
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
}) {
  return (
    <>
      <h2 className="font-serif text-3xl text-foreground">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
    </>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function ToggleCheck({
  label,
  checked,
  onToggle,
}: {
  label: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-full border px-4 py-2 text-sm transition-colors ${
        checked ? "border-gold bg-foreground text-background" : "border-border bg-background text-foreground"
      }`}
    >
      {label}
    </button>
  )
}

const inputClassName =
  "w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-gold/60"
