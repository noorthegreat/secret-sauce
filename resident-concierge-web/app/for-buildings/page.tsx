"use client"

import { useState } from "react"

import { submitBuildingManagerLead } from "@/lib/public-intake"

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
          <p className="font-mono text-[11px] uppercase tracking-[0.42em] text-gold">For buildings</p>
          <h1 className="mt-6 max-w-3xl text-balance font-serif text-5xl leading-[0.98] text-foreground sm:text-6xl">
            Start a Resident Concierge pilot for your building.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            This page is now connected to the real manager-lead intake backend. Submissions create or update
            the building lead flow and its subscription lead state.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="mt-8 rounded-[2rem] border border-border bg-card p-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Building name">
              <input value={buildingName} onChange={(e) => setBuildingName(e.target.value)} className={inputClassName} required />
            </Field>
            <Field label="Unit count">
              <input type="number" min={1} max={10000} value={unitCount} onChange={(e) => setUnitCount(e.target.value)} className={inputClassName} required />
            </Field>
            <Field label="City">
              <input value={city} onChange={(e) => setCity(e.target.value)} className={inputClassName} required />
            </Field>
            <Field label="State / region">
              <input value={stateRegion} onChange={(e) => setStateRegion(e.target.value)} className={inputClassName} />
            </Field>
            <Field label="Manager first name">
              <input value={managerFirstName} onChange={(e) => setManagerFirstName(e.target.value)} className={inputClassName} required />
            </Field>
            <Field label="Manager last name">
              <input value={managerLastName} onChange={(e) => setManagerLastName(e.target.value)} className={inputClassName} required />
            </Field>
            <Field label="Manager email">
              <input type="email" value={managerEmail} onChange={(e) => setManagerEmail(e.target.value)} className={inputClassName} required />
            </Field>
            <Field label="Manager phone">
              <input type="tel" value={managerPhone} onChange={(e) => setManagerPhone(e.target.value)} className={inputClassName} placeholder="+14155551234" required />
            </Field>
            <Field label="Job title" className="sm:col-span-2">
              <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className={inputClassName} />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputClassName} min-h-28 resize-y`} maxLength={2000} />
            </Field>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <ToggleCheck label="Text me" checked={contactViaSms} onToggle={() => setContactViaSms((value) => !value)} />
            <ToggleCheck label="Email me" checked={contactViaEmail} onToggle={() => setContactViaEmail((value) => !value)} />
          </div>

          {errorMessage && <p className="mt-5 text-sm text-destructive">{errorMessage}</p>}
          {successMessage && <p className="mt-5 text-sm text-gold-foreground">{successMessage}</p>}
          {inviteCode && <p className="mt-2 text-sm text-muted-foreground">Pilot invite code: {inviteCode}</p>}

          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className="mt-6 rounded-full bg-foreground px-6 py-3 text-sm font-medium tracking-wide text-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Request pilot"}
          </button>
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
