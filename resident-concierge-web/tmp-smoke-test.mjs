import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createClient } from "@supabase/supabase-js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = __dirname
const envPath = path.join(rootDir, ".env.local")

function parseEnv(content) {
  const env = {}
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const idx = trimmed.indexOf("=")
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    const value = trimmed.slice(idx + 1).trim()
    env[key] = value
  }
  return env
}

function assertEnv(env, key) {
  const value = env[key]?.trim()
  if (!value) {
    throw new Error(`Missing env: ${key}`)
  }
  return value
}

function createFetcher(baseUrl, token) {
  return async function request(method, urlPath, body) {
    const response = await fetch(`${baseUrl}${urlPath}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    const text = await response.text()
    let json = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      json = { raw: text }
    }
    return { status: response.status, ok: response.ok, json }
  }
}

function checklistItem(name, passed, detail, extra = {}) {
  return { name, passed, detail, ...extra }
}

async function ensureUser(admin, { email, password, firstName }) {
  const list = await admin.auth.admin.listUsers()
  const existing = list.data?.users?.find((user) => user.email?.toLowerCase() === email.toLowerCase())

  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
      },
    })
    return existing
  }

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
    },
  })

  if (created.error || !created.data.user) {
    throw new Error(`Unable to create user for ${email}: ${created.error?.message ?? "unknown error"}`)
  }

  return created.data.user
}

async function signIn(anon, email, password) {
  const result = await anon.auth.signInWithPassword({ email, password })
  if (result.error || !result.data.session?.access_token) {
    throw new Error(`Unable to sign in ${email}: ${result.error?.message ?? "unknown error"}`)
  }
  return result.data.session.access_token
}

async function main() {
  const env = parseEnv(await fs.readFile(envPath, "utf8"))
  const supabaseUrl = assertEnv(env, "NEXT_PUBLIC_SUPABASE_URL")
  const anonKey = assertEnv(env, "NEXT_PUBLIC_SUPABASE_ANON_KEY")
  const serviceRoleKey = assertEnv(env, "SUPABASE_SERVICE_ROLE_KEY")
  const buildingSlug = assertEnv(env, "RESIDENT_CONCIERGE_BUILDING_SLUG")
  const allowPreviewFallback = env.RESIDENT_CONCIERGE_ALLOW_PREVIEW_FALLBACK ?? "unset"
  const baseUrl = process.env.SMOKE_BASE_URL?.trim() || "http://127.0.0.1:3000"

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const anon = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const buildingQuery = await admin
    .from("buildings")
    .select("id, name, slug, invite_code, is_active")
    .eq("slug", buildingSlug)
    .maybeSingle()

  if (buildingQuery.error || !buildingQuery.data) {
    throw new Error(`Unable to load building ${buildingSlug}`)
  }

  const building = buildingQuery.data
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 12)
  const password = `Pilot!${stamp}Aa1`
  const managerEmail = `pilot.manager.${stamp}@example.com`
  const residentOneEmail = `pilot.resident1.${stamp}@example.com`
  const residentTwoEmail = `pilot.resident2.${stamp}@example.com`

  const results = []
  const notes = []

  const managerLeadSubmit = await fetch(`${supabaseUrl}/functions/v1/submit-building-manager-lead`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({
      buildingName: building.name,
      city: "San Francisco",
      stateRegion: "CA",
      managerFirstName: "Pilot",
      managerLastName: "Manager",
      managerEmail,
      managerPhone: "+14155550101",
      jobTitle: "General Manager",
      unitCount: 300,
      notes: "Automated live smoke test",
      contactViaSms: false,
      contactViaEmail: true,
    }),
  })
  const managerLeadBody = await managerLeadSubmit.json().catch(() => ({}))
  results.push(
    checklistItem(
      "Manager lead submit",
      managerLeadSubmit.ok,
      managerLeadSubmit.ok ? "Public manager lead intake succeeded." : (managerLeadBody.error ?? "Manager lead intake failed."),
    ),
  )

  const residentJoinPayloads = [
    {
      email: residentOneEmail,
      firstName: "Pilot",
      lastName: "ResidentOne",
      phone: "+14155550111",
      unitNumber: "1201",
      lookingFor: ["friendships", "activity_partners"],
      wantsFriendships: true,
      wantsNetworking: false,
    },
    {
      email: residentTwoEmail,
      firstName: "Pilot",
      lastName: "ResidentTwo",
      phone: "+14155550112",
      unitNumber: "1202",
      lookingFor: ["friendships", "professional_networking"],
      wantsFriendships: true,
      wantsNetworking: true,
    },
  ]

  for (const resident of residentJoinPayloads) {
    const response = await fetch(`${supabaseUrl}/functions/v1/submit-resident-join-request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        inviteCode: building.invite_code,
        firstName: resident.firstName,
        lastName: resident.lastName,
        email: resident.email,
        phone: resident.phone,
        unitNumber: resident.unitNumber,
        interests: ["coffee", "wellness", "technology"],
        lookingFor: resident.lookingFor,
        connectionStyles: ["one_on_one", "flexible"],
        availability: ["weekday_evenings", "weekend_mornings"],
        wantsFriendships: resident.wantsFriendships,
        wantsNetworking: resident.wantsNetworking,
        contactViaSms: true,
        contactViaEmail: true,
      }),
    })
    const body = await response.json().catch(() => ({}))
    results.push(
      checklistItem(
        `Resident join submit (${resident.email})`,
        response.ok,
        response.ok ? "Resident join request intake succeeded." : (body.error ?? "Resident join request failed."),
      ),
    )
  }

  const managerUser = await ensureUser(admin, { email: managerEmail, password, firstName: "Pilot" })
  const residentOneUser = await ensureUser(admin, { email: residentOneEmail, password, firstName: "Pilot" })
  const residentTwoUser = await ensureUser(admin, { email: residentTwoEmail, password, firstName: "Pilot" })

  const nowIso = new Date().toISOString()
  await admin
    .from("resident_join_requests")
    .update({ status: "approved", updated_at: nowIso })
    .eq("building_id", building.id)
    .in("normalized_email", [residentOneEmail, residentTwoEmail])

  const managerToken = await signIn(anon, managerEmail, password)
  const residentOneToken = await signIn(anon, residentOneEmail, password)
  const residentTwoToken = await signIn(anon, residentTwoEmail, password)

  const managerFetch = createFetcher(baseUrl, managerToken)
  const residentOneFetch = createFetcher(baseUrl, residentOneToken)
  const residentTwoFetch = createFetcher(baseUrl, residentTwoToken)
  const anonymousFetch = createFetcher(baseUrl, null)

  const unauthorizedManager = await anonymousFetch("GET", "/api/manager-dashboard")
  results.push(
    checklistItem(
      "Manager dashboard blocks anonymous access",
      unauthorizedManager.status === 401,
      `Status ${unauthorizedManager.status}`,
    ),
  )

  const managerAccess = await managerFetch("GET", "/api/manager-access")
  results.push(
    checklistItem(
      "Manager provisioning/access",
      managerAccess.ok && (managerAccess.json?.state === "authorized" || managerAccess.json?.state === "provisioned"),
      managerAccess.ok ? `${managerAccess.json?.state}` : (managerAccess.json?.error ?? "Manager access failed."),
      { state: managerAccess.json?.state ?? null },
    ),
  )

  const wrongResidentManagerAccess = await residentOneFetch("GET", "/api/manager-dashboard")
  results.push(
    checklistItem(
      "Resident blocked from manager dashboard",
      wrongResidentManagerAccess.status === 403 || wrongResidentManagerAccess.status === 401,
      `Status ${wrongResidentManagerAccess.status}`,
    ),
  )

  const residentOneBefore = await residentOneFetch("GET", "/api/resident-account")
  results.push(
    checklistItem(
      "Resident account before onboarding",
      residentOneBefore.ok && residentOneBefore.json?.status === "active",
      residentOneBefore.ok ? `needsSurveyCompletion=${residentOneBefore.json?.needsSurveyCompletion}` : (residentOneBefore.json?.error ?? "Resident account fetch failed."),
    ),
  )

  const onboardingPayload = {
    interests: ["coffee", "wellness", "technology"],
    lookingFor: ["friendships", "activity_partners", "professional_networking"],
    connectionStyles: ["one_on_one", "flexible"],
    availability: ["weekday_evenings", "weekend_mornings"],
    availabilityGrid: {
      monday: ["evening"],
      tuesday: [],
      wednesday: ["evening"],
      thursday: [],
      friday: [],
      saturday: ["morning"],
      sunday: [],
    },
    conciergeNote: "Looking for thoughtful neighbors for coffee, wellness, and startup conversations.",
    profileBasics: { hometown: "San Francisco" },
    compatibilityPrompts: {
      social_energy: "balanced",
      planning_style: "planned",
    },
    activityPreferences: ["coffee", "walking", "coworking"],
    networkingPreferences: {
      open_to_networking: true,
      open_to_mentoring: false,
      looking_for_mentorship: false,
    },
    introPreferences: {
      intro_pace: "2_per_month",
    },
    consentState: {
      community_guidelines_acknowledged: true,
      introductions_opt_in: true,
    },
  }

  const residentOneOnboarding = await residentOneFetch("POST", "/api/resident-account", onboardingPayload)
  const residentTwoOnboarding = await residentTwoFetch("POST", "/api/resident-account", {
    ...onboardingPayload,
    interests: ["coffee", "travel", "technology"],
    conciergeNote: "New to the building and open to coffee, ideas, and weekend walks.",
    compatibilityPrompts: {
      social_energy: "balanced",
      planning_style: "flexible",
    },
  })

  results.push(
    checklistItem(
      "Resident one onboarding persistence",
      residentOneOnboarding.ok && residentOneOnboarding.json?.needsSurveyCompletion === false,
      residentOneOnboarding.ok ? "Onboarding saved." : (residentOneOnboarding.json?.error ?? "Onboarding failed."),
    ),
    checklistItem(
      "Resident two onboarding persistence",
      residentTwoOnboarding.ok && residentTwoOnboarding.json?.needsSurveyCompletion === false,
      residentTwoOnboarding.ok ? "Onboarding saved." : (residentTwoOnboarding.json?.error ?? "Onboarding failed."),
    ),
  )

  const joinRows = await admin
    .from("resident_join_requests")
    .select("normalized_email, availability, availability_grid, onboarding_completed_at")
    .eq("building_id", building.id)
    .in("normalized_email", [residentOneEmail, residentTwoEmail])

  const joinMap = new Map((joinRows.data ?? []).map((row) => [row.normalized_email, row]))
  const rowOne = joinMap.get(residentOneEmail)
  results.push(
    checklistItem(
      "Availability grid persisted",
      Boolean(rowOne?.availability_grid?.monday?.includes?.("evening")) && Boolean(rowOne?.onboarding_completed_at),
      rowOne ? "availability_grid stored on resident_join_requests." : "No approved resident row found after onboarding.",
    ),
    checklistItem(
      "Broad availability derived",
      Array.isArray(rowOne?.availability) && rowOne.availability.includes("weekday_evenings"),
      rowOne ? JSON.stringify(rowOne.availability ?? []) : "No availability summary found.",
    ),
  )

  const managerCreateEvent = await managerFetch("POST", "/api/manager-events", {
    action: "save",
    name: `Pilot Rooftop Wine ${stamp}`,
    description: "Pilot event for live smoke testing.",
    venueName: "Rooftop Terrace",
    startDate: "2026-07-01T18:30:00.000Z",
    endDate: "2026-07-01T20:00:00.000Z",
  })

  let eventId = managerCreateEvent.json?.event?.id ?? null
  results.push(
    checklistItem(
      "Manager creates event draft",
      managerCreateEvent.ok && Boolean(eventId),
      managerCreateEvent.ok ? `Event ${eventId}` : (managerCreateEvent.json?.error ?? "Manager event save failed."),
    ),
  )

  if (eventId) {
    const managerPublishEvent = await managerFetch("POST", "/api/manager-events", {
      action: "publish",
      eventId,
    })
    results.push(
      checklistItem(
        "Manager publishes event",
        managerPublishEvent.ok && managerPublishEvent.json?.event?.active === true,
        managerPublishEvent.ok ? "Event is active." : (managerPublishEvent.json?.error ?? "Publish failed."),
      ),
    )
  }

  const communityFeed = await anonymousFetch("GET", "/api/community-feed")
  const feedEvent = Array.isArray(communityFeed.json?.events)
    ? communityFeed.json.events.find((event) => event.id === eventId)
    : null
  results.push(
    checklistItem(
      "Published event visible in community feed",
      communityFeed.ok && Boolean(feedEvent),
      communityFeed.ok ? `events=${communityFeed.json?.events?.length ?? 0}` : (communityFeed.json?.error ?? "Community feed failed."),
    ),
  )

  const residentRsvp = eventId
    ? await residentOneFetch("POST", "/api/event-rsvp", { eventId, attending: true })
    : { ok: false, status: 0, json: { error: "No event id." } }
  results.push(
    checklistItem(
      "Resident RSVP",
      residentRsvp.ok && residentRsvp.json?.attending === true,
      residentRsvp.ok ? "RSVP saved." : (residentRsvp.json?.error ?? "RSVP failed."),
    ),
  )

  const residentSuggestionPrivate = await residentOneFetch("POST", "/api/event-suggestions", {
    action: "create_suggestion",
    category: "venue",
    title: `Private lounge idea ${stamp}`,
    description: "Quiet conversation night in the resident lounge.",
    whyResidentsWouldLikeIt: "Low-pressure way to meet neighbors.",
    suggestedForEventType: "conversation",
    estimatedCostRange: "$$",
    contactInfo: "manager@building.test",
    websiteOrSocialLink: "https://example.com/lounge",
    location: "Resident lounge",
    residentVisibility: "private_to_management",
  })

  const privateSuggestionId = residentSuggestionPrivate.json?.suggestion?.id ?? null
  results.push(
    checklistItem(
      "Resident private suggestion submit",
      residentSuggestionPrivate.ok && Boolean(privateSuggestionId),
      residentSuggestionPrivate.ok ? "Private suggestion saved." : (residentSuggestionPrivate.json?.error ?? "Private suggestion failed."),
    ),
  )

  const residentSuggestionVisible = await residentOneFetch("POST", "/api/event-suggestions", {
    action: "create_suggestion",
    category: "workshop",
    title: `Visible workshop idea ${stamp}`,
    description: "Founders coffee circle.",
    whyResidentsWouldLikeIt: "Residents interested in ideas and career conversations.",
    suggestedForEventType: "networking",
    estimatedCostRange: "$",
    location: "Coworking lounge",
    residentVisibility: "visible_for_voting",
  })
  const visibleSuggestionId = residentSuggestionVisible.json?.suggestion?.id ?? null
  results.push(
    checklistItem(
      "Resident visible suggestion submit",
      residentSuggestionVisible.ok && Boolean(visibleSuggestionId),
      residentSuggestionVisible.ok ? "Visible suggestion saved." : (residentSuggestionVisible.json?.error ?? "Visible suggestion failed."),
    ),
  )

  const residentSupportVisible = visibleSuggestionId
    ? await residentTwoFetch("POST", "/api/event-suggestions", {
        action: "set_support",
        suggestionId: visibleSuggestionId,
        supportType: "would_attend",
        optionalComment: "Would join this if scheduled after work.",
      })
    : { ok: false, status: 0, json: { error: "No visible suggestion id." } }
  results.push(
    checklistItem(
      "Second resident can support visible suggestion",
      residentSupportVisible.ok,
      residentSupportVisible.ok ? "Support saved." : (residentSupportVisible.json?.error ?? "Support failed."),
    ),
  )

  const residentTwoSuggestionsView = await residentTwoFetch("GET", "/api/event-suggestions")
  const visibleSeenByResidentTwo = Array.isArray(residentTwoSuggestionsView.json?.suggestions)
    ? residentTwoSuggestionsView.json.suggestions.some((item) => item.id === visibleSuggestionId)
    : false
  const privateSeenByResidentTwo = Array.isArray(residentTwoSuggestionsView.json?.suggestions)
    ? residentTwoSuggestionsView.json.suggestions.some((item) => item.id === privateSuggestionId)
    : false
  results.push(
    checklistItem(
      "Resident cannot see private suggestion from another resident",
      residentTwoSuggestionsView.ok && visibleSeenByResidentTwo && !privateSeenByResidentTwo,
      residentTwoSuggestionsView.ok
        ? `visibleSeen=${visibleSeenByResidentTwo}, privateSeen=${privateSeenByResidentTwo}`
        : (residentTwoSuggestionsView.json?.error ?? "Resident suggestions view failed."),
    ),
  )

  const managerPlanningBefore = await managerFetch("GET", "/api/manager-event-planning")
  results.push(
    checklistItem(
      "Manager event planning loads",
      managerPlanningBefore.ok,
      managerPlanningBefore.ok ? "Manager planning snapshot loaded." : (managerPlanningBefore.json?.error ?? "Manager planning load failed."),
    ),
  )

  const managerBudgetSave = await managerFetch("POST", "/api/manager-event-planning", {
    action: "update_budget",
    eventBudgetAmount: 5000,
    eventBudgetPeriod: "monthly",
    preferredEventFrequency: "3 events per month",
    preferredEventTypes: ["music", "comedy", "dance"],
    eventPlanningNotes: "Live smoke test budget save.",
  })
  results.push(
    checklistItem(
      "Manager budget save",
      managerBudgetSave.ok && managerBudgetSave.json?.settings?.event_budget_amount === 5000,
      managerBudgetSave.ok ? "Budget settings persisted." : (managerBudgetSave.json?.error ?? "Budget save failed."),
    ),
  )

  const managerRecommendationCreate = await managerFetch("POST", "/api/manager-event-planning", {
    action: "save_recommendation",
    title: `Recommendation ${stamp}`,
    description: "Test recommendation draft.",
    estimatedMinCost: 300,
    estimatedMaxCost: 700,
    expectedAttendance: 20,
    recommendedCapacity: 24,
    suggestedLocation: "Rooftop Terrace",
    suggestedTiming: "Wednesday 6:30 PM",
    residentInterestSignalsUsed: [{ label: "Coffee", value: 2, source: "interest" }],
    reasonRecommended: "Residents signaled interest in low-pressure networking.",
    budgetFitLabel: "within_budget",
    source: "manual",
    status: "draft",
  })
  const recommendationId = managerRecommendationCreate.json?.recommendation?.id ?? null
  results.push(
    checklistItem(
      "Manager recommendation draft create",
      managerRecommendationCreate.ok && Boolean(recommendationId),
      managerRecommendationCreate.ok ? "Recommendation draft saved." : (managerRecommendationCreate.json?.error ?? "Recommendation create failed."),
    ),
  )

  const managerSuggestionShortlist = visibleSuggestionId
    ? await managerFetch("POST", "/api/manager-event-planning", {
        action: "update_suggestion_status",
        suggestionId: visibleSuggestionId,
        status: "shortlisted",
        residentVisibility: "visible_for_voting",
      })
    : { ok: false, status: 0, json: { error: "No visible suggestion id." } }
  results.push(
    checklistItem(
      "Manager can update suggestion status",
      managerSuggestionShortlist.ok && managerSuggestionShortlist.json?.suggestion?.status === "shortlisted",
      managerSuggestionShortlist.ok ? "Suggestion status updated." : (managerSuggestionShortlist.json?.error ?? "Suggestion status update failed."),
    ),
  )

  const managerDashboard = await managerFetch("GET", "/api/manager-dashboard")
  const dashboardEvent = Array.isArray(managerDashboard.json?.upcomingEvents)
    ? managerDashboard.json.upcomingEvents.find((event) => event.id === eventId)
    : null
  results.push(
    checklistItem(
      "Manager dashboard loads",
      managerDashboard.ok,
      managerDashboard.ok ? "Manager dashboard snapshot loaded." : (managerDashboard.json?.error ?? "Manager dashboard failed."),
    ),
    checklistItem(
      "Manager sees RSVP activity",
      managerDashboard.ok && dashboardEvent && Number(dashboardEvent.rsvpCount ?? 0) >= 1,
      managerDashboard.ok
        ? `rsvpCount=${dashboardEvent?.rsvpCount ?? 0}`
        : (managerDashboard.json?.error ?? "Dashboard RSVP verification failed."),
    ),
  )

  const residentsPreview = await residentOneFetch("GET", "/api/resident-preview")
  const candidates = Array.isArray(residentsPreview.json?.candidates) ? residentsPreview.json.candidates : []
  const residentTwoCandidate = candidates.find((candidate) => candidate.email === undefined && candidate.id === residentTwoUser.id) || candidates[0]
  results.push(
    checklistItem(
      "Resident preview/ranked candidates",
      residentsPreview.ok && candidates.length > 0,
      residentsPreview.ok ? `candidateCount=${candidates.length}` : (residentsPreview.json?.error ?? "Resident preview failed."),
    ),
  )

  let introductionId = null
  if (residentTwoCandidate?.id) {
    const introRequest = await residentOneFetch("POST", "/api/introductions/request", {
      targetUserId: residentTwoCandidate.id,
      introType: "friendship",
    })
    introductionId = introRequest.json?.id ?? introRequest.json?.introduction?.id ?? introRequest.json?.introductionId ?? null
    results.push(
      checklistItem(
        "Resident can request introduction",
        introRequest.ok,
        introRequest.ok ? "Introduction requested." : (introRequest.json?.error ?? "Introduction request failed."),
      ),
    )
  } else {
    results.push(checklistItem("Resident can request introduction", false, "No compatible candidate available to request."))
  }

  const residentTwoIntroductions = await residentTwoFetch("GET", "/api/introductions")
  const introForResidentTwo = Array.isArray(residentTwoIntroductions.json?.introductions)
    ? residentTwoIntroductions.json.introductions.find((item) => item.status === "requested" || item.status === "accepted" || item.status === "mutual")
    : null
  if (!introductionId) {
    introductionId = introForResidentTwo?.id ?? null
  }

  const introRespond = introductionId
    ? await residentTwoFetch("POST", "/api/introductions/respond", {
        introductionId,
        action: "accepted",
      })
    : { ok: false, status: 0, json: { error: "No introduction id." } }
  results.push(
    checklistItem(
      "Resident can respond to introduction",
      introRespond.ok,
      introRespond.ok ? "Introduction response saved." : (introRespond.json?.error ?? "Introduction respond failed."),
    ),
  )

  if (introductionId) {
    const deliveredUpdate = await admin
      .from("building_introductions")
      .update({
        status: "delivered",
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", introductionId)
      .select("id, status")
      .maybeSingle()

    results.push(
      checklistItem(
        "Introduction delivery state can advance",
        !deliveredUpdate.error && deliveredUpdate.data?.status === "delivered",
        deliveredUpdate.error ? deliveredUpdate.error.message : "Introduction marked delivered.",
      ),
    )
  }

  const privateLeakCheck = await residentTwoFetch("GET", "/api/resident-preview")
  const leakedSensitive = JSON.stringify(privateLeakCheck.json ?? {}).match(/service_role|password|normalized_phone|contact_info/i)
  results.push(
    checklistItem(
      "No obvious sensitive fields leaked in resident APIs",
      !leakedSensitive,
      leakedSensitive ? "Sensitive-looking field name detected in response payload." : "No obvious sensitive payload leakage detected.",
    ),
  )

  const output = {
    environment: {
      baseUrl,
      buildingSlug,
      previewFallback: allowPreviewFallback,
    },
    accounts: {
      managerEmail,
      residentOneEmail,
      residentTwoEmail,
      password,
    },
    results,
    notes,
  }

  console.log(JSON.stringify(output, null, 2))
}

main().catch((error) => {
  console.error(JSON.stringify({ fatal: error instanceof Error ? error.message : String(error) }, null, 2))
  process.exitCode = 1
})
