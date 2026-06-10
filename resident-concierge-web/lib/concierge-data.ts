type ChoiceOption<T extends string> = {
  id: T
  label: string
  note?: string
}

export type MatchingGoalId =
  | "friendships"
  | "activity_partners"
  | "community_involvement"
  | "professional_networking"

export type InterestId =
  | "coffee"
  | "food"
  | "travel"
  | "books"
  | "wellness"
  | "art"
  | "design"
  | "film"
  | "music"
  | "technology"
  | "entrepreneurship"
  | "fitness"
  | "running"
  | "hiking"
  | "tennis"
  | "walking"
  | "yoga"
  | "coworking"
  | "volunteering"
  | "dogs"

export type ConnectionStyleId =
  | "one_on_one"
  | "small_group"
  | "event_based"
  | "flexible"

export type AvailabilitySummaryId =
  | "weekday_mornings"
  | "weekday_lunch"
  | "weekday_evenings"
  | "weekend_mornings"
  | "weekend_afternoons"
  | "weekend_evenings"
  | "flexible"

export type WeekdayId =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday"

export type TimeBlockId =
  | "morning"
  | "lunch"
  | "afternoon"
  | "evening"
  | "late_evening"

export type AmenityId =
  | "resident_lounge"
  | "rooftop"
  | "coworking_space"
  | "pool_deck"
  | "fitness_center"

export type AvailabilityGrid = Record<WeekdayId, TimeBlockId[]>

export type Resident = {
  id: string
  name: string
  unit: string
  photo: string
  tagline: string
  goal: string
  interests: string[]
  shared: number
  matchScore?: number
}

export const residents: Resident[] = [
  {
    id: "elena",
    name: "Elena Marchetti",
    unit: "Residence 18B",
    photo: "/residents/elena.png",
    tagline: "Architect, early riser, always chasing good light.",
    goal: "Friendships",
    interests: ["Art", "Wellness", "Travel", "Books"],
    shared: 4,
  },
  {
    id: "marcus",
    name: "Marcus Bell",
    unit: "Residence 12A",
    photo: "/residents/marcus.png",
    tagline: "Founder by day, runner by morning, always up for a strong coffee.",
    goal: "Activity partners",
    interests: ["Running", "Technology", "Coffee", "Food"],
    shared: 3,
  },
  {
    id: "sophie",
    name: "Sophie Laurent",
    unit: "Residence 21C",
    photo: "/residents/sophie.png",
    tagline: "Curator who collects quiet mornings and rare books.",
    goal: "Friendships",
    interests: ["Books", "Art", "Wellness", "Walking"],
    shared: 3,
  },
  {
    id: "james",
    name: "James Okafor",
    unit: "Residence 9D",
    photo: "/residents/james.png",
    tagline: "Long walks, good dinners, and a soft spot for rooftop conversation.",
    goal: "Community involvement",
    interests: ["Food", "Travel", "Music", "Walking"],
    shared: 2,
  },
  {
    id: "priya",
    name: "Priya Anand",
    unit: "Residence 15F",
    photo: "/residents/priya.png",
    tagline: "Product lead, hot yoga devotee, and lobby-lounge regular.",
    goal: "Friendships",
    interests: ["Technology", "Wellness", "Food", "Yoga"],
    shared: 4,
  },
  {
    id: "daniel",
    name: "Daniel Cho",
    unit: "Residence 7B",
    photo: "/residents/daniel.png",
    tagline: "Composer who runs the river loop at dawn.",
    goal: "Activity partners",
    interests: ["Music", "Running", "Hiking", "Books"],
    shared: 3,
  },
]

export type ConciergeEvent = {
  id: string
  title: string
  host: "Building" | "Resident"
  date: string
  time: string
  location: string
  image: string
  attendees: number
  description: string
}

export const events: ConciergeEvent[] = [
  {
    id: "wine",
    title: "Rooftop Wine Evening",
    host: "Building",
    date: "Thursday, June 12",
    time: "7:00 PM",
    location: "The Rooftop",
    image: "/events/wine.png",
    attendees: 14,
    description: "An intimate evening of conversation and natural wines for residents.",
  },
  {
    id: "brunch",
    title: "Sunday Residents' Brunch",
    host: "Resident",
    date: "Sunday, June 15",
    time: "11:00 AM",
    location: "Resident Lounge",
    image: "/events/brunch.png",
    attendees: 9,
    description: "A slow Sunday gathering with pastries, coffee, and good company.",
  },
  {
    id: "wellness",
    title: "Morning Wellness Workshop",
    host: "Building",
    date: "Saturday, June 21",
    time: "9:00 AM",
    location: "Fitness Studio",
    image: "/events/wellness.png",
    attendees: 11,
    description: "Breathwork and mobility with a visiting practitioner.",
  },
]

