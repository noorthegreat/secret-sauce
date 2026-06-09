"use client"

import { useState } from "react"
import { meetupTypes, amenities, meetupTimes, type Resident } from "@/lib/concierge-data"
import { SelectCard } from "@/components/select-card"
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

export function MeetupFlow({
  resident,
  onClose,
}: {
  resident: Resident
  onClose: () => void
}) {
  const [step, setStep] = useState(0)
  const [type, setType] = useState<string | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const [amenity, setAmenity] = useState<string | null>(null)

  const titles = ["Choose a meetup", "Select a time", "Choose a space", "Confirm"]
  const canContinue = [type, time, amenity, true][step]

  const selectedType = meetupTypes.find((t) => t.id === type)
  const selectedAmenity = amenities.find((a) => a.id === amenity)

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-background">
      <div className="flex items-center justify-between px-6 pb-3 pt-6">
        <button
          type="button"
          onClick={step === 0 ? onClose : () => setStep((s) => s - 1)}
          className="flex size-9 items-center justify-center rounded-full border border-border text-foreground"
          aria-label="Back"
        >
          {step === 0 ? <X className="size-4" /> : <ArrowLeft className="size-4" />}
        </button>
        <div className="flex gap-1.5">
          {[0, 1, 2, 3].map((s) => (
            <span
              key={s}
              className={cn("h-1 w-6 rounded-full", s <= step ? "bg-gold" : "bg-border")}
            />
          ))}
        </div>
        <span className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-32 pt-3">
        <div className="mb-5 flex items-center gap-3">
          <img
            src={resident.photo || "/placeholder.svg"}
            alt={resident.name}
            className="size-11 rounded-full object-cover"
          />
          <div>
            <p className="text-xs text-muted-foreground">Arranging with</p>
            <p className="font-serif text-lg leading-tight text-foreground">{resident.name}</p>
          </div>
        </div>

        <h2 className="mb-5 font-serif text-2xl text-foreground">{titles[step]}</h2>

        {step === 0 && (
          <div className="flex flex-col gap-3">
            {meetupTypes.map((t) => (
              <SelectCard
                key={t.id}
                label={t.label}
                note={t.note}
                selected={type === t.id}
                onClick={() => setType(t.id)}
              />
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-3">
            {meetupTimes.map((t) => (
              <SelectCard key={t} label={t} selected={time === t} onClick={() => setTime(t)} />
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-2 gap-3">
            {amenities.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAmenity(a.id)}
                className={cn(
                  "overflow-hidden rounded-2xl border text-left transition-all",
                  amenity === a.id ? "border-gold ring-2 ring-gold/30" : "border-border",
                )}
              >
                <img
                  src={a.image || "/placeholder.svg"}
                  alt={a.label}
                  className="h-24 w-full object-cover"
                />
                <div className="px-3 py-2.5">
                  <p className="font-serif text-base leading-tight text-foreground">{a.label}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{a.note}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="overflow-hidden rounded-3xl border border-border bg-card">
            {selectedAmenity && (
              <img
                src={selectedAmenity.image || "/placeholder.svg"}
                alt={selectedAmenity.label}
                className="h-36 w-full object-cover"
              />
            )}
            <div className="space-y-4 p-5">
              <ConfirmRow label="Guest" value={resident.name} />
              <ConfirmRow label="Meetup" value={selectedType?.label ?? ""} />
              <ConfirmRow label="When" value={time ?? ""} />
              <ConfirmRow label="Where" value={selectedAmenity?.label ?? ""} />
            </div>
          </div>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background to-transparent px-6 pb-8 pt-4">
        <button
          type="button"
          disabled={!canContinue}
          onClick={step === 3 ? onClose : () => setStep((s) => s + 1)}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-medium tracking-wide transition-all active:scale-[0.99]",
            canContinue
              ? "bg-foreground text-background"
              : "cursor-not-allowed bg-secondary text-muted-foreground",
          )}
        >
          {step === 3 ? (
            <>
              Send invitation <Check className="size-4" />
            </>
          ) : (
            <>
              Continue <ArrowRight className="size-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 pb-3 last:border-0 last:pb-0">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      <span className="font-serif text-lg text-foreground">{value}</span>
    </div>
  )
}
