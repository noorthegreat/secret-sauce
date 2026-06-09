import type { Resident } from "@/lib/concierge-data"
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
    case "requested":
      return 2
    case "accepted":
      return 3
    case "suggested":
      return 4
    case "paused":
      return 5
    case "declined":
      return 6
  }
}

export function canScheduleIntroduction(card: ResidentIntroductionCard) {
  return card.status === "mutual" || card.status === "delivered"
}

export function buildResidentIntroductionCards(
  residents: Resident[],
  introductions: IntroductionPreview[],
) {
  const cards: ResidentIntroductionCard[] = residents.map((resident) => {
    const introduction = introductions.find((entry) => entry.resident.userId === resident.id)

    if (!introduction) {
      return {
        resident,
        introductionId: null,
        status: "suggested",
        source: "resident_preview",
        requestedByCurrentResident: false,
        currentResidentDecision: null,
        otherResidentDecision: null,
        mutualAt: null,
        deliveredAt: null,
        compatibilitySummary:
          resident.shared > 0
            ? `You share ${resident.shared} interest${resident.shared === 1 ? "" : "s"} in common.`
            : resident.tagline,
      }
    }

    return {
      resident: {
        ...resident,
        name: resident.name || introduction.resident.firstName,
        photo: resident.photo || introduction.resident.photoUrl || "/placeholder.svg",
        tagline:
          introduction.resident.compatibilitySummary?.trim() ||
          resident.tagline,
        interests: introduction.resident.sharedInterests.length
          ? introduction.resident.sharedInterests
          : resident.interests,
        goal: introduction.resident.sharedGoals[0] || resident.goal,
        shared: introduction.resident.sharedInterests.length || resident.shared,
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

    return right.resident.shared - left.resident.shared
  })
}

export function countVisibleIntroductions(cards: ResidentIntroductionCard[]) {
  return cards.filter((card) => card.status !== "declined" && card.status !== "paused").length
}

