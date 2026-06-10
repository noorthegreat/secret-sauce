import {
  amenities,
  availabilityGridDays,
  availabilityTimeBlocks,
  formatAmenityLabel,
  formatAvailabilitySummaryLabel,
  formatConnectionStyleLabel,
  formatIntentLabel,
  formatInterestLabel,
  normalizeAvailabilityGrid,
  type AmenityId,
  type AvailabilityGrid,
  type AvailabilitySummaryId,
  type TimeBlockId,
  type WeekdayId,
} from "@/lib/concierge-data"

export type MatchCandidate = {
  interests: string[]
  lookingFor: string[]
  connectionStyles: string[]
  availability: string[]
  availabilityGrid: AvailabilityGrid | null
  conciergeNote: string | null
}

export type MatchOverlapSlot = {
  day: WeekdayId
  block: TimeBlockId
}

export type MeetupRecommendation = {
  title: string
  amenityId: AmenityId
  amenityLabel: string
  timingLabel: string | null
  reason: string
}

export type MatchInsights = {
  score: number
  scoreBreakdown: {
    interests: number
    goals: number
    styles: number
    availability: number
    noteHints: number
  }
  sharedInterests: string[]
  sharedGoals: string[]
  sharedConnectionStyles: string[]
  overlapSlots: MatchOverlapSlot[]
  overlapSummaries: AvailabilitySummaryId[]
  timingLabel: string | null
  compatibilitySummary: string
  managerCompatibilitySummary: string
  meetupRecommendation: MeetupRecommendation
}

const weekdayWeightByDay: Record<WeekdayId, number> = {
  monday: 1,
  tuesday: 1,
  wednesday: 1.05,
  thursday: 1.05,
  friday: 0.95,
  saturday: 1.2,
  sunday: 1.15,
}

const timeBlockWeight: Record<TimeBlockId, number> = {
  morning: 0.95,
  lunch: 0.85,
  afternoon: 0.9,
  evening: 1.25,
  late_evening: 0.8,
}

const availabilitySummaryLookup: Record<string, true> = {
  weekday_mornings: true,
  weekday_lunch: true,
  weekday_evenings: true,
  weekend_mornings: true,
  weekend_afternoons: true,
  weekend_evenings: true,
  flexible: true,
}

type RecommendationHint = "coffee" | "coworking" | "wellness" | "rooftop" | "gathering"

