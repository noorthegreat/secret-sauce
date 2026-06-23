/* Fifth Circle — mock data layer (Chorus deployment). Plain JS, sets window.FC. */
window.FC = (function () {
  // ── Residents ──────────────────────────────────────────────
  // Cast keyed by photo id (img/faces/<id>.png — real Chorus resident photos).
  // `me` (Noor) is the viewer. The ten below are her neighbours at Chorus.
  const residents = {
    noor: {
      id: 'noor', name: 'Noor Haddad', initials: 'NH', unit: 'A · 23',
      occupation: 'Product Designer', industry: 'Design',
      bio: "A designer who loves good coffee, slow travel, and finding beautiful things in everyday places.",
      interests: ['Design', 'Coffee', 'Travel', 'Architecture', 'Art'],
      goals: ['Friendships', 'Activity Partners', 'Professional', 'Group Hangouts'],
      languages: ['English', 'Arabic', 'French'],
    },
    ethan: {
      id: 'ethan', name: 'Ethan Cole', initials: 'EC', unit: 'A · 17',
      occupation: 'Architect', industry: 'Architecture',
      bio: "Architect at a small studio downtown. I sketch on napkins, chase good light, and take my coffee at the Lobby Bar most mornings.",
      interests: ['Architecture', 'Art', 'Design', 'Coffee', 'Cycling'],
      shared: ['Design', 'Architecture', 'Art'],
      sharedGoals: ['Friendships', 'Creative Circles'],
      why: "Ethan shares your eye for design, architecture, and art — and he's a Lobby Bar regular. A morning coffee downstairs could be an easy first conversation.",
      compat: 94, affinityWord: 'A natural fit',
      activities: [{ name: 'Cycling', where: 'Lobby → Embarcadero', when: 'Sat · 6:30 AM', skill: 'Advanced' }],
    },
    maya: {
      id: 'maya', name: 'Maya Tan', initials: 'MT', unit: 'B · 22',
      occupation: 'Marketing Manager', industry: 'Marketing',
      bio: "Yoga on the Terrace, a camera in my bag, and a long list of places to go. I host the Sunday flow up on Floor 30 — all levels welcome.",
      interests: ['Yoga', 'Travel', 'Photography', 'Design', 'Wellness'],
      shared: ['Travel', 'Design'],
      sharedGoals: ['Activity Partners', 'Wellness Communities'],
      why: "Maya hosts the Terrace yoga you've shown interest in, and you both travel often and care about design. She tends to make newcomers feel at home quickly.",
      compat: 88, affinityWord: 'Easy company',
      activities: [{ name: 'Yoga', where: 'The Terrace, Floor 30', when: 'Sun · 9:00 AM', skill: 'All levels' }],
    },
    james: {
      id: 'james', name: 'James Whitfield', initials: 'JW', unit: 'A · 25',
      occupation: 'Startup Founder', industry: 'Technology',
      bio: "Building a seed-stage company and reading too many books about it. Happy to trade founder notes over dinner at the Workspace table.",
      interests: ['Startups', 'Networking', 'Books', 'Coffee', 'Wine'],
      shared: ['Networking', 'Coffee'],
      sharedGoals: ['Professional Networking', 'Founder Networks'],
      why: "James hosts the building's Founders' Table and is always glad to meet someone starting something of their own. A natural professional introduction.",
      compat: 83, affinityWord: 'Worth knowing',
    },
    sophie: {
      id: 'sophie', name: 'Sophie Bauer', initials: 'SB', unit: 'B · 19',
      occupation: 'Attorney', industry: 'Law',
      bio: "Early riser, weekend runner, and a glass of something red on Fridays. I lead the Sunrise Run Club along the Embarcadero.",
      interests: ['Running', 'Law', 'Wine', 'Fitness', 'Travel'],
      shared: ['Travel'],
      sharedGoals: ['Activity Partners'],
      why: "Sophie leads the Sunrise Run Club and is looking for a steady morning partner at an easy pace. You both travel and like an early start.",
      compat: 79, affinityWord: 'A steady match',
      activities: [{ name: 'Running', where: 'Lobby → Embarcadero', when: 'Sun · 7:00 AM', skill: 'Intermediate' }],
    },
    david: {
      id: 'david', name: 'David Okonkwo', initials: 'DO', unit: 'A · 21',
      occupation: 'Product Manager', industry: 'Technology',
      bio: "PM by day, doubles on weekends. Always looking for a fourth on the court. Interested in where tech and good design meet.",
      interests: ['Tech', 'Investing', 'Tennis', 'Design', 'Coffee'],
      shared: ['Design', 'Coffee'],
      sharedGoals: ['Activity Partners', 'Professional Networking'],
      why: "David works in product and cares about design as much as you do — and he's hunting for a weekend tennis partner. Easy to talk to, easy to play with.",
      compat: 81, affinityWord: 'Good company',
      activities: [{ name: 'Tennis', where: 'Rooftop Court', when: 'Sat · 4:00 PM', skill: 'Beginner' }],
    },
    priya: {
      id: 'priya', name: 'Dr. Priya Anand', initials: 'PA', unit: 'B · 24',
      occupation: 'Physician', industry: 'Medicine',
      bio: "Hospital hours, then the quiet of a slow dinner and a longer breath. I guide the Wellness Circle on the Terrace twice a month.",
      interests: ['Health', 'Cooking', 'Meditation', 'Wellness', 'Books'],
      shared: ['Wellness'],
      sharedGoals: ['Wellness Communities', 'Friendships'],
      why: "Priya guides the building's Wellness Circle — restorative, unhurried evenings on the Terrace. A warm, steady presence in the building.",
      compat: 84, affinityWord: 'Restorative',
      activities: [{ name: 'Meditation', where: 'The Terrace, Floor 30', when: 'Wed · 7:00 AM', skill: 'All levels' }],
    },
    isabella: {
      id: 'isabella', name: 'Isabella Ferraro', initials: 'IF', unit: 'B · 20',
      occupation: 'MBA Student', industry: 'Business',
      bio: "New to Chorus and to the city. Business school by day, exploring by foot the rest of the time. Hoping to meet a few good neighbours.",
      interests: ['Education', 'Networking', 'Travel', 'Coffee', 'Art'],
      shared: ['Travel', 'Coffee', 'Art'],
      sharedGoals: ['New Resident Connections', 'Friendships'],
      why: "Isabella moved into Tower B two weeks ago and shares your love of travel, coffee, and art. New residents often appreciate a warm first introduction.",
      compat: 86, affinityWord: 'An easy first',
      newResident: true,
    },
    alex: {
      id: 'alex', name: 'Alex Rivera', initials: 'AR', unit: 'A · 18',
      occupation: 'Software Engineer', industry: 'Technology',
      bio: "Engineer who lifts before standups and takes coffee seriously. Find me in the Fitness Center most mornings or at the Lobby Bar after.",
      interests: ['Fitness', 'Coffee', 'Gaming', 'Tech', 'Music'],
      shared: ['Coffee'],
      sharedGoals: ['Activity Partners', 'Friendships'],
      why: "You and Alex both take coffee seriously and keep an early routine. He's part of the Sunday Coffee Circle you've been considering.",
      compat: 80, affinityWord: 'Kindred',
      activities: [{ name: 'Strength training', where: 'The Fitness Center', when: 'Weekdays · 7:00 AM', skill: 'Intermediate' }],
    },
    kevin: {
      id: 'kevin', name: 'Kevin Park', initials: 'KP', unit: 'A · 16',
      occupation: 'Data Analyst', industry: 'Technology',
      bio: "Numbers by day, vinyl and tournaments by night. I run the Game Room nights — bring a record or a competitive streak.",
      interests: ['Data', 'Gaming', 'Coffee', 'Music', 'Film'],
      shared: ['Coffee'],
      sharedGoals: ['Group Hangouts', 'Friendships'],
      why: "Kevin hosts the building's Game Room nights and is part of the Coffee Circle — a low-key way into the building's most relaxed crowd.",
      compat: 78, affinityWord: 'Easy company',
    },
    margaret: {
      id: 'margaret', name: 'Margaret Hale', initials: 'MH', unit: 'B · 15',
      occupation: 'Retired Executive', industry: 'Business',
      bio: "A reader, a theatre-goer, and a traveller with stories. I keep the Reading Room going — one good book a month, no homework.",
      interests: ['Books', 'Theater', 'Travel', 'Art', 'Wine'],
      shared: ['Art', 'Travel'],
      sharedGoals: ['Friendships', 'Creative Circles'],
      why: "Margaret keeps the Reading Room thoughtful and generous. She's met half the building over a good book and is wonderful with newcomers.",
      compat: 82, affinityWord: 'Worth knowing',
    },
  };

  // ── Introductions ──────────────────────────────────────────
  const introductions = {
    new: [
      { id: 'ethan', status: 'new' },
      { id: 'isabella', status: 'new' },
    ],
    pending: [
      { id: 'maya', status: 'pending', note: 'You accepted · waiting on Maya' },
    ],
    accepted: [
      { id: 'alex', status: 'accepted', note: 'Connected · 2 days ago', meet: { stage: 'upcoming', when: 'Sat · Jun 21 · 10:00 AM', place: 'The Lobby Bar' } },
      { id: 'kevin', status: 'accepted', note: 'Connected · today', meet: { stage: 'coordinating' } },
    ],
    past: [
      { id: 'james', status: 'past', note: "Met at the Founders' Table · Jun 4", meet: { stage: 'met', when: 'Jun 4', place: 'The Workspace', feedbackGiven: false } },
    ],
  };

  // ── Curated Circles ────────────────────────────────────────
  const circles = [
    {
      id: 'coffee', name: 'Sunday Coffee Circle', type: 'Coffee Circle',
      size: 4, cap: 5, cadence: 'Weekly · Sunday mornings',
      atmosphere: 'Quiet & unhurried', place: 'The Lobby Bar', photo: 'amenity-lobbybar',
      members: ['alex', 'kevin', 'isabella'],
      sharedInterests: ['Coffee', 'Design', 'Art'],
      why: "Four residents who all start their Sundays slowly, over good coffee at the Lobby Bar. Your taste in design and art makes this an easy fit.",
      joined: false, status: 'open', openToNew: true,
    },
    {
      id: 'founders', name: "Founders' Table", type: 'Founder Circle',
      size: 5, cap: 6, cadence: 'Monthly dinners',
      atmosphere: 'Candid & generous', place: 'The Workspace', photo: 'amenity-workspace',
      members: ['james', 'david'],
      sharedInterests: ['Startups', 'Investing', 'Design'],
      why: "A small table of founders and operators trading honest notes over dinner in the Workspace. With your studio just beginning, this is a room worth being in.",
      joined: false, status: 'open', openToNew: true,
    },
    {
      id: 'wellness', name: 'The Wellness Circle', type: 'Wellness Circle',
      size: 6, cap: 6, cadence: 'Bi-weekly evenings',
      atmosphere: 'Restorative', place: 'The Terrace, Floor 30', photo: 'amenity-outdoor',
      members: ['priya', 'maya', 'sophie'],
      sharedInterests: ['Wellness', 'Yoga', 'Meditation'],
      why: "Movement, rest, and conversation as the sun goes down over the Terrace. Dr. Priya guides the sessions; the group is warm and consistent.",
      joined: false, status: 'full',
    },
    {
      id: 'reading', name: 'The Reading Room', type: 'Book Club',
      size: 4, cap: 6, cadence: 'Monthly',
      atmosphere: 'Considered', place: 'The Sky Deck Lounge', photo: 'amenity-skydeck',
      members: ['margaret', 'isabella', 'james'],
      sharedInterests: ['Books', 'Art', 'Travel'],
      why: "One book a month, chosen together, up on the Sky Deck at golden hour. Margaret keeps it thoughtful without it ever feeling like homework.",
      joined: true, status: 'open', openToNew: true,
    },
    {
      id: 'creative', name: 'Creative Hours', type: 'Creative Circle',
      size: 3, cap: 6, cadence: 'Weekly evenings',
      atmosphere: 'Generative', place: 'The Game Room', photo: 'amenity-gameroom',
      members: ['ethan', 'maya', 'kevin'],
      sharedInterests: ['Design', 'Music', 'Art'],
      why: "A standing evening for people who make things — design, music, photography — working alongside each other in the Game Room. Quiet company, no agenda.",
      joined: false, status: 'open', openToNew: true,
    },
  ];

  // ── Events ─────────────────────────────────────────────────
  // `photo` points at a real Chorus amenity image (img/<photo>.png).
  const events = {
    building: [
      { id: 'rooftop', title: 'Sky Deck Social', day: 21, month: 'Jun', dow: 'Sat', time: '6:30 PM', loc: 'The Sky Deck, Floor 30', host: 'Building', attending: 28, cap: 40, interests: ['Social', 'Music'], rsvp: false, rating: 4.9, ratings: 48, votes: 41, photo: 'amenity-skydeck' },
      { id: 'wine', title: 'Wine Tasting Evening', day: 27, month: 'Jun', dow: 'Fri', time: '7:00 PM', loc: 'The Lobby Bar', host: 'Building', attending: 9, cap: 12, interests: ['Wine', 'Social'], rsvp: true, rating: 4.6, ratings: 22, votes: 19, photo: 'amenity-lobbybar' },
      { id: 'swim', title: 'Dawn Swim & Coffee', day: 24, month: 'Jun', dow: 'Tue', time: '6:30 AM', loc: 'The Pool, Level 6', host: 'Building', attending: 11, cap: 18, interests: ['Wellness', 'Fitness'], rsvp: false, rating: 4.7, ratings: 18, votes: 15, photo: 'amenity-pool' },
    ],
    circles: [
      { id: 'fdinner', title: "Founders' Dinner", day: 26, month: 'Jun', dow: 'Thu', time: '7:30 PM', loc: 'The Workspace', host: "Founders' Table", attending: 5, cap: 6, interests: ['Startups', 'Investing'], rsvp: false, photo: 'amenity-workspace' },
      { id: 'cmorning', title: 'Coffee Circle Morning', day: 22, month: 'Jun', dow: 'Sun', time: '9:00 AM', loc: 'The Lobby Bar', host: 'Sunday Coffee Circle', attending: 4, cap: 5, interests: ['Coffee', 'Design'], rsvp: false, photo: 'amenity-lobbybar' },
    ],
    resident: [
      { id: 'runclub', title: 'Sunrise Run Club', day: 22, month: 'Jun', dow: 'Sun', time: '7:00 AM', loc: 'Lobby → Embarcadero', host: 'Sophie Bauer', attending: 7, cap: 12, interests: ['Running', 'Fitness'], rsvp: false, rating: 4.7, ratings: 14, votes: 12, photo: 'amenity-gym' },
      { id: 'gamenight', title: 'Vinyl & Game Night', day: 25, month: 'Jun', dow: 'Wed', time: '8:00 PM', loc: 'The Game Room', host: 'Kevin Park', attending: 12, cap: 20, interests: ['Music', 'Social'], rsvp: false, rating: 4.5, ratings: 27, votes: 23, photo: 'amenity-gameroom' },
    ],
    proposed: [
      { id: 'artwalk', title: 'Neighborhood Art Walk', votes: 23, interested: 45, status: 'Under Review', voted: false },
      { id: 'chef', title: 'Private Chef Dinner on the Terrace', votes: 18, interested: 31, status: 'Gathering Interest', voted: false },
      { id: 'film', title: 'Game Room Film Night', votes: 35, interested: 62, status: 'Approved · Jul 4', voted: true },
    ],
    // Management is weighing whether to throw this — residents vote to signal demand.
    consideration: {
      id: 'autumngala', title: 'An Autumn Sky Deck Gala', when: 'Late September',
      line: "We're considering a catered evening up on the Sky Deck — live music, a season's-end toast over the city. Worth doing?",
      yes: 38, no: 4, threshold: 50, vote: null,
    },
  };

  // ── Chorus building identity ───────────────────────────────
  const buildingProfile = {
    name: 'Chorus',
    kind: 'Residential community',
    location: 'SoMa · San Francisco',
    logo: 'img/chorus-logo.png',
    hero: 'amenity-skydeck',
    blurb: "Two towers, one community. Chorus pairs skyline living with a calendar of gatherings — and now a Fifth Circle concierge to make the introductions.",
    stats: [
      { label: 'Residents', value: '248' },
      { label: 'Towers', value: 'A & B' },
      { label: 'On Fifth Circle', value: 'Since Apr' },
    ],
    amenities: [
      { name: 'The Sky Deck', sub: 'Floor 30 · open-air lounge & firepits', photo: 'amenity-skydeck' },
      { name: 'The Lobby Bar', sub: 'Lobby · coffee by day, cocktails by night', photo: 'amenity-lobbybar' },
      { name: 'The Pool', sub: 'Level 6 · lap pool & sundeck', photo: 'amenity-pool' },
      { name: 'The Fitness Center', sub: 'Level 6 · skyline gym', photo: 'amenity-gym' },
      { name: 'The Terrace', sub: 'Floor 30 · yoga, firepits & city views', photo: 'amenity-outdoor' },
      { name: 'The Workspace', sub: 'Level 2 · coworking & meeting rooms', photo: 'amenity-workspace' },
      { name: 'The Game Room', sub: 'Lobby · lounge, billiards & screening', photo: 'amenity-gameroom' },
    ],
  };

  // ── Concierge ──────────────────────────────────────────────
  // How matching works — thoughtfully curated, technology-enabled, privacy-first.
  const howItWorks = [
    { icon: 'ti-affiliate', title: 'Matched on what matters', line: 'Fifth Circle reads shared interests, goals, availability, and the community you want — then surfaces the few introductions most likely to fit.' },
    { icon: 'ti-shield-lock', title: 'Delivered privately', line: 'Every suggestion comes through your concierge alone. You are never listed, ranked publicly, or browsable by other residents.' },
    { icon: 'ti-hand-stop', title: 'Only with both yeses', line: 'Nothing is shared and no one is introduced until you and the other resident have each said yes.' },
  ];

  const concierge = {
    note: "Two neighbours caught my eye for you this week \u2014 both with a designer's heart. And the Sunday Coffee Circle, down at the Lobby Bar, has an open seat that feels right.",
    dayOne: "Welcome to Chorus, Noor. I'm spending this first week getting to know the building on your behalf \u2014 there's no rush at all.",
    suggestions: [
      { kind: 'introduction', refId: 'ethan', title: 'An introduction to Ethan Cole',
        line: "You both design, both love the Lobby Bar's coffee, and he sketches buildings for a living." },
      { kind: 'circle', refId: 'coffee', title: 'A seat at the Sunday Coffee Circle',
        line: "Four residents who take their Sundays slowly at the Lobby Bar. Your taste in design and art fits the table." },
      { kind: 'event', refId: 'wine', title: 'Wine Tasting Evening, this Friday',
        line: "A relaxed first gathering at the Lobby Bar. Three people you'd get along with are going." },
    ],
    starters: [
      "Ask Ethan what he's drawing \u2014 he loves talking shop over a Lobby Bar espresso.",
      "Isabella just moved into Tower B; she'd appreciate a neighbourhood recommendation.",
      "Kevin's Game Room nights are a low-key way to meet the building's relaxed crowd.",
    ],
    pulse: [
      { label: 'Coffee mornings', trend: '+18 residents', dir: 'up' },
      { label: 'Terrace wellness', trend: '+11 residents', dir: 'up' },
      { label: 'Founder dinners', trend: 'Steady', dir: 'flat' },
      { label: 'Sunrise run club', trend: '+7 residents', dir: 'up' },
    ],
    greetings: [
      "Two neighbours caught my eye for you this week \u2014 both with a designer's heart. The Sunday Coffee Circle has a seat open at the Lobby Bar, too.",
      "The Sky Deck is at its best this month. I've a quiet introduction in mind, and a wine evening worth your Friday.",
      "A slower week, on purpose \u2014 one introduction is still taking shape. I'll bring it to you when it's right.",
    ],
    season: { tag: 'Early summer at Chorus', line: 'Long evenings on the Sky Deck, the pool open at dawn \u2014 a generous season to meet someone.' },
    milestones: [
      'The Reading Room gathered on the Sky Deck for the fourth time',
      'Coffee mornings welcomed six new faces',
      'The Sky Deck Social is nearly full',
    ],
  };

  // ── Onboarding content ─────────────────────────────────────
  const consentItems = [
    'Participation is always optional',
    'Introductions require mutual interest',
    'Your data is never sold or shared with advertisers',
    'I agree to the Terms of Service',
    'I agree to the Privacy Policy',
    'I agree to the Community Guidelines',
  ];

  // Refined consent: three promises (spoken, not ticked) + one merged agreement.
  const consentPromises = [
    'Your participation is always optional',
    'Every introduction is mutual \u2014 nothing happens without both yeses',
    'Your words are never sold or shared with advertisers',
  ];
  const consentAgreement = 'I agree to the Terms of Service, Privacy Policy & Community Guidelines';

  const goalOptions = [
    { id: 'friendship', label: 'Friendships', icon: 'ti-heart', desc: 'Neighbors who become friends' },
    { id: 'activity', label: 'Activity Partners', icon: 'ti-run', desc: 'For the gym, courts & trails' },
    { id: 'professional', label: 'Professional', icon: 'ti-briefcase', desc: 'Mentors, peers & founders' },
    { id: 'group', label: 'Group Hangouts', icon: 'ti-users', desc: 'Small, easy gatherings' },
  ];

  const interestSuggestions = [
    'Coffee', 'Design', 'Art', 'Travel', 'Books', 'Music',
    'Fitness', 'Food', 'Film', 'Architecture', 'Wellness', 'Writing',
  ];

  const compatPrompts = [
    { id: 'enjoy', q: "Who are the people you find easiest to be yourself around?",
      placeholder: "The ones who are curious, unhurried, and easy to be quiet with…" },
    { id: 'community', q: "What kind of community are you hoping to build here?",
      placeholder: "A few real friendships, not a crowd…" },
  ];

  return {
    residents, introductions, circles, events, concierge, buildingProfile, howItWorks,
    consentItems, consentPromises, consentAgreement, goalOptions, interestSuggestions, compatPrompts,
    me: residents.noor, building: 'Chorus',
  };
})();
