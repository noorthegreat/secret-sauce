import type { User } from "@supabase/supabase-js"

import { getSupabaseAdmin } from "@/lib/supabase-admin"

type BuildingRow = {
  id: string
  name: string
  slug: string
  is_active: boolean
}

type ManagerMembershipRow = {
  building_id: string
}

type ManagerLeadRow = {
  id: string
  building_id: string
  first_name: string
  normalized_email: string
  provisioning_status: "awaiting_claim" | "provisioned" | "disabled"
  provisioned_user_id: string | null
  created_at: string
}

type SubscriptionRow = {
  building_id: string
  status: "lead" | "trial" | "active" | "past_due" | "paused" | "cancelled"
}

type ProfileRow = {
  id: string
  first_name: string
  building_id: string | null
}

export type ManagerAccessState =
  | "authorized"
  | "provisioned"
  | "awaiting_provisioning"
  | "no_matching_lead"
  | "building_inactive"
  | "conflict"

export type ManagerBuildingAccess = {
  state: ManagerAccessState
  message: string
  building: BuildingRow | null
  isAdmin: boolean
  isManager: boolean
  provisionedNow: boolean
}

function getBuildingSlug() {
  return (process.env.RESIDENT_CONCIERGE_BUILDING_SLUG ?? "chorus-apartments").trim().toLowerCase()
}

async function getConfiguredBuilding() {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("buildings")
    .select("id, name, slug, is_active")
    .eq("slug", getBuildingSlug())
    .maybeSingle<BuildingRow>()

  if (error || !data) {
    throw new Error("Unable to load the configured building.")
  }

  return data
}

async function getBuildingById(buildingId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("buildings")
    .select("id, name, slug, is_active")
    .eq("id", buildingId)
    .maybeSingle<BuildingRow>()

  if (error || !data) {
    throw new Error("Unable to load the manager building.")
  }

  return data
}

async function getBuildingsByIds(buildingIds: string[]) {
  if (buildingIds.length === 0) {
    return []
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("buildings")
    .select("id, name, slug, is_active")
    .in("id", buildingIds)
    .returns<BuildingRow[]>()

  if (error) {
    throw new Error("Unable to load manager building access.")
  }

  return data ?? []
}

async function isAdminUser(userId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  })

  if (error) {
    throw new Error("Unable to verify manager access.")
  }

  return Boolean(data)
}

async function getActiveManagerMemberships(userId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("building_memberships")
    .select("building_id")
    .eq("user_id", userId)
    .eq("role", "manager")
    .eq("status", "active")
    .returns<ManagerMembershipRow[]>()

  if (error) {
    throw new Error("Unable to verify manager access.")
  }

  return data ?? []
}

async function getBuildingLead(buildingId: string, normalizedEmail: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("building_manager_leads")
    .select("id, building_id, first_name, normalized_email, provisioning_status, provisioned_user_id, created_at")
    .eq("building_id", buildingId)
    .eq("normalized_email", normalizedEmail)
    .maybeSingle<ManagerLeadRow>()

  if (error) {
    throw new Error("Unable to verify manager access.")
  }

  return data
}

async function getBuildingLeadsByEmail(normalizedEmail: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("building_manager_leads")
    .select("id, building_id, first_name, normalized_email, provisioning_status, provisioned_user_id, created_at")
    .eq("normalized_email", normalizedEmail)
    .order("created_at", { ascending: false })
    .returns<ManagerLeadRow[]>()

  if (error) {
    throw new Error("Unable to verify manager access.")
  }

  return data ?? []
}

async function getBuildingSubscription(buildingId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("building_subscriptions")
    .select("status")
    .eq("building_id", buildingId)
    .maybeSingle<SubscriptionRow>()

  if (error) {
    throw new Error("Unable to verify manager access.")
  }

  return data
}

async function getBuildingSubscriptions(buildingIds: string[]) {
  if (buildingIds.length === 0) {
    return []
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("building_subscriptions")
    .select("building_id, status")
    .in("building_id", buildingIds)
    .returns<SubscriptionRow[]>()

  if (error) {
    throw new Error("Unable to verify manager access.")
  }

  return data ?? []
}

async function ensureManagerProfile(user: Pick<User, "id">, building: BuildingRow, lead: ManagerLeadRow) {
  const supabase = getSupabaseAdmin()
  const nowIso = new Date().toISOString()
  const { data: existing, error: loadError } = await supabase
    .from("profiles")
    .select("id, first_name, building_id")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>()

  if (loadError) {
    throw new Error("Unable to prepare the building-team profile.")
  }

  if (!existing) {
    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      first_name: lead.first_name?.trim() || "Manager",
      completed_questionnaire: false,
      completed_friendship_questionnaire: false,
      is_paused: false,
      building_id: building.id,
      updated_at: nowIso,
    })

    if (error) {
      throw new Error("Unable to create the building-team profile.")
    }

    return
  }

  const updatePayload: Partial<ProfileRow> & { updated_at: string } = {
    updated_at: nowIso,
  }

  if (!existing.first_name?.trim()) {
    updatePayload.first_name = lead.first_name?.trim() || "Manager"
  }

  if (!existing.building_id) {
    updatePayload.building_id = building.id
  }

  const { error } = await supabase.from("profiles").update(updatePayload).eq("id", user.id)

  if (error) {
    throw new Error("Unable to update the building-team profile.")
  }
}

