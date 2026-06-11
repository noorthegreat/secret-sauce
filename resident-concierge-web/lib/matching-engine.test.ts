import { describe, expect, it } from "vitest"

import { compareMatchInsightsByStrength, compareResidents } from "@/lib/matching-engine"
import { createEmptyAvailabilityGrid } from "@/lib/concierge-data"

describe("compareResidents", () => {
  it("scores higher when residents share interests and goals", () => {
    const base = {
      interests: ["coffee", "wellness"],
      lookingFor: ["friendships"],
      connectionStyles: ["one_on_one"],
      availability: ["weekday_evenings"],
      availabilityGrid: createEmptyAvailabilityGrid(),
      conciergeNote: null,
    }

    const aligned = compareResidents(base, {
      ...base,
      interests: ["coffee", "wellness", "books"],
      lookingFor: ["friendships", "activity_partners"],
    })

    const misaligned = compareResidents(base, {
      interests: ["technology"],
      lookingFor: ["professional_networking"],
      connectionStyles: ["event_based"],
      availability: ["weekday_mornings"],
      availabilityGrid: createEmptyAvailabilityGrid(),
      conciergeNote: null,
    })

    expect(aligned.score).toBeGreaterThan(misaligned.score)
    expect(aligned.sharedInterests).toContain("coffee")
    expect(aligned.compatibilitySummary.length).toBeGreaterThan(0)
    expect(aligned.meetupRecommendation.amenityLabel.length).toBeGreaterThan(0)
  })

  it("rewards overlapping availability grids", () => {
    const leftGrid = createEmptyAvailabilityGrid()
    leftGrid.thursday = ["evening"]

    const rightGrid = createEmptyAvailabilityGrid()
    rightGrid.thursday = ["evening"]

    const withOverlap = compareResidents(
      {
        interests: ["coffee"],
        lookingFor: ["friendships"],
        connectionStyles: ["one_on_one"],
        availability: [],
        availabilityGrid: leftGrid,
        conciergeNote: null,
      },
      {
        interests: ["coffee"],
        lookingFor: ["friendships"],
        connectionStyles: ["one_on_one"],
        availability: [],
        availabilityGrid: rightGrid,
        conciergeNote: null,
      },
    )

    const withoutOverlap = compareResidents(
      {
        interests: ["coffee"],
        lookingFor: ["friendships"],
        connectionStyles: ["one_on_one"],
        availability: [],
        availabilityGrid: leftGrid,
        conciergeNote: null,
      },
      {
        interests: ["coffee"],
        lookingFor: ["friendships"],
        connectionStyles: ["one_on_one"],
        availability: [],
        availabilityGrid: createEmptyAvailabilityGrid(),
        conciergeNote: null,
      },
    )

    expect(withOverlap.score).toBeGreaterThan(withoutOverlap.score)
    expect(withOverlap.overlapSlots.length).toBeGreaterThan(0)
  })
})

describe("compareMatchInsightsByStrength", () => {
  it("sorts by score before tie-breakers", () => {
    const stronger = compareResidents(
      {
        interests: ["coffee", "wellness", "books"],
        lookingFor: ["friendships"],
        connectionStyles: ["one_on_one"],
        availability: ["weekday_evenings"],
        availabilityGrid: createEmptyAvailabilityGrid(),
        conciergeNote: "love coffee walks",
      },
      {
        interests: ["coffee", "wellness", "books"],
        lookingFor: ["friendships"],
        connectionStyles: ["one_on_one"],
        availability: ["weekday_evenings"],
        availabilityGrid: createEmptyAvailabilityGrid(),
        conciergeNote: "also love coffee walks",
      },
    )

    const weaker = compareResidents(
      {
        interests: ["coffee"],
        lookingFor: ["friendships"],
        connectionStyles: ["flexible"],
        availability: ["flexible"],
        availabilityGrid: createEmptyAvailabilityGrid(),
        conciergeNote: null,
      },
      {
        interests: ["wellness"],
        lookingFor: ["activity_partners"],
        connectionStyles: ["event_based"],
        availability: ["weekend_mornings"],
        availabilityGrid: createEmptyAvailabilityGrid(),
        conciergeNote: null,
      },
    )

    expect(compareMatchInsightsByStrength(weaker, stronger)).toBeGreaterThan(0)
    expect(compareMatchInsightsByStrength(stronger, weaker)).toBeLessThan(0)
  })
})
