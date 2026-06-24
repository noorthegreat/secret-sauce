"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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
    <main className="min-h-screen bg-[#1f1a15] text-[#f3ebdc]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-12 pt-6">
        <div className="mb-8 flex items-start justify-between gap-4">
          <FifthCircleBrandMark
            theme="dark"
            caption="Private building access"
            align="left"
            className="gap-3"
          />
          <Link
            href="/auth?next=%2Fapp"
            className="inline-flex shrink-0 items-center rounded-full border border-[#4a4034] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.24em] text-[#d5c7b2] transition-colors hover:border-[#b89655] hover:text-[#f3ebdc]"
          >
            Sign in
          </Link>
        </div>

        <div className="mb-8 flex items-center justify-center gap-2">
          {[0, 1].map((value) => (
            <span
              key={value}
              className={`h-1.5 w-12 rounded-full transition-colors ${
                step >= value ? "bg-[#b89655]" : "bg-[#43392f]"
              }`}
            />
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {step === 0 ? (
            <section className="space-y-6">
              <HeroBlock
                eyebrow="Private residential community"
                title="Welcome to"
                accent="your building."
                description="A calm private entry into your building community. We verify residency first, then open the full Fifth Circle experience once you are approved."
              />

              <div className="rounded-[1.8rem] border border-[#3f352c] bg-[#251f19] px-5 py-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#b89655]">
                  Already approved?
                </p>
                <div className="mt-3 flex items-center justify-between gap-4">
                  <p className="text-sm leading-7 text-[#b8ab97]">
                    Sign in with the same email tied to your resident request.
                  </p>
                  <Link
                    href="/auth?next=%2Fapp"
                    className="inline-flex items-center gap-2 rounded-full border border-[#4a4034] bg-[#1f1a15] px-4 py-2 text-sm text-[#f3ebdc] transition-colors hover:border-[#b89655]"
                  >
                    Enter
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>

              <JourneyPreview />

              <div className="space-y-4 rounded-[2rem] border border-[#3f352c] bg-[#251f19] p-5">
                <div className="pb-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#b89655]">
                    Confirm your residence
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[#b8ab97]">
                    This stays private to your building team and Fifth Circle.
                  </p>
                </div>

                <Field label="Invite code">
                  <input
                    value={inviteCode}
                    onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                    className={inputClassName}
                    required
                  />
                </Field>

                <Field label="Apartment or unit">
                  <input
                    value={unitNumber}
                    onChange={(event) => setUnitNumber(event.target.value)}
                    className={inputClassName}
                    required
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="First name">
                    <input
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      className={inputClassName}
                      required
                    />
                  </Field>
                  <Field label="Last name">
                    <input
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      className={inputClassName}
                      required
                    />
                  </Field>
                </div>

                <Field label="Email">
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={inputClassName}
                    required
                  />
                </Field>

                <Field label="Phone">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+14155551234"
                    className={inputClassName}
                    required
                  />
                </Field>
              </div>

              <PrimaryButton type="button" disabled={!canAdvanceStep0} onClick={() => setStep(1)}>
                Continue
              </PrimaryButton>
            </section>
          ) : (
            <section className="space-y-6">
              <HeroBlock
                eyebrow="Thoughtful introductions"
                title="What kind of"
                accent="connections"
                afterAccent="matter most to you?"
                description="Choose only what feels genuinely useful. We use this to prepare thoughtful introductions after approval, not to create a public profile."
              />

              <div className="space-y-3">
                {intents.map((option) => (
                  <SelectCard
                    key={option.id}
                    label={option.label}
                    note={option.note}
                    selected={selectedLookingFor.includes(option.id)}
                    onClick={() =>
                      setSelectedLookingFor((current) => toggleValue(current, option.id))
                    }
                    tone="dark"
                  />
                ))}
              </div>

              <div className="rounded-[2rem] border border-[#3f352c] bg-[#251f19] p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#a89274]">
                  How should we reach you?
                </p>
                <p className="mt-2 text-sm leading-7 text-[#b8ab97]">
                  We&apos;ll only use this to confirm access, share approval updates, and send your
                  next step into onboarding.
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
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
              </div>

              {errorMessage ? <Message tone="error">{errorMessage}</Message> : null}
              {successMessage ? (
                <Message tone="success">
                  <div className="space-y-3">
                    <p>{successMessage}</p>
                    <p className="text-xs leading-6 text-[#d9cfbf]">
                      Once approved, sign in to complete your private onboarding and unlock
                      introductions, circles, and gatherings.
                    </p>
                    <Link
                      href="/auth?next=%2Fapp"
                      className="inline-flex rounded-full border border-[#4a4034] bg-[#1f1a15] px-4 py-2 text-sm font-medium text-[#f3ebdc]"
                    >
                      Sign in or create account
                    </Link>
                  </div>
                </Message>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <SecondaryButton type="button" onClick={() => setStep(0)}>
                  Back
                </SecondaryButton>
                <PrimaryButton type="submit" disabled={!canSubmit || isSubmitting}>
                  {isSubmitting ? "Requesting access..." : "Request access"}
                </PrimaryButton>
              </div>

              {!successMessage ? (
                <p className="text-center text-sm leading-7 text-[#a99780]">
                  Already part of your building community?{" "}
                  <Link
                    href="/auth?next=%2Fapp"
                    className="text-[#f3ebdc] underline decoration-[#8d7043] underline-offset-4"
                  >
                    Sign in here
                  </Link>
                  .
                </p>
              ) : null}
            </section>
          )}
        </form>

        <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-[#8f7d66]">
          Private. Building-scoped. Concierge-led.
        </p>
      </div>
    </main>
  )
}

function JourneyPreview() {
  return (
    <div className="rounded-[1.8rem] border border-[#3f352c] bg-[#211b16] px-5 py-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#b89655]">
        What happens next
      </p>
      <div className="mt-4 grid gap-3">
        {[
          ["1", "Request access", "We confirm your building and unit details."],
          ["2", "Receive approval", "Your building team approves private access."],
          [
            "3",
            "Enter Fifth Circle",
            "Sign in and complete your onboarding to unlock introductions.",
          ],
        ].map(([step, title, body]) => (
          <div
            key={step}
            className="rounded-[1.4rem] border border-[#3b3228] bg-[#26201b] px-4 py-4"
          >
            <div className="flex items-start gap-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[#7c6238] text-sm text-[#f0debc]">
                {step}
              </span>
              <div>
                <p className="font-serif text-xl text-[#f3ebdc]">{title}</p>
                <p className="mt-1 text-sm leading-7 text-[#a99780]">{body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function HeroBlock({
  eyebrow,
  title,
  accent,
  afterAccent,
  description,
}: {
  eyebrow: string
  title: string
  accent: string
  afterAccent?: string
  description: string
}) {
  return (
    <div className="text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.36em] text-[#b89655]">
        {eyebrow}
      </p>
      <h1 className="mt-5 font-serif text-[2.7rem] leading-[0.96] text-[#f3ebdc]">
        {title}
        <span className="block italic text-[#c29a51]">{accent}</span>
        {afterAccent ? <span className="block">{afterAccent}</span> : null}
      </h1>
      <p className="mt-4 text-sm leading-7 text-[#b8ab97]">{description}</p>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.24em] text-[#9f917e]">
        {label}
      </span>
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
        checked
          ? "border-[#b89655] bg-[#f3ebdc] text-[#2d241d]"
          : "border-[#43392f] bg-[#1f1a15] text-[#f3ebdc]"
      }`}
    >
      {label}
    </button>
  )
}

function PrimaryButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="w-full rounded-full border border-[#4a4034] bg-[#231d17] px-6 py-3 text-sm font-medium tracking-[0.18em] text-[#f3ebdc] transition-colors hover:border-[#b89655] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  )
}

function SecondaryButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="rounded-full border border-[#4a4034] bg-[#1f1a15] px-6 py-3 text-sm font-medium tracking-[0.18em] text-[#f3ebdc]"
    >
      {children}
    </button>
  )
}

function Message({
  children,
  tone,
}: {
  children: React.ReactNode
  tone: "error" | "success"
}) {
  return (
    <div
      className={`rounded-[1.6rem] border px-4 py-3 text-sm ${
        tone === "error"
          ? "border-[#6d433f] bg-[#382320] text-[#efb0a6]"
          : "border-[#7a6640] bg-[#2d271d] text-[#f0dfbe]"
      }`}
    >
      {children}
    </div>
  )
}

const inputClassName =
  "h-12 w-full rounded-[1rem] border border-[#42382d] bg-[#2a231c] px-4 text-sm text-[#f3ebdc] outline-none transition-colors placeholder:text-[#7f7262] focus:border-[#b89655]"
