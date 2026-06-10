"use client"

import { useMemo, useState } from "react"
import { StatusBar } from "@/components/phone-frame"
import { SelectCard, Chip } from "@/components/select-card"
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
import { ArrowRight, Loader2, CalendarRange, Sparkles, Users } from "lucide-react"
import { cn } from "@/lib/utils"

type Step = 0 | 1 | 2 | 3 | 4 | 5

export type OnboardingSubmission = {
  lookingFor: MatchingGoalId[]
  interests: InterestId[]
  connectionStyles: ConnectionStyleId[]
  availability: AvailabilitySummaryId[]
  availabilityGrid: AvailabilityGrid
  conciergeNote: string
}

export function Onboarding({
  onComplete,
}: {
  onComplete: (submission: OnboardingSubmission) => Promise<void>
}) {
  const [step, setStep] = useState<Step>(0)
  const [lookingFor, setLookingFor] = useState<MatchingGoalId[]>(["friendships"])
  const [chosenInterests, setChosenInterests] = useState<InterestId[]>(["coffee", "walking", "wellness"])
  const [style, setStyle] = useState<ConnectionStyleId[]>(["one_on_one"])
  const [availabilityGrid, setAvailabilityGrid] = useState<AvailabilityGrid>(() => createEmptyAvailabilityGrid())
  const [conciergeNote, setConciergeNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const availabilitySummary = useMemo(
    () => buildAvailabilitySummaryFromGrid(availabilityGrid),
    [availabilityGrid],
  )

  const next = () => setStep((current) => Math.min(5, (current + 1) as Step))
  const previous = () => setStep((current) => Math.max(0, (current - 1) as Step))

  const canAdvance =
    step === 1
      ? lookingFor.length > 0
      : step === 2
        ? chosenInterests.length >= 3
        : step === 3
          ? style.length > 0
          : step === 4
            ? availabilitySummary.length > 0
            : true

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
        conciergeNote,
      })
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to save your onboarding right now.",
      )
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <StatusBar />

      {step > 0 && (
        <div className="px-7 pt-2">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((progressStep) => (
              <span
                key={progressStep}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  progressStep <= step ? "bg-gold" : "bg-border",
                )}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-7 pb-28 pt-6">
        {step === 0 && <Welcome />}
        {step === 1 && (
          <Section
            eyebrow="What you want"
            title="What would feel most valuable here?"
            subtitle="Choose the kinds of introductions you would genuinely want us to make inside the building."
          >
            <div className="flex flex-col gap-3">
              {intents.map((intent) => (
                <SelectCard
                  key={intent.id}
                  label={intent.label}
                  note={intent.note ?? ""}
                  selected={lookingFor.includes(intent.id)}
                  onClick={() =>
                    setLookingFor((current) =>
                      current.includes(intent.id)
                        ? current.filter((value) => value !== intent.id)
                        : [...current, intent.id],
                    )
                  }
                />
              ))}
            </div>
          </Section>
        )}
        {step === 2 && (
          <Section
            eyebrow="Common ground"
            title="What should your matches have in common with you?"
            subtitle="Choose a few specific interests. Three to six usually leads to the strongest introductions."
          >
            <div className="flex flex-wrap gap-2.5">
              {interestOptions.map((interest) => (
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
                />
              ))}
            </div>
          </Section>
        )}
        {step === 3 && (
          <Section
            eyebrow="Format"
            title="How do you like to connect?"
            subtitle="This helps us choose between quieter introductions, small circles, and event-led meetups."
          >
            <div className="flex flex-col gap-3">
              {connectionStyles.map((option) => (
                <SelectCard
                  key={option.id}
                  label={option.label}
                  note={option.note ?? ""}
                  selected={style.includes(option.id)}
                  onClick={() =>
                    setStyle((current) =>
                      current.includes(option.id)
                        ? current.filter((value) => value !== option.id)
                        : [...current, option.id],
                    )
                  }
                />
              ))}
            </div>
          </Section>
        )}
        {step === 4 && (
          <Section
            eyebrow="When you are free"
            title="When are introductions easiest for you?"
            subtitle="Select the times that tend to work most weeks. We use schedule overlap to make introductions more realistic."
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
            eyebrow="Concierge note"
            title="What kind of person would you genuinely enjoy being introduced to?"
            subtitle="Optional, but helpful. Focus on the kind of interaction you want, not your full biography."
          >
            <textarea
              value={conciergeNote}
              onChange={(event) => setConciergeNote(event.target.value)}
              maxLength={280}
              className="min-h-40 w-full rounded-3xl border border-border bg-card px-4 py-4 text-sm leading-relaxed text-foreground outline-none transition-colors focus:border-gold/50"
              placeholder="Examples: Looking for people to grab coffee with after work. Hoping to find a tennis or walking partner on weekends. New to the city and would love a few thoughtful neighbor introductions."
            />

            <div className="mt-5 rounded-3xl border border-gold/20 bg-gold/10 p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-background text-gold">
                  <Sparkles className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">What happens next</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    We&apos;ll use your goals, interests, social style, and availability to shape
                    more thoughtful introductions and better meetup suggestions.
                  </p>
                </div>
              </div>
            </div>

            {errorMessage ? (
              <div className="mt-5 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-center text-sm text-destructive">
                {errorMessage}
              </div>
            ) : null}
          </Section>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background to-transparent px-7 pb-8 pt-4">
        <div className="flex gap-3">
          {step > 0 ? (
            <button
              type="button"
              onClick={previous}
              className="rounded-full border border-border bg-card px-5 py-4 text-sm font-medium text-foreground"
            >
              Back
            </button>
          ) : null}
          <button
            type="button"
            onClick={step === 5 ? () => void handleComplete() : next}
            disabled={!canAdvance || isSubmitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-foreground px-6 py-4 text-sm font-medium tracking-wide text-background transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving your profile
              </>
            ) : step === 0 ? (
              <>
                Begin
                <ArrowRight className="size-4" />
              </>
            ) : step === 5 ? (
              "Save my profile"
            ) : (
              <>
                Continue
                <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function Welcome() {
  return (
    <div className="flex h-full flex-col justify-center pb-10 pt-10">
      <div className="mb-8">
        <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold">
          Fifth Circle
        </span>
      </div>
      <h1 className="text-balance font-serif text-5xl leading-[1.05] text-foreground">
        A few details, better introductions
      </h1>
      <p className="mt-6 max-w-[300px] text-pretty text-base leading-relaxed text-muted-foreground">
        We keep this short and private. The goal is not a survey. It is a better first
        introduction.
      </p>
      <div className="mt-10 flex flex-col gap-4">
        <Promise icon={Users} text="Meet a few right people, not a directory." />
        <Promise icon={CalendarRange} text="Use timing overlap to suggest realistic meetups." />
        <Promise icon={Sparkles} text="Keep everything calm, curated, and building-scoped." />
      </div>
    </div>
  )
}

function Promise({ icon: Icon, text }: { icon: typeof Users; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold">
        <Icon className="size-[18px]" strokeWidth={1.5} />
      </span>
      <span className="text-sm leading-snug text-foreground/80">{text}</span>
    </div>
  )
}

function Section({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div>
      <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold">{eyebrow}</span>
      <h2 className="mt-3 text-balance font-serif text-3xl leading-tight text-foreground">{title}</h2>
      <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
      <div className="mt-7">{children}</div>
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
    <div className="rounded-[2rem] border border-border bg-card p-4">
      <div className="mb-4 flex flex-wrap gap-2">
        {summary.length > 0 ? (
          summary.map((item) => (
            <span
              key={item}
              className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-xs text-gold-foreground"
            >
              {formatAvailabilitySummaryLabel(item)}
            </span>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Pick the windows that usually work. Even two or three is enough for strong matching.
          </p>
        )}
      </div>

      <div className="grid grid-cols-[90px_repeat(5,minmax(0,1fr))] gap-2 text-center">
        <div />
        {availabilityTimeBlocks.map((block) => (
          <div key={block.id} className="px-1 text-[11px] font-medium text-muted-foreground">
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
      <div className="flex items-center justify-start py-2 text-sm text-foreground/85">{dayLabel}</div>
      {availabilityTimeBlocks.map((block) => {
        const selected = selectedBlocks.includes(block.id)
        return (
          <button
            key={block.id}
            type="button"
            onClick={() => onToggle(block.id)}
            className={cn(
              "h-10 rounded-2xl border text-xs transition-colors",
              selected
                ? "border-gold bg-gold/15 text-gold-foreground"
                : "border-border bg-background text-muted-foreground",
            )}
          >
            {selected ? "Yes" : ""}
          </button>
        )
      })}
    </>
  )
}
