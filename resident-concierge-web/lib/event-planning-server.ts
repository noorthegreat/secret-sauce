import { getSupabaseAdmin } from "@/lib/supabase-admin"

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
type SuggestionSupportType = "interested" | "love_this" | "would_attend" | "not_for_me"
type EventEngagementType = "proposal" | "vote" | "interest" | "waitlist" | "feedback"

type EventBudgetSettingsRow = {
  building_id: string
  event_budget_amount: number | null
  event_budget_period: BudgetPeriod | null
  preferred_event_frequency: string | null
  preferred_event_types: string[] | null
  event_planning_notes: string | null
  updated_by_manager_id: string | null
  updated_at: string
}

type EventRecommendationRow = {
  id: string
  building_id: string
  title: string
  description: string | null
  estimated_min_cost: number | null
  estimated_max_cost: number | null
  expected_attendance: number | null
  recommended_capacity: number | null
  suggested_location: string | null
  suggested_timing: string | null
  resident_interest_signals_used: unknown
  reason_recommended: string | null
  budget_fit_label: BudgetFitLabel
  source: RecommendationSource
  status: RecommendationStatus
  created_at: string
  updated_at: string
}

type EventSuggestionRow = {
  id: string
  building_id: string
  submitted_by_resident_id: string
  category: SuggestionCategory
  title: string
  description: string | null
  why_residents_would_like_it: string | null
  suggested_for_event_type: string | null
  estimated_cost_range: string | null
  contact_info: string | null
  website_or_social_link: string | null
  location: string | null
  resident_visibility: SuggestionVisibility
  status: SuggestionStatus
  created_at: string
  updated_at: string
}

type SuggestionSupportRow = {
  id: string
  suggestion_id: string
  resident_id: string
  support_type: SuggestionSupportType
  optional_comment: string | null
  created_at: string
  updated_at: string
}

type ProfileRow = {
  id: string
  first_name: string | null
}

type EventEngagementRow = {
  engagement_type: EventEngagementType
  status: "active" | "withdrawn" | "resolved"
  title: string | null
  value: string | null
  metadata: Record<string, unknown> | null
}

type EventEnrollmentRow = {
  event_name: string | null
}

export type ResidentEventSuggestionSupportSummary = {
  total: number
  interested: number
  loveThis: number
  wouldAttend: number
  notForMe: number
}

export type EventPlanningDemandSignal = {
  label: string
  value: number
  source: "proposal" | "interest" | "vote" | "waitlist" | "rsvp" | "feedback"
}

export type ManagerEventBudgetSettings = {
  buildingId: string
  eventBudgetAmount: number | null
  eventBudgetPeriod: BudgetPeriod | null
  preferredEventFrequency: string | null
  preferredEventTypes: string[]
  eventPlanningNotes: string | null
  updatedByManagerId: string | null
  updatedAt: string | null
}

