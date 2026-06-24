/* Fifth Circle — Manager portal data. Mirrors the resident app's voice. */
const FCM = {
  building: 'Chorus Apartments',
  buildingSub: 'Live Pilot · 400 Units',
  manager: { name: 'Sarah Johnson', role: 'Property Manager', email: 'sarah@chorusapartments.com', initials: 'SJ' },
  period: 'Last 30 Days',
  week: 'Week of June 14, 2025',

  sentiment: { state: 'Community Thriving', score: 84 },

  metrics: [
    { label: 'Active Residents', val: '34', trend: '↑ 8 this week', kind: 'up' },
    { label: 'Introductions Made', val: '61', trend: '↑ 78% accepted', kind: 'up' },
    { label: 'Gatherings Held', val: '7', trend: '3 upcoming', kind: 'gold' },
    { label: 'Community Health', val: '84%', trend: '↑ Strong', kind: 'up' }
  ],

  interests: [
    { label: 'Design & Art', n: 18, pct: 84 },
    { label: 'Food & Wine', n: 16, pct: 74 },
    { label: 'Fitness', n: 13, pct: 60 },
    { label: 'Travel', n: 11, pct: 51 },
    { label: 'Entrepreneurship', n: 9, pct: 42 },
    { label: 'Parenting', n: 7, pct: 32 }
  ],

  weekly: [
    { d: 'Mon', h: 40 }, { d: 'Tue', h: 60 }, { d: 'Wed', h: 45 },
    { d: 'Thu', h: 90, hi: true }, { d: 'Fri', h: 70 },
    { d: 'Sat', h: 100, hi: true }, { d: 'Sun', h: 55 }
  ],
  weeklyNote: 'Saturday gatherings drive the highest engagement.',

  retention: [
    { name: 'Daniel M. · Unit 9F', note: 'No activity in 3 weeks. May benefit from a new connection opportunity.', kind: 'warn' },
    { name: 'Tom R. · Unit 2A', note: 'Joined 6 weeks ago, no introductions accepted yet.', kind: 'warn' },
    { name: 'Sophie L. · Unit 14B', note: 'High contributor. Attended 3 gatherings this month.', kind: 'good' },
    { name: 'Aisha K. · Unit 3C', note: 'New resident. Awaiting first introduction.', kind: 'new' }
  ],

  trends: [
    { label: 'Outdoor dining interest', dir: 'up', val: '+40%' },
    { label: 'Weekend event requests', dir: 'up', val: '+28%' },
    { label: 'Fitness & wellness', dir: 'up', val: '+22%' },
    { label: 'Book & culture events', dir: 'flat', val: 'Steady' },
    { label: 'Morning meetups', dir: 'up', val: '+18%' },
    { label: 'Professional networking', dir: 'flat', val: 'Steady' }
  ],

  exec: {
    score: 84,
    rows: [
      ['Active Residents', '34 of 40 target'],
      ['Intro Success Rate', '78%'],
      ['Avg Event Attendance', '89%'],
      ['Resident Satisfaction', '4.6 / 5.0'],
      ['Pilot Status', 'On Track']
    ]
  },

  approvals: [
    { day: '28', month: 'Jun', name: 'Rooftop Yoga Morning', by: 'Aisha K.', unit: '3C', loc: 'Rooftop Terrace', time: '10:00 AM', votes: 14 },
    { day: '05', month: 'Jul', name: 'Neighbors Film Night', by: 'Daniel M.', unit: '9F', loc: 'Private Dining Room', time: '7:00 PM', votes: 9 },
    { day: '12', month: 'Jul', name: 'Resident Wine Tasting Evening', by: 'Marcus R.', unit: '7A', loc: 'Rooftop Terrace', time: '7:30 PM', votes: 21 }
  ],
  approved: [
    { day: '19', month: 'Jun', name: 'Rooftop Wine & Conversation', meta: 'Hosted by Marcus R. · 7:00 PM · 12 attending' },
    { day: '21', month: 'Jun', name: 'Saturday Morning Coffee', meta: 'Building Lobby · 10:00 AM · 8 attending' }
  ],

  // Pilot cohort — the residents actually enrolled in the Chorus pilot.
  // Counts shown across the app are derived from THIS list (see mgr-store).
  pilotTargets: { activeTarget: 25, enrollTarget: 30, buildingUnits: 400 },
  healthWeights: [
    { key: 'participation', label: 'Active participation', weight: 30 },
    { key: 'satisfaction', label: 'Resident satisfaction', weight: 30, fixed: 92 },
    { key: 'attendance', label: 'Event attendance', weight: 20, fixed: 89 },
    { key: 'introSuccess', label: 'Introduction success', weight: 20, fixed: 78 }
  ],
  residents: [
    { initials: 'SL', name: 'Sophie L.', unit: '14B', joined: 'Jun 1', intros: 3, events: 4, active: 'Today', status: 'active', onboarding: 'Complete', participation: 'High' },
    { initials: 'MR', name: 'Marcus R.', unit: '7A', joined: 'May 15', intros: 5, events: 6, active: 'Today', status: 'active', onboarding: 'Complete', participation: 'High' },
    { initials: 'AK', name: 'Aisha K.', unit: '3C', joined: 'Jun 10', intros: 0, events: 1, active: 'Yesterday', status: 'new', onboarding: 'In progress', participation: 'Low' },
    { initials: 'JT', name: 'James T.', unit: '11D', joined: 'May 20', intros: 4, events: 3, active: '2 days ago', status: 'active', onboarding: 'Complete', participation: 'Medium' },
    { initials: 'CW', name: 'Clara W.', unit: '2B', joined: 'May 28', intros: 2, events: 2, active: '3 days ago', status: 'active', onboarding: 'Complete', participation: 'Medium' },
    { initials: 'DM', name: 'Daniel M.', unit: '9F', joined: 'Apr 30', intros: 1, events: 1, active: '3 weeks ago', status: 'risk', onboarding: 'Complete', participation: 'At risk' },
    { initials: 'TR', name: 'Tom R.', unit: '2A', joined: 'May 5', intros: 0, events: 0, active: '5 weeks ago', status: 'inactive', onboarding: 'Stalled', participation: 'None' },
    { initials: 'NK', name: 'Nina K.', unit: '6D', joined: 'Jun 12', intros: null, events: null, active: 'Pending', status: 'pending', onboarding: 'Not started', participation: 'None', invited: true },
    { initials: 'EB', name: 'Elena B.', unit: '5A', joined: 'May 8', intros: 4, events: 5, active: 'Today', status: 'active', onboarding: 'Complete', participation: 'High' },
    { initials: 'PV', name: 'Priya V.', unit: '8C', joined: 'May 22', intros: 2, events: 2, active: 'Yesterday', status: 'active', onboarding: 'Complete', participation: 'Medium' },
    { initials: 'LH', name: 'Liam H.', unit: '12E', joined: 'Apr 18', intros: 5, events: 6, active: 'Today', status: 'active', onboarding: 'Complete', participation: 'High' },
    { initials: 'GF', name: 'Grace F.', unit: '4D', joined: 'May 30', intros: 2, events: 3, active: '2 days ago', status: 'active', onboarding: 'Complete', participation: 'Medium' },
    { initials: 'OM', name: 'Omar M.', unit: '10B', joined: 'May 12', intros: 3, events: 2, active: '4 days ago', status: 'active', onboarding: 'Complete', participation: 'Medium' },
    { initials: 'RC', name: 'Rosa C.', unit: '3A', joined: 'Apr 25', intros: 4, events: 5, active: 'Today', status: 'active', onboarding: 'Complete', participation: 'High' },
    { initials: 'HW', name: 'Henry W.', unit: '15C', joined: 'May 18', intros: 2, events: 2, active: '3 days ago', status: 'active', onboarding: 'Complete', participation: 'Medium' },
    { initials: 'ID', name: 'Ines D.', unit: '6F', joined: 'Apr 29', intros: 5, events: 4, active: 'Today', status: 'active', onboarding: 'Complete', participation: 'High' },
    { initials: 'SB', name: 'Samuel B.', unit: '9A', joined: 'May 26', intros: 1, events: 2, active: '5 days ago', status: 'active', onboarding: 'Complete', participation: 'Medium' },
    { initials: 'MT', name: 'Maya T.', unit: '7D', joined: 'Jun 14', intros: 0, events: 0, active: 'Yesterday', status: 'new', onboarding: 'In progress', participation: 'Low' },
    { initials: 'FN', name: 'Farah N.', unit: '11A', joined: 'May 9', intros: 3, events: 3, active: '2 days ago', status: 'active', onboarding: 'Complete', participation: 'Medium' },
    { initials: 'BL', name: 'Ben L.', unit: '2C', joined: 'Apr 20', intros: 4, events: 5, active: 'Today', status: 'active', onboarding: 'Complete', participation: 'High' },
    { initials: 'VK', name: 'Vera K.', unit: '13B', joined: 'Apr 28', intros: 1, events: 0, active: '4 weeks ago', status: 'risk', onboarding: 'Complete', participation: 'At risk' },
    { initials: 'AC', name: 'Andre C.', unit: '5D', joined: 'May 24', intros: 2, events: 2, active: '6 days ago', status: 'active', onboarding: 'Complete', participation: 'Medium' },
    { initials: 'TS', name: 'Tess S.', unit: '8A', joined: 'May 2', intros: 5, events: 4, active: 'Today', status: 'active', onboarding: 'Complete', participation: 'High' },
    { initials: 'RP', name: 'Raj P.', unit: '10F', joined: 'May 16', intros: 2, events: 3, active: '3 days ago', status: 'active', onboarding: 'Complete', participation: 'Medium' },
    { initials: 'NW', name: 'Nora W.', unit: '4B', joined: 'Jun 13', intros: 0, events: 1, active: 'Yesterday', status: 'new', onboarding: 'In progress', participation: 'Low' },
    { initials: 'CG', name: 'Carl G.', unit: '12A', joined: 'May 1', intros: 0, events: 0, active: '5 weeks ago', status: 'inactive', onboarding: 'Stalled', participation: 'None' },
    { initials: 'DV', name: 'Dana V.', unit: '6A', joined: 'May 21', intros: 3, events: 2, active: '4 days ago', status: 'active', onboarding: 'Complete', participation: 'Medium' },
    { initials: 'KM', name: 'Kira M.', unit: '9D', joined: 'Apr 22', intros: 4, events: 5, active: 'Today', status: 'active', onboarding: 'Complete', participation: 'High' },
    { initials: 'PA', name: 'Paul A.', unit: '3F', joined: 'Apr 27', intros: 1, events: 1, active: '3 weeks ago', status: 'risk', onboarding: 'Complete', participation: 'At risk' },
    { initials: 'LN', name: 'Lena N.', unit: '7C', joined: 'Jun 15', intros: null, events: null, active: 'Pending', status: 'pending', onboarding: 'Not started', participation: 'None', invited: true }
  ],

  introStats: [
    { label: 'Introductions Made', val: '61', trend: '↑ 12 this week', kind: 'up' },
    { label: 'Acceptance Rate', val: '78%', trend: '↑ Above average', kind: 'up' },
    { label: 'Met In Person', val: '42', trend: '69% met rate', kind: 'gold' }
  ],
  introLog: [
    { a: 'SL', b: 'NS', names: 'Sophie L. & Noor S.', meta: 'Introduced Jun 8 · Design & Travel', outcome: 'met', detail: 'Coffee · Jun 12' },
    { a: 'MR', b: 'JT', names: 'Marcus R. & James T.', meta: 'Introduced Jun 5 · Wine & Tennis', outcome: 'met', detail: 'Supper Club' },
    { a: 'AK', b: 'CW', names: 'Aisha K. & Clara W.', meta: 'Introduced Jun 3 · Architecture', outcome: 'pending' },
    { a: 'DM', b: 'SL', names: 'Daniel M. & Sophie L.', meta: 'Introduced May 28 · Art', outcome: 'pending' },
    { a: 'JK', b: 'NS', names: 'James K. & Noor S.', meta: 'Activity Match · Rock Climbing', outcome: 'met', detail: 'The Arch · Jun 21' }
  ],
  introOutcomes: [
    { label: 'Met in person', n: 42, pct: 69, c: 'gold' },
    { label: 'Accepted, not met', n: 9, pct: 15, c: 'taupe' },
    { label: 'Pending response', n: 8, pct: 13, c: 'goldsoft' },
    { label: 'Declined', n: 2, pct: 3, c: 'amber' }
  ],
  matchReasons: [
    { label: 'Shared activity', n: 28, pct: 80 },
    { label: 'Shared interests', n: 22, pct: 64 },
    { label: 'Professional overlap', n: 11, pct: 32 }
  ],

  satMetrics: [
    { label: 'Overall Satisfaction', val: '4.6', trend: '↑ out of 5.0', kind: 'up' },
    { label: 'Introduction Quality', val: '4.8', trend: '↑ Excellent', kind: 'up' },
    { label: 'Event Satisfaction', val: '4.4', trend: '↑ Strong', kind: 'up' },
    { label: 'Reviews Submitted', val: '38', trend: '62% response rate', kind: 'gold' }
  ],
  introExperience: [
    { label: 'Really well', pct: 68, c: 'excellent' },
    { label: 'It was good', pct: 20, c: 'good' },
    { label: 'A bit awkward', pct: 9, c: 'neutral' },
    { label: 'Not for me', pct: 3, c: 'poor' }
  ],
  wouldMeetAgain: [
    { label: 'Yes, definitely', pct: 72, c: 'excellent' },
    { label: 'Maybe', pct: 18, c: 'good' },
    { label: 'Probably not', pct: 10, c: 'neutral' }
  ],
  whatWorked: [
    { label: 'Shared interest', n: 31, pct: 82 },
    { label: 'Great conversation', n: 26, pct: 68 },
    { label: 'Easy and natural', n: 23, pct: 60 },
    { label: 'Good energy', n: 19, pct: 50 }
  ],
  eventRatings: [
    { label: 'Rooftop Wine', n: '4.8', pct: 96 },
    { label: 'Supper Club', n: '4.5', pct: 90 },
    { label: 'Morning Coffee', n: '4.3', pct: 86 },
    { label: 'Book Circle', n: '4.0', pct: 80 }
  ],

  report: {
    title: 'June 2025',
    hero: [
      { label: 'Community Health Score', val: '84', sub: '↑ Thriving', good: true },
      { label: 'Resident Satisfaction', val: '4.6', sub: 'Out of 5.0' },
      { label: 'Monthly Active', val: '34', sub: 'of 40 target' }
    ],
    highlights: [
      { k: 'Introductions', v: '61 made · 78% accepted' },
      { k: 'Gatherings', v: '7 held · 89% avg attendance' },
      { k: 'New Residents', v: '8 joined the community' }
    ],
    growth: [
      { m: 'Feb', h: 30 }, { m: 'Mar', h: 40 }, { m: 'Apr', h: 52 },
      { m: 'May', h: 64 }, { m: 'Jun', h: 84, hi: true }
    ],
    growthNote: 'Community health score up from 52 → 84 over 5 months.',
    recommendations: [
      { c: 'green', t: 'Saturday events drive highest engagement', d: 'Consider adding a second Saturday gathering each month.' },
      { c: 'amber', t: '2 residents showing disengagement signals', d: 'Daniel M. and Tom R. — consider a personal outreach.' },
      { c: 'gold', t: 'Outdoor dining trend rising +40%', d: 'Rooftop wine tasting proposal has 21 votes — strong candidate to approve.' }
    ]
  }
};

