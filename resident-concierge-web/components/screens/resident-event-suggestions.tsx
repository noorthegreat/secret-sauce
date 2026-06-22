"use client"

import { useEffect, useState } from "react"
import { Loader2, MessageCircleHeart, Plus, Save, Trash2 } from "lucide-react"

import type { ResidentAccountSnapshot } from "@/lib/resident-account-server"
import { useResidentSession } from "@/lib/session-browser"

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
type SuggestionSupportType = "interested" | "love_this" | "would_attend" | "not_for_me"

type SupportSummary = {
  total: number
  interested: number
  loveThis: number
  wouldAttend: number
  notForMe: number
}

type ResidentVisibleSuggestionItem = {
  id: string
  category: SuggestionCategory
  title: string
  description: string | null
  whyResidentsWouldLikeIt: string | null
  suggestedForEventType: string | null
  estimatedCostRange: string | null
  websiteOrSocialLink: string | null
  location: string | null
  residentVisibility: SuggestionVisibility
  status: SuggestionStatus
  submittedByResidentFirstName: string | null
  supportSummary: SupportSummary
  viewerSupport: {
    supportType: SuggestionSupportType
    optionalComment: string | null
  } | null
  canEdit: boolean
  createdAt: string
  updatedAt: string
}

type ResidentEventSuggestionSnapshot = {
  suggestions: ResidentVisibleSuggestionItem[]
}

const suggestionCategories: Array<{ value: SuggestionCategory; label: string }> = [
  { value: "venue", label: "Venue" },
  { value: "food_truck", label: "Food truck" },
  { value: "caterer", label: "Caterer" },
  { value: "dj_performer", label: "DJ / performer" },
  { value: "fitness_instructor", label: "Fitness instructor" },
  { value: "wellness_provider", label: "Wellness provider" },
  { value: "artist", label: "Artist" },
  { value: "local_business", label: "Local business" },
  { value: "workshop", label: "Workshop" },
  { value: "pop_up", label: "Pop-up" },
  { value: "other", label: "Other" },
]

const supportOptions: Array<{ value: SuggestionSupportType; label: string }> = [
  { value: "interested", label: "Interested" },
  { value: "love_this", label: "Love this" },
  { value: "would_attend", label: "Would attend" },
  { value: "not_for_me", label: "Not for me" },
]

