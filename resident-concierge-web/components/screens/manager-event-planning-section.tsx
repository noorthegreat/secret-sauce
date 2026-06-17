"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Save, Sparkles } from "lucide-react"

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
  dj_performer: "DJ / performer",
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

export function ManagerEventPlanningSection({
  accessToken,
}: {
  accessToken: string
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

  const defaultSignals = useMemo(
    () => snapshot.demandSignals.slice(0, 5),
    [snapshot.demandSignals],
  )

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
        recommendation?.recommendedCapacity !== null &&
        recommendation?.recommendedCapacity !== undefined
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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="rounded-2xl border border-border bg-background p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-serif text-lg text-foreground">Event budget planning</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Keep gathering plans aligned with the pilot budget and cadence.
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
            <div className="grid grid-cols-[1fr_140px] gap-3">
              <input
                value={budgetForm.eventBudgetAmount}
                onChange={(event) =>
                  setBudgetForm((current) => ({
                    ...current,
                    eventBudgetAmount: event.target.value,
                  }))
                }
                placeholder="Event budget amount"
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
              placeholder="Preferred event types (comma-separated)"
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
                Live proposal, vote, waitlist, RSVP, and feedback data we can reuse for event planning.
              </p>
            </div>
            <Sparkles className="size-4 text-gold" />
          </div>

          {isLoading ? (
            <div className="mt-4 h-32 animate-pulse rounded-2xl bg-secondary" />
          ) : snapshot.demandSignals.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No live demand signals yet. This will start filling in once residents begin proposing gatherings, voting, and RSVPing.
            </p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {snapshot.demandSignals.map((signal) => (
                <span
                  key={`${signal.source}:${signal.label}`}
                  className="rounded-full border border-gold/20 bg-gold/10 px-3 py-2 text-xs text-foreground"
                >
                  {signal.label} · {signal.value} {signal.source}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-serif text-lg text-foreground">Recommendation drafts</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Save manual event concepts, track their budget fit, and keep a shortlist for the pilot calendar.
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
                placeholder="Short description"
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
                placeholder="Why this is a good fit for the building"
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
                No recommendation drafts yet.
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
                        {recommendation.status.replaceAll("_", " ")} · {recommendation.budgetFitLabel.replaceAll("_", " ")}
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
                        {signal.label} · {signal.value}
                      </span>
                    ))}
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
        <p className="font-serif text-lg text-foreground">Resident suggestions</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Review vendor, venue, workshop, and experience ideas coming in from residents.
        </p>

        {suggestionError ? (
          <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {suggestionError}
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          {isLoading ? (
            <>
              <div className="h-32 animate-pulse rounded-2xl bg-secondary" />
              <div className="h-32 animate-pulse rounded-2xl bg-secondary" />
            </>
          ) : snapshot.residentSuggestions.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card px-4 py-5 text-sm text-muted-foreground">
              No resident suggestions yet.
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
                        {suggestionCategoryLabels[suggestion.category]} · from{" "}
                        {suggestion.submittedByResidentFirstName ?? "Resident"}
                      </p>
                    </div>
                    <span className="rounded-full bg-gold/10 px-3 py-1 text-[11px] text-foreground">
                      {suggestion.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {suggestion.description || suggestion.whyResidentsWouldLikeIt || "No extra details yet."}
                  </p>
                  <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    <p>For event type: {suggestion.suggestedForEventType || "Open use"}</p>
                    <p>Cost: {suggestion.estimatedCostRange || "Not shared"}</p>
                    <p>Location: {suggestion.location || "Flexible"}</p>
                    <p>Visibility: {suggestion.residentVisibility.replaceAll("_", " ")}</p>
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
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