export type EventRecommendationDraft = {
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

export type ManagerResidentSuggestionItem = {
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
  supportSummary: ResidentEventSuggestionSupportSummary
  createdAt: string
  updatedAt: string
}

export type ResidentVisibleSuggestionItem = {
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
  supportSummary: ResidentEventSuggestionSupportSummary
  viewerSupport: {
    supportType: SuggestionSupportType
    optionalComment: string | null
  } | null
  canEdit: boolean
  createdAt: string
  updatedAt: string
}

export type ManagerEventPlanningSnapshot = {
  budgetSettings: ManagerEventBudgetSettings
  recommendations: EventRecommendationDraft[]
  residentSuggestions: ManagerResidentSuggestionItem[]
  demandSignals: EventPlanningDemandSignal[]
}

export type ResidentEventSuggestionSnapshot = {
  suggestions: ResidentVisibleSuggestionItem[]
}

export type UpsertBudgetSettingsInput = {
  eventBudgetAmount?: number | null
  eventBudgetPeriod?: BudgetPeriod | null
  preferredEventFrequency?: string | null
  preferredEventTypes?: string[]
  eventPlanningNotes?: string | null
}

export type UpsertRecommendationInput = {
  title: string
  description?: string | null
  estimatedMinCost?: number | null
  estimatedMaxCost?: number | null
  expectedAttendance?: number | null
  recommendedCapacity?: number | null
  suggestedLocation?: string | null
  suggestedTiming?: string | null
  residentInterestSignalsUsed?: EventPlanningDemandSignal[]
  reasonRecommended?: string | null
  budgetFitLabel?: BudgetFitLabel
  source?: RecommendationSource
  status?: RecommendationStatus
}

export type CreateResidentSuggestionInput = {
  category: SuggestionCategory
  title: string
  description?: string | null
  whyResidentsWouldLikeIt?: string | null
  suggestedForEventType?: string | null
  estimatedCostRange?: string | null
  contactInfo?: string | null
  websiteOrSocialLink?: string | null
  location?: string | null
  residentVisibility?: SuggestionVisibility
}

export type UpdateResidentSuggestionInput = CreateResidentSuggestionInput

export const allowedBudgetPeriods = new Set<BudgetPeriod>(["monthly", "yearly"])
export const allowedRecommendationSources = new Set<RecommendationSource>([
  "manual",
  "resident_suggestion",
  "ai_draft",
])
export const allowedRecommendationStatuses = new Set<RecommendationStatus>([
  "draft",
  "proposed",
  "approved",
  "rejected",
  "scheduled",
])
export const allowedBudgetFitLabels = new Set<BudgetFitLabel>([
  "within_budget",
  "stretch",
  "above_budget",
  "unknown",
])
export const allowedSuggestionCategories = new Set<SuggestionCategory>([
  "venue",
  "food_truck",
  "caterer",
  "dj_performer",
  "fitness_instructor",
  "wellness_provider",
  "artist",
  "local_business",
  "workshop",
  "pop_up",
  "other",
])
export const allowedSuggestionVisibilities = new Set<SuggestionVisibility>([
  "private_to_management",
  "visible_for_voting",
])
export const allowedSuggestionStatuses = new Set<SuggestionStatus>([
  "submitted",
  "under_review",
  "shortlisted",
  "approved",
  "rejected",
  "used_for_event",
])
export const allowedSuggestionSupportTypes = new Set<SuggestionSupportType>([
  "interested",
  "love_this",
  "would_attend",
  "not_for_me",
])

function clampText(value: string | null | undefined, maxLength: number) {
  const normalized = value?.trim() ?? ""
  if (!normalized) {
    return null
  }

  return normalized.slice(0, maxLength)
}

function normalizeStringList(values: string[] | null | undefined, maxItemLength = 80) {
  return Array.from(
    new Set(
      (values ?? [])
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => value.slice(0, maxItemLength)),
    ),
  )
}

function normalizeMoney(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null
  }

  const normalized = Number(value)
  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new Error("Budget amounts must be zero or higher.")
  }

  return Math.round(normalized * 100) / 100
}

function normalizeCount(value: number | null | undefined, label: string) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null
  }

  const normalized = Math.trunc(Number(value))
  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new Error(`${label} must be zero or higher.`)
  }

  return normalized
}

function mapSupportSummary(rows: SuggestionSupportRow[]): ResidentEventSuggestionSupportSummary {
  return rows.reduce<ResidentEventSuggestionSupportSummary>(
    (summary, row) => {
      summary.total += 1

      switch (row.support_type) {
        case "interested":
          summary.interested += 1
          break
        case "love_this":
          summary.loveThis += 1
          break
        case "would_attend":
          summary.wouldAttend += 1
          break
        case "not_for_me":
          summary.notForMe += 1
          break
      }

      return summary
    },
    {
      total: 0,
      interested: 0,
      loveThis: 0,
      wouldAttend: 0,
      notForMe: 0,
    },
  )
}

function normalizeDemandSignals(value: EventPlanningDemandSignal[] | null | undefined) {
  return (value ?? [])
    .map((signal) => ({
      label: signal.label.trim().slice(0, 120),
      value: Math.max(0, Math.trunc(signal.value)),
      source: signal.source,
    }))
    .filter(
      (signal) =>
        signal.label &&
        signal.value >= 0 &&
        ["proposal", "interest", "vote", "waitlist", "rsvp", "feedback"].includes(signal.source),
    )
    .slice(0, 12)
}

