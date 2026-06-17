type ResidentJoinPayload = {
  inviteCode: string
  firstName: string
  lastName: string
  email: string
  phone: string
  unitNumber: string
  moveInDate?: string
  occupation?: string
  ageRange?: "18-24" | "25-34" | "35-44" | "45-54" | "55-64" | "65+"
  introduction?: string
  interests?: string[]
  lookingFor: string[]
  connectionStyles?: string[]
  availability?: string[]
  amenityPreferences?: string[]
  wantsFriendships: boolean
  wantsNetworking: boolean
  contactViaSms: boolean
  contactViaEmail: boolean
}

type ManagerLeadPayload = {
  buildingName: string
  city: string
  stateRegion?: string
  managerFirstName: string
  managerLastName: string
  managerEmail: string
  managerPhone: string
  jobTitle?: string
  unitCount: number
  notes?: string
  contactViaSms: boolean
  contactViaEmail: boolean
}

type IntakeResponse = {
  success: boolean
  message: string
  inviteCode?: string
  buildingSlug?: string
  buildingName?: string
  error?: string
}

function getPublicSupabaseUrl() {
  const value =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim()
  if (!value) {
    throw new Error("Missing public Supabase URL. Set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL.")
  }
  return value
}

function getPublicSupabaseAnonKey() {
  const value =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!value) {
    throw new Error(
      "Missing public Supabase key. Set NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    )
  }
  return value
}

async function invokePublicFunction<TPayload extends Record<string, unknown>>(
  functionName: string,
  payload: TPayload,
) {
  const url = `${getPublicSupabaseUrl()}/functions/v1/${functionName}`
  const anonKey = getPublicSupabaseAnonKey()

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify(payload),
  })

  const body = (await response.json().catch(() => ({ error: "Unexpected response." }))) as IntakeResponse

  if (!response.ok || body.error) {
    throw new Error(body.error || body.message || "Unable to process your request.")
  }

  return body
}

export async function submitResidentJoinRequest(payload: ResidentJoinPayload) {
  return invokePublicFunction("submit-resident-join-request", payload)
}

export async function submitBuildingManagerLead(payload: ManagerLeadPayload) {
  return invokePublicFunction("submit-building-manager-lead", payload)
}