function formatTimestamp(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

export function ResidentEventSuggestions({
  isSignedIn,
  accountSnapshot,
  accountLoading,
  onSignIn,
  onCompleteProfile,
}: {
  isSignedIn: boolean
  accountSnapshot: ResidentAccountSnapshot | null
  accountLoading: boolean
  onSignIn: () => void
  onCompleteProfile: () => void
}) {
  const { session } = useResidentSession()
  const [snapshot, setSnapshot] = useState<ResidentEventSuggestionSnapshot>({ suggestions: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)
  const [editingSuggestionId, setEditingSuggestionId] = useState<string | null>(null)
  const [form, setForm] = useState({
    category: "venue" as SuggestionCategory,
    title: "",
    description: "",
    whyResidentsWouldLikeIt: "",
    suggestedForEventType: "",
    estimatedCostRange: "",
    contactInfo: "",
    websiteOrSocialLink: "",
    location: "",
    residentVisibility: "private_to_management" as SuggestionVisibility,
  })

  const isEligible =
    isSignedIn &&
    accountSnapshot?.status === "active" &&
    accountSnapshot.hasActiveMembership

  async function loadSuggestions() {
    const accessToken = session?.access_token

    if (!accessToken || !isEligible) {
      setSnapshot({ suggestions: [] })
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/event-suggestions", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      })

      const payload = (await response.json()) as ResidentEventSuggestionSnapshot & { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || "Unable to load resident suggestions.")
      }

      setSnapshot(payload)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load resident suggestions.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadSuggestions()
  }, [session?.access_token, isEligible])

  function resetForm() {
    setEditingSuggestionId(null)
    setForm({
      category: "venue",
      title: "",
      description: "",
      whyResidentsWouldLikeIt: "",
      suggestedForEventType: "",
      estimatedCostRange: "",
      contactInfo: "",
      websiteOrSocialLink: "",
      location: "",
      residentVisibility: "private_to_management",
    })
  }

  async function saveSuggestion() {
    const accessToken = session?.access_token
    if (!accessToken) {
      onSignIn()
      return
    }

    if (accountSnapshot?.needsSurveyCompletion) {
      onCompleteProfile()
      return
    }

    setActionId(editingSuggestionId ?? "new")
    setError(null)

    try {
      const response = await fetch("/api/event-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        body: JSON.stringify({
          action: editingSuggestionId ? "update_suggestion" : "create_suggestion",
          suggestionId: editingSuggestionId,
          ...form,
        }),
      })

      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || "Unable to save your suggestion.")
      }

      resetForm()
      await loadSuggestions()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save your suggestion.")
    } finally {
      setActionId(null)
    }
  }

  async function deleteSuggestion(suggestionId: string) {
    const accessToken = session?.access_token
    if (!accessToken) {
      onSignIn()
      return
    }

    setActionId(suggestionId)
    setError(null)

    try {
      const response = await fetch("/api/event-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        body: JSON.stringify({
          action: "delete_suggestion",
          suggestionId,
        }),
      })

      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || "Unable to delete your suggestion.")
      }

      await loadSuggestions()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete your suggestion.")
    } finally {
      setActionId(null)
    }
  }

  async function setSupport(suggestionId: string, supportType: SuggestionSupportType) {
    const accessToken = session?.access_token
    if (!accessToken) {
      onSignIn()
      return
    }

    setActionId(`${suggestionId}:${supportType}`)
    setError(null)

    try {
      const response = await fetch("/api/event-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        body: JSON.stringify({
          action: "set_support",
          suggestionId,
          supportType,
        }),
      })

      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || "Unable to save your support.")
      }

      await loadSuggestions()
    } catch (supportError) {
      setError(supportError instanceof Error ? supportError.message : "Unable to save your support.")
    } finally {
      setActionId(null)
    }
  }

  function beginEdit(suggestion: ResidentVisibleSuggestionItem) {
    setEditingSuggestionId(suggestion.id)
    setForm({
      category: suggestion.category,
      title: suggestion.title,
      description: suggestion.description ?? "",
      whyResidentsWouldLikeIt: suggestion.whyResidentsWouldLikeIt ?? "",
      suggestedForEventType: suggestion.suggestedForEventType ?? "",
      estimatedCostRange: suggestion.estimatedCostRange ?? "",
      contactInfo: "",
      websiteOrSocialLink: suggestion.websiteOrSocialLink ?? "",
      location: suggestion.location ?? "",
      residentVisibility: suggestion.residentVisibility,
    })
  }

  return (
    <div className="mt-6 space-y-5">
      <div className="rounded-[1.8rem] border border-[#e1d5c3] bg-[#fbf6ee] p-5 shadow-[0_22px_50px_-42px_rgba(70,56,35,0.38)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-serif text-xl text-foreground">
              Suggest something worth gathering around.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#6f604f]">
              Share a venue, food idea, performer, workshop, or other local experience the building team should consider.
            </p>
          </div>
          <MessageCircleHeart className="mt-1 size-5 text-gold" />
        </div>

        <div className="mt-4 rounded-2xl border border-[#e9dece] bg-[#f7f0e5] px-4 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
            Private or visible
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#6f604f]">
            Keep a suggestion private to management when it is still rough or sensitive. Choose visible for voting when you want the community to add signal and help the idea gain momentum.
          </p>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#eadfce] bg-white/70 px-4 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
              Best for private notes
            </p>
            <p className="mt-2 text-sm leading-6 text-[#6f604f]">
              Early ideas, sensitive vendor suggestions, or something that still needs shaping before the community sees it.
            </p>
          </div>
          <div className="rounded-2xl border border-[#eadfce] bg-white/70 px-4 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
              Best for community voting
            </p>
            <p className="mt-2 text-sm leading-6 text-[#6f604f]">
              Stronger ideas that benefit from resident signal, momentum, and a clearer sense of who would actually attend.
            </p>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {!isEligible ? (
          <div className="mt-4 rounded-2xl border border-[#ded1bf] bg-[#efe6d8] px-4 py-4 text-sm text-[#6f604f]">
            {accountLoading
              ? "Checking resident access..."
              : "Suggestions open once your resident membership is active."}
          </div>
        ) : null}

        <div className="mt-4 grid gap-3">
          <div className="grid grid-cols-[1fr_180px] gap-3">
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Suggestion title"
              className="rounded-2xl border border-[#e1d5c3] bg-white px-4 py-3 text-sm text-foreground outline-none"
            />
            <select
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  category: event.target.value as SuggestionCategory,
                }))
              }
              className="rounded-2xl border border-[#e1d5c3] bg-white px-4 py-3 text-sm text-foreground outline-none"
            >
              {suggestionCategories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="What is it?"
            className="min-h-24 rounded-2xl border border-[#e1d5c3] bg-white px-4 py-3 text-sm text-foreground outline-none"
          />
          <textarea
            value={form.whyResidentsWouldLikeIt}
            onChange={(event) =>
              setForm((current) => ({ ...current, whyResidentsWouldLikeIt: event.target.value }))
            }
            placeholder="Why would residents love this?"
            className="min-h-24 rounded-2xl border border-[#e1d5c3] bg-white px-4 py-3 text-sm text-foreground outline-none"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={form.suggestedForEventType}
              onChange={(event) =>
                setForm((current) => ({ ...current, suggestedForEventType: event.target.value }))
              }
              placeholder="Best for what kind of gathering?"
              className="rounded-2xl border border-[#e1d5c3] bg-white px-4 py-3 text-sm text-foreground outline-none"
            />
            <input
              value={form.estimatedCostRange}
              onChange={(event) =>
                setForm((current) => ({ ...current, estimatedCostRange: event.target.value }))
              }
              placeholder="Estimated cost range"
              className="rounded-2xl border border-[#e1d5c3] bg-white px-4 py-3 text-sm text-foreground outline-none"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              value={form.location}
              onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
              placeholder="Location"
              className="rounded-2xl border border-[#e1d5c3] bg-white px-4 py-3 text-sm text-foreground outline-none"
            />
            <input
              value={form.websiteOrSocialLink}
              onChange={(event) =>
                setForm((current) => ({ ...current, websiteOrSocialLink: event.target.value }))
              }
              placeholder="Website or social link"
              className="rounded-2xl border border-[#e1d5c3] bg-white px-4 py-3 text-sm text-foreground outline-none"
            />
            <select
              value={form.residentVisibility}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  residentVisibility: event.target.value as SuggestionVisibility,
                }))
              }
              className="rounded-2xl border border-[#e1d5c3] bg-white px-4 py-3 text-sm text-foreground outline-none"
            >
              <option value="private_to_management">Private to management</option>
              <option value="visible_for_voting">Visible for resident voting</option>
            </select>
          </div>
          <input
            value={form.contactInfo}
            onChange={(event) => setForm((current) => ({ ...current, contactInfo: event.target.value }))}
            placeholder="Optional contact info for management"
            className="rounded-2xl border border-[#e1d5c3] bg-white px-4 py-3 text-sm text-foreground outline-none"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void saveSuggestion()}
            disabled={Boolean(actionId) || !form.title.trim() || !isEligible}
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-70"
          >
            {actionId === (editingSuggestionId ?? "new") ? (
              <Loader2 className="size-4 animate-spin" />
            ) : editingSuggestionId ? (
              <Save className="size-4" />
            ) : (
              <Plus className="size-4" />
            )}
            {editingSuggestionId ? "Save suggestion" : "Submit suggestion"}
          </button>
          {editingSuggestionId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-full border border-[#e1d5c3] px-4 py-2.5 text-sm font-medium text-foreground"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <>
            <div className="h-32 animate-pulse rounded-[1.8rem] bg-[#efe6d8]" />
            <div className="h-32 animate-pulse rounded-[1.8rem] bg-[#efe6d8]" />
          </>
        ) : snapshot.suggestions.length === 0 ? (
          <div className="rounded-[1.8rem] border border-[#e1d5c3] bg-[#fbf6ee] px-5 py-5 text-sm text-[#6f604f]">
            No resident suggestions are visible yet. Once the first ideas are shared for community voting, they will appear here.
          </div>
        ) : (
          snapshot.suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="rounded-[1.8rem] border border-[#e1d5c3] bg-[#fbf6ee] p-5 shadow-[0_22px_50px_-42px_rgba(70,56,35,0.38)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-xl text-foreground">{suggestion.title}</p>
                  <p className="mt-1 text-xs text-[#8b7c6a]">
                    {suggestionCategories.find((category) => category.value === suggestion.category)?.label} ·{" "}
                    {suggestion.submittedByResidentFirstName || "Resident"} · {formatTimestamp(suggestion.createdAt)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="rounded-full bg-gold/10 px-3 py-1 text-[11px] text-foreground">
                    {suggestion.status.replaceAll("_", " ")}
                  </span>
                  <span className="rounded-full border border-[#e3d8c7] bg-white px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-[#7a6b5b]">
                    {suggestion.residentVisibility === "visible_for_voting"
                      ? "Visible to residents"
                      : "Private to management"}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[#6f604f]">
                {suggestion.description || suggestion.whyResidentsWouldLikeIt || "No extra detail yet."}
              </p>
              {suggestion.suggestedForEventType || suggestion.location ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {suggestion.suggestedForEventType ? (
                    <span className="rounded-full border border-[#e3d8c7] bg-white px-3 py-1 text-[11px] text-[#756656]">
                      Best for {suggestion.suggestedForEventType}
                    </span>
                  ) : null}
                  {suggestion.location ? (
                    <span className="rounded-full border border-[#e3d8c7] bg-white px-3 py-1 text-[11px] text-[#756656]">
                      {suggestion.location}
                    </span>
                  ) : null}
                </div>
              ) : null}
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
              <div className="mt-4 flex flex-wrap gap-2">
                {suggestion.residentVisibility === "visible_for_voting"
                  ? supportOptions.map((option) => {
                      const isCurrent = suggestion.viewerSupport?.supportType === option.value
                      const isWorking = actionId === `${suggestion.id}:${option.value}`

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => void setSupport(suggestion.id, option.value)}
                          disabled={!isEligible || Boolean(actionId)}
                          className={`rounded-full px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
                            isCurrent
                              ? "bg-foreground text-background"
                              : "border border-[#e1d5c3] text-foreground"
                          }`}
                        >
                          {isWorking ? <Loader2 className="size-3 animate-spin" /> : option.label}
                        </button>
                      )
                    })
                  : (
                    <span className="text-sm text-[#6f604f]">
                      Shared privately with the building team.
                    </span>
                  )}
              </div>

              {suggestion.canEdit ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => beginEdit(suggestion)}
                    className="rounded-full border border-[#e1d5c3] px-3 py-2 text-xs font-medium text-foreground"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteSuggestion(suggestion.id)}
                    disabled={actionId === suggestion.id}
                    className="inline-flex items-center gap-2 rounded-full border border-destructive/25 px-3 py-2 text-xs font-medium text-destructive disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {actionId === suggestion.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Trash2 className="size-3" />
                    )}
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