// ─────────────────────────────────────────────────────────
// BEFORE-PILOT MODULE DATA
// ─────────────────────────────────────────────────────────
Object.assign(FCM, {
  // PILOT PROGRAM
  pilot: {
    status: 'PILOT ACTIVE',
    daysRemaining: 42,
    start: 'Apr 1, 2025',
    end: 'Jul 30, 2025',
    conversionDate: 'Aug 1, 2025',
    code: 'CHORUS-2025',
    progress: 76,
    milestones: [
      { label: 'Onboarding complete', done: true, date: 'Apr 14' },
      { label: 'First gatherings held', done: true, date: 'Apr 28' },
      { label: 'Health score above 80', done: true, date: 'Jun 6' },
      { label: 'Conversion review', done: false, date: 'Jul 24' }
    ],
    targets: [
      { label: 'Active residents', val: '34 / 40', pct: 85 },
      { label: 'Satisfaction', val: '4.6 / 4.5', pct: 100 },
      { label: 'Monthly gatherings', val: '7 / 6', pct: 100 }
    ]
  },

  // EVENT OPERATIONS (manager-created)
  eventTypes: ['Social', 'Wellness', 'Culinary', 'Cultural', 'Professional', 'Wellbeing'],
  locations: ['Rooftop Terrace', 'Private Dining Room', 'Building Lobby', 'Belvedere Room', 'Fitness Studio', 'Courtyard Garden'],
  myEvents: [
    { id: 'e1', title: 'Rooftop Wine & Conversation', type: 'Social', status: 'published', day: '24', month: 'Jun', dow: 'Tue', time: '7:00 PM', loc: 'Rooftop Terrace', host: 'Concierge', cap: 24, rsvp: 18, waitlist: 3, attended: null, desc: 'An evening of natural wines and easy conversation as the sun sets over the city.' },
    { id: 'e2', title: 'Saturday Morning Coffee', type: 'Social', status: 'published', day: '28', month: 'Jun', dow: 'Sat', time: '10:00 AM', loc: 'Building Lobby', host: 'Concierge', cap: 16, rsvp: 11, waitlist: 0, attended: null, desc: 'A relaxed weekly ritual — coffee, pastries, and your neighbors.' },
    { id: 'e3', title: 'Summer Supper Club', type: 'Culinary', status: 'draft', day: '11', month: 'Jul', dow: 'Fri', time: '7:30 PM', loc: 'Private Dining Room', host: 'Sophie L.', cap: 12, rsvp: 0, waitlist: 0, attended: null, desc: 'A seasonal tasting menu shared family-style for twelve residents.' },
    { id: 'e4', title: 'Rooftop Wine & Conversation', type: 'Social', status: 'closed', day: '19', month: 'Jun', dow: 'Thu', time: '7:00 PM', loc: 'Rooftop Terrace', host: 'Marcus R.', cap: 24, rsvp: 22, waitlist: 5, attended: 21, desc: 'Last week\u2019s gathering — exceptional turnout and feedback.', rating: '4.8' }
  ],

  // EVENT APPROVALS (resident proposals) — richer review data
  approvalsDetailed: [
    { id: 'a1', day: '28', month: 'Jun', name: 'Rooftop Yoga Morning', by: 'Aisha K.', unit: '3C', loc: 'Rooftop Terrace', time: '10:00 AM', votes: 14, rsvpEst: 18, amenity: 'Rooftop Terrace', budget: '$120', type: 'Wellness', comments: 'Would love a calm morning session before the day starts. Happy to bring my own mats.' },
    { id: 'a2', day: '05', month: 'Jul', name: 'Neighbors Film Night', by: 'Daniel M.', unit: '9F', loc: 'Private Dining Room', time: '7:00 PM', votes: 9, rsvpEst: 12, amenity: 'Private Dining Room + projector', budget: '$200', type: 'Cultural', comments: 'A relaxed screening with wine. I can curate the films and handle setup.' },
    { id: 'a3', day: '12', month: 'Jul', name: 'Resident Wine Tasting Evening', by: 'Marcus R.', unit: '7A', loc: 'Rooftop Terrace', time: '7:30 PM', votes: 21, rsvpEst: 24, amenity: 'Rooftop Terrace + bar service', budget: '$450', type: 'Culinary', comments: 'A guided tasting with a local sommelier. Strong interest already — 21 neighbors in.' }
  ],

  // COMMUNITY REQUESTS
  requestsTrending: [
    { label: 'Outdoor dining series', n: 31, pct: 88 },
    { label: 'Morning fitness classes', n: 24, pct: 70 },
    { label: 'Wine & spirits tastings', n: 21, pct: 62 },
    { label: 'Live music evenings', n: 17, pct: 50 },
    { label: 'Family weekend brunches', n: 13, pct: 40 }
  ],
  suggestions: [
    { id: 's1', kind: 'Experience', text: 'A monthly chef\u2019s table with rotating local restaurants', by: 'Sophie L.', votes: 19, status: 'open' },
    { id: 's2', kind: 'Vendor', text: 'Partner with Maison Noir florist for seasonal workshops', by: 'Clara W.', votes: 11, status: 'shortlisted' },
    { id: 's3', kind: 'Venue', text: 'Open the courtyard garden for evening gatherings', by: 'James T.', votes: 16, status: 'open' },
    { id: 's4', kind: 'Experience', text: 'Sound bath & meditation on the rooftop', by: 'Aisha K.', votes: 9, status: 'open' },
    { id: 's5', kind: 'Vendor', text: 'Weekly specialty coffee cart in the lobby', by: 'Marcus R.', votes: 22, status: 'open' }
  ],

  // PLANNING & BUDGETING
  planning: {
    monthlyBudget: 2500, monthlySpent: 1640,
    annualBudget: 30000, annualSpent: 11200,
    frequencyGoal: 6, frequencyActual: 7,
    drafts: [
      { title: 'Second Saturday gathering', why: 'Saturdays drive peak engagement', est: '$300', demand: 'High' },
      { title: 'Outdoor dining series', why: '31 residents requested · +40% trend', est: '$1,200', demand: 'Very high' },
      { title: 'Lobby coffee cart (weekly)', why: '22 votes · low cost, high frequency', est: '$480/mo', demand: 'High' }
    ]
  },

  // COMMUNICATIONS
  comms: {
    sent: [
      { title: 'Rooftop Wine — this Thursday', kind: 'Event reminder', channel: 'Push · In-app', when: 'Sent Jun 16 · 9:00 AM', reach: '34 residents', open: '82%' },
      { title: 'Welcome to Chorus, Aisha', kind: 'Welcome message', channel: 'Email', when: 'Sent Jun 10', reach: '1 resident', open: '100%' },
      { title: 'June community update', kind: 'Community update', channel: 'Email · In-app', when: 'Sent Jun 1', reach: '38 residents', open: '74%' }
    ],
    scheduled: [
      { title: 'Saturday Coffee — tomorrow', kind: 'Event reminder', channel: 'Push', when: 'Scheduled Jun 27 · 6:00 PM' }
    ],
    templates: ['Event reminder', 'Welcome message', 'Community update', 'Announcement']
  },

  // TRUST & SAFETY
  reports: [
    { id: 'r1', subject: 'Inappropriate message', by: 'Resident · Unit 5B', about: 'Unit 12A', status: 'investigating', when: '2 days ago', severity: 'High', note: 'Resident reported an unwelcome direct message after an introduction.' },
    { id: 'r2', subject: 'No-show concern', by: 'Resident · Unit 7A', about: 'Unit 9F', status: 'open', when: 'Yesterday', severity: 'Low', note: 'Repeated last-minute cancellations on confirmed introductions.' },
    { id: 'r3', subject: 'Resolved — misunderstanding', by: 'Resident · Unit 2B', about: 'Unit 14B', status: 'resolved', when: 'Jun 8', severity: 'Low', note: 'Both parties spoke; matter closed amicably.' }
  ],
  techIssues: [
    { label: 'Push notifications delayed', severity: 'Medium', when: 'Reported Jun 14' },
    { label: 'Event photo upload failing', severity: 'Low', when: 'Reported Jun 12' },
    { label: 'Calendar sync (iOS)', severity: 'High', when: 'Reported Jun 16' }
  ],

  // BUILDING SETTINGS + PERSONALIZATION
  building: 'Chorus Apartments',
  settings: {
    info: { name: 'Chorus Apartments', address: '123 Main Street, New York, NY', units: '400', manager: 'Sarah Johnson' },
    amenities: ['Rooftop Terrace', 'Private Dining Room', 'Fitness Studio', 'Courtyard Garden', 'Belvedere Room', 'Lobby Lounge'],
    guidelines: 'Be warm, be considerate, and treat every neighbor as you would a guest in your home. Gatherings are by invitation through the concierge.',
    accessCode: 'CHORUS-RESIDENT',
    approvalRules: { autoThreshold: 20, requireManager: true },
    personalization: {
      description: 'A landmark residence on the waterfront, Chorus brings together 400 homes around a shared sense of warmth, design, and quiet hospitality.',
      neighborhood: ['Hudson River Greenway — 2 min', 'Maison Noir café — ground floor', 'Tribeca galleries — 8 min walk', 'Pier 25 — riverside dining']
    }
  },

  // BILLING (light)
  billing: {
    plan: 'Fifth Circle — Community', status: 'Pilot', renewal: 'Aug 1, 2025', monthly: '$1,200 / mo (post-pilot)',
    method: 'Visa ending 4242', tiers: [
      { name: 'Pilot', price: 'Complimentary', current: true, note: '90-day evaluation' },
      { name: 'Community', price: '$1,200/mo', note: 'Up to 400 units · full platform' },
      { name: 'Portfolio', price: 'Custom', note: 'Multi-building operators' }
    ],
    invoices: [
      { id: 'Pilot agreement', date: 'Apr 1, 2025', amount: '$0.00', status: 'Paid' }
    ]
  },

  // FEEDBACK CENTER (simple)
  feedback: [
    { title: 'Let residents propose recurring events', cat: 'Events', status: 'Under Review', votes: 12 },
    { title: 'Add dietary preferences to RSVPs', cat: 'Events', status: 'Planned', votes: 9 },
    { title: 'Group introductions (3–4 people)', cat: 'Introductions', status: 'In Development', votes: 21 },
    { title: 'Calendar export for gatherings', cat: 'Mobile', status: 'Released', votes: 7 }
  ],
  feedbackStages: ['Submitted', 'Under Review', 'Planned', 'In Development', 'Released'],

  // TEAM & ROLES
  team: [
    { initials: 'SJ', name: 'Sarah Johnson', role: 'Property Manager', access: 'Full access', you: true },
    { initials: 'RD', name: 'Ray Delgado', role: 'Assistant Manager', access: 'Events & Residents' },
    { initials: 'CM', name: 'Concierge Team', role: 'Concierge', access: 'Introductions & Events' }
  ],
  roles: [
    { name: 'Property Manager', desc: 'Full access to every module and setting.' },
    { name: 'Assistant Manager', desc: 'Events, residents, communications. No billing or settings.' },
    { name: 'Concierge', desc: 'Introductions and event hosting only.' }
  ],

  // VENDOR DIRECTORY
  vendors: [
    { id: 'vn1', initials: 'MN', name: 'Maison Noir', cat: 'Florist & Workshops', status: 'Preferred', last: 'Apr — Spring workshop', typical: '$300 / workshop' },
    { id: 'vn2', initials: 'CV', name: 'Cellar & Vine', cat: 'Wine & Sommelier', status: 'Preferred', last: 'Jun — Wine evening', typical: '$450 / tasting' },
    { id: 'vn3', initials: 'GC', name: 'Gray Coffee Co.', cat: 'Coffee & Catering', status: 'Active', last: 'Weekly — Lobby', typical: '$480 / mo' },
    { id: 'vn4', initials: 'SS', name: 'Stillness Studio', cat: 'Yoga & Wellness', status: 'New', last: 'Proposed — Rooftop yoga', typical: '$200 / session' }
  ],
  // Resident-recommended vendors awaiting the manager's approval onto the Chorus list
  vendorRecs: [
    { id: 'vr1', initials: 'TC', name: 'Tavola Catering', cat: 'Catering & Supper Clubs', by: 'James T.', unit: '11D', votes: 12, note: 'Family-style Italian — they\u2019d be perfect for the supper club idea.', typical: '$60 / head' },
    { id: 'vr2', initials: 'LS', name: 'Lumen Sound', cat: 'Live Music & DJs', by: 'Marcus R.', unit: '7A', votes: 6, note: 'A jazz trio I\u2019ve booked before — lovely for rooftop evenings.', typical: '$600 / event' },
    { id: 'vr3', initials: 'BT', name: 'Bloom & Thistle', cat: 'Florist & Workshops', by: 'Sophie L.', unit: '14B', votes: 8, note: 'Stunning seasonal arrangements — great for a flower workshop.', typical: '$320 / workshop' }
  ],

  // AUDIT LOG
  audit: [
    { who: 'Sarah Johnson', action: 'Approved event', target: 'Rooftop Wine & Conversation', when: 'Jun 16 · 9:42 AM', icon: 'ti-calendar-check' },
    { who: 'Concierge Team', action: 'Sent announcement', target: 'June community update', when: 'Jun 16 · 9:00 AM', icon: 'ti-send' },
    { who: 'Sarah Johnson', action: 'Invited resident', target: 'Nina K. · Unit 6D', when: 'Jun 12 · 2:15 PM', icon: 'ti-user-plus' },
    { who: 'Ray Delgado', action: 'Held event proposal', target: 'Neighbors Film Night', when: 'Jun 11 · 4:30 PM', icon: 'ti-clock' },
    { who: 'Sarah Johnson', action: 'Updated guidelines', target: 'Community guidelines', when: 'Jun 9 · 11:02 AM', icon: 'ti-edit' }
  ]
});

// Resident records already carry onboarding/participation inline above.
FCM.residents.forEach(function (r) { if (r.invited == null) r.invited = false; });

window.FCM = FCM;
