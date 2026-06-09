"use client"

import { useState } from "react"
import Link from "next/link"

import { submitResidentJoinRequest } from "@/lib/public-intake"
import { interests } from "@/lib/concierge-data"
import { Chip } from "@/components/select-card"

const lookingForOptions = [
  "Friendships",
  "Networking",
  "Activity partners",
  "New-to-city connections",
  "Professional connections",
  "Community events",
] as const

const connectionStyles = [
  "One-on-one",
  "Small groups",
  "Community events",
  "Activity partners",
  "Professional networking",
] as const

const availabilityOptions = [
  "Weekday mornings",
  "Weekday evenings",
  "Weekends",
  "Flexible",
  "Workday lunch",
  "Late evenings",
] as const

const amenityOptions = [
  "Sky deck",
  "Pool",
  "Game room",
  "Lounge",
  "Gym",
  "Coworking space",
  "Private dining room",
  "Lobby cafe",
] as const

const ageRangeOptions = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"] as const

function toggleValue(values: string[], nextValue: string) {
  return values.includes(nextValue)
    ? values.filter((value) => value !== nextValue)
    : [...values, nextValue]
}

export default function JoinCommunityPage() {
  const [inviteCode, setInviteCode] = useState("CHORUS")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [unitNumber, setUnitNumber] = useState("")
  const [moveInDate, setMoveInDate] = useState("")
  const [occupation, setOccupation] = useState("")
  const [ageRange, setAgeRange] = useState<(typeof ageRangeOptions)[number] | "">("")
  const [introduction, setIntroduction] = useState("")
  const [selectedInterests, setSelectedInterests] = useState<string[]>(["Wellness", "Food"])
  const [selectedLookingFor, setSelectedLookingFor] = useState<string[]>(["Friendships"])
  const [selectedConnectionStyles, setSelectedConnectionStyles] = useState<string[]>(["One-on-one"])
  const [selectedAvailability, setSelectedAvailability] = useState<string[]>(["Weekday evenings"])
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(["Lounge"])
  const [contactViaSms, setContactViaSms] = useState(true)
  const [contactViaEmail, setContactViaEmail] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const canSubmit =
    inviteCode.trim().length >= 5 &&
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 0 &&
    phone.trim().length > 0 &&
    unitNumber.trim().length > 0 &&
    selectedLookingFor.length > 0 &&
    selectedConnectionStyles.length > 0 &&
    selectedAvailability.length > 0 &&
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
        moveInDate: moveInDate || undefined,
        occupation: occupation.trim() || undefined,
        ageRange: ageRange || undefined,
        introduction: introduction.trim() || undefined,
        interests: selectedInterests,
        lookingFor: selectedLookingFor,
        connectionStyles: selectedConnectionStyles,
        availability: selectedAvailability,
        amenityPreferences: selectedAmenities,
        wantsFriendships: selectedLookingFor.includes("Friendships"),
        wantsNetworking:
          selectedLookingFor.includes("Networking") ||
          selectedLookingFor.includes("Professional connections"),
        contactViaSms,
        contactViaEmail,
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
      <div className="mx-auto max-w-4xl px-6 py-10 sm:px-8 lg:py-14">
        <header className="rounded-[2.5rem] border border-border bg-card px-8 py-10 shadow-[0_32px_70px_-42px_rgba(70,56,35,0.35)]">
          <p className="font-mono text-[11px] uppercase tracking-[0.42em] text-gold">Resident Concierge</p>
          <h1 className="mt-6 max-w-3xl text-balance font-serif text-5xl leading-[0.98] text-foreground sm:text-6xl">
            Join your building&apos;s private community.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            This form is live and connected to the existing secure Supabase intake function. Your request
            goes into the real building-scoped review flow.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <section className="rounded-[2rem] border border-border bg-card p-7">
            <h2 className="font-serif text-3xl text-foreground">Basics</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Invite code">
                <input value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} className={inputClassName} required />
              </Field>
              <Field label="Unit number">
                <input value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)} className={inputClassName} required />
              </Field>
              <Field label="First name">
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClassName} required />
              </Field>
              <Field label="Last name">
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClassName} required />
              </Field>
              <Field label="Email">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClassName} required />
              </Field>
              <Field label="Phone">
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClassName} placeholder="+14155551234" required />
              </Field>
              <Field label="Move-in date">
                <input type="date" value={moveInDate} onChange={(e) => setMoveInDate(e.target.value)} className={inputClassName} />
              </Field>
              <Field label="Age range">
                <select value={ageRange} onChange={(e) => setAgeRange(e.target.value as typeof ageRangeOptions[number] | "")} className={inputClassName}>
                  <option value="">Optional</option>
                  {ageRangeOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </Field>
              <Field label="Occupation" className="sm:col-span-2">
                <input value={occupation} onChange={(e) => setOccupation(e.target.value)} className={inputClassName} />
              </Field>
              <Field label="Short introduction" className="sm:col-span-2">
                <textarea value={introduction} onChange={(e) => setIntroduction(e.target.value)} className={`${inputClassName} min-h-28 resize-y`} maxLength={400} />
              </Field>
            </div>
          </section>

          <OptionSection title="Interests" subtitle="Pick up to 12.">
            {interests.map((option) => (
              <Chip
                key={option}
                label={option}
                selected={selectedInterests.includes(option)}
                onClick={() =>
                  setSelectedInterests((current) =>
                    current.includes(option)
                      ? current.filter((value) => value !== option)
                      : current.length < 12
                        ? [...current, option]
                        : current,
                  )
                }
              />
            ))}
          </OptionSection>

          <OptionSection title="Looking for" subtitle="Choose at least one.">
            {lookingForOptions.map((option) => (
              <Chip
                key={option}
                label={option}
                selected={selectedLookingFor.includes(option)}
                onClick={() => setSelectedLookingFor((current) => toggleValue(current, option))}
              />
            ))}
          </OptionSection>

          <OptionSection title="How you like to connect" subtitle="Choose at least one.">
            {connectionStyles.map((option) => (
              <Chip
                key={option}
                label={option}
                selected={selectedConnectionStyles.includes(option)}
                onClick={() => setSelectedConnectionStyles((current) => toggleValue(current, option))}
              />
            ))}
          </OptionSection>

          <OptionSection title="Availability" subtitle="Choose at least one.">
            {availabilityOptions.map((option) => (
              <Chip
                key={option}
                label={option}
                selected={selectedAvailability.includes(option)}
                onClick={() => setSelectedAvailability((current) => toggleValue(current, option))}
              />
            ))}
          </OptionSection>

          <OptionSection title="Preferred amenities" subtitle="Optional.">
            {amenityOptions.map((option) => (
              <Chip
                key={option}
                label={option}
                selected={selectedAmenities.includes(option)}
                onClick={() => setSelectedAmenities((current) => toggleValue(current, option))}
              />
            ))}
          </OptionSection>

          <section className="rounded-[2rem] border border-border bg-card p-7">
            <h2 className="font-serif text-3xl text-foreground">Contact preferences</h2>
            <div className="mt-5 flex flex-wrap gap-3">
              <ToggleCheck label="Text me" checked={contactViaSms} onToggle={() => setContactViaSms((value) => !value)} />
              <ToggleCheck label="Email me" checked={contactViaEmail} onToggle={() => setContactViaEmail((value) => !value)} />
            </div>

            {errorMessage && <p className="mt-5 text-sm text-destructive">{errorMessage}</p>}
            {successMessage ? (
              <div className="mt-5 rounded-3xl border border-gold/30 bg-gold/10 p-4">
                <p className="text-sm text-gold-foreground">{successMessage}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  After approval, sign in with this same email address to activate your live resident account.
                </p>
                <Link
                  href="/auth?next=%2Fapp%2Fprofile"
                  className="mt-3 inline-flex rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-gold/40"
                >
                  Sign in or create account
                </Link>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="mt-6 rounded-full bg-foreground px-6 py-3 text-sm font-medium tracking-wide text-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Join the community"}
            </button>
          </section>
        </form>
      </div>
    </main>
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

function OptionSection({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[2rem] border border-border bg-card p-7">
      <h2 className="font-serif text-3xl text-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-5 flex flex-wrap gap-3">{children}</div>
    </section>
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