export type EventPoll = {
  id: string
  title: string
  image: string
  votes: number
  percent: number
}

export const eventPolls: EventPoll[] = [
  { id: "wine", title: "Rooftop Wine Night", image: "/events/wine.png", votes: 42, percent: 84 },
  { id: "running", title: "Sunrise Running Club", image: "/events/running.png", votes: 31, percent: 62 },
  { id: "brunch", title: "Women's Brunch", image: "/events/brunch.png", votes: 27, percent: 54 },
  { id: "books", title: "Quarterly Book Club", image: "/events/books.png", votes: 23, percent: 46 },
  { id: "wellness", title: "Wellness Workshop", image: "/events/wellness.png", votes: 19, percent: 38 },
]

const allIntentOptions: ChoiceOption<MatchingGoalId>[] = [
  {
    id: "friendships",
    label: "Friendships",
    note: "Thoughtful introductions to neighbors you would genuinely enjoy knowing.",
  },
  {
    id: "activity_partners",
    label: "Activity partners",
    note: "Find people for coffee walks, workouts, hobbies, or recurring rituals.",
  },
  {
    id: "community_involvement",
    label: "Community involvement",
    note: "Feel more connected to the life of the building and its gatherings.",
  },
  {
    id: "professional_networking",
    label: "Professional networking",
    note: "Optional future networking around work, ideas, and mentorship.",
  },
]

export const intents = allIntentOptions.filter((option) => option.id !== "professional_networking")

export const interestOptions: ChoiceOption<InterestId>[] = [
  { id: "coffee", label: "Coffee" },
  { id: "food", label: "Food" },
  { id: "travel", label: "Travel" },
  { id: "books", label: "Books" },
  { id: "wellness", label: "Wellness" },
  { id: "art", label: "Art" },
  { id: "design", label: "Design" },
  { id: "film", label: "Film" },
  { id: "music", label: "Music" },
  { id: "technology", label: "Technology" },
  { id: "entrepreneurship", label: "Entrepreneurship" },
  { id: "fitness", label: "Fitness" },
  { id: "running", label: "Running" },
  { id: "hiking", label: "Hiking" },
  { id: "tennis", label: "Tennis" },
  { id: "walking", label: "Walking" },
  { id: "yoga", label: "Yoga" },
  { id: "coworking", label: "Coworking" },
  { id: "volunteering", label: "Volunteering" },
  { id: "dogs", label: "Dogs" },
]

export const connectionStyles: ChoiceOption<ConnectionStyleId>[] = [
  {
    id: "one_on_one",
    label: "One-on-one",
    note: "Quiet, intentional introductions with one resident at a time.",
  },
  {
    id: "small_group",
    label: "Small group",
    note: "A few well-matched neighbors at a time.",
  },
  {
    id: "event_based",
    label: "Event-based",
    note: "Meet through building gatherings and shared programming.",
  },
  {
    id: "flexible",
    label: "Flexible",
    note: "Open to whichever format feels like the best fit.",
  },
]

export const availabilitySummaryOptions: ChoiceOption<AvailabilitySummaryId>[] = [
  { id: "weekday_mornings", label: "Weekday mornings" },
  { id: "weekday_lunch", label: "Weekday lunch" },
  { id: "weekday_evenings", label: "Weekday evenings" },
  { id: "weekend_mornings", label: "Weekend mornings" },
  { id: "weekend_afternoons", label: "Weekend afternoons" },
  { id: "weekend_evenings", label: "Weekend evenings" },
  { id: "flexible", label: "Flexible" },
]

export const availabilityGridDays: ChoiceOption<WeekdayId>[] = [
  { id: "monday", label: "Monday" },
  { id: "tuesday", label: "Tuesday" },
  { id: "wednesday", label: "Wednesday" },
  { id: "thursday", label: "Thursday" },
  { id: "friday", label: "Friday" },
  { id: "saturday", label: "Saturday" },
  { id: "sunday", label: "Sunday" },
]

export const availabilityTimeBlocks: ChoiceOption<TimeBlockId>[] = [
  { id: "morning", label: "Morning" },
  { id: "lunch", label: "Lunch" },
  { id: "afternoon", label: "Afternoon" },
  { id: "evening", label: "Evening" },
  { id: "late_evening", label: "Late evening" },
]

