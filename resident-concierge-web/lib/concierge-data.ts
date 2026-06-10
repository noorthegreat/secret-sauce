export type Resident = {
  id: string
  name: string
  unit: string
  photo: string
  tagline: string
  goal: string
  interests: string[]
  shared: number
}

export const residents: Resident[] = [
  {
    id: "elena",
    name: "Elena Marchetti",
    unit: "Residence 18B",
    photo: "/residents/elena.png",
    tagline: "Architect, early riser, always chasing good light.",
    goal: "New Friends",
    interests: ["Art", "Wellness", "Travel", "Books"],
    shared: 4,
  },
  {
    id: "marcus",
    name: "Marcus Bell",
    unit: "Residence 12A",
    photo: "/residents/marcus.png",
    tagline: "Founder by day, marathoner by morning.",
    goal: "Professional Connections",
    interests: ["Entrepreneurship", "Running", "Technology", "Food"],
    shared: 3,
  },
  {
    id: "sophie",
    name: "Sophie Laurent",
    unit: "Residence 21C",
    photo: "/residents/sophie.png",
    tagline: "Curator who collects quiet mornings and rare books.",
    goal: "Activity Partners",
    interests: ["Books", "Art", "Wellness", "Hiking"],
    shared: 3,
  },
  {
    id: "james",
    name: "James Okafor",
    unit: "Residence 9D",
    photo: "/residents/james.png",
    tagline: "Wine, long walks, and even longer dinners.",
    goal: "Community Events",
    interests: ["Food", "Travel", "Music", "Dogs"],
    shared: 2,
  },
  {
    id: "priya",
    name: "Priya Anand",
    unit: "Residence 15F",
    photo: "/residents/priya.png",
    tagline: "Product lead, hot yoga devotee, café connoisseur.",
    goal: "Professional Connections",
    interests: ["Technology", "Wellness", "Food", "Entrepreneurship"],
    shared: 4,
  },
  {
    id: "daniel",
    name: "Daniel Cho",
    unit: "Residence 7B",
    photo: "/residents/daniel.png",
    tagline: "Composer who runs the river loop at dawn.",
    goal: "Activity Partners",
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
    description: "An intimate evening of natural wines curated by our resident sommelier.",
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
    description: "A slow Sunday gathering hosted by Sophie in 21C. Pastries provided.",
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
    description: "Breathwork and mobility with a visiting practitioner. Mats provided.",
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

export const interests = [
  "Fitness",
  "Travel",
  "Food",
  "Coffee",
  "Books",
  "Wellness",
  "Art",
  "Design",
  "Film",
  "Music",
  "Technology",
  "Hiking",
  "Running",
  "Tennis",
  "Entrepreneurship",
  "Dogs",
]

export const intents = [
  { id: "friendships", label: "Friendships", note: "Meet neighbors you would genuinely want to know." },
  { id: "activity", label: "Activity partners", note: "Find people for workouts, walks, racquet sports, or hobbies." },
  { id: "community", label: "Community involvement", note: "Be included in gatherings, rituals, and building life." },
  { id: "networking", label: "Professional networking", note: "Opt into thoughtful introductions around work and ideas." },
]

export const connectionStyles = [
  { id: "one-on-one", label: "One-on-one", note: "Quiet, thoughtful introductions." },
  { id: "small-group", label: "Small group", note: "A few well-matched neighbors at a time." },
  { id: "event-based", label: "Event-based", note: "Meet naturally through gatherings in the building." },
  { id: "flexible", label: "Flexible", note: "Open to whichever format feels like the best fit." },
]

export const meetupTypes = [
  { id: "coffee", label: "Coffee Chat", note: "A relaxed 30 minutes over coffee." },
  { id: "rooftop", label: "Rooftop Conversation", note: "Golden-hour conversation with a view." },
  { id: "coworking", label: "Coworking Session", note: "Quiet, productive company." },
  { id: "fitness", label: "Fitness Partner Meetup", note: "Train together, stay accountable." },
]

export const amenities = [
  { id: "lounge", label: "Resident Lounge", image: "/spaces/lounge.png", note: "Warm, quiet, ground floor." },
  { id: "rooftop", label: "Rooftop", image: "/spaces/rooftop.png", note: "Open air with skyline views." },
  { id: "coworking", label: "Coworking Space", image: "/spaces/coworking.png", note: "Desks and soft focus." },
  { id: "pool", label: "Pool Deck", image: "/spaces/pool.png", note: "Calm water, evening light." },
  { id: "fitness", label: "Fitness Center", image: "/spaces/fitness.png", note: "Private boutique studio." },
]

export const meetupTimes = [
  "Tomorrow · 8:30 AM",
  "Thursday · 6:00 PM",
  "Saturday · 10:00 AM",
  "Sunday · 4:30 PM",
]
