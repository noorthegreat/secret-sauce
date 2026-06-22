"use client"

import { useEffect, useMemo, useState } from "react"
import { Lightbulb, Loader2, Save, Sparkles, Users2 } from "lucide-react"

type BudgetPeriod = "monthly" | "yearly"
type RecommendationSource = "manual" | "resident_suggestion" | "ai_draft"
type RecommendationStatus = "draft" | "proposed" | "approved" | "rejected" | "scheduled"
type BudgetFitLabel = "within_budget" | "stretch" | "above_budget" | "unknown"
type SuggestionCategory =
  | "venue"
  | "food_truck"
  | "caterer"
  | "dj_performer"
  | "fitness_instructor"
  | "wellness_provider"
  | "artist"
  | "local_business"
  | "workshop"
  | "pop_up"
  | "other"
type SuggestionVisibility = "private_to_management" | "visible_for_voting"
type SuggestionStatus =
  | "submitted"
  | "under_review"
  | "shortlisted"
  | "approved"
  | "rejected"
  | "used_for_event"

type EventPlanningDemandSignal = {
  label: string
  value: number
  source: "proposal" | "interest" | "vote" | "waitlist" | "rsvp" | "feedback"
}

type ManagerEventBudgetSettings = {
  buildingId: string
  eventBudgetAmount: number | null
  eventBudgetPeriod: BudgetPeriod | null
  preferredEventFrequency: string | null
  preferredEventTypes: string[]
  eventPlanningNotes: string | null
  updatedByManagerId: string | null
  updatedAt: string | null
}

type EventRecommendationDraft = {
  id: string
  title: string
  description: string | null
  estimatedMinCost: number | null
  estimatedMaxCost: number | null
  expectedAttendance: number | null
  recommendedCapacity: number | null
  suggestedLocation: string | null
  suggestedTiming: string | null
  residentInterestSignalsUsed: EventPlanningDemandSignal[]
  reasonRecommended: string | null
  budgetFitLabel: BudgetFitLabel
  source: RecommendationSource
  status: RecommendationStatus
  createdAt: string
  updatedAt: string
}

type SupportSummary = {
  total: number
  interested: number
  loveThis: number
  wouldAttend: number
  notForMe: number
}

type ManagerResidentSuggestionItem = {
  id: string
  submittedByResidentId: string
  submittedByResidentFirstName: string | null
  category: SuggestionCategory
  title: string
  description: string | null
  whyResidentsWouldLikeIt: string | null
  suggestedForEventType: string | null
  estimatedCostRange: string | null
  contactInfo: string | null
  websiteOrSocialLink: string | null
  location: string | null
  residentVisibility: SuggestionVisibility
  status: SuggestionStatus
  supportSummary: SupportSummary
  createdAt: string
  updatedAt: string
}

type ManagerEventPlanningSnapshot = {
  budgetSettings: ManagerEventBudgetSettings
  recommendations: EventRecommendationDraft[]
  residentSuggestions: ManagerResidentSuggestionItem[]
  demandSignals: EventPlanningDemandSignal[]
}

const emptySnapshot: ManagerEventPlanningSnapshot = {
  budgetSettings: {
    buildingId: "",
    eventBudgetAmount: null,
    eventBudgetPeriod: null,
    preferredEventFrequency: null,
    preferredEventTypes: [],
    eventPlanningNotes: null,
    updatedByManagerId: null,
    updatedAt: null,
  },
  recommendations: [],
  residentSuggestions: [],
  demandSignals: [],
}

const suggestionCategoryLabels: Record<SuggestionCategory, string> = {
  venue: "Venue",
  food_truck: "Food truck",
  caterer: "Caterer",
  dj_performer: "DJ or performer",
  fitness_instructor: "Fitness instructor",
  wellness_provider: "Wellness provider",
  artist: "Artist",
  local_business: "Local business",
  workshop: "Workshop",
  pop_up: "Pop-up",
  other: "Other",
}

