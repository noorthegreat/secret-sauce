"use client"

import { useMemo, useState } from "react"
import { amenities, meetupTypes, meetupTimes, type Resident } from "@/lib/concierge-data"
import { SelectCard } from "@/components/select-card"
import { ArrowLeft, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { trackProductEvent } from "@/lib/product-analytics"

type MeetupRecommendation = {
  title: string
  amenityLabel: string
  timingLabel: string | null
}

type MeetupPreset = {
  id: string
  label: string
  note: string
  typeId: string
  time: string
  amenityId: string
  recommended?: boolean
}

function buildPresets(recommendation?: MeetupRecommendation | null): MeetupPreset[] {
  const lounge = amenities.find((amenity) => amenity.id === "resident_lounge") ?? amenities[0]
  const rooftop = amenities.find((amenity) => amenity.id === "rooftop") ?? amenities[1] ?? lounge
  const coffeeType = meetupTypes.find((type) => type.id === "coffee") ?? meetupTypes[0]
  const wellnessType = meetupTypes.find((type) => type.id === "wellness") ?? meetupTypes[1] ?? coffeeType
  const eveningTime = meetupTimes.find((time) => time.includes("evening")) ?? meetupTimes[0]
  const weekendTime = meetupTimes.find((time) => time.includes("Saturday")) ?? meetupTimes[1] ?? eveningTime

  const recommendedAmenity =
    amenities.find((amenity) =>
      recommendation?.amenityLabel.toLowerCase().includes(amenity.label.toLowerCase()),
    ) ?? lounge

  const recommendedTime =
    meetupTimes.find((time) => recommendation?.timingLabel?.includes(time.split(" ")[0] ?? "")) ??
    eveningTime

  const presets: MeetupPreset[] = [
    {
      id: "recommended",
      label: recommendation?.title ?? "Coffee in the lounge",
      note:
        recommendation?.timingLabel && recommendation.amenityLabel
          ? `${recommendation.timingLabel} · ${recommendation.amenityLabel}`
          : "Concierge-recommended first meetup",
      typeId: coffeeType.id,
      time: recommendedTime,
      amenityId: recommendedAmenity.id,
      recommended: true,
    },
    {
      id: "wellness",
      label: "Wellness meetup",
      note: weekendTime,
      typeId: wellnessType.id,
      time: weekendTime,
      amenityId: lounge.id,
    },
    {
      id: "rooftop",
      label: "Rooftop catch-up",
      note: eveningTime,
      typeId: coffeeType.id,
      time: eveningTime,
      amenityId: rooftop.id,
    },
  ]

  return presets
}

export function MeetupFlow({
  resident,
  meetupRecommendation,
  onClose,
}: {
  resident: Resident
  meetupRecommendation?: MeetupRecommendation | null
  onClose: () => void
}) {
  const presets = useMemo(() => buildPresets(meetupRecommendation), [meetupRecommendation])
  const [step, setStep] = useState(0)
  const [presetId, setPresetId] = useState(presets[0]?.id ?? "recommended")

  const selectedPreset = presets.find((preset) => preset.id === presetId) ?? presets[0]
  const selectedType = meetupTypes.find((type) => type.id === selectedPreset?.typeId)
  const selectedAmenity = amenities.find((amenity) => amenity.id === selectedPreset?.amenityId)

  const handleConfirm = () => {
    trackProductEvent("meetup_scheduled", {
      preset: selectedPreset?.id ?? "unknown",
    })
    onClose()
  }

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-background">
      <div className="flex items-center justify-between px-6 pb-3 pt-6">
        <button
          type="button"
          onClick={step === 0 ? onClose : () => setStep(0)}
          className="flex size-9 items-center justify-center rounded-full border border-border text-foreground"
          aria-label="Back"
        >
          {step === 0 ? <X className="size-4" /> : <ArrowLeft className="size-4" />}
        </button>
        <div className="flex gap-1.5">
          {[0, 1].map((value) => (
            <span
              key={value}
              className={cn("h-1 w-8 rounded-full", value <= step ? "bg-gold" : "bg-border")}
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

        {step === 0 ? (
          <>
            <h2 className="mb-2 font-serif text-2xl text-foreground">Choose a meetup</h2>
            <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
              Pick a low-pressure option. You can always adjust the details together later.
            </p>
            <div className="flex flex-col gap-3">
              {presets.map((preset) => (
                <SelectCard
                  key={preset.id}
                  label={preset.label}
                  note={preset.recommended ? `Recommended · ${preset.note}` : preset.note}
                  selected={presetId === preset.id}
                  onClick={() => setPresetId(preset.id)}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 className="mb-5 font-serif text-2xl text-foreground">Confirm and send</h2>
            <div className="overflow-hidden rounded-3xl border border-border bg-card">
              {selectedAmenity ? (
                <img
                  src={selectedAmenity.image || "/placeholder.svg"}
                  alt={selectedAmenity.label}
                  className="h-36 w-full object-cover"
                />
              ) : null}
              <div className="space-y-4 p-5">
                <ConfirmRow label="Guest" value={resident.name} />
                <ConfirmRow label="Meetup" value={selectedType?.label ?? ""} />
                <ConfirmRow label="When" value={selectedPreset?.time ?? ""} />
                <ConfirmRow label="Where" value={selectedAmenity?.label ?? ""} />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background to-transparent px-6 pb-8 pt-4">
        <button
          type="button"
          disabled={!selectedPreset}
          onClick={step === 0 ? () => setStep(1) : handleConfirm}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-medium tracking-wide transition-all active:scale-[0.99]",
            selectedPreset
              ? "bg-foreground text-background"
              : "cursor-not-allowed bg-secondary text-muted-foreground",
          )}
        >
          {step === 0 ? (
            "Review meetup"
          ) : (
            <>
              Send invitation <Check className="size-4" />
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
