"use client"

import { ArrowLeft } from "lucide-react"
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  CartesianGrid,
} from "recharts"

const trend = [
  { month: "Jan", value: 38 },
  { month: "Feb", value: 44 },
  { month: "Mar", value: 51 },
  { month: "Apr", value: 49 },
  { month: "May", value: 63 },
  { month: "Jun", value: 72 },
]

const topInterests = [
  { label: "Wellness", value: 84 },
  { label: "Food", value: 76 },
  { label: "Travel", value: 61 },
  { label: "Books", value: 48 },
  { label: "Running", value: 39 },
]

const requestedEvents = [
  { label: "Rooftop Wine Night", value: 42 },
  { label: "Sunrise Running Club", value: 31 },
  { label: "Women's Brunch", value: 27 },
  { label: "Book Club", value: 23 },
]

const amenityUsage = [
  { label: "Resident Lounge", value: 72 },
  { label: "Rooftop", value: 64 },
  { label: "Coworking Space", value: 53 },
  { label: "Fitness Center", value: 41 },
  { label: "Pool Deck", value: 28 },
]

export function ManagerDashboard({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border px-6 pb-4 pt-6">
        <button
          type="button"
          onClick={onBack}
          className="flex size-9 items-center justify-center rounded-full border border-border text-foreground"
          aria-label="Back to resident app"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
            The Albany Residences
          </p>
          <h1 className="font-serif text-2xl leading-tight text-foreground">Manager Dashboard</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-10 pt-6">
        {/* Stat grid */}
        <div className="grid grid-cols-2 gap-3">
          <Stat value="214" label="Total residents" />
          <Stat value="168" label="Active this month" accent />
          <Stat value="92" label="Introductions requested" />
          <Stat value="57" label="Meetups scheduled" />
        </div>

        {/* Engagement trend */}
        <Panel title="Engagement trend" caption="Active residents, last 6 months">
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ stroke: "var(--gold)", strokeWidth: 1 }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    color: "var(--foreground)",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--gold)"
                  strokeWidth={2.5}
                  fill="url(#gold)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Top interests" caption="Across all residents">
          <BarList data={topInterests} suffix="%" />
        </Panel>

        <Panel title="Most requested events" caption="By resident votes">
          <BarList data={requestedEvents} suffix=" votes" />
        </Panel>

        <Panel title="Amenity usage" caption="As meeting spaces this month">
          <BarList data={amenityUsage} suffix="%" />
        </Panel>
      </div>
    </div>
  )
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-3xl border p-5 ${
        accent ? "border-gold/40 bg-gold/10" : "border-border bg-card"
      }`}
    >
      <p className="font-serif text-4xl leading-none text-foreground">{value}</p>
      <p className="mt-2 text-xs leading-snug text-muted-foreground">{label}</p>
    </div>
  )
}

function Panel({
  title,
  caption,
  children,
}: {
  title: string
  caption: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-4 rounded-3xl border border-border bg-card p-5">
      <h2 className="font-serif text-xl leading-tight text-foreground">{title}</h2>
      <p className="mb-4 mt-0.5 text-xs text-muted-foreground">{caption}</p>
      {children}
    </section>
  )
}

function BarList({
  data,
  suffix,
}: {
  data: { label: string; value: number }[]
  suffix: string
}) {
  const max = Math.max(...data.map((d) => d.value))
  return (
    <div className="flex flex-col gap-3.5">
      {data.map((d) => (
        <div key={d.label}>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-sm text-foreground">{d.label}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {d.value}
              {suffix}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gold"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