export const meetupTypes = [
  { id: "coffee", label: "Coffee chat", note: "A relaxed first conversation." },
  { id: "rooftop", label: "Rooftop conversation", note: "Golden-hour conversation with a view." },
  { id: "coworking", label: "Coworking session", note: "Quiet, productive company." },
  { id: "wellness", label: "Wellness meetup", note: "An active, low-pressure first meetup." },
]

export const amenities: Array<{
  id: AmenityId
  label: string
  image: string
  note: string
}> = [
  {
    id: "resident_lounge",
    label: "Resident Lounge",
    image: "/spaces/lounge.png",
    note: "Warm, quiet, and easy for a first introduction.",
  },
  {
    id: "rooftop",
    label: "Rooftop Terrace",
    image: "/spaces/rooftop.png",
    note: "Open-air conversation with skyline views.",
  },
  {
    id: "coworking_space",
    label: "Coworking Space",
    image: "/spaces/coworking.png",
    note: "Productive, calm, and naturally conversational.",
  },
  {
    id: "pool_deck",
    label: "Pool Deck",
    image: "/spaces/pool.png",
    note: "Best for casual daytime meetups.",
  },
  {
    id: "fitness_center",
    label: "Fitness Studio",
    image: "/spaces/fitness.png",
    note: "A strong fit for active or wellness-oriented residents.",
  },
]

export const meetupTimes = [
  "Wednesday evening",
  "Thursday evening",
  "Saturday morning",
  "Sunday afternoon",
]

export const interests = interestOptions.map((option) => option.label)

const intentLabelLookup = new Map(allIntentOptions.map((option) => [option.id, option.label]))
const interestLabelLookup = new Map(interestOptions.map((option) => [option.id, option.label]))
const connectionStyleLabelLookup = new Map(
  connectionStyles.map((option) => [option.id, option.label]),
)
const availabilitySummaryLabelLookup = new Map(
  availabilitySummaryOptions.map((option) => [option.id, option.label]),
)
const amenityLabelLookup = new Map(amenities.map((option) => [option.id, option.label]))

export function formatIntentLabel(value: string) {
  return intentLabelLookup.get(value as MatchingGoalId) ?? value
}

export function formatInterestLabel(value: string) {
  return interestLabelLookup.get(value as InterestId) ?? value
}

export function formatConnectionStyleLabel(value: string) {
  return connectionStyleLabelLookup.get(value as ConnectionStyleId) ?? value
}

export function formatAvailabilitySummaryLabel(value: string) {
  return availabilitySummaryLabelLookup.get(value as AvailabilitySummaryId) ?? value
}

export function formatAmenityLabel(value: string) {
  return amenityLabelLookup.get(value as AmenityId) ?? value
}

export function createEmptyAvailabilityGrid(): AvailabilityGrid {
  return {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  }
}

export function normalizeAvailabilityGrid(grid: unknown): AvailabilityGrid {
  const normalized = createEmptyAvailabilityGrid()

  if (!grid || typeof grid !== "object" || Array.isArray(grid)) {
    return normalized
  }

  const rawGrid = grid as Record<string, unknown>

  for (const day of availabilityGridDays) {
    const values = Array.isArray(rawGrid[day.id]) ? rawGrid[day.id] : []
    normalized[day.id] = Array.from(
      new Set(
        values
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter((value): value is TimeBlockId =>
            availabilityTimeBlocks.some((block) => block.id === value),
          ),
      ),
    ) as TimeBlockId[]
  }

  return normalized
}

export function hasAvailabilitySelection(grid: AvailabilityGrid) {
  return Object.values(grid).some((slots) => slots.length > 0)
}

export function buildAvailabilitySummaryFromGrid(grid: AvailabilityGrid) {
  const summary = new Set<AvailabilitySummaryId>()

  for (const [day, slots] of Object.entries(grid) as Array<[WeekdayId, TimeBlockId[]]>) {
    const isWeekend = day === "saturday" || day === "sunday"
    for (const slot of slots) {
      if (slot === "morning") {
        summary.add(isWeekend ? "weekend_mornings" : "weekday_mornings")
      } else if (slot === "lunch") {
        summary.add(isWeekend ? "weekend_afternoons" : "weekday_lunch")
      } else if (slot === "afternoon") {
        summary.add(isWeekend ? "weekend_afternoons" : "weekday_evenings")
      } else if (slot === "evening" || slot === "late_evening") {
        summary.add(isWeekend ? "weekend_evenings" : "weekday_evenings")
      }
    }
  }

  return availabilitySummaryOptions
    .map((option) => option.id)
    .filter((option): option is AvailabilitySummaryId => summary.has(option))
}