function mapBudgetSettings(
  buildingId: string,
  row: EventBudgetSettingsRow | null,
): ManagerEventBudgetSettings {
  return {
    buildingId,
    eventBudgetAmount: row?.event_budget_amount ?? null,
    eventBudgetPeriod: row?.event_budget_period ?? null,
    preferredEventFrequency: row?.preferred_event_frequency ?? null,
    preferredEventTypes: row?.preferred_event_types ?? [],
    eventPlanningNotes: row?.event_planning_notes ?? null,
    updatedByManagerId: row?.updated_by_manager_id ?? null,
    updatedAt: row?.updated_at ?? null,
  }
}

function mapRecommendation(row: EventRecommendationRow): EventRecommendationDraft {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    estimatedMinCost: row.estimated_min_cost,
    estimatedMaxCost: row.estimated_max_cost,
    expectedAttendance: row.expected_attendance,
    recommendedCapacity: row.recommended_capacity,
    suggestedLocation: row.suggested_location,
    suggestedTiming: row.suggested_timing,
    residentInterestSignalsUsed: Array.isArray(row.resident_interest_signals_used)
      ? (row.resident_interest_signals_used as EventPlanningDemandSignal[])
      : [],
    reasonRecommended: row.reason_recommended,
    budgetFitLabel: row.budget_fit_label,
    source: row.source,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function getDemandSignalsForBuilding(buildingId: string) {
  const supabase = getSupabaseAdmin()
  const [{ data: engagementRows, error: engagementError }, { data: buildingEvents, error: eventsError }] =
    await Promise.all([
      supabase
        .from("building_event_engagements")
        .select("engagement_type, status, title, value, metadata")
        .eq("building_id", buildingId)
        .returns<EventEngagementRow[]>(),
      supabase.from("events").select("id").eq("building_id", buildingId).returns<Array<{ id: string }>>(),
    ])

  if (engagementError) {
    throw new Error("Unable to load event demand signals.")
  }

  if (eventsError) {
    throw new Error("Unable to load event demand signals.")
  }

  const eventIds = (buildingEvents ?? []).map((event) => event.id)
  const { data: enrollments, error: enrollmentError } = eventIds.length
    ? await supabase
        .from("event_enrollments")
        .select("event_name")
        .in("event_id", eventIds)
        .returns<EventEnrollmentRow[]>()
    : { data: [] as EventEnrollmentRow[], error: null }

  if (enrollmentError) {
    throw new Error("Unable to load RSVP demand signals.")
  }

  const counts = new Map<string, { source: EventPlanningDemandSignal["source"]; value: number }>()

  for (const row of engagementRows ?? []) {
    const activeFeedback = row.engagement_type === "feedback" ? row.status === "active" : row.status === "active"
    if (!activeFeedback) {
      continue
    }

    const label =
      row.title?.trim() ||
      row.value?.trim() ||
      (typeof row.metadata?.event_title === "string" ? row.metadata.event_title.trim() : "") ||
      ""

    if (!label) {
      continue
    }

    const source =
      row.engagement_type === "feedback"
        ? "feedback"
        : row.engagement_type === "interest"
          ? "interest"
          : row.engagement_type === "vote"
            ? "vote"
            : row.engagement_type === "waitlist"
              ? "waitlist"
              : "proposal"

    const key = `${source}:${label.toLowerCase()}`
    const existing = counts.get(key)
    counts.set(key, {
      source,
      value: (existing?.value ?? 0) + 1,
    })
  }

  for (const enrollment of enrollments ?? []) {
    const label = enrollment.event_name?.trim() ?? ""
    if (!label) {
      continue
    }

    const key = `rsvp:${label.toLowerCase()}`
    const existing = counts.get(key)
    counts.set(key, {
      source: "rsvp",
      value: (existing?.value ?? 0) + 1,
    })
  }

  return [...counts.entries()]
    .map(([key, item]) => ({
      label: key.slice(key.indexOf(":") + 1).replace(/\b\w/g, (char) => char.toUpperCase()),
      value: item.value,
      source: item.source,
    }))
    .sort((left, right) => {
      if (right.value !== left.value) {
        return right.value - left.value
      }

      return left.label.localeCompare(right.label)
    })
    .slice(0, 12)
}

export async function getManagerEventPlanningSnapshot(buildingId: string): Promise<ManagerEventPlanningSnapshot> {
  const supabase = getSupabaseAdmin()
  const [{ data: budgetRow, error: budgetError }, { data: recommendations, error: recommendationError }, { data: suggestions, error: suggestionError }, demandSignals] =
    await Promise.all([
      supabase
        .from("building_event_budget_settings")
        .select(
          "building_id, event_budget_amount, event_budget_period, preferred_event_frequency, preferred_event_types, event_planning_notes, updated_by_manager_id, updated_at",
        )
        .eq("building_id", buildingId)
        .maybeSingle<EventBudgetSettingsRow>(),
      supabase
        .from("building_event_recommendations")
        .select(
          "id, building_id, title, description, estimated_min_cost, estimated_max_cost, expected_attendance, recommended_capacity, suggested_location, suggested_timing, resident_interest_signals_used, reason_recommended, budget_fit_label, source, status, created_at, updated_at",
        )
        .eq("building_id", buildingId)
        .order("updated_at", { ascending: false })
        .returns<EventRecommendationRow[]>(),
      supabase
        .from("building_event_suggestions")
        .select(
          "id, building_id, submitted_by_resident_id, category, title, description, why_residents_would_like_it, suggested_for_event_type, estimated_cost_range, contact_info, website_or_social_link, location, resident_visibility, status, created_at, updated_at",
        )
        .eq("building_id", buildingId)
        .order("created_at", { ascending: false })
        .returns<EventSuggestionRow[]>(),
      getDemandSignalsForBuilding(buildingId),
    ])

  if (budgetError || recommendationError || suggestionError) {
    throw new Error("Unable to load event planning data.")
  }

  const suggestionIds = (suggestions ?? []).map((suggestion) => suggestion.id)
  const residentIds = Array.from(new Set((suggestions ?? []).map((suggestion) => suggestion.submitted_by_resident_id)))

  const [{ data: supportRows, error: supportError }, { data: profiles, error: profileError }] =
    await Promise.all([
      suggestionIds.length > 0
        ? supabase
            .from("building_event_suggestion_supports")
            .select("id, suggestion_id, resident_id, support_type, optional_comment, created_at, updated_at")
            .in("suggestion_id", suggestionIds)
            .returns<SuggestionSupportRow[]>()
        : Promise.resolve({ data: [] as SuggestionSupportRow[], error: null }),
      residentIds.length > 0
        ? supabase.from("profiles").select("id, first_name").in("id", residentIds).returns<ProfileRow[]>()
        : Promise.resolve({ data: [] as ProfileRow[], error: null }),
    ])

  if (supportError || profileError) {
    throw new Error("Unable to load resident suggestion context.")
  }

  const supportsBySuggestionId = new Map<string, SuggestionSupportRow[]>()
  for (const support of supportRows ?? []) {
    const list = supportsBySuggestionId.get(support.suggestion_id) ?? []
    list.push(support)
    supportsBySuggestionId.set(support.suggestion_id, list)
  }

  const residentNames = new Map((profiles ?? []).map((profile) => [profile.id, profile.first_name?.trim() || null]))

  return {
    budgetSettings: mapBudgetSettings(buildingId, budgetRow ?? null),
    recommendations: (recommendations ?? []).map(mapRecommendation),
    residentSuggestions: (suggestions ?? []).map((suggestion) => ({
      id: suggestion.id,
      submittedByResidentId: suggestion.submitted_by_resident_id,
      submittedByResidentFirstName: residentNames.get(suggestion.submitted_by_resident_id) ?? null,
      category: suggestion.category,
      title: suggestion.title,
      description: suggestion.description,
      whyResidentsWouldLikeIt: suggestion.why_residents_would_like_it,
      suggestedForEventType: suggestion.suggested_for_event_type,
      estimatedCostRange: suggestion.estimated_cost_range,
      contactInfo: suggestion.contact_info,
      websiteOrSocialLink: suggestion.website_or_social_link,
      location: suggestion.location,
      residentVisibility: suggestion.resident_visibility,
      status: suggestion.status,
      supportSummary: mapSupportSummary(supportsBySuggestionId.get(suggestion.id) ?? []),
      createdAt: suggestion.created_at,
      updatedAt: suggestion.updated_at,
    })),
    demandSignals,
  }
}

export async function updateBuildingEventBudgetSettings({
  buildingId,
  managerUserId,
  input,
}: {
  buildingId: string
  managerUserId: string
  input: UpsertBudgetSettingsInput
}) {
  const supabase = getSupabaseAdmin()
  const nowIso = new Date().toISOString()

  if (input.eventBudgetPeriod && !allowedBudgetPeriods.has(input.eventBudgetPeriod)) {
    throw new Error("Choose a valid event budget period.")
  }

  const { data, error } = await supabase
    .from("building_event_budget_settings")
    .upsert(
      {
        building_id: buildingId,
        event_budget_amount: normalizeMoney(input.eventBudgetAmount),
        event_budget_period: input.eventBudgetPeriod ?? null,
        preferred_event_frequency: clampText(input.preferredEventFrequency ?? null, 80),
        preferred_event_types: normalizeStringList(input.preferredEventTypes, 80),
        event_planning_notes: clampText(input.eventPlanningNotes ?? null, 4000),
        updated_by_manager_id: managerUserId,
        updated_at: nowIso,
      },
      {
        onConflict: "building_id",
      },
    )
    .select(
      "building_id, event_budget_amount, event_budget_period, preferred_event_frequency, preferred_event_types, event_planning_notes, updated_by_manager_id, updated_at",
    )
    .maybeSingle<EventBudgetSettingsRow>()

  if (error || !data) {
    throw new Error("Unable to save the event budget settings.")
  }

  return mapBudgetSettings(buildingId, data)
}

export async function saveManagerEventRecommendation({
  buildingId,
  recommendationId,
  input,
}: {
  buildingId: string
  recommendationId?: string | null
  input: UpsertRecommendationInput
}) {
  const supabase = getSupabaseAdmin()
  const nowIso = new Date().toISOString()
  const title = clampText(input.title, 160)

  if (!title) {
    throw new Error("Recommendation title is required.")
  }

  if (input.source && !allowedRecommendationSources.has(input.source)) {
    throw new Error("Choose a valid recommendation source.")
  }

  if (input.status && !allowedRecommendationStatuses.has(input.status)) {
    throw new Error("Choose a valid recommendation status.")
  }

  if (input.budgetFitLabel && !allowedBudgetFitLabels.has(input.budgetFitLabel)) {
    throw new Error("Choose a valid budget fit label.")
  }

  const estimatedMinCost = normalizeMoney(input.estimatedMinCost)
  const estimatedMaxCost = normalizeMoney(input.estimatedMaxCost)
  if (estimatedMinCost !== null && estimatedMaxCost !== null && estimatedMaxCost < estimatedMinCost) {
    throw new Error("Estimated max cost must be greater than or equal to estimated min cost.")
  }

  const payload = {
    building_id: buildingId,
    title,
    description: clampText(input.description ?? null, 2000),
    estimated_min_cost: estimatedMinCost,
    estimated_max_cost: estimatedMaxCost,
    expected_attendance: normalizeCount(input.expectedAttendance, "Expected attendance"),
    recommended_capacity: normalizeCount(input.recommendedCapacity, "Recommended capacity"),
    suggested_location: clampText(input.suggestedLocation ?? null, 160),
    suggested_timing: clampText(input.suggestedTiming ?? null, 160),
    resident_interest_signals_used: normalizeDemandSignals(input.residentInterestSignalsUsed),
    reason_recommended: clampText(input.reasonRecommended ?? null, 2000),
    budget_fit_label: input.budgetFitLabel ?? "unknown",
    source: input.source ?? "manual",
    status: input.status ?? "draft",
    updated_at: nowIso,
  }

  if (recommendationId) {
    const { data, error } = await supabase
      .from("building_event_recommendations")
      .update(payload)
      .eq("id", recommendationId)
      .eq("building_id", buildingId)
      .select(
        "id, building_id, title, description, estimated_min_cost, estimated_max_cost, expected_attendance, recommended_capacity, suggested_location, suggested_timing, resident_interest_signals_used, reason_recommended, budget_fit_label, source, status, created_at, updated_at",
      )
      .maybeSingle<EventRecommendationRow>()

    if (error || !data) {
      throw new Error("Unable to update the event recommendation.")
    }

    return mapRecommendation(data)
  }

  const { data, error } = await supabase
    .from("building_event_recommendations")
    .insert({
      ...payload,
      created_at: nowIso,
    })
    .select(
      "id, building_id, title, description, estimated_min_cost, estimated_max_cost, expected_attendance, recommended_capacity, suggested_location, suggested_timing, resident_interest_signals_used, reason_recommended, budget_fit_label, source, status, created_at, updated_at",
    )
    .maybeSingle<EventRecommendationRow>()

  if (error || !data) {
    throw new Error("Unable to create the event recommendation.")
  }

  return mapRecommendation(data)
}

export async function updateManagerEventSuggestionStatus({
  buildingId,
  suggestionId,
  status,
  residentVisibility,
}: {
  buildingId: string
  suggestionId: string
  status: SuggestionStatus
  residentVisibility?: SuggestionVisibility | null
}) {
  const supabase = getSupabaseAdmin()

  if (!allowedSuggestionStatuses.has(status)) {
    throw new Error("Choose a valid suggestion status.")
  }

  if (residentVisibility && !allowedSuggestionVisibilities.has(residentVisibility)) {
    throw new Error("Choose a valid resident visibility setting.")
  }

  const { data, error } = await supabase
    .from("building_event_suggestions")
    .update({
      status,
      resident_visibility: residentVisibility ?? undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", suggestionId)
    .eq("building_id", buildingId)
    .select(
      "id, building_id, submitted_by_resident_id, category, title, description, why_residents_would_like_it, suggested_for_event_type, estimated_cost_range, contact_info, website_or_social_link, location, resident_visibility, status, created_at, updated_at",
    )
    .maybeSingle<EventSuggestionRow>()

  if (error || !data) {
    throw new Error("Unable to update the resident suggestion.")
  }

  return data
}

export async function getResidentVisibleEventSuggestions({
  userId,
  buildingId,
}: {
  userId: string
  buildingId: string
}): Promise<ResidentEventSuggestionSnapshot> {
  const supabase = getSupabaseAdmin()
  const { data: suggestions, error } = await supabase
    .from("building_event_suggestions")
    .select(
      "id, building_id, submitted_by_resident_id, category, title, description, why_residents_would_like_it, suggested_for_event_type, estimated_cost_range, contact_info, website_or_social_link, location, resident_visibility, status, created_at, updated_at",
    )
    .eq("building_id", buildingId)
    .order("created_at", { ascending: false })
    .returns<EventSuggestionRow[]>()

  if (error) {
    throw new Error("Unable to load resident suggestions.")
  }

  const visibleSuggestions = (suggestions ?? []).filter(
    (suggestion) =>
      suggestion.resident_visibility === "visible_for_voting" || suggestion.submitted_by_resident_id === userId,
  )

  const suggestionIds = visibleSuggestions.map((suggestion) => suggestion.id)
  const residentIds = Array.from(new Set(visibleSuggestions.map((suggestion) => suggestion.submitted_by_resident_id)))

  const [{ data: supportRows, error: supportError }, { data: profiles, error: profileError }] =
    await Promise.all([
      suggestionIds.length > 0
        ? supabase
            .from("building_event_suggestion_supports")
            .select("id, suggestion_id, resident_id, support_type, optional_comment, created_at, updated_at")
            .in("suggestion_id", suggestionIds)
            .returns<SuggestionSupportRow[]>()
        : Promise.resolve({ data: [] as SuggestionSupportRow[], error: null }),
      residentIds.length > 0
        ? supabase.from("profiles").select("id, first_name").in("id", residentIds).returns<ProfileRow[]>()
        : Promise.resolve({ data: [] as ProfileRow[], error: null }),
    ])

  if (supportError || profileError) {
    throw new Error("Unable to load suggestion support signals.")
  }

  const supportsBySuggestionId = new Map<string, SuggestionSupportRow[]>()
  for (const support of supportRows ?? []) {
    const list = supportsBySuggestionId.get(support.suggestion_id) ?? []
    list.push(support)
    supportsBySuggestionId.set(support.suggestion_id, list)
  }

  const residentNames = new Map((profiles ?? []).map((profile) => [profile.id, profile.first_name?.trim() || null]))

  return {
    suggestions: visibleSuggestions.map((suggestion) => {
      const supportRowsForSuggestion = supportsBySuggestionId.get(suggestion.id) ?? []
      const viewerSupport =
        supportRowsForSuggestion.find((support) => support.resident_id === userId) ?? null

      return {
        id: suggestion.id,
        category: suggestion.category,
        title: suggestion.title,
        description: suggestion.description,
        whyResidentsWouldLikeIt: suggestion.why_residents_would_like_it,
        suggestedForEventType: suggestion.suggested_for_event_type,
        estimatedCostRange: suggestion.estimated_cost_range,
        websiteOrSocialLink: suggestion.website_or_social_link,
        location: suggestion.location,
        residentVisibility: suggestion.resident_visibility,
        status: suggestion.status,
        submittedByResidentFirstName: residentNames.get(suggestion.submitted_by_resident_id) ?? null,
        supportSummary: mapSupportSummary(supportRowsForSuggestion),
        viewerSupport: viewerSupport
          ? {
              supportType: viewerSupport.support_type,
              optionalComment: viewerSupport.optional_comment,
            }
          : null,
        canEdit:
          suggestion.submitted_by_resident_id === userId && suggestion.status === "submitted",
        createdAt: suggestion.created_at,
        updatedAt: suggestion.updated_at,
      }
    }),
  }
}

export async function createResidentEventSuggestion({
  userId,
  buildingId,
  input,
}: {
  userId: string
  buildingId: string
  input: CreateResidentSuggestionInput
}) {
  const supabase = getSupabaseAdmin()

  if (!allowedSuggestionCategories.has(input.category)) {
    throw new Error("Choose a valid suggestion category.")
  }

  const title = clampText(input.title, 160)
  if (!title) {
    throw new Error("Suggestion title is required.")
  }

  const residentVisibility = input.residentVisibility ?? "private_to_management"
  if (!allowedSuggestionVisibilities.has(residentVisibility)) {
    throw new Error("Choose a valid resident visibility setting.")
  }

  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from("building_event_suggestions")
    .insert({
      building_id: buildingId,
      submitted_by_resident_id: userId,
      category: input.category,
      title,
      description: clampText(input.description ?? null, 2000),
      why_residents_would_like_it: clampText(input.whyResidentsWouldLikeIt ?? null, 1200),
      suggested_for_event_type: clampText(input.suggestedForEventType ?? null, 120),
      estimated_cost_range: clampText(input.estimatedCostRange ?? null, 120),
      contact_info: clampText(input.contactInfo ?? null, 280),
      website_or_social_link: clampText(input.websiteOrSocialLink ?? null, 500),
      location: clampText(input.location ?? null, 200),
      resident_visibility: residentVisibility,
      status: "submitted",
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select(
      "id, building_id, submitted_by_resident_id, category, title, description, why_residents_would_like_it, suggested_for_event_type, estimated_cost_range, contact_info, website_or_social_link, location, resident_visibility, status, created_at, updated_at",
    )
    .maybeSingle<EventSuggestionRow>()

  if (error || !data) {
    throw new Error("Unable to submit the resident suggestion.")
  }

  return data
}

export async function updateResidentEventSuggestion({
  userId,
  buildingId,
  suggestionId,
  input,
}: {
  userId: string
  buildingId: string
  suggestionId: string
  input: UpdateResidentSuggestionInput
}) {
  const supabase = getSupabaseAdmin()
  const { data: existing, error: loadError } = await supabase
    .from("building_event_suggestions")
    .select("submitted_by_resident_id, status")
    .eq("id", suggestionId)
    .eq("building_id", buildingId)
    .maybeSingle<{ submitted_by_resident_id: string; status: SuggestionStatus }>()

  if (loadError || !existing) {
    throw new Error("Suggestion not found.")
  }

  if (existing.submitted_by_resident_id !== userId || existing.status !== "submitted") {
    throw new Error("Only your own submitted suggestions can be edited.")
  }

  if (!allowedSuggestionCategories.has(input.category)) {
    throw new Error("Choose a valid suggestion category.")
  }

  const title = clampText(input.title, 160)
  if (!title) {
    throw new Error("Suggestion title is required.")
  }

  const residentVisibility = input.residentVisibility ?? "private_to_management"
  if (!allowedSuggestionVisibilities.has(residentVisibility)) {
    throw new Error("Choose a valid resident visibility setting.")
  }

  const { data, error } = await supabase
    .from("building_event_suggestions")
    .update({
      category: input.category,
      title,
      description: clampText(input.description ?? null, 2000),
      why_residents_would_like_it: clampText(input.whyResidentsWouldLikeIt ?? null, 1200),
      suggested_for_event_type: clampText(input.suggestedForEventType ?? null, 120),
      estimated_cost_range: clampText(input.estimatedCostRange ?? null, 120),
      contact_info: clampText(input.contactInfo ?? null, 280),
      website_or_social_link: clampText(input.websiteOrSocialLink ?? null, 500),
      location: clampText(input.location ?? null, 200),
      resident_visibility: residentVisibility,
      updated_at: new Date().toISOString(),
    })
    .eq("id", suggestionId)
    .eq("building_id", buildingId)
    .select(
      "id, building_id, submitted_by_resident_id, category, title, description, why_residents_would_like_it, suggested_for_event_type, estimated_cost_range, contact_info, website_or_social_link, location, resident_visibility, status, created_at, updated_at",
    )
    .maybeSingle<EventSuggestionRow>()

  if (error || !data) {
    throw new Error("Unable to update the resident suggestion.")
  }

  return data
}

export async function deleteResidentEventSuggestion({
  userId,
  buildingId,
  suggestionId,
}: {
  userId: string
  buildingId: string
  suggestionId: string
}) {
  const supabase = getSupabaseAdmin()
  const { data: existing, error: loadError } = await supabase
    .from("building_event_suggestions")
    .select("submitted_by_resident_id, status")
    .eq("id", suggestionId)
    .eq("building_id", buildingId)
    .maybeSingle<{ submitted_by_resident_id: string; status: SuggestionStatus }>()

  if (loadError || !existing) {
    throw new Error("Suggestion not found.")
  }

  if (existing.submitted_by_resident_id !== userId || existing.status !== "submitted") {
    throw new Error("Only your own submitted suggestions can be deleted.")
  }

  const { error } = await supabase
    .from("building_event_suggestions")
    .delete()
    .eq("id", suggestionId)
    .eq("building_id", buildingId)

  if (error) {
    throw new Error("Unable to delete the resident suggestion.")
  }

  return { id: suggestionId, deleted: true }
}

export async function upsertResidentSuggestionSupport({
  userId,
  buildingId,
  suggestionId,
  supportType,
  optionalComment,
}: {
  userId: string
  buildingId: string
  suggestionId: string
  supportType: SuggestionSupportType
  optionalComment?: string | null
}) {
  const supabase = getSupabaseAdmin()

  if (!allowedSuggestionSupportTypes.has(supportType)) {
    throw new Error("Choose a valid support signal.")
  }

  const { data: suggestion, error: loadError } = await supabase
    .from("building_event_suggestions")
    .select("id, resident_visibility, status")
    .eq("id", suggestionId)
    .eq("building_id", buildingId)
    .maybeSingle<{ id: string; resident_visibility: SuggestionVisibility; status: SuggestionStatus }>()

  if (loadError || !suggestion) {
    throw new Error("Suggestion not found.")
  }

  if (suggestion.resident_visibility !== "visible_for_voting") {
    throw new Error("This suggestion is currently private to the building team.")
  }

  if (suggestion.status === "rejected" || suggestion.status === "used_for_event") {
    throw new Error("This suggestion is no longer collecting resident support.")
  }

  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from("building_event_suggestion_supports")
    .upsert(
      {
        suggestion_id: suggestionId,
        resident_id: userId,
        support_type: supportType,
        optional_comment: clampText(optionalComment ?? null, 600),
        updated_at: nowIso,
      },
      {
        onConflict: "suggestion_id,resident_id",
      },
    )
    .select("id, suggestion_id, resident_id, support_type, optional_comment, created_at, updated_at")
    .maybeSingle<SuggestionSupportRow>()

  if (error || !data) {
    throw new Error("Unable to save your support signal.")
  }

  return data
}
