export const buildingPresets: Record<string, { name: string; city: string; inviteCode: string }> = {
  "chorus-apartments": {
    name: "Chorus Apartments",
    city: "San Francisco",
    inviteCode: "CHORUS",
  },
  "the-clara": {
    name: "The Clara",
    city: "Boston",
    inviteCode: "CLARA",
  },
};

export const residentPreviewData = {
  currentResident: {
    firstName: "Noor",
    role: "Marketing",
  },
  suggestedConnections: [
    {
      id: "sarah",
      name: "Sarah",
      age: 28,
      headline: "New to Boston",
      sharedInterests: ["Hiking", "Fitness", "Travel"],
      sharedGoals: ["New Friends", "Activity Partners"],
      about: "You both enjoy hiking, wellness, and rooftop events.",
    },
    {
      id: "melissa",
      name: "Melissa",
      age: 31,
      headline: "Wellness Coach",
      sharedInterests: ["Wellness", "Food", "Art"],
      sharedGoals: ["Community Events", "New Friends"],
      about: "A warm fit for small-group experiences and wellness mornings.",
    },
    {
      id: "david",
      name: "David",
      age: 30,
      headline: "Founder, remote-first",
      sharedInterests: ["Entrepreneurship", "Technology", "Running"],
      sharedGoals: ["Professional Connections", "Activity Partners"],
      about: "Likely a strong fit for coffee chats and founder meetups.",
    },
  ],
  upcomingEvents: [
    {
      id: "rooftop-wine-night",
      name: "Rooftop Social",
      day: "Friday, May 24",
      time: "6:00 PM",
      place: "Rooftop Terrace",
    },
    {
      id: "womens-brunch",
      name: "Women's Brunch",
      day: "Saturday, May 25",
      time: "11:00 AM",
      place: "Private Dining Room",
    },
    {
      id: "pool-party",
      name: "Pool Party",
      day: "Sunday, May 26",
      time: "2:00 PM",
      place: "Pool Deck",
    },
    {
      id: "book-club",
      name: "Book Club",
      day: "Tuesday, May 28",
      time: "7:00 PM",
      place: "Resident Lounge",
    },
  ],
  communityOpportunities: [
    "Rock Climbing Group",
    "Running Club",
    "Startup Coffee Meetup",
  ],
};