function formatTimestamp(value: string | null) {
  if (!value) return "Not saved yet"

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatMoney(value: number | null) {
  if (value === null || value === undefined) {
    return "Not set"
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatEnumLabel(value: string) {
  return value.replaceAll("_", " ")
}

function getRecommendationStatusGuidance(status: RecommendationStatus) {
  switch (status) {
    case "draft":
      return "Still being shaped. Tighten the concept before moving it toward the calendar."
    case "proposed":
      return "Ready for a manager decision. If the concept feels strong, turn it into a gathering draft."
    case "approved":
      return "Manager-approved. This is ready to become a scheduled building gathering."
    case "scheduled":
      return "Already committed to the calendar. Keep the live gathering details aligned."
    case "rejected":
      return "Not moving forward right now. Keep for reference only if the demand picture changes."
    default:
      return "Use this recommendation to guide the next building gathering."
  }
}

function getBudgetFitGuidance(budgetFitLabel: BudgetFitLabel) {
  switch (budgetFitLabel) {
    case "within_budget":
      return "Fits the current pilot budget."
    case "stretch":
      return "Possible, but may need tighter scoping or stronger demand."
    case "above_budget":
      return "Likely too expensive for the current pilot unless priorities shift."
    default:
      return "Budget fit still needs a manager read."
  }
}

function getSuggestionGuidance(suggestion: ManagerResidentSuggestionItem) {
  if (suggestion.status === "used_for_event") {
    return "Already used in a gathering. Keep it private unless you want more resident signal for a future version."
  }

  if (suggestion.status === "approved") {
    return "Approved concept. Turn it into a recommendation draft or live gathering when timing is right."
  }

  if (suggestion.status === "shortlisted") {
    return "Strong candidate. This is a good moment to convert it into a shaped recommendation draft."
  }

  if (suggestion.residentVisibility === "visible_for_voting" && suggestion.supportSummary.total < 4) {
    return "Still gathering signal. Leave it visible a bit longer before making a final call."
  }

  if (suggestion.residentVisibility === "visible_for_voting" && suggestion.supportSummary.total >= 4) {
    return "Resident demand is building. Review whether this should move into shortlist or recommendation shaping."
  }

  if (suggestion.status === "under_review") {
    return "Needs a manager decision on visibility, shortlist, or rejection."
  }

  return "New suggestion waiting for first review."
}

function buildSuggestionRecommendationReason(suggestion: ManagerResidentSuggestionItem) {
  const support = suggestion.supportSummary
  const signals: string[] = []

  if (support.loveThis > 0) {
    signals.push(`${support.loveThis} strong resident endorsement${support.loveThis === 1 ? "" : "s"}`)
  }

  if (support.wouldAttend > 0) {
    signals.push(`${support.wouldAttend} resident${support.wouldAttend === 1 ? "" : "s"} saying they would attend`)
  }

  if (support.interested > 0) {
    signals.push(`${support.interested} additional interest signal${support.interested === 1 ? "" : "s"}`)
  }

  const base = suggestion.whyResidentsWouldLikeIt?.trim() || suggestion.description?.trim()
  const supportSummary = signals.length > 0 ? signals.join(", ") : "early resident demand"

  if (base) {
    return `${base} This concept already has ${supportSummary}.`
  }

  return `Resident demand suggests this could resonate for ${suggestion.suggestedForEventType || "an upcoming gathering"}. It already has ${supportSummary}.`
}

function summarizeBudget(settings: ManagerEventBudgetSettings) {
  if (settings.eventBudgetAmount === null || !settings.eventBudgetPeriod) {
    return "Budget not set"
  }

  return `${formatMoney(settings.eventBudgetAmount)} per ${settings.eventBudgetPeriod === "monthly" ? "month" : "year"}`
}

function PlanningStat({
  label,
  value,
  helper,
}: {
  label: string
  value: string
  helper: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-background px-4 py-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">{label}</p>
      <p className="mt-3 font-serif text-2xl leading-none text-foreground">{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{helper}</p>
    </div>
  )
}

export function ManagerEventPlanningSection({
  accessToken,
  onUseRecommendationAsEventDraft,
}: {
  accessToken: string
  onUseRecommendationAsEventDraft?: (recommendation: {
    title: string
    description: string | null
    suggestedLocation: string | null
    suggestedTiming: string | null
    reasonRecommended: string | null
    expectedAttendance: number | null
  }) => void
}) {
  const [snapshot, setSnapshot] = useState<ManagerEventPlanningSnapshot>(emptySnapshot)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [budgetSaving, setBudgetSaving] = useState(false)
  const [budgetError, setBudgetError] = useState<string | null>(null)
  const [recommendationSaving, setRecommendationSaving] = useState(false)
  const [recommendationError, setRecommendationError] = useState<string | null>(null)
  const [suggestionActionId, setSuggestionActionId] = useState<string | null>(null)
  const [suggestionError, setSuggestionError] = useState<string | null>(null)
  const [editingRecommendationId, setEditingRecommendationId] = useState<string | null>(null)
  const [budgetForm, setBudgetForm] = useState({
    eventBudgetAmount: "",
    eventBudgetPeriod: "monthly" as BudgetPeriod,
    preferredEventFrequency: "",
    preferredEventTypes: "",
    eventPlanningNotes: "",
  })
  const [recommendationForm, setRecommendationForm] = useState({
    title: "",
    description: "",
    estimatedMinCost: "",
    estimatedMaxCost: "",
    expectedAttendance: "",
    recommendedCapacity: "",
    suggestedLocation: "",
    suggestedTiming: "",
    reasonRecommended: "",
    budgetFitLabel: "unknown" as BudgetFitLabel,
    source: "manual" as RecommendationSource,
    status: "draft" as RecommendationStatus,
  })
  const [suggestionEdits, setSuggestionEdits] = useState<
    Record<string, { status: SuggestionStatus; residentVisibility: SuggestionVisibility }>
  >({})

  async function loadPlanning() {
    setIsLoading(true)
    setLoadError(null)

    try {
      const response = await fetch("/api/manager-event-planning", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      })

      const payload = (await response.json()) as ManagerEventPlanningSnapshot & { error?: string }

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load event planning.")
      }

      setSnapshot(payload)
      setBudgetForm({
        eventBudgetAmount:
          payload.budgetSettings.eventBudgetAmount !== null
            ? String(payload.budgetSettings.eventBudgetAmount)
            : "",
        eventBudgetPeriod: payload.budgetSettings.eventBudgetPeriod ?? "monthly",
        preferredEventFrequency: payload.budgetSettings.preferredEventFrequency ?? "",
        preferredEventTypes: payload.budgetSettings.preferredEventTypes.join(", "),
        eventPlanningNotes: payload.budgetSettings.eventPlanningNotes ?? "",
      })
      setSuggestionEdits(
        Object.fromEntries(
          payload.residentSuggestions.map((suggestion) => [
            suggestion.id,
            {
              status: suggestion.status,
              residentVisibility: suggestion.residentVisibility,
            },
          ]),
        ),
      )
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load event planning.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadPlanning()
  }, [accessToken])

  const defaultSignals = useMemo(() => snapshot.demandSignals.slice(0, 5), [snapshot.demandSignals])

  const planningStats = useMemo(() => {
    const suggestionCounts = snapshot.residentSuggestions.reduce(
      (counts, suggestion) => {
        counts.total += 1
        if (suggestion.status === "under_review") counts.underReview += 1
        if (suggestion.status === "shortlisted") counts.shortlisted += 1
        if (suggestion.status === "approved" || suggestion.status === "used_for_event") counts.approved += 1
        if (suggestion.residentVisibility === "visible_for_voting") counts.visible += 1
        return counts
      },
      {
        total: 0,
        underReview: 0,
        shortlisted: 0,
        approved: 0,
        visible: 0,
      },
    )

    const recommendationCounts = snapshot.recommendations.reduce(
      (counts, recommendation) => {
        counts.total += 1
        if (recommendation.status === "proposed") counts.proposed += 1
        if (recommendation.status === "approved" || recommendation.status === "scheduled") counts.ready += 1
        return counts
      },
      {
        total: 0,
        proposed: 0,
        ready: 0,
      },
    )

    const totalSignalVolume = snapshot.demandSignals.reduce((total, signal) => total + signal.value, 0)

    return {
      suggestionCounts,
      recommendationCounts,
      totalSignalVolume,
    }
  }, [snapshot])

  const strongestSuggestion = useMemo(() => {
    return [...snapshot.residentSuggestions].sort((left, right) => {
      const signalDelta = right.supportSummary.total - left.supportSummary.total
      if (signalDelta !== 0) {
        return signalDelta
      }

      const statusPriority = (value: SuggestionStatus) => {
        switch (value) {
          case "shortlisted":
            return 0
          case "under_review":
            return 1
          case "submitted":
            return 2
          case "approved":
            return 3
          case "used_for_event":
            return 4
          case "rejected":
            return 5
          default:
            return 6
        }
      }

      const statusDelta = statusPriority(left.status) - statusPriority(right.status)
      if (statusDelta !== 0) {
        return statusDelta
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    })[0] ?? null
  }, [snapshot.residentSuggestions])

  function startRecommendationEdit(recommendation?: EventRecommendationDraft) {
    setEditingRecommendationId(recommendation?.id ?? null)
    setRecommendationError(null)
    setRecommendationForm({
      title: recommendation?.title ?? "",
      description: recommendation?.description ?? "",
      estimatedMinCost:
        recommendation?.estimatedMinCost !== null && recommendation?.estimatedMinCost !== undefined
          ? String(recommendation.estimatedMinCost)
          : "",
      estimatedMaxCost:
        recommendation?.estimatedMaxCost !== null && recommendation?.estimatedMaxCost !== undefined
          ? String(recommendation.estimatedMaxCost)
          : "",
      expectedAttendance:
        recommendation?.expectedAttendance !== null && recommendation?.expectedAttendance !== undefined
          ? String(recommendation.expectedAttendance)
          : "",
      recommendedCapacity:
        recommendation?.recommendedCapacity !== null && recommendation?.recommendedCapacity !== undefined
          ? String(recommendation.recommendedCapacity)
          : "",
      suggestedLocation: recommendation?.suggestedLocation ?? "",
      suggestedTiming: recommendation?.suggestedTiming ?? "",
      reasonRecommended: recommendation?.reasonRecommended ?? "",
      budgetFitLabel: recommendation?.budgetFitLabel ?? "unknown",
      source: recommendation?.source ?? "manual",
      status: recommendation?.status ?? "draft",
    })
  }

  function startRecommendationFromSuggestion(suggestion: ManagerResidentSuggestionItem) {
    setEditingRecommendationId(null)
    setRecommendationError(null)
    setRecommendationForm({
      title: suggestion.title,
      description: suggestion.description ?? suggestion.whyResidentsWouldLikeIt ?? "",
      estimatedMinCost: "",
      estimatedMaxCost: "",
      expectedAttendance:
        suggestion.supportSummary.wouldAttend > 0
          ? String(Math.max(suggestion.supportSummary.wouldAttend, 8))
          : "",
      recommendedCapacity:
        suggestion.supportSummary.total > 0
          ? String(Math.max(suggestion.supportSummary.total * 2, 12))
          : "",
      suggestedLocation: suggestion.location ?? "",
      suggestedTiming: "",
      reasonRecommended: buildSuggestionRecommendationReason(suggestion),
      budgetFitLabel: "unknown",
      source: "resident_suggestion",
      status: suggestion.status === "shortlisted" ? "proposed" : "draft",
    })
  }

  async function saveBudget() {
    setBudgetSaving(true)
    setBudgetError(null)

    try {
      const response = await fetch("/api/manager-event-planning", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        body: JSON.stringify({
          action: "update_budget",
          eventBudgetAmount: budgetForm.eventBudgetAmount || null,
          eventBudgetPeriod: budgetForm.eventBudgetPeriod,
          preferredEventFrequency: budgetForm.preferredEventFrequency,
          preferredEventTypes: budgetForm.preferredEventTypes
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          eventPlanningNotes: budgetForm.eventPlanningNotes,
        }),
      })

      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || "Unable to save budget settings.")
      }

      await loadPlanning()
    } catch (error) {
      setBudgetError(error instanceof Error ? error.message : "Unable to save budget settings.")
    } finally {
      setBudgetSaving(false)
    }
  }

  async function saveRecommendation() {
    setRecommendationSaving(true)
    setRecommendationError(null)

    try {
      const response = await fetch("/api/manager-event-planning", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        body: JSON.stringify({
          action: "save_recommendation",
          recommendationId: editingRecommendationId,
          title: recommendationForm.title,
          description: recommendationForm.description,
          estimatedMinCost: recommendationForm.estimatedMinCost || null,
          estimatedMaxCost: recommendationForm.estimatedMaxCost || null,
          expectedAttendance: recommendationForm.expectedAttendance || null,
          recommendedCapacity: recommendationForm.recommendedCapacity || null,
          suggestedLocation: recommendationForm.suggestedLocation,
          suggestedTiming: recommendationForm.suggestedTiming,
          reasonRecommended: recommendationForm.reasonRecommended,
          budgetFitLabel: recommendationForm.budgetFitLabel,
          source: recommendationForm.source,
          status: recommendationForm.status,
          residentInterestSignalsUsed: defaultSignals,
        }),
      })

      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || "Unable to save recommendation draft.")
      }

      setEditingRecommendationId(null)
      setRecommendationForm({
        title: "",
        description: "",
        estimatedMinCost: "",
        estimatedMaxCost: "",
        expectedAttendance: "",
        recommendedCapacity: "",
        suggestedLocation: "",
        suggestedTiming: "",
        reasonRecommended: "",
        budgetFitLabel: "unknown",
        source: "manual",
        status: "draft",
      })
      await loadPlanning()
    } catch (error) {
      setRecommendationError(
        error instanceof Error ? error.message : "Unable to save recommendation draft.",
      )
    } finally {
      setRecommendationSaving(false)
    }
  }

  async function saveSuggestionReview(suggestionId: string) {
    const edit = suggestionEdits[suggestionId]
    if (!edit) return

    setSuggestionActionId(suggestionId)
    setSuggestionError(null)

    try {
      const response = await fetch("/api/manager-event-planning", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        body: JSON.stringify({
          action: "update_suggestion_status",
          suggestionId,
          status: edit.status,
          residentVisibility: edit.residentVisibility,
        }),
      })

      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || "Unable to update resident suggestion.")
      }

      await loadPlanning()
    } catch (error) {
      setSuggestionError(
        error instanceof Error ? error.message : "Unable to update resident suggestion.",
      )
    } finally {
      setSuggestionActionId(null)
    }
  }

  return (
    <div className="space-y-5">
      {loadError ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-4">
        <PlanningStat
          label="Budget stance"
          value={summarizeBudget(snapshot.budgetSettings)}
          helper="Sets the planning ceiling the building team should respect."
        />
        <PlanningStat
          label="Resident demand"
          value={String(planningStats.totalSignalVolume)}
          helper="Combined proposal, vote, waitlist, RSVP, and feedback signals."
        />
        <PlanningStat
          label="Suggestion pipeline"
          value={String(planningStats.suggestionCounts.total)}
          helper={`${planningStats.suggestionCounts.underReview} under review, ${planningStats.suggestionCounts.shortlisted} shortlisted.`}
        />
        <PlanningStat
          label="Calendar-ready ideas"
          value={String(planningStats.recommendationCounts.ready)}
          helper={`${planningStats.recommendationCounts.proposed} proposed and awaiting a calendar decision.`}
        />
      </div>

      <div className="rounded-2xl border border-border bg-background p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
          Demand to event workflow
        </p>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card px-4 py-4">
            <p className="font-serif text-lg text-foreground">1. Listen for demand</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Resident requests, waitlists, feedback, and visible suggestions show where organic momentum is building.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-4 py-4">
            <p className="font-serif text-lg text-foreground">2. Shape a strong concept</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Turn the strongest signals into budget-aware recommendation drafts with an expected turnout and a suggested setting.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-4 py-4">
            <p className="font-serif text-lg text-foreground">3. Move it onto the calendar</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Once a concept is approved, publish the live gathering and watch RSVP traction inside Community Pulse.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-background p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-serif text-lg text-foreground">Top resident demand signals</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                The clearest proof that a gathering idea already has momentum inside the building.
              </p>
            </div>
            <Sparkles className="size-4 text-gold" />
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {snapshot.demandSignals.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card px-4 py-5 text-sm text-muted-foreground">
                No live demand signals yet. Resident proposals, support, waitlists, RSVPs, and feedback will begin shaping this queue as the pilot fills in.
              </div>
            ) : (
              snapshot.demandSignals.slice(0, 5).map((signal) => (
                <div
                  key={`${signal.source}:${signal.label}`}
                  className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{signal.label}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-gold">
                      {signal.source.replaceAll("_", " ")}
                    </p>
                  </div>
                  <span className="rounded-full bg-gold/10 px-3 py-1 text-sm font-medium text-foreground">
                    {signal.value}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-serif text-lg text-foreground">Best next concept to shape</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Turn one strong resident idea into a budget-aware recommendation draft instead of starting from a blank page.
              </p>
            </div>
            <Lightbulb className="size-4 text-gold" />
          </div>

          {strongestSuggestion ? (
            <div className="mt-4 rounded-2xl border border-border bg-card px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-lg text-foreground">{strongestSuggestion.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {suggestionCategoryLabels[strongestSuggestion.category]} /{" "}
                    {strongestSuggestion.submittedByResidentFirstName ?? "Resident"}
                  </p>
                </div>
                <span className="rounded-full bg-gold/10 px-3 py-1 text-[11px] text-foreground">
                  {strongestSuggestion.supportSummary.total} total signal
                </span>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {strongestSuggestion.whyResidentsWouldLikeIt ||
                  strongestSuggestion.description ||
                  "A resident-submitted idea ready for manager review."}
              </p>

              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-foreground">
                <span className="rounded-full bg-[#efe6d8] px-2.5 py-1">
                  Love this {strongestSuggestion.supportSummary.loveThis}
                </span>
                <span className="rounded-full bg-[#efe6d8] px-2.5 py-1">
                  Would attend {strongestSuggestion.supportSummary.wouldAttend}
                </span>
                <span className="rounded-full bg-[#efe6d8] px-2.5 py-1">
                  Status {formatEnumLabel(strongestSuggestion.status)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => startRecommendationFromSuggestion(strongestSuggestion)}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background"
              >
                <Lightbulb className="size-4" />
                Use as recommendation draft
              </button>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-border bg-card px-4 py-5 text-sm text-muted-foreground">
              No resident idea is strong enough to shape yet. Once suggestions or support signals begin to accumulate, the strongest concept will appear here.
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="rounded-2xl border border-border bg-background p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-serif text-lg text-foreground">Event budget planning</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Keep gathering plans aligned with the pilot budget, cadence, and event mix.
              </p>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {formatTimestamp(snapshot.budgetSettings.updatedAt)}
            </span>
          </div>

          {budgetError ? (
            <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {budgetError}
            </div>
          ) : null}

          <div className="mt-4 grid gap-3">
            <div className="grid grid-cols-[1fr_160px] gap-3">
              <input
                value={budgetForm.eventBudgetAmount}
                onChange={(event) =>
                  setBudgetForm((current) => ({
                    ...current,
                    eventBudgetAmount: event.target.value,
                  }))
                }
                placeholder="Budget amount"
                className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none"
              />
              <select
                value={budgetForm.eventBudgetPeriod}
                onChange={(event) =>
                  setBudgetForm((current) => ({
                    ...current,
                    eventBudgetPeriod: event.target.value as BudgetPeriod,
                  }))
                }
                className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <input
              value={budgetForm.preferredEventFrequency}
              onChange={(event) =>
                setBudgetForm((current) => ({
                  ...current,
                  preferredEventFrequency: event.target.value,
                }))
              }
              placeholder="Preferred event frequency"
              className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none"
            />
            <input
              value={budgetForm.preferredEventTypes}
              onChange={(event) =>
                setBudgetForm((current) => ({
                  ...current,
                  preferredEventTypes: event.target.value,
                }))
              }
              placeholder="Preferred event types, separated by commas"
              className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none"
            />
            <textarea
              value={budgetForm.eventPlanningNotes}
              onChange={(event) =>
                setBudgetForm((current) => ({
                  ...current,
                  eventPlanningNotes: event.target.value,
                }))
              }
              placeholder="Planning notes for the building team"
              className="min-h-28 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => void saveBudget()}
            disabled={budgetSaving || isLoading}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-70"
          >
            {budgetSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save planning settings
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-background p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-serif text-lg text-foreground">Resident demand signals</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Live proposals, visible support, waitlists, RSVPs, and feedback that can guide the next gathering.
              </p>
            </div>
            <Sparkles className="size-4 text-gold" />
          </div>

          {isLoading ? (
            <div className="mt-4 h-32 animate-pulse rounded-2xl bg-secondary" />
          ) : snapshot.demandSignals.length === 0 ? (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              No demand signals yet. This fills in as residents begin suggesting, supporting, and RSVPing to gatherings.
            </p>
          ) : (
            <>
              <div className="mt-4 flex flex-wrap gap-2">
                {snapshot.demandSignals.map((signal) => (
                  <span
                    key={`${signal.source}:${signal.label}`}
                    className="rounded-full border border-gold/20 bg-gold/10 px-3 py-2 text-xs text-foreground"
                  >
                    {signal.label} / {signal.value} {signal.source}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                Strongest visible idea pool: {planningStats.suggestionCounts.visible} resident suggestion
                {planningStats.suggestionCounts.visible === 1 ? "" : "s"} open for community signal.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-serif text-lg text-foreground">Recommendation drafts</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Shape event concepts from live demand, assign budget fit, and decide which ideas are ready for the pilot calendar.
            </p>
          </div>
          <button
            type="button"
            onClick={() => startRecommendationEdit()}
            className="rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-foreground"
          >
            New draft
          </button>
        </div>

        {recommendationError ? (
          <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {recommendationError}
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="font-medium text-foreground">
              {editingRecommendationId ? "Edit recommendation" : "Create recommendation"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Keep it specific enough that a manager could publish the idea after one review pass.
            </p>
            <div className="mt-4 grid gap-3">
              <input
                value={recommendationForm.title}
                onChange={(event) =>
                  setRecommendationForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Recommendation title"
                className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none"
              />
              <textarea
                value={recommendationForm.description}
                onChange={(event) =>
                  setRecommendationForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="What would this gathering feel like?"
                className="min-h-24 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={recommendationForm.estimatedMinCost}
                  onChange={(event) =>
                    setRecommendationForm((current) => ({
                      ...current,
                      estimatedMinCost: event.target.value,
                    }))
                  }
                  placeholder="Min cost"
                  className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none"
                />
                <input
                  value={recommendationForm.estimatedMaxCost}
                  onChange={(event) =>
                    setRecommendationForm((current) => ({
                      ...current,
                      estimatedMaxCost: event.target.value,
                    }))
                  }
                  placeholder="Max cost"
                  className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={recommendationForm.expectedAttendance}
                  onChange={(event) =>
                    setRecommendationForm((current) => ({
                      ...current,
                      expectedAttendance: event.target.value,
                    }))
                  }
                  placeholder="Expected attendance"
                  className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none"
                />
                <input
                  value={recommendationForm.recommendedCapacity}
                  onChange={(event) =>
                    setRecommendationForm((current) => ({
                      ...current,
                      recommendedCapacity: event.target.value,
                    }))
                  }
                  placeholder="Recommended capacity"
                  className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none"
                />
              </div>
              <input
                value={recommendationForm.suggestedLocation}
                onChange={(event) =>
                  setRecommendationForm((current) => ({
                    ...current,
                    suggestedLocation: event.target.value,
                  }))
                }
                placeholder="Suggested location"
                className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none"
              />
              <input
                value={recommendationForm.suggestedTiming}
                onChange={(event) =>
                  setRecommendationForm((current) => ({
                    ...current,
                    suggestedTiming: event.target.value,
                  }))
                }
                placeholder="Suggested timing"
                className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none"
              />
              <textarea
                value={recommendationForm.reasonRecommended}
                onChange={(event) =>
                  setRecommendationForm((current) => ({
                    ...current,
                    reasonRecommended: event.target.value,
                  }))
                }
                placeholder="Why is this a good fit for the building right now?"
                className="min-h-24 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none"
              />
              <div className="grid grid-cols-3 gap-3">
                <select
                  value={recommendationForm.budgetFitLabel}
                  onChange={(event) =>
                    setRecommendationForm((current) => ({
                      ...current,
                      budgetFitLabel: event.target.value as BudgetFitLabel,
                    }))
                  }
                  className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none"
                >
                  <option value="unknown">Budget fit</option>
                  <option value="within_budget">Within budget</option>
                  <option value="stretch">Stretch</option>
                  <option value="above_budget">Above budget</option>
                </select>
                <select
                  value={recommendationForm.source}
                  onChange={(event) =>
                    setRecommendationForm((current) => ({
                      ...current,
                      source: event.target.value as RecommendationSource,
                    }))
                  }
                  className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none"
                >
                  <option value="manual">Manual</option>
                  <option value="resident_suggestion">Resident suggestion</option>
                  <option value="ai_draft">AI draft</option>
                </select>
                <select
                  value={recommendationForm.status}
                  onChange={(event) =>
                    setRecommendationForm((current) => ({
                      ...current,
                      status: event.target.value as RecommendationStatus,
                    }))
                  }
                  className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none"
                >
                  <option value="draft">Draft</option>
                  <option value="proposed">Proposed</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void saveRecommendation()}
                disabled={recommendationSaving || !recommendationForm.title.trim()}
                className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-70"
              >
                {recommendationSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {editingRecommendationId ? "Save draft" : "Create draft"}
              </button>
              {editingRecommendationId ? (
                <button
                  type="button"
                  onClick={() => startRecommendationEdit()}
                  className="rounded-full border border-border px-4 py-2.5 text-sm font-medium text-foreground"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <>
                <div className="h-32 animate-pulse rounded-2xl bg-secondary" />
                <div className="h-32 animate-pulse rounded-2xl bg-secondary" />
              </>
            ) : snapshot.recommendations.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card px-4 py-5 text-sm text-muted-foreground">
                No recommendation drafts yet. Use resident demand, support signals, and RSVP history to shape the first event concepts.
              </div>
            ) : (
              snapshot.recommendations.map((recommendation) => (
                <div
                  key={recommendation.id}
                  className="rounded-2xl border border-border bg-card px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-serif text-lg text-foreground">{recommendation.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatEnumLabel(recommendation.status)} / {formatEnumLabel(recommendation.budgetFitLabel)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startRecommendationEdit(recommendation)}
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {recommendation.description || recommendation.reasonRecommended || "No description yet."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {recommendation.residentInterestSignalsUsed.slice(0, 4).map((signal) => (
                      <span
                        key={`${recommendation.id}:${signal.source}:${signal.label}`}
                        className="rounded-full bg-gold/10 px-2.5 py-1 text-[11px] text-foreground"
                      >
                        {signal.label} / {signal.value}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    <p>Suggested setting: {recommendation.suggestedLocation || "Not set yet"}</p>
                    <p>Timing: {recommendation.suggestedTiming || "Still open"}</p>
                    <p>Expected attendance: {recommendation.expectedAttendance ?? "TBD"}</p>
                    <p>Budget range: {formatMoney(recommendation.estimatedMinCost)} to {formatMoney(recommendation.estimatedMaxCost)}</p>
                  </div>
                  <div className="mt-3 rounded-2xl border border-gold/15 bg-gold/5 px-3 py-3 text-xs leading-relaxed text-muted-foreground">
                    <p className="font-medium text-foreground">Next step</p>
                    <p className="mt-1">{getRecommendationStatusGuidance(recommendation.status)}</p>
                    <p className="mt-2">{getBudgetFitGuidance(recommendation.budgetFitLabel)}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onUseRecommendationAsEventDraft?.({
                          title: recommendation.title,
                          description: recommendation.description,
                          suggestedLocation: recommendation.suggestedLocation,
                          suggestedTiming: recommendation.suggestedTiming,
                          reasonRecommended: recommendation.reasonRecommended,
                          expectedAttendance: recommendation.expectedAttendance,
                        })
                      }
                      className="rounded-full bg-foreground px-3 py-2 text-xs font-medium text-background disabled:cursor-not-allowed disabled:opacity-70"
                      disabled={!onUseRecommendationAsEventDraft}
                    >
                      Move to gathering draft
                    </button>
                    <button
                      type="button"
                      onClick={() => startRecommendationEdit(recommendation)}
                      className="rounded-full border border-border px-3 py-2 text-xs font-medium text-foreground"
                    >
                      Refine recommendation
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Updated {formatTimestamp(recommendation.updatedAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-serif text-lg text-foreground">Resident suggestions</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Review vendor, venue, workshop, and experience ideas coming in from residents, then decide which ones should stay private, surface for voting, or move toward approval.
            </p>
          </div>
          <Users2 className="size-4 text-gold" />
        </div>

        {suggestionError ? (
          <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {suggestionError}
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 lg:grid-cols-4">
          <PlanningStat
            label="Submitted"
            value={String(planningStats.suggestionCounts.total)}
            helper="All resident-originated ideas in the planning queue."
          />
          <PlanningStat
            label="Under review"
            value={String(planningStats.suggestionCounts.underReview)}
            helper="Ideas that still need a building-team decision."
          />
          <PlanningStat
            label="Shortlisted"
            value={String(planningStats.suggestionCounts.shortlisted)}
            helper="Strong candidates for an upcoming gathering."
          />
          <PlanningStat
            label="Visible for voting"
            value={String(planningStats.suggestionCounts.visible)}
            helper="Suggestions currently open to wider resident signal."
          />
        </div>

        <div className="mt-4 space-y-3">
          {isLoading ? (
            <>
              <div className="h-32 animate-pulse rounded-2xl bg-secondary" />
              <div className="h-32 animate-pulse rounded-2xl bg-secondary" />
            </>
          ) : snapshot.residentSuggestions.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card px-4 py-5 text-sm text-muted-foreground">
              No resident suggestions yet. Once residents begin sharing ideas for workshops, food, performers, or spaces, they will appear here for review.
            </div>
          ) : (
            snapshot.residentSuggestions.map((suggestion) => {
              const edit = suggestionEdits[suggestion.id] ?? {
                status: suggestion.status,
                residentVisibility: suggestion.residentVisibility,
              }
              const isSaving = suggestionActionId === suggestion.id

              return (
                <div
                  key={suggestion.id}
                  className="rounded-2xl border border-border bg-card px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-serif text-lg text-foreground">{suggestion.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {suggestionCategoryLabels[suggestion.category]} / from{" "}
                        {suggestion.submittedByResidentFirstName ?? "Resident"}
                      </p>
                    </div>
                    <span className="rounded-full bg-gold/10 px-3 py-1 text-[11px] text-foreground">
                      {formatEnumLabel(suggestion.status)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {suggestion.description || suggestion.whyResidentsWouldLikeIt || "No extra details yet."}
                  </p>
                  <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    <p>Best for: {suggestion.suggestedForEventType || "Open use"}</p>
                    <p>Cost: {suggestion.estimatedCostRange || "Not shared"}</p>
                    <p>Location: {suggestion.location || "Flexible"}</p>
                    <p>Visibility: {formatEnumLabel(suggestion.residentVisibility)}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-foreground">
                    <span className="rounded-full bg-[#efe6d8] px-2.5 py-1">
                      Interested {suggestion.supportSummary.interested}
                    </span>
                    <span className="rounded-full bg-[#efe6d8] px-2.5 py-1">
                      Love this {suggestion.supportSummary.loveThis}
                    </span>
                    <span className="rounded-full bg-[#efe6d8] px-2.5 py-1">
                      Would attend {suggestion.supportSummary.wouldAttend}
                    </span>
                    <span className="rounded-full bg-[#efe6d8] px-2.5 py-1">
                      Total signal {suggestion.supportSummary.total}
                    </span>
                  </div>
                  <div className="mt-3 rounded-2xl border border-gold/15 bg-gold/5 px-3 py-3 text-xs leading-relaxed text-muted-foreground">
                    <p className="font-medium text-foreground">Manager read</p>
                    <p className="mt-1">{getSuggestionGuidance(suggestion)}</p>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                    <select
                      value={edit.status}
                      onChange={(event) =>
                        setSuggestionEdits((current) => ({
                          ...current,
                          [suggestion.id]: {
                            ...edit,
                            status: event.target.value as SuggestionStatus,
                          },
                        }))
                      }
                      className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none"
                    >
                      <option value="submitted">Submitted</option>
                      <option value="under_review">Under review</option>
                      <option value="shortlisted">Shortlisted</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="used_for_event">Used for event</option>
                    </select>
                    <select
                      value={edit.residentVisibility}
                      onChange={(event) =>
                        setSuggestionEdits((current) => ({
                          ...current,
                          [suggestion.id]: {
                            ...edit,
                            residentVisibility: event.target.value as SuggestionVisibility,
                          },
                        }))
                      }
                      className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none"
                    >
                      <option value="private_to_management">Private to management</option>
                      <option value="visible_for_voting">Visible for voting</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => void saveSuggestionReview(suggestion.id)}
                      disabled={isSaving}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-4 py-3 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                      Save
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startRecommendationFromSuggestion(suggestion)}
                      className="rounded-full border border-border px-3 py-2 text-xs font-medium text-foreground"
                    >
                      Use as draft
                    </button>
                  </div>
                  {suggestion.contactInfo || suggestion.websiteOrSocialLink ? (
                    <div className="mt-3 rounded-2xl border border-border bg-background px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                      {suggestion.contactInfo ? <p>Contact: {suggestion.contactInfo}</p> : null}
                      {suggestion.websiteOrSocialLink ? <p>Reference: {suggestion.websiteOrSocialLink}</p> : null}
                    </div>
                  ) : null}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
