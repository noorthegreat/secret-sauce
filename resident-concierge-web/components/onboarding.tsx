"use client"

import { useState } from "react"
import { StatusBar } from "@/components/phone-frame"
import { SelectCard, Chip } from "@/components/select-card"
import { interests, intents, connectionStyles } from "@/lib/concierge-data"
import { ArrowRight, Users, CalendarCheck, DoorOpen } from "lucide-react"
import { cn } from "@/lib/utils"

type Step = 0 | 1 | 2 | 3 | 4

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<Step>(0)
  const [intent, setIntent] = useState<string[]>([])
  const [chosenInterests, setChosenInterests] = useState<string[]>(["Wellness", "Food", "Books"])
  const [style, setStyle] = useState<string[]>([])

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

  const next = () => setStep((s) => Math.min(4, (s + 1) as Step))

  return (
    <div className="flex h-full flex-col bg-background">
      <StatusBar />

      {step > 0 && step < 4 && (
        <div className="px-7 pt-2">
          <div className="flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <span
                key={s}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  s <= step ? "bg-gold" : "bg-border",
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
            eyebrow="To begin"
            title="What brings you here?"
            subtitle="Choose all that feel right. Your concierge will tailor every introduction."
          >
            <div className="flex flex-col gap-3">
              {intents.map((i) => (
                <SelectCard
                  key={i.id}
                  label={i.label}
                  note={i.note}
                  selected={intent.includes(i.id)}
                  onClick={() => toggle(intent, setIntent, i.id)}
                />
              ))}
            </div>
          </Section>
        )}
        {step === 2 && (
          <Section
            eyebrow="Your interests"
            title="What do you love?"
            subtitle="We pair neighbors around genuine common ground."
          >
            <div className="flex flex-wrap gap-2.5">
              {interests.map((i) => (
                <Chip
                  key={i}
                  label={i}
                  selected={chosenInterests.includes(i)}
                  onClick={() => toggle(chosenInterests, setChosenInterests, i)}
                />
              ))}
            </div>
          </Section>
        )}
        {step === 3 && (
          <Section
            eyebrow="Connection style"
            title="How would you like to meet?"
            subtitle="We keep things intentional, never overwhelming."
          >
            <div className="flex flex-col gap-3">
              {connectionStyles.map((s) => (
                <SelectCard
                  key={s.id}
                  label={s.label}
                  note={s.note}
                  selected={style.includes(s.id)}
                  onClick={() => toggle(style, setStyle, s.id)}
                />
              ))}
            </div>
          </Section>
        )}
        {step === 4 && <Success onComplete={onComplete} />}
      </div>

      {step < 4 && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background to-transparent px-7 pb-8 pt-4">
          <button
            type="button"
            onClick={step === 0 ? next : next}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 py-4 text-sm font-medium tracking-wide text-background transition-transform active:scale-[0.99]"
          >
            {step === 0 ? "Begin" : step === 3 ? "Find my matches" : "Continue"}
            <ArrowRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  )
}

function Welcome() {
  return (
    <div className="flex h-full flex-col justify-center pb-10 pt-10">
      <div className="mb-8">
        <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold">
          The Albany Residences
        </span>
      </div>
      <h1 className="text-balance font-serif text-5xl leading-[1.05] text-foreground">
        Resident Concierge
      </h1>
      <p className="mt-6 max-w-[300px] text-pretty text-base leading-relaxed text-muted-foreground">
        A private introduction to the neighbors, gatherings, and spaces that suit you — quietly arranged,
        never browsed.
      </p>
      <div className="mt-10 flex flex-col gap-4">
        <Promise icon={Users} text="Meet a few right people, not hundreds of profiles." />
        <Promise icon={CalendarCheck} text="Discover gatherings happening within your walls." />
        <Promise icon={DoorOpen} text="Reserve beautiful spaces to meet in person." />
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

function Success({ onComplete }: { onComplete: () => void }) {
  const stats = [
    { value: "12", label: "residents share your interests" },
    { value: "3", label: "upcoming events may be a fit" },
    { value: "2", label: "building spaces are ideal for meeting" },
  ]
  return (
    <div className="flex h-full flex-col justify-center pb-10 pt-6">
      <div className="mx-auto mb-8 flex size-16 items-center justify-center rounded-full border border-gold/40 bg-gold/10">
        <span className="font-serif text-3xl text-gold">✦</span>
      </div>
      <h2 className="text-balance text-center font-serif text-4xl leading-tight text-foreground">
        Your concierge is ready
      </h2>
      <p className="mx-auto mt-3 max-w-[280px] text-pretty text-center text-sm leading-relaxed text-muted-foreground">
        Here is what we found within your building.
      </p>
      <div className="mt-8 flex flex-col gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4"
          >
            <span className="font-serif text-4xl text-gold">{s.value}</span>
            <span className="text-sm leading-snug text-foreground/80">{s.label}</span>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onComplete}
        className="mt-8 w-full rounded-full bg-foreground px-6 py-4 text-sm font-medium tracking-wide text-background transition-transform active:scale-[0.99]"
      >
        Enter Resident Concierge
      </button>
    </div>
  )
}