async function ensureManagerMembership(userId: string, buildingId: string) {
  const supabase = getSupabaseAdmin()
  const nowIso = new Date().toISOString()
  const { error } = await supabase.from("building_memberships").upsert(
    {
      building_id: buildingId,
      user_id: userId,
      role: "manager",
      status: "active",
      joined_at: nowIso,
      updated_at: nowIso,
    },
    {
      onConflict: "building_id,user_id",
    },
  )

  if (error) {
    throw new Error("Unable to provision the building-team membership.")
  }
}

async function markLeadProvisioned(leadId: string, userId: string) {
  const supabase = getSupabaseAdmin()
  const nowIso = new Date().toISOString()
  const { error } = await supabase
    .from("building_manager_leads")
    .update({
      provisioning_status: "provisioned",
      provisioned_user_id: userId,
      provisioned_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", leadId)

  if (error) {
    throw new Error("Unable to finalize building-team access.")
  }
}

function isProvisionableSubscription(
  status: SubscriptionRow["status"] | null | undefined,
) {
  return ["lead", "trial", "active"].includes(status ?? "lead")
}

function rankLeadCandidate({
  lead,
  configuredBuildingId,
  currentUserId,
  subscriptionStatus,
}: {
  lead: ManagerLeadRow
  configuredBuildingId: string
  currentUserId: string
  subscriptionStatus: SubscriptionRow["status"] | null | undefined
}) {
  let score = 0

  if (lead.provisioned_user_id === currentUserId) {
    score += 200
  }

  if (lead.building_id === configuredBuildingId) {
    score += 120
  }

  if (subscriptionStatus === "active") {
    score += 80
  } else if (subscriptionStatus === "trial") {
    score += 60
  } else if (subscriptionStatus === "lead") {
    score += 40
  }

  return score
}

function selectManagerLeadCandidate({
  candidates,
  configuredBuildingId,
  currentUserId,
  subscriptionsByBuildingId,
}: {
  candidates: ManagerLeadRow[]
  configuredBuildingId: string
  currentUserId: string
  subscriptionsByBuildingId: Map<string, SubscriptionRow["status"]>
}) {
  return candidates
    .slice()
    .sort((left, right) => {
      const rightScore = rankLeadCandidate({
        lead: right,
        configuredBuildingId,
        currentUserId,
        subscriptionStatus: subscriptionsByBuildingId.get(right.building_id),
      })
      const leftScore = rankLeadCandidate({
        lead: left,
        configuredBuildingId,
        currentUserId,
        subscriptionStatus: subscriptionsByBuildingId.get(left.building_id),
      })

      if (rightScore !== leftScore) {
        return rightScore - leftScore
      }

      return right.created_at.localeCompare(left.created_at)
    })[0] ?? null
}

export async function resolveManagerBuildingAccess(
  user: Pick<User, "id" | "email">,
): Promise<ManagerBuildingAccess> {
  const building = await getConfiguredBuilding()
  const [admin, memberships] = await Promise.all([
    isAdminUser(user.id),
    getActiveManagerMemberships(user.id),
  ])

  if (admin) {
    return {
      state: "authorized",
      message: `Admin access is active for ${building.name}.`,
      building,
      isAdmin: true,
      isManager: true,
      provisionedNow: false,
    }
  }

  const configuredMembership = memberships.find((membership) => membership.building_id === building.id)
  if (configuredMembership) {
    return {
      state: "authorized",
      message: building.is_active
        ? `Building-team access is active for ${building.name}.`
        : `Building-team access is active for ${building.name}. Resident access will stay paused until the building is launched.`,
      building,
      isAdmin: false,
      isManager: true,
      provisionedNow: false,
    }
  }

  if (memberships.length === 1) {
    const membershipBuilding = await getBuildingById(memberships[0].building_id)
    return {
      state: "authorized",
      message: membershipBuilding.is_active
        ? `Building-team access is active for ${membershipBuilding.name}.`
        : `Building-team access is active for ${membershipBuilding.name}. Resident access will stay paused until the building is launched.`,
      building: membershipBuilding,
      isAdmin: false,
      isManager: true,
      provisionedNow: false,
    }
  }

  if (memberships.length > 1) {
    return {
      state: "conflict",
      message:
        "This account is active as a building manager in more than one community. Pilot manager access needs an explicit building selection before Community Pulse can open.",
      building,
      isAdmin: false,
      isManager: false,
      provisionedNow: false,
    }
  }

  const normalizedEmail = user.email?.trim().toLowerCase()
  if (!normalizedEmail) {
    return {
      state: "awaiting_provisioning",
      message: "Sign in with the same work email used for the pilot request to unlock building-team access.",
      building,
      isAdmin: false,
      isManager: false,
      provisionedNow: false,
    }
  }

  const [configuredLead, allLeads] = await Promise.all([
    getBuildingLead(building.id, normalizedEmail),
    getBuildingLeadsByEmail(normalizedEmail),
  ])

  const uniqueLeadBuildingIds = Array.from(new Set(allLeads.map((lead) => lead.building_id)))
  const [leadBuildings, subscriptions] = await Promise.all([
    getBuildingsByIds(uniqueLeadBuildingIds),
    getBuildingSubscriptions(uniqueLeadBuildingIds),
  ])

  const buildingsById = new Map(leadBuildings.map((row) => [row.id, row]))
  const subscriptionsByBuildingId = new Map(subscriptions.map((row) => [row.building_id, row.status]))

  const eligibleLeads = allLeads.filter((lead) => {
    if (lead.provisioning_status === "disabled") {
      return false
    }

    if (lead.provisioned_user_id && lead.provisioned_user_id !== user.id) {
      return false
    }

    return isProvisionableSubscription(subscriptionsByBuildingId.get(lead.building_id))
  })

  const claimedByAnotherAccount = allLeads.some(
    (lead) => Boolean(lead.provisioned_user_id) && lead.provisioned_user_id !== user.id,
  )

  const disabledLead = configuredLead?.provisioning_status === "disabled"
  if (disabledLead) {
    return {
      state: "awaiting_provisioning",
      message:
        "This building-team account is temporarily paused. Ask Fifth Circle to re-enable your pilot access.",
      building,
      isAdmin: false,
      isManager: false,
      provisionedNow: false,
    }
  }

  if (configuredLead?.provisioned_user_id && configuredLead.provisioned_user_id !== user.id) {
    return {
      state: "conflict",
      message:
        "This building-team pilot request has already been claimed by a different account. Ask Fifth Circle to review the provisioning record before continuing.",
      building,
      isAdmin: false,
      isManager: false,
      provisionedNow: false,
    }
  }

  const configuredSubscriptionStatus = subscriptionsByBuildingId.get(building.id)
  if (configuredLead && !isProvisionableSubscription(configuredSubscriptionStatus)) {
    return {
      state: "awaiting_provisioning",
      message:
        "This building subscription is not currently in a live pilot state. Ask Fifth Circle to finish setup before using Community Pulse.",
      building,
      isAdmin: false,
      isManager: false,
      provisionedNow: false,
    }
  }

  const selectedLead =
    configuredLead && isProvisionableSubscription(configuredSubscriptionStatus)
      ? configuredLead
      : selectManagerLeadCandidate({
          candidates: eligibleLeads,
          configuredBuildingId: building.id,
          currentUserId: user.id,
          subscriptionsByBuildingId,
        })

  if (!selectedLead) {
    if (claimedByAnotherAccount) {
      return {
        state: "conflict",
        message:
          "A building-team pilot request already exists for this email, but it has been claimed by a different account. Ask Fifth Circle to review the manager provisioning record.",
        building,
        isAdmin: false,
        isManager: false,
        provisionedNow: false,
      }
    }

    if (allLeads.some((lead) => !isProvisionableSubscription(subscriptionsByBuildingId.get(lead.building_id)))) {
      return {
        state: "awaiting_provisioning",
        message:
          "We found your building-team request, but the subscription is not yet in a pilot-ready state. Ask Fifth Circle to finish setup before using Community Pulse.",
        building,
        isAdmin: false,
        isManager: false,
        provisionedNow: false,
      }
    }

    return {
      state: "no_matching_lead",
      message:
        "We could not find a building-team pilot request for this email. Use the same work email submitted on the pilot request, or ask Fifth Circle to provision your access.",
      building,
      isAdmin: false,
      isManager: false,
      provisionedNow: false,
    }
  }

  const selectedBuilding = buildingsById.get(selectedLead.building_id) ?? (selectedLead.building_id === building.id ? building : null)

  if (!selectedBuilding) {
    throw new Error("Unable to resolve the building tied to this manager request.")
  }

  await ensureManagerProfile(user, selectedBuilding, selectedLead)
  await ensureManagerMembership(user.id, selectedBuilding.id)
  await markLeadProvisioned(selectedLead.id, user.id)

  const provisionedMessage =
    selectedLead.building_id === building.id
      ? selectedBuilding.is_active
        ? `Building-team access is now active for ${selectedBuilding.name}.`
        : `Building-team access is now active for ${selectedBuilding.name}. Resident access can stay paused until the pilot launch is ready.`
      : selectedBuilding.is_active
        ? `Building-team access is now active for ${selectedBuilding.name}. We used the most recent pilot request tied to this work email.`
        : `Building-team access is now active for ${selectedBuilding.name}. We used the most recent pilot request tied to this work email, and resident access can stay paused until launch.`

  return {
    state: "provisioned",
    message: provisionedMessage,
    building: selectedBuilding,
    isAdmin: false,
    isManager: true,
    provisionedNow: true,
  }
}

export async function requireManagerBuilding(user: Pick<User, "id" | "email">) {
  const access = await resolveManagerBuildingAccess(user)

  if (!access.building || (access.state !== "authorized" && access.state !== "provisioned")) {
    throw new Error(access.message)
  }

  return access.building
}
