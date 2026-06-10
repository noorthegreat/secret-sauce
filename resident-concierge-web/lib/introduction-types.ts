export type IntroductionStatus =
  | "suggested"
  | "requested"
  | "accepted"
  | "mutual"
  | "delivered"
  | "declined"
  | "paused"

export type IntroductionType = "friendship" | "professional"

export type IntroductionDecision = "requested" | "accepted" | "declined" | "paused" | null

export type IntroductionPreview = {
  introductionId: string
  status: IntroductionStatus
  introType: IntroductionType
  source: string
  suggestedAt: string
  mutualAt: string | null
  deliveredAt: string | null
  requestedByCurrentResident: boolean
  currentResidentDecision: IntroductionDecision
  otherResidentDecision: IntroductionDecision
  resident: {
    userId: string
    firstName: string
    photoUrl: string | null
    bio: string | null
    sharedInterests: string[]
    sharedGoals: string[]
    sharedConnectionStyles: string[]
    sharedAvailability: string[]
    compatibilitySummary: string | null
    managerCompatibilitySummary: string | null
    meetupRecommendation: {
      title: string
      amenityLabel: string
      timingLabel: string | null
      reason: string
    } | null
  }
}

export type IntroductionListResult = {
  buildingId: string
  buildingName: string
  introductions: IntroductionPreview[]
}
