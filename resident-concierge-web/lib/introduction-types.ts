export type IntroductionStatus =
  | "suggested"
  | "requested"
  | "accepted"
  | "mutual"
  | "delivered"
  | "scheduled"
  | "completed"
  | "declined"
  | "paused"

export type IntroductionType = "friendship" | "professional"
export type IntroductionMatchFormat =
  | "one_on_one"
  | "small_group"
  | "activity_partner"
  | "professional_networking"

export type IntroductionDecision = "requested" | "accepted" | "declined" | "paused" | null

export type IntroductionPreview = {
  introductionId: string
  status: IntroductionStatus
  introType: IntroductionType
  matchFormat?: IntroductionMatchFormat
  source: string
  suggestedAt: string
  mutualAt: string | null
  deliveredAt: string | null
  scheduledAt?: string | null
  completedAt?: string | null
  sensitiveDetailsRevealedAt?: string | null
  requestedByCurrentResident: boolean
  currentResidentDecision: IntroductionDecision
  otherResidentDecision: IntroductionDecision
  resident: {
    userId: string
    firstName: string
    photoUrl: string | null
    bio: string | null
    occupation?: string | null
    recognitionCue?: string | null
    socialEnergy?: string | null
    planningStyle?: string | null
    connectionPreference?: string | null
    sharedInterests: string[]
    sharedGoals: string[]
    sharedConnectionStyles: string[]
    sharedAvailability: string[]
    compatibilityDetails?: string[]
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
