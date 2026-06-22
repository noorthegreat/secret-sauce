"use client"

import { useMemo, useState } from "react"
import { ArrowRight, CalendarRange, Loader2, Sparkles, Users } from "lucide-react"

import { FifthCircleBrandMark } from "@/components/fifth-circle-brand-mark"
import { Chip, SelectCard } from "@/components/select-card"
import {
  availabilityGridDays,
  availabilityTimeBlocks,
  buildAvailabilitySummaryFromGrid,
  connectionStyles,
  createEmptyAvailabilityGrid,
  formatAvailabilitySummaryLabel,
  interestOptions,
  intents,
  type AvailabilityGrid,
  type AvailabilitySummaryId,
  type ConnectionStyleId,
  type InterestId,
  type MatchingGoalId,
  type TimeBlockId,
  type WeekdayId,
} from "@/lib/concierge-data"
import { cn } from "@/lib/utils"

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6
type SocialEnergyId = "calm" | "balanced" | "outgoing"
type PlanningStyleId = "spontaneous" | "planned" | "flexible"

export type OnboardingSubmission = {
  lookingFor: MatchingGoalId[]
  interests: InterestId[]
  connectionStyles: ConnectionStyleId[]
  availability: AvailabilitySummaryId[]
  availabilityGrid: AvailabilityGrid
  conciergeNote: string
  profileBasics?: {
    recognitionCue?: string
    occupation?: string
  }
  compatibilityPrompts?: {
    socialEnergy?: SocialEnergyId
    planningStyle?: PlanningStyleId
    favoriteTopics?: string[]
  }
  activityPreferences?: string[]
  networkingPreferences?: {
    openToNetworking?: boolean
    openToMentoring?: boolean
    lookingForMentorship?: boolean
    occupation?: string
  }
  introPreferences?: {
    cadence?: string
    socialEnergy?: SocialEnergyId
    planningStyle?: PlanningStyleId
    connectionStyles?: ConnectionStyleId[]
  }
  consentState?: {
    communityAgreementAccepted: boolean
  }
}

const socialInterests: InterestId[] = [
  "coffee",
  "food",
  "travel",
  "books",
  "art",
  "arts_culture",
  "design",
  "film",
  "law",
  "music",
  "startups",
  "technology",
  "entrepreneurship",
  "current_events",
  "dogs",
]

const activityInterests: InterestId[] = [
  "walking",
  "running",
  "hiking",
  "tennis",
  "yoga",
  "fitness",
  "wellness",
  "coworking",
  "volunteering",
]

const cadenceOptions = [
  { id: "1", label: "1", note: "A gentle pace" },
  { id: "2", label: "2", note: "A steady rhythm" },
  { id: "3", label: "3", note: "A little more often" },
  { id: "4+", label: "4+", note: "Open to a fuller social calendar" },
] as const

const socialEnergyOptions: Array<{
  id: SocialEnergyId
  label: string
  note: string
}> = [
  { id: "calm", label: "Calm", note: "Low-key, quieter energy." },
  { id: "balanced", label: "Balanced", note: "A mix of calm and lively." },
  { id: "outgoing", label: "Outgoing", note: "More social and high-energy." },
]

const planningStyleOptions: Array<{
  id: PlanningStyleId
  label: string
  note: string
}> = [
  { id: "spontaneous", label: "Spontaneous", note: "Last-minute can work." },
  { id: "planned", label: "Planned", note: "A little notice feels best." },
  { id: "flexible", label: "Flexible", note: "Somewhere in between." },
]

