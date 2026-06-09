import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type BuildingRow = Tables<"buildings">;
type BuildingMembershipRow = Tables<"building_memberships">;
type BuildingSubscriptionRow = Tables<"building_subscriptions">;
type EventRow = Tables<"events">;
type ResidentJoinRequestRow = Tables<"resident_join_requests">;

export type ResidentConciergeDomainMap = {
  residents: string[];
  events: string[];
  buildingCommunity: string[];
  intake: string[];
  stillMocked: string[];
};

export const residentConciergeDomainMap: ResidentConciergeDomainMap = {
  residents: [
    "profiles",
    "private_profile_data",
    "building_memberships",
    "resident_join_requests",
  ],
  events: [
    "events",
    "event_enrollments",
  ],
  buildingCommunity: [
    "buildings",
    "building_memberships",
    "building_subscriptions",
    "user_roles",
  ],
  intake: [
    "building_manager_leads",
    "public_intake_attempts",
    "resident_join_requests",
  ],
  stillMocked: [
    "amenities",
    "amenity import flow",
    "amenity-level usage analytics",
  ],
};

export type ResidentConciergeManagerSnapshot = {
  building: Pick<
    BuildingRow,
    "id" | "name" | "slug" | "city" | "state_region" | "timezone" | "invite_code" | "is_active"
  >;
  residentCounts: {
    activeResidents: number;
    activeManagers: number;
    totalMemberships: number;
  };
  requestCounts: {
    pendingReview: number;
    approved: number;
    rejected: number;
    withdrawn: number;
    total: number;
  };
  subscription: Pick<
    BuildingSubscriptionRow,
    "status" | "plan_code" | "billing_interval" | "monthly_fee_cents" | "resident_capacity"
  > | null;
  upcomingEvents: Array<
    Pick<
      EventRow,
      "id" | "name" | "slug" | "start_date" | "venue_name" | "city" | "is_public" | "active"
    >
  >;
  topInterests: Array<{ label: string; count: number }>;
  topGoals: Array<{ label: string; count: number }>;
  accessNotes: {
    subscriptionVisibility: "available" | "restricted";
    managerLeadsVisibility: "admin_only";
    amenitiesStatus: "mocked";
  };
};

function assertBuildingSlug(buildingSlug: string) {
  const normalized = buildingSlug.trim().toLowerCase();

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    throw new Error("Invalid building slug.");
  }

  return normalized;
}

function countValues(values: string[], limit = 5) {
  const counts = new Map<string, number>();

  values.forEach((value) => {
    const normalized = value.trim();
    if (!normalized) return;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  });

  return [...counts.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function countByStatus(requests: Pick<ResidentJoinRequestRow, "status">[]) {
  return requests.reduce(
    (summary, request) => {
      switch (request.status) {
        case "pending_review":
          summary.pendingReview += 1;
          break;
        case "approved":
          summary.approved += 1;
          break;
        case "rejected":
          summary.rejected += 1;
          break;
        case "withdrawn":
          summary.withdrawn += 1;
          break;
      }

      summary.total += 1;
      return summary;
    },
    {
      pendingReview: 0,
      approved: 0,
      rejected: 0,
      withdrawn: 0,
      total: 0,
    }
  );
}

export async function getResidentConciergeManagerSnapshot(buildingSlug: string) {
  const slug = assertBuildingSlug(buildingSlug);

  const { data: building, error: buildingError } = await supabase
    .from("buildings")
    .select("id, name, slug, city, state_region, timezone, invite_code, is_active")
    .eq("slug", slug)
    .maybeSingle();

  if (buildingError) {
    throw new Error(buildingError.message || "Unable to load building.");
  }

  if (!building) {
    throw new Error("Building not found or not accessible.");
  }

  const [
    activeResidentsResult,
    activeManagersResult,
    totalMembershipsResult,
    requestsResult,
    eventsResult,
    subscriptionResult,
  ] = await Promise.all([
    supabase
      .from("building_memberships")
      .select("*", { count: "exact", head: true })
      .eq("building_id", building.id)
      .eq("role", "resident")
      .eq("status", "active"),
    supabase
      .from("building_memberships")
      .select("*", { count: "exact", head: true })
      .eq("building_id", building.id)
      .eq("role", "manager")
      .eq("status", "active"),
    supabase
      .from("building_memberships")
      .select("*", { count: "exact", head: true })
      .eq("building_id", building.id),
    supabase
      .from("resident_join_requests")
      .select("status, interests, looking_for")
      .eq("building_id", building.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("events")
      .select("id, name, slug, start_date, venue_name, city, is_public, active")
      .eq("building_id", building.id)
      .order("start_date", { ascending: true })
      .limit(6),
    supabase
      .from("building_subscriptions")
      .select("status, plan_code, billing_interval, monthly_fee_cents, resident_capacity")
      .eq("building_id", building.id)
      .maybeSingle(),
  ]);

  const countErrors = [
    activeResidentsResult.error,
    activeManagersResult.error,
    totalMembershipsResult.error,
    requestsResult.error,
    eventsResult.error,
  ].filter(Boolean);

  if (countErrors.length > 0) {
    throw new Error(countErrors[0]?.message || "Unable to load building analytics.");
  }

  const requests = requestsResult.data ?? [];
  const topInterests = countValues(
    requests.flatMap((request) => request.interests ?? []),
  );
  const topGoals = countValues(
    requests.flatMap((request) => request.looking_for ?? []),
  );

  return {
    building,
    residentCounts: {
      activeResidents: activeResidentsResult.count ?? 0,
      activeManagers: activeManagersResult.count ?? 0,
      totalMemberships: totalMembershipsResult.count ?? 0,
    },
    requestCounts: countByStatus(requests),
    subscription: subscriptionResult.error ? null : subscriptionResult.data,
    upcomingEvents: eventsResult.data ?? [],
    topInterests,
    topGoals,
    accessNotes: {
      subscriptionVisibility: subscriptionResult.error ? "restricted" : "available",
      managerLeadsVisibility: "admin_only",
      amenitiesStatus: "mocked",
    },
  } satisfies ResidentConciergeManagerSnapshot;
}

export async function listResidentConciergeBuildings() {
  const { data, error } = await supabase
    .from("buildings")
    .select("id, name, slug, city, state_region, timezone, invite_code, is_active")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message || "Unable to load buildings.");
  }

  return data ?? [];
}