function uniqueValues(values: string[] | null | undefined) {
  return Array.from(
    new Set(
      (values ?? [])
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  )
}

function intersection(left: string[], right: string[]) {
  const rightSet = new Set(right)
  return left.filter((value) => rightSet.has(value))
}

function slotWeight(day: WeekdayId, block: TimeBlockId) {
  return weekdayWeightByDay[day] * timeBlockWeight[block]
}

function getOverlapSlots(
  leftGrid: AvailabilityGrid | null,
  rightGrid: AvailabilityGrid | null,
): MatchOverlapSlot[] {
  if (!leftGrid || !rightGrid) {
    return []
  }

  const overlaps: MatchOverlapSlot[] = []

  for (const day of availabilityGridDays) {
    const leftSlots = new Set(leftGrid[day.id] ?? [])
    for (const block of rightGrid[day.id] ?? []) {
      if (leftSlots.has(block)) {
        overlaps.push({ day: day.id, block })
      }
    }
  }

  return overlaps
}

function buildOverlapSummaries(slots: MatchOverlapSlot[]) {
  const summaries = new Set<AvailabilitySummaryId>()

  for (const slot of slots) {
    const isWeekend = slot.day === "saturday" || slot.day === "sunday"

    if (slot.block === "morning") {
      summaries.add(isWeekend ? "weekend_mornings" : "weekday_mornings")
    } else if (slot.block === "lunch") {
      summaries.add(isWeekend ? "weekend_afternoons" : "weekday_lunch")
    } else if (slot.block === "afternoon") {
      summaries.add(isWeekend ? "weekend_afternoons" : "weekday_evenings")
    } else if (slot.block === "evening" || slot.block === "late_evening") {
      summaries.add(isWeekend ? "weekend_evenings" : "weekday_evenings")
    }
  }

  return Array.from(summaries)
}

function scoreAvailability(
  overlapSlots: MatchOverlapSlot[],
  fallbackAvailability: string[],
  otherFallbackAvailability: string[],
) {
  if (overlapSlots.length > 0) {
    const weightedOverlap = overlapSlots.reduce(
      (total, slot) => total + slotWeight(slot.day, slot.block),
      0,
    )

    return Math.min(24, Math.round(weightedOverlap * 3.15))
  }

  const sharedFallbacks = intersection(fallbackAvailability, otherFallbackAvailability)
  if (sharedFallbacks.length === 0) {
    return 0
  }

  if (sharedFallbacks.includes("flexible")) {
    return 6
  }

  return 9
}

function getTopOverlapSlot(slots: MatchOverlapSlot[]) {
  return (
    slots
      .slice()
      .sort((left, right) => {
        const weightDifference =
          slotWeight(right.day, right.block) - slotWeight(left.day, left.block)

        if (weightDifference !== 0) {
          return weightDifference
        }

        return left.day.localeCompare(right.day)
      })[0] ?? null
  )
}

function formatDayLabel(day: WeekdayId) {
  return availabilityGridDays.find((value) => value.id === day)?.label ?? day
}

function formatTimeBlockLabel(block: TimeBlockId) {
  return availabilityTimeBlocks.find((value) => value.id === block)?.label ?? block
}

function buildTimingLabel(
  overlapSlots: MatchOverlapSlot[],
  overlapSummaries: AvailabilitySummaryId[],
) {
  const topSlot = getTopOverlapSlot(overlapSlots)

  if (topSlot) {
    return `${formatDayLabel(topSlot.day)} ${formatTimeBlockLabel(topSlot.block).toLowerCase()}`
  }

  return overlapSummaries[0] ? formatAvailabilitySummaryLabel(overlapSummaries[0]) : null
}

function firstMatchingAmenity(amenityIds: AmenityId[]) {
  for (const amenityId of amenityIds) {
    if (amenities.some((amenity) => amenity.id === amenityId)) {
      return amenityId
    }
  }

  return "resident_lounge"
}

function formatList(labels: string[]) {
  if (labels.length === 0) {
    return ""
  }

  if (labels.length === 1) {
    return labels[0]
  }

  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`
  }

  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`
}

function normalizeNoteText(note: string | null | undefined) {
  return (note ?? "").trim().toLowerCase()
}

function hasAnyNoteKeyword(noteText: string, keywords: string[]) {
  return keywords.some((keyword) => noteText.includes(keyword))
}

function detectRecommendationHint(
  sharedInterests: string[],
  sharedGoals: string[],
  sharedStyles: string[],
  currentNote: string | null,
  otherNote: string | null,
): RecommendationHint {
  const interestSet = new Set(sharedInterests)
  const goalSet = new Set(sharedGoals)
  const styleSet = new Set(sharedStyles)
  const combinedNotes = `${normalizeNoteText(currentNote)} ${normalizeNoteText(otherNote)}`.trim()

  if (
    interestSet.has("technology") ||
    interestSet.has("entrepreneurship") ||
    interestSet.has("coworking") ||
    hasAnyNoteKeyword(combinedNotes, ["cowork", "startup", "founder", "work session"])
  ) {
    return "coworking"
  }

  if (
    interestSet.has("fitness") ||
    interestSet.has("running") ||
    interestSet.has("walking") ||
    interestSet.has("yoga") ||
    interestSet.has("wellness") ||
    interestSet.has("hiking") ||
    hasAnyNoteKeyword(combinedNotes, ["walk", "run", "yoga", "wellness", "tennis"])
  ) {
    return "wellness"
  }

  if (
    goalSet.has("community_involvement") ||
    styleSet.has("event_based") ||
    styleSet.has("small_group") ||
    interestSet.has("food") ||
    interestSet.has("music") ||
    interestSet.has("travel") ||
    hasAnyNoteKeyword(combinedNotes, ["group", "happy hour", "neighbors", "gathering"])
  ) {
    return "gathering"
  }

  if (
    interestSet.has("coffee") ||
    interestSet.has("books") ||
    interestSet.has("art") ||
    interestSet.has("design") ||
    hasAnyNoteKeyword(combinedNotes, ["coffee", "book", "museum", "design", "quiet"])
  ) {
    return "coffee"
  }

  return "rooftop"
}

function buildMeetupRecommendation(
  sharedInterests: string[],
  sharedGoals: string[],
  sharedStyles: string[],
  timingLabel: string | null,
  currentNote: string | null,
  otherNote: string | null,
): MeetupRecommendation {
  const hint = detectRecommendationHint(
    sharedInterests,
    sharedGoals,
    sharedStyles,
    currentNote,
    otherNote,
  )

  if (hint === "coworking") {
    const amenityId = firstMatchingAmenity(["coworking_space", "resident_lounge"])
    return {
      title: "Coworking session",
      amenityId,
      amenityLabel: formatAmenityLabel(amenityId),
      timingLabel,
      reason: "Their overlap points to a thoughtful, productive introduction with room for conversation.",
    }
  }

  if (hint === "wellness") {
    const amenityId = firstMatchingAmenity(["fitness_center", "pool_deck", "rooftop"])
    return {
      title: "Wellness meetup",
      amenityId,
      amenityLabel: formatAmenityLabel(amenityId),
      timingLabel,
      reason: "Shared active interests make a low-pressure wellness-oriented meetup feel natural.",
    }
  }

  if (hint === "gathering") {
    const amenityId = firstMatchingAmenity(["rooftop", "resident_lounge"])
    return {
      title: "Building happy hour",
      amenityId,
      amenityLabel: formatAmenityLabel(amenityId),
      timingLabel,
      reason: "Their social style leans toward a more communal, building-led introduction.",
    }
  }

  if (hint === "coffee") {
    const amenityId = firstMatchingAmenity(["resident_lounge", "rooftop", "coworking_space"])
    return {
      title: "Coffee in the lounge",
      amenityId,
      amenityLabel: formatAmenityLabel(amenityId),
      timingLabel,
      reason: "Shared interests suggest a calm first conversation in an easy, in-building setting.",
    }
  }

  const amenityId = firstMatchingAmenity(["rooftop", "resident_lounge"])
  return {
    title: "Rooftop conversation",
    amenityId,
    amenityLabel: formatAmenityLabel(amenityId),
    timingLabel,
    reason: "A simple concierge-led introduction keeps the first meeting warm, private, and easy to accept.",
  }
}

function buildResidentSummary(
  sharedInterests: string[],
  sharedGoals: string[],
  sharedStyles: string[],
  overlapSummaries: AvailabilitySummaryId[],
) {
  const parts: string[] = []

  if (sharedGoals.length > 0 && sharedInterests.length > 0) {
    parts.push(
      `You're both here for ${formatIntentLabel(sharedGoals[0]).toLowerCase()} and share ${formatList(
        sharedInterests.slice(0, 3).map(formatInterestLabel),
      ).toLowerCase()}.`,
    )
  } else if (sharedGoals.length > 0) {
    parts.push(`You're both here for ${formatIntentLabel(sharedGoals[0]).toLowerCase()}.`)
  } else if (sharedInterests.length > 0) {
    parts.push(
      `You both gravitate toward ${formatList(
        sharedInterests.slice(0, 3).map(formatInterestLabel),
      ).toLowerCase()}.`,
    )
  }

  if (sharedStyles.length > 0) {
    parts.push(
      `${formatConnectionStyleLabel(sharedStyles[0])} feels like the best format for a first introduction.`,
    )
  }

  if (overlapSummaries.length > 0) {
    parts.push(
      `Your schedules line up around ${formatAvailabilitySummaryLabel(
        overlapSummaries[0],
      ).toLowerCase()}.`,
    )
  }

  if (parts.length === 0) {
    return "A private building introduction shaped around shared community fit."
  }

  return parts.slice(0, 3).join(" ")
}

function buildManagerSummary(
  sharedInterests: string[],
  sharedGoals: string[],
  sharedStyles: string[],
  overlapSummaries: AvailabilitySummaryId[],
  timingLabel: string | null,
) {
  const descriptors: string[] = []

  if (sharedGoals.length > 0) {
    descriptors.push(`goal: ${formatIntentLabel(sharedGoals[0]).toLowerCase()}`)
  }

  if (sharedInterests.length > 0) {
    descriptors.push(
      `interests: ${formatList(sharedInterests.slice(0, 3).map(formatInterestLabel)).toLowerCase()}`,
    )
  }

  if (sharedStyles.length > 0) {
    descriptors.push(`format: ${formatConnectionStyleLabel(sharedStyles[0]).toLowerCase()}`)
  }

  if (timingLabel) {
    descriptors.push(`timing: ${timingLabel.toLowerCase()}`)
  } else if (overlapSummaries.length > 0) {
    descriptors.push(
      `timing: ${formatAvailabilitySummaryLabel(overlapSummaries[0]).toLowerCase()}`,
    )
  }

  return descriptors.length > 0
    ? descriptors.join(" · ")
    : "Private building introduction with general community fit."
}

function scoreInterestOverlap(sharedInterests: string[]) {
  if (sharedInterests.length >= 4) {
    return 28
  }

  if (sharedInterests.length === 3) {
    return 22
  }

  if (sharedInterests.length === 2) {
    return 15
  }

  if (sharedInterests.length === 1) {
    return 8
  }

  return 0
}

function scoreGoalOverlap(sharedGoals: string[]) {
  if (sharedGoals.length >= 2) {
    return 24
  }

  if (sharedGoals.length === 1) {
    return 18
  }

  return 0
}

function scoreStyleOverlap(sharedConnectionStyles: string[]) {
  if (sharedConnectionStyles.length >= 2) {
    return 16
  }

  if (sharedConnectionStyles.length === 1) {
    return sharedConnectionStyles[0] === "one_on_one" ? 12 : 10
  }

  return 0
}

function scoreNoteHints(currentNote: string | null, otherNote: string | null) {
  const current = normalizeNoteText(currentNote)
  const other = normalizeNoteText(otherNote)

  if (!current || !other) {
    return 0
  }

  const sharedKeywords = [
    "coffee",
    "walk",
    "walking",
    "running",
    "yoga",
    "books",
    "startup",
    "design",
    "food",
    "travel",
    "neighbors",
    "community",
  ].filter((keyword) => current.includes(keyword) && other.includes(keyword))

  return sharedKeywords.length > 0 ? Math.min(6, sharedKeywords.length * 2) : 0
}

export function compareMatchInsightsByStrength(left: MatchInsights, right: MatchInsights) {
  if (right.score !== left.score) {
    return right.score - left.score
  }

  if (right.overlapSlots.length !== left.overlapSlots.length) {
    return right.overlapSlots.length - left.overlapSlots.length
  }

  if (right.sharedGoals.length !== left.sharedGoals.length) {
    return right.sharedGoals.length - left.sharedGoals.length
  }

  if (right.sharedInterests.length !== left.sharedInterests.length) {
    return right.sharedInterests.length - left.sharedInterests.length
  }

  if (right.sharedConnectionStyles.length !== left.sharedConnectionStyles.length) {
    return right.sharedConnectionStyles.length - left.sharedConnectionStyles.length
  }

  if (Boolean(right.timingLabel) !== Boolean(left.timingLabel)) {
    return right.timingLabel ? 1 : -1
  }

  return 0
}

export function compareResidents(
  currentResident: MatchCandidate,
  otherResident: MatchCandidate,
): MatchInsights {
  const sharedInterests = intersection(
    uniqueValues(currentResident.interests),
    uniqueValues(otherResident.interests),
  ).slice(0, 4)
  const sharedGoals = intersection(
    uniqueValues(currentResident.lookingFor),
    uniqueValues(otherResident.lookingFor),
  ).slice(0, 3)
  const sharedConnectionStyles = intersection(
    uniqueValues(currentResident.connectionStyles),
    uniqueValues(otherResident.connectionStyles),
  ).slice(0, 3)

  const currentGrid = normalizeAvailabilityGrid(currentResident.availabilityGrid)
  const otherGrid = normalizeAvailabilityGrid(otherResident.availabilityGrid)
  const overlapSlots = getOverlapSlots(currentGrid, otherGrid)
  const overlapSummaries = buildOverlapSummaries(overlapSlots)
  const sharedFallbackAvailability = intersection(
    uniqueValues(currentResident.availability),
    uniqueValues(otherResident.availability),
  )
  const filteredFallbackAvailability = sharedFallbackAvailability.filter(
    (value): value is AvailabilitySummaryId => value in availabilitySummaryLookup,
  )
  const finalOverlapSummaries =
    overlapSummaries.length > 0 ? overlapSummaries : filteredFallbackAvailability
  const timingLabel = buildTimingLabel(overlapSlots, finalOverlapSummaries)

  const scoreBreakdown = {
    interests: scoreInterestOverlap(sharedInterests),
    goals: scoreGoalOverlap(sharedGoals),
    styles: scoreStyleOverlap(sharedConnectionStyles),
    availability: scoreAvailability(
      overlapSlots,
      uniqueValues(currentResident.availability),
      uniqueValues(otherResident.availability),
    ),
    noteHints: scoreNoteHints(currentResident.conciergeNote, otherResident.conciergeNote),
  }

  const score = Object.values(scoreBreakdown).reduce((total, value) => total + value, 0)

  const meetupRecommendation = buildMeetupRecommendation(
    sharedInterests,
    sharedGoals,
    sharedConnectionStyles,
    timingLabel,
    currentResident.conciergeNote,
    otherResident.conciergeNote,
  )

  return {
    score,
    scoreBreakdown,
    sharedInterests,
    sharedGoals,
    sharedConnectionStyles,
    overlapSlots,
    overlapSummaries: finalOverlapSummaries,
    timingLabel,
    compatibilitySummary: buildResidentSummary(
      sharedInterests,
      sharedGoals,
      sharedConnectionStyles,
      finalOverlapSummaries,
    ),
    managerCompatibilitySummary: buildManagerSummary(
      sharedInterests,
      sharedGoals,
      sharedConnectionStyles,
      finalOverlapSummaries,
      timingLabel,
    ),
    meetupRecommendation,
  }
}