export function Onboarding({
  onComplete,
}: {
  onComplete: (submission: OnboardingSubmission) => Promise<void>
}) {
  const [step, setStep] = useState<Step>(0)
  const [lookingFor, setLookingFor] = useState<MatchingGoalId[]>(["friendships"])
  const [chosenInterests, setChosenInterests] = useState<InterestId[]>([
    "coffee",
    "walking",
    "wellness",
  ])
  const [style, setStyle] = useState<ConnectionStyleId[]>(["one_on_one"])
  const [availabilityGrid, setAvailabilityGrid] = useState<AvailabilityGrid>(() =>
    createEmptyAvailabilityGrid(),
  )
  const [cadence, setCadence] = useState<(typeof cadenceOptions)[number]["id"]>("2")
  const [socialEnergy, setSocialEnergy] = useState<SocialEnergyId>("balanced")
  const [planningStyle, setPlanningStyle] = useState<PlanningStyleId>("flexible")
  const [occupation, setOccupation] = useState("")
  const [openToMentoring, setOpenToMentoring] = useState(false)
  const [lookingForMentorship, setLookingForMentorship] = useState(false)
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [recognitionCue, setRecognitionCue] = useState("")
  const [conciergeNote, setConciergeNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const availabilitySummary = useMemo(
    () => buildAvailabilitySummaryFromGrid(availabilityGrid),
    [availabilityGrid],
  )

  const composedConciergeNote = useMemo(() => {
    const parts = [conciergeNote.trim()]
    if (recognitionCue.trim()) {
      parts.push(`Recognition cue: ${recognitionCue.trim()}`)
    }
    if (cadence) {
      parts.push(`Introduction pace: ${cadence} per month`)
    }
    return parts.filter(Boolean).join(" | ").slice(0, 280)
  }, [cadence, conciergeNote, recognitionCue])

  const canAdvance =
    step === 1
      ? true
      : step === 2
        ? lookingFor.length > 0 && style.length > 0
        : step === 3
          ? chosenInterests.length >= 3
          : step === 4
            ? availabilitySummary.length > 0
            : step === 5
              ? Boolean(cadence && socialEnergy && planningStyle)
              : step === 6
                ? consentAccepted && conciergeNote.trim().length >= 12
                : true

  function next() {
    setStep((current) => Math.min(6, (current + 1) as Step))
  }

  function previous() {
    setStep((current) => Math.max(0, (current - 1) as Step))
  }

  async function handleComplete() {
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      await onComplete({
        lookingFor,
        interests: chosenInterests,
        connectionStyles: style,
        availability: availabilitySummary,
        availabilityGrid,
        conciergeNote: composedConciergeNote,
        profileBasics: {
          recognitionCue: recognitionCue.trim() || undefined,
          occupation: occupation.trim() || undefined,
        },
        compatibilityPrompts: {
          socialEnergy,
          planningStyle,
          favoriteTopics: chosenInterests.filter((interest) => socialInterests.includes(interest)),
        },
        activityPreferences: chosenInterests.filter((interest) =>
          activityInterests.includes(interest),
        ),
        networkingPreferences: {
          openToNetworking: lookingFor.includes("professional_networking"),
          openToMentoring,
          lookingForMentorship,
          occupation: occupation.trim() || undefined,
        },
        introPreferences: {
          cadence,
          socialEnergy,
          planningStyle,
          connectionStyles: style,
        },
        consentState: {
          communityAgreementAccepted: consentAccepted,
        },
      })
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to save your onboarding right now.",
      )
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-[#1f1a15] text-[#f3ebdc]">
      <div className="px-7 pb-1 pt-3 text-[11px] font-medium tracking-wide text-[#d9cfbf]">
        9:41
      </div>

      {step > 0 ? (
        <div className="px-7 pt-1">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5, 6].map((progressStep) => (
              <span
                key={progressStep}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  progressStep <= step ? "bg-[#b89655]" : "bg-[#43392f]",
                )}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto px-7 pb-28 pt-8">
        {step === 0 && <WelcomeStep />}
        {step === 1 && (
          <Section
            eyebrow="Private community"
            title="You belong"
            accent="here."
            subtitle="What you share here stays quiet, building-scoped, and concierge-led. The goal is thoughtful introductions, not another feed."
          >
            <button
              type="button"
              onClick={next}
              className="w-full rounded-full border border-[#43392f] bg-[#231d17] py-3.5 text-sm font-medium tracking-[0.18em] text-[#f3ebdc] transition-colors hover:border-[#b89655]"
            >
              Begin
            </button>
          </Section>
        )}
        {step === 2 && (
          <Section
            eyebrow="Introductions"
            title="What kind of"
            accent="connections"
            afterAccent="matter most to you?"
            subtitle="Choose the kinds of resident introductions that would feel genuinely valuable inside your building."
          >
            <div className="space-y-3">
              {intents.map((intent) => (
                <SelectCard
                  key={intent.id}
                  label={intent.label}
                  note={intent.note}
                  selected={lookingFor.includes(intent.id)}
                  onClick={() =>
                    setLookingFor((current) =>
                      current.includes(intent.id)
                        ? current.filter((value) => value !== intent.id)
                        : [...current, intent.id],
                    )
                  }
                  tone="dark"
                />
              ))}
            </div>

            <div className="mt-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#8f7d66]">
                How you like to meet
              </p>
              <div className="mt-3 space-y-3">
                {connectionStyles.map((option) => (
                  <SelectCard
                    key={option.id}
                    label={option.label}
                    note={option.note}
                    selected={style.includes(option.id)}
                    onClick={() =>
                      setStyle((current) =>
                        current.includes(option.id)
                          ? current.filter((value) => value !== option.id)
                          : [...current, option.id],
                      )
                    }
                    tone="dark"
                  />
                ))}
              </div>
            </div>
          </Section>
        )}
        {step === 3 && (
          <Section
            eyebrow="Shared interests"
            title="What do you"
            accent="love to do?"
            subtitle="Pick a mix of conversation interests and activities. Three to eight is usually enough for stronger introductions."
          >
            <InterestGroup
              title="Conversation and common ground"
              interestIds={socialInterests}
              chosenInterests={chosenInterests}
              setChosenInterests={setChosenInterests}
            />
            <InterestGroup
              title="Activities and routines"
              interestIds={activityInterests}
              chosenInterests={chosenInterests}
              setChosenInterests={setChosenInterests}
              className="mt-8"
            />
          </Section>
        )}
        {step === 4 && (
          <Section
            eyebrow="Availability"
            title="When are you"
            accent="usually free?"
            subtitle="Choose the times that tend to work most weeks. This helps us suggest introductions that can actually happen."
          >
            <AvailabilityGridEditor
              grid={availabilityGrid}
              summary={availabilitySummary}
              onChange={setAvailabilityGrid}
            />
          </Section>
        )}
        {step === 5 && (
          <Section
            eyebrow="Cadence"
            title="How often would you"
            accent="like to meet someone"
            afterAccent="new?"
            subtitle="We use this to keep your introduction pace comfortable and to understand the social rhythm that fits you best."
          >
            <div className="grid grid-cols-4 gap-3">
              {cadenceOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setCadence(option.id)}
                  className={cn(
                    "rounded-[1.4rem] border px-3 py-4 text-center transition-colors",
                    cadence === option.id
                      ? "border-[#b89655] bg-[#2c251d]"
                      : "border-[#43392f] bg-[#251f19]",
                  )}
                >
                  <p className="font-serif text-2xl text-[#f3ebdc]">{option.label}</p>
                  <p className="mt-1 text-[11px] leading-5 text-[#a79883]">{option.note}</p>
                </button>
              ))}
            </div>

            <div className="mt-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#8f7d66]">
                Social energy
              </p>
              <div className="mt-3 grid gap-3">
                {socialEnergyOptions.map((option) => (
                  <SelectCard
                    key={option.id}
                    label={option.label}
                    note={option.note}
                    selected={socialEnergy === option.id}
                    onClick={() => setSocialEnergy(option.id)}
                    tone="dark"
                  />
                ))}
              </div>
            </div>

            <div className="mt-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#8f7d66]">
                Planning style
              </p>
              <div className="mt-3 grid gap-3">
                {planningStyleOptions.map((option) => (
                  <SelectCard
                    key={option.id}
                    label={option.label}
                    note={option.note}
                    selected={planningStyle === option.id}
                    onClick={() => setPlanningStyle(option.id)}
                    tone="dark"
                  />
                ))}
              </div>
            </div>
          </Section>
        )}
        {step === 6 && (
          <Section
            eyebrow="Recognition"
            title="Help your neighbors"
            accent="recognise you."
            subtitle="Give your concierge a helpful cue and a note about the kind of introduction, conversation, or gathering that would feel genuinely worthwhile."
          >
            <div className="rounded-[2rem] border border-[#43392f] bg-[#251f19] p-5">
              <div className="flex items-center gap-4">
                <div className="flex size-16 items-center justify-center rounded-full border border-[#b89655]/45 bg-[#30281f] font-serif text-2xl text-[#d9bf86]">
                  N
                </div>
                <div>
                  <p className="font-serif text-2xl">Noor</p>
                  <p className="mt-1 text-sm text-[#a79883]">
                    This stays private to your concierge workflow.
                  </p>
                </div>
              </div>

              <label className="mt-5 block">
                <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.24em] text-[#8f7d66]">
                  A detail that helps people place you
                </span>
                <input
                  value={recognitionCue}
                  onChange={(event) => setRecognitionCue(event.target.value)}
                  placeholder="Often working from the lounge, usually has a green water bottle..."
                  className="h-12 w-full rounded-[1rem] border border-[#42382d] bg-[#2a231c] px-4 text-sm text-[#f3ebdc] outline-none transition-colors placeholder:text-[#7f7262] focus:border-[#b89655]"
                />
              </label>

              <label className="mt-4 block">
                <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.24em] text-[#8f7d66]">
                  Occupation or professional context
                </span>
                <input
                  value={occupation}
                  onChange={(event) => setOccupation(event.target.value)}
                  placeholder="Optional: architecture, law, investing, design, founder..."
                  className="h-12 w-full rounded-[1rem] border border-[#42382d] bg-[#2a231c] px-4 text-sm text-[#f3ebdc] outline-none transition-colors placeholder:text-[#7f7262] focus:border-[#b89655]"
                />
              </label>

              <label className="mt-4 block">
                <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.24em] text-[#8f7d66]">
                  Concierge note
                </span>
                <textarea
                  value={conciergeNote}
                  onChange={(event) => setConciergeNote(event.target.value)}
                  maxLength={200}
                  placeholder="Looking for people to grab coffee with after work, interested in startup conversations, hoping to find tennis partners, or new to the city and wanting to meet a few neighbors."
                  className="min-h-32 w-full rounded-[1.2rem] border border-[#42382d] bg-[#2a231c] px-4 py-3 text-sm leading-7 text-[#f3ebdc] outline-none transition-colors placeholder:text-[#7f7262] focus:border-[#b89655]"
                />
              </label>

              {lookingFor.includes("professional_networking") ? (
                <div className="mt-5 rounded-[1.4rem] border border-[#43392f] bg-[#201b16] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#8f7d66]">
                    Professional introductions
                  </p>
                  <div className="mt-3 space-y-3">
                    <ToggleRow
                      label="Open to professional networking"
                      note="This keeps networking opt-in and resident-led."
                      checked={lookingFor.includes("professional_networking")}
                      disabled
                      onChange={() => undefined}
                    />
                    <ToggleRow
                      label="Open to mentoring"
                      note="You would be comfortable sharing guidance or making warm introductions."
                      checked={openToMentoring}
                      onChange={setOpenToMentoring}
                    />
                    <ToggleRow
                      label="Looking for mentorship"
                      note="You would value being introduced to a resident with experience in an area you are growing into."
                      checked={lookingForMentorship}
                      onChange={setLookingForMentorship}
                    />
                  </div>
                </div>
              ) : null}

              <div className="mt-5 rounded-[1.4rem] border border-[#43392f] bg-[#201b16] px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#8f7d66]">
                  Saved context
                </p>
                <p className="mt-2 text-sm leading-7 text-[#d9cfbf]">
                  {composedConciergeNote || "Your concierge note will appear here before you save."}
                </p>
              </div>

              <label className="mt-5 flex items-start gap-3 rounded-[1.4rem] border border-[#43392f] bg-[#201b16] px-4 py-4">
                <input
                  type="checkbox"
                  checked={consentAccepted}
                  onChange={(event) => setConsentAccepted(event.target.checked)}
                  className="mt-1 size-4 rounded border-[#6e604f] bg-[#2a231c] text-[#b89655] accent-[#b89655]"
                />
                <span className="text-sm leading-7 text-[#d9cfbf]">
                  I understand Fifth Circle keeps introductions private, building-scoped, and voluntary.
                </span>
              </label>
            </div>

            {errorMessage ? (
              <div className="mt-5 rounded-[1.4rem] border border-[#6d433f] bg-[#382320] px-4 py-3 text-sm text-[#efb0a6]">
                {errorMessage}
              </div>
            ) : null}
          </Section>
        )}
      </div>

      {step !== 1 ? (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#1f1a15] via-[#1f1a15] to-transparent px-7 pb-8 pt-4">
          <div className="flex gap-3">
            {step > 0 ? (
              <button
                type="button"
                onClick={previous}
                className="rounded-full border border-[#43392f] bg-[#251f19] px-5 py-4 text-sm font-medium text-[#f3ebdc]"
              >
                Back
              </button>
            ) : null}
            <button
              type="button"
              onClick={step === 6 ? () => void handleComplete() : next}
              disabled={!canAdvance || isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-full border border-[#43392f] bg-[#231d17] px-6 py-4 text-sm font-medium tracking-[0.18em] text-[#f3ebdc] transition-colors hover:border-[#b89655] disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving
                </>
              ) : step === 6 ? (
                "Enter Fifth Circle"
              ) : (
                <>
                  Continue
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function WelcomeStep() {
  return (
    <div className="flex h-full flex-col justify-center">
      <div className="flex justify-center">
        <FifthCircleBrandMark theme="dark" caption="Private building community" />
      </div>
      <div className="mt-10 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-[#b89655]">
          Resident onboarding
        </p>
        <h1 className="mt-5 font-serif text-4xl leading-[1.02]">
          Welcome to
          <span className="block italic text-[#c29a51]">your building.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-sm text-sm leading-7 text-[#b8ab97]">
          We keep this short, private, and warm. The goal is not a survey. It is better
          introductions inside one building community.
        </p>
      </div>
      <div className="mt-10 space-y-4">
        <Promise icon={Users} text="A thoughtful list of neighbors, not a directory." />
        <Promise icon={CalendarRange} text="Availability overlap to suggest realistic meetups." />
        <Promise
          icon={Sparkles}
          text="Calm, concierge-led introductions with stronger matching context."
        />
      </div>
    </div>
  )
}

function Promise({ icon: Icon, text }: { icon: typeof Users; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[1.4rem] border border-[#43392f] bg-[#251f19] px-4 py-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#b89655]/35 bg-[#2f261d] text-[#d9bf86]">
        <Icon className="size-[18px]" strokeWidth={1.5} />
      </span>
      <span className="text-sm leading-snug text-[#f3ebdc]">{text}</span>
    </div>
  )
}

function Section({
  eyebrow,
  title,
  accent,
  afterAccent,
  subtitle,
  children,
}: {
  eyebrow: string
  title: string
  accent: string
  afterAccent?: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-[#8f7d66]">{eyebrow}</p>
      <h2 className="mt-4 font-serif text-[2.2rem] leading-[1.04] text-[#f3ebdc]">
        {title} <span className="italic text-[#c29a51]">{accent}</span>
        {afterAccent ? ` ${afterAccent}` : ""}
      </h2>
      <p className="mt-4 max-w-sm text-sm leading-7 text-[#b8ab97]">{subtitle}</p>
      <div className="mt-8">{children}</div>
    </div>
  )
}

function InterestGroup({
  title,
  interestIds,
  chosenInterests,
  setChosenInterests,
  className,
}: {
  title: string
  interestIds: InterestId[]
  chosenInterests: InterestId[]
  setChosenInterests: React.Dispatch<React.SetStateAction<InterestId[]>>
  className?: string
}) {
  const options = interestOptions.filter((interest) => interestIds.includes(interest.id))

  return (
    <div className={className}>
      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#8f7d66]">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2.5">
        {options.map((interest) => (
          <Chip
            key={interest.id}
            label={interest.label}
            selected={chosenInterests.includes(interest.id)}
            onClick={() =>
              setChosenInterests((current) =>
                current.includes(interest.id)
                  ? current.filter((value) => value !== interest.id)
                  : current.length < 10
                    ? [...current, interest.id]
                    : current,
              )
            }
            tone="dark"
          />
        ))}
      </div>
    </div>
  )
}

function AvailabilityGridEditor({
  grid,
  summary,
  onChange,
}: {
  grid: AvailabilityGrid
  summary: AvailabilitySummaryId[]
  onChange: (next: AvailabilityGrid) => void
}) {
  function toggleSlot(day: WeekdayId, block: TimeBlockId) {
    const currentSlots = grid[day] ?? []
    const nextSlots = currentSlots.includes(block)
      ? currentSlots.filter((value) => value !== block)
      : [...currentSlots, block]

    onChange({
      ...grid,
      [day]: nextSlots,
    })
  }

  return (
    <div className="rounded-[2rem] border border-[#43392f] bg-[#251f19] p-4">
      <div className="mb-4 flex flex-wrap gap-2">
        {summary.length > 0 ? (
          summary.map((item) => (
            <span
              key={item}
              className="rounded-full border border-[#b89655]/35 bg-[#2f261d] px-3 py-1 text-xs text-[#e7d2a7]"
            >
              {formatAvailabilitySummaryLabel(item)}
            </span>
          ))
        ) : (
          <p className="text-sm text-[#a79883]">
            Pick the windows that usually work. Even two or three is enough for strong matching.
          </p>
        )}
      </div>

      <div className="grid grid-cols-[54px_repeat(5,minmax(0,1fr))] gap-2 text-center">
        <div />
        {availabilityTimeBlocks.map((block) => (
          <div key={block.id} className="px-1 text-[10px] font-medium text-[#8f7d66]">
            {block.label}
          </div>
        ))}

        {availabilityGridDays.map((day) => (
          <AvailabilityGridRow
            key={day.id}
            dayLabel={day.label.slice(0, 3)}
            selectedBlocks={grid[day.id] ?? []}
            onToggle={(block) => toggleSlot(day.id, block)}
          />
        ))}
      </div>
    </div>
  )
}

function AvailabilityGridRow({
  dayLabel,
  selectedBlocks,
  onToggle,
}: {
  dayLabel: string
  selectedBlocks: TimeBlockId[]
  onToggle: (block: TimeBlockId) => void
}) {
  return (
    <>
      <div className="flex items-center justify-start py-2 text-xs uppercase tracking-[0.18em] text-[#a79883]">
        {dayLabel}
      </div>
      {availabilityTimeBlocks.map((block) => {
        const selected = selectedBlocks.includes(block.id)
        return (
          <button
            key={block.id}
            type="button"
            onClick={() => onToggle(block.id)}
            className={cn(
              "h-10 rounded-[1rem] border text-xs transition-colors",
              selected
                ? "border-[#b89655] bg-[#8d7532] text-[#f3ebdc]"
                : "border-[#43392f] bg-[#211b16] text-transparent",
            )}
          >
            {selected ? "•" : ""}
          </button>
        )
      })}
    </>
  )
}

function ToggleRow({
  label,
  note,
  checked,
  onChange,
  disabled,
}: {
  label: string
  note: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <label
      className={cn(
        "flex items-start gap-3 rounded-[1.2rem] border border-[#43392f] px-4 py-3",
        disabled ? "opacity-75" : "cursor-pointer",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        className="mt-1 size-4 rounded border-[#6e604f] bg-[#2a231c] text-[#b89655] accent-[#b89655]"
      />
      <span>
        <span className="block text-sm text-[#f3ebdc]">{label}</span>
        <span className="mt-1 block text-xs leading-6 text-[#a79883]">{note}</span>
      </span>
    </label>
  )
}
