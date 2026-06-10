"use client"

import Link from "next/link"
import { useState } from "react"

import { submitBuildingManagerLead } from "@/lib/public-intake"

const valueCards = [
  {
    title: "Private resident access",
    description:
      "Residents opt in to a building-scoped experience that feels curated, not crowded.",
  },
  {
    title: "Concierge-led introductions",
    description:
      "Thoughtful introductions and small moments of connection designed for trust and compatibility.",
  },
  {
    title: "Community Pulse",
    description:
      "See join demand, event traction, and introduction activity in one clean operating view.",
  },
] as const

const nextSteps = [
  "We confirm fit for your building",
  "We set up your pilot invite flow",
  "Residents opt in privately",
  "Your team launches with Community Pulse",
] as const

export default function ForBuildingsPage() {
  const [buildingName, setBuildingName] = useState("")
  const [city, setCity] = useState("")
  const [stateRegion, setStateRegion] = useState("")
  const [managerFirstName, setManagerFirstName] = useState("")
  const [managerLastName, setManagerLastName] = useState("")
  const [managerEmail, setManagerEmail] = useState("")
  const [managerPhone, setManagerPhone] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [unitCount, setUnitCount] = useState("250")
  const [notes, setNotes] = useState("")
  const [contactViaSms, setContactViaSms] = useState(false)
  const [contactViaEmail, setContactViaEmail] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [buildingSlug, setBuildingSlug] = useState<string | null>(null)

  const canSubmit =
    buildingName.trim().length >= 2 &&
    city.trim().length > 0 &&
    managerFirstName.trim().length > 0 &&
    managerLastName.trim().length > 0 &&
    managerEmail.trim().length > 0 &&
    managerPhone.trim().length > 0 &&
    Number(unitCount) > 0 &&
    (contactViaSms || contactViaEmail)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit || isSubmitting) return

    setIsSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    setInviteCode(null)
    setBuildingSlug(null)

    try {
      const result = await submitBuildingManagerLead({
        buildingName: buildingName.trim(),
        city: city.trim(),
        stateRegion: stateRegion.trim() || undefined,
        managerFirstName: managerFirstName.trim(),
        managerLastName: managerLastName.trim(),
        managerEmail: managerEmail.trim(),
        managerPhone: managerPhone.trim(),
        jobTitle: jobTitle.trim() || undefined,
        unitCount: Number(unitCount),
        notes: notes.trim() || undefined,
        contactViaSms,
        contactViaEmail,
      })

      setSuccessMessage(result.message)
      setInviteCode(result.inviteCode ?? null)
      setBuildingSlug(result.buildingSlug ?? null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to submit your request.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(191,151,85,0.16),_transparent_36%)]" />
        <div className="mx-auto max-w-6xl px-6 py-10 sm:px-8 lg:px-10 lg:py-14">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <section className="lg:sticky lg:top-10">
              <div className="rounded-[2.5rem] border border-border bg-card px-8 py-10 shadow-[0_32px_70px_-42px_rgba(70,56,35,0.35)]">
                <p className="font-mono text-[11px] uppercase tracking-[0.42em] text-gold">
                  For building teams
                </p>
                <h1 className="mt-6 max-w-xl text-balance font-serif text-5xl leading-[0.98] text-foreground sm:text-6xl">
                  Launch a private resident community pilot for your building.
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                  Resident Concierge helps luxury residential buildings turn resident interest into
                  curated introductions, stronger event participation, and clearer community insight.
                </p>

                <div className="mt-8 grid gap-3">
                  {valueCards.map((card) => (
                    <div
                      key={card.title}
                      className="rounded-[1.75rem] border border-border bg-background px-5 py-4"
                    >
                      <h2 className="font-serif text-2xl text-foreground">{card.title}</h2>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {card.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 rounded-[2rem] border border-border bg-card p-6 shadow-[0_24px_60px_-42px_rgba(70,56,35,0.3)]">
                <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold">
                  What happens next
                </p>
                <ol className="mt-5 space-y-3">
                  {nextSteps.map((step, index) => (
                    <li key={step} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/10 font-mono text-[11px] text-gold-foreground">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                  We recommend starting with one flagship property, one building lead, and a soft
                  resident launch.
                </p>
              </div>
            </section>

            <section>
              <form
                onSubmit={handleSubmit}
                className="rounded-[2rem] border border-border bg-card p-7 shadow-[0_24px_60px_-42px_rgba(70,56,35,0.3)] sm:p-8"
              >
                <div className="border-b border-border pb-6">
                  <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold">
                    Request your pilot
                  </p>
                  <h2 className="mt-3 font-serif text-4xl leading-tight text-foreground">
                    Tell us about your building.
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    Share a few details about the property and the lead contact. We will use this to
                    prepare pilot setup, manager access, and resident invites.
                  </p>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <Field label="Building name">
                    <input
                      value={buildingName}
                      onChange={(e) => setBuildingName(e.target.value)}
                      className={inputClassName}
                      required
                    />
                  </Field>
                  <Field label="Approximate unit count">
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={unitCount}
                      onChange={(e) => setUnitCount(e.target.value)}
                      className={inputClassName}
                      required
                    />
                  </Field>
                  <Field label="City">
                    <input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className={inputClassName}
                      required
                    />
                  </Field>
                  <Field label="State / region">
                    <input
                      value={stateRegion}
                      onChange={(e) => setStateRegion(e.target.value)}
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Building lead first name">
                    <input
                      value={managerFirstName}
                      onChange={(e) => setManagerFirstName(e.target.value)}
                      className={inputClassName}
                      required
                    />
                  </Field>
                  <Field label="Building lead last name">
                    <input
                      value={managerLastName}
                      onChange={(e) => setManagerLastName(e.target.value)}
                      className={inputClassName}
                      required
                    />
                  </Field>
                  <Field label="Work email">
                    <input
                      type="email"
                      value={managerEmail}
                      onChange={(e) => setManagerEmail(e.target.value)}
                      className={inputClassName}
                      required
                    />
                  </Field>
                  <Field label="Mobile phone">
                    <input
                      type="tel"
                      value={managerPhone}
                      onChange={(e) => setManagerPhone(e.target.value)}
                      className={inputClassName}
                      placeholder="+14155551234"
                      required
                    />
                  </Field>
                  <Field label="Role or title" className="sm:col-span-2">
                    <input
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Anything we should know?" className="sm:col-span-2">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className={`${inputClassName} min-h-28 resize-y`}
                      maxLength={2000}
                      placeholder="Launch timing, resident profile, amenity focus, or anything else helpful."
                    />
                  </Field>
                </div>

                <div className="mt-6 rounded-[1.5rem] border border-border bg-background px-5 py-4">
                  <p className="text-sm font-medium text-foreground">Preferred follow-up</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Choose how you would like us to reach you during pilot setup.
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

                {errorMessage ? (
                  <p className="mt-5 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {errorMessage}
                  </p>
                ) : null}

                {successMessage ? (
                  <div className="mt-5 rounded-3xl border border-gold/30 bg-gold/10 p-5">
                    <p className="text-sm font-medium text-gold-foreground">{successMessage}</p>
                    {inviteCode ? (
                      <p className="mt-3 text-sm text-foreground">
                        Pilot invite code: <span className="font-mono text-gold-foreground">{inviteCode}</span>
                      </p>
                    ) : null}
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      Your next step is to test the resident invite flow and confirm manager access for
                      Community Pulse.
                    </p>
                    {buildingSlug ? (
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Link
                          href={`/join-community?invite=${encodeURIComponent(inviteCode ?? "")}`}
                          className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-gold/40"
                        >
                          Open resident join flow
                        </Link>
                        <Link
                          href="/manager/dashboard"
                          className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-gold/40"
                        >
                          Open Community Pulse
                        </Link>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Lean pilot, private access, and building-scoped resident data from day one.
                  </p>
                  <button
                    type="submit"
                    disabled={!canSubmit || isSubmitting}
                    className="rounded-full bg-foreground px-6 py-3 text-sm font-medium tracking-wide text-background disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? "Submitting..." : "Request pilot"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
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
