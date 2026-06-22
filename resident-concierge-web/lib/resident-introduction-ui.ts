import { formatIntentLabel, formatInterestLabel, type Resident } from "@/lib/concierge-data"
import type {
  IntroductionDecision,
  IntroductionPreview,
  IntroductionStatus,
} from "@/lib/introduction-types"

export type ResidentIntroductionCard = {
  resident: Resident
  introductionId: string | null
  status: IntroductionStatus
  source: string
  requestedByCurrentResident: boolean
  currentResidentDecision: IntroductionDecision
  otherResidentDecision: IntroductionDecision
  mutualAt: string | null
  deliveredAt: string | null
  compatibilitySummary: string | null
  managerCompatibilitySummary: string | null
  sharedConnectionStyles: string[]
  sharedAvailability: string[]
  meetupRecommendation: {
    title: string
    amenityLabel: string
    timingLabel: string | null
    reason: string
  } | null
}

function isPositiveDecision(decision: IntroductionDecision) {
  return decision === "accepted" || decision === "requested"
}

function statusPriority(status: IntroductionStatus) {
  switch (status) {
    case "mutual":
      return 0
    case "delivered":
      return 1
    case "scheduled":
      return 2
    case "completed":
      return 3
    case "requested":
      return 4
    case "accepted":
      return 5
    case "suggested":
      return 6
    case "paused":
      return 7
    case "declined":
      return 8
  }
}

export function canScheduleIntroduction(card: ResidentIntroductionCard) {
  return card.status === "mutual" || card.status === "delivered"
}

export function buildResidentIntroductionCards(
  residents: Resident[],
  introductions: IntroductionPreview[],
) {
  const residentById = new Map(residents.map((resident) => [resident.id, resident]))
  const residentIds = new Set(residents.map((resident) => resident.id))

  for (const introduction of introductions) {
    residentIds.add(introduction.resident.userId)
  }

  const cards: ResidentIntroductionCard[] = Array.from(residentIds).map((residentId) => {
    const resident = residentById.get(residentId)
    const introduction = introductions.find((entry) => entry.resident.userId === residentId)

    if (!resident && !introduction) {
      throw new Error("Unable to build the introduction card.")
    }

    if (!introduction) {
      return {
        resident: resident!,
        introductionId: null,
        status: "suggested",
        source: "resident_preview",
        requestedByCurrentResident: false,
        currentResidentDecision: null,
        otherResidentDecision: null,
        mutualAt: null,
        deliveredAt: null,
        compatibilitySummary: resident.tagline,
        managerCompatibilitySummary: null,
        sharedConnectionStyles: [],
        sharedAvailability: [],
        meetupRecommendation: null,
      }
    }

    return {
      resident: {
        ...(resident ?? {
          id: introduction.resident.userId,
          name: introduction.resident.firstName,
          unit: introduction.resident.recognitionCue ?? "Fifth Circle resident",
          photo: introduction.resident.photoUrl || "/placeholder.svg",
          tagline: introduction.resident.bio || "A private building introduction shaped by shared fit.",
          goal: introduction.resident.sharedGoals[0]
            ? formatIntentLabel(introduction.resident.sharedGoals[0])
            : "Community involvement",
          interests: introduction.resident.sharedInterests.length
            ? introduction.resident.sharedInterests.map(formatInterestLabel)
            : [],
          shared: introduction.resident.sharedInterests.length,
        }),
        name: resident?.name || introduction.resident.firstName,
        photo: resident?.photo || introduction.resident.photoUrl || "/placeholder.svg",
        tagline:
          introduction.resident.compatibilitySummary?.trim() ||
          resident?.tagline ||
          introduction.resident.bio ||
          "A private building introduction shaped by shared fit.",
        interests: introduction.resident.sharedInterests.length
          ? introduction.resident.sharedInterests.map(formatInterestLabel)
          : resident?.interests ?? [],
        goal: introduction.resident.sharedGoals[0]
          ? formatIntentLabel(introduction.resident.sharedGoals[0])
          : resident?.goal ?? "Community involvement",
        shared: introduction.resident.sharedInterests.length || resident?.shared || 0,
        occupation: resident?.occupation ?? introduction.resident.occupation ?? null,
        recognitionCue: resident?.recognitionCue ?? introduction.resident.recognitionCue ?? null,
        socialEnergy: resident?.socialEnergy ?? introduction.resident.socialEnergy ?? null,
        planningStyle: resident?.planningStyle ?? introduction.resident.planningStyle ?? null,
        connectionPreference:
          resident?.connectionPreference ?? introduction.resident.connectionPreference ?? null,
        compatibilityDetails:
          resident?.compatibilityDetails ?? introduction.resident.compatibilityDetails ?? [],
      },
      introductionId: introduction.introductionId,
      status: introduction.status,
      source: introduction.source,
      requestedByCurrentResident: introduction.requestedByCurrentResident,
      currentResidentDecision: introduction.currentResidentDecision,
      otherResidentDecision: introduction.otherResidentDecision,
      mutualAt: introduction.mutualAt,
      deliveredAt: introduction.deliveredAt,
      compatibilitySummary: introduction.resident.compatibilitySummary,
      managerCompatibilitySummary: introduction.resident.managerCompatibilitySummary,
      sharedConnectionStyles: introduction.resident.sharedConnectionStyles,
      sharedAvailability: introduction.resident.sharedAvailability,
      meetupRecommendation: introduction.resident.meetupRecommendation,
    }
  })

  return cards.sort((left, right) => {
    const priorityDifference = statusPriority(left.status) - statusPriority(right.status)
    if (priorityDifference !== 0) {
      return priorityDifference
    }

    const leftNeedsAction =
      !isPositiveDecision(left.currentResidentDecision) && isPositiveDecision(left.otherResidentDecision)
    const rightNeedsAction =
      !isPositiveDecision(right.currentResidentDecision) && isPositiveDecision(right.otherResidentDecision)

    if (leftNeedsAction !== rightNeedsAction) {
      return leftNeedsAction ? -1 : 1
    }

    const scoreDifference = (right.resident.matchScore ?? 0) - (left.resident.matchScore ?? 0)
    if (scoreDifference !== 0) {
      return scoreDifference
    }

    return right.resident.shared - left.resident.shared
  })
}

export function countVisibleIntroductions(cards: ResidentIntroductionCard[]) {
  return cards.filter((card) => card.status !== "declined" && card.status !== "paused").length
}
