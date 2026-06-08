import { supabase } from "@/integrations/supabase/client";

export type ResidentJoinRequestStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "withdrawn";

export type ResidentJoinRequest = {
  id: string;
  building_id: string;
  first_name: string;
  last_name: string;
  email: string;
  normalized_email: string;
  phone_number: string;
  normalized_phone: string;
  unit_number: string;
  move_in_date: string | null;
  status: ResidentJoinRequestStatus;
  wants_friendships: boolean;
  wants_networking: boolean;
  contact_via_sms: boolean;
  contact_via_email: boolean;
  source: string;
  created_at: string;
  updated_at: string;
};

export type ResidentJoinRequestSummary = Record<ResidentJoinRequestStatus, number>;

export type ManagedBuilding = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  invite_code: string | null;
};

export async function listResidentJoinRequests(options: {
  buildingSlug: string;
  status?: ResidentJoinRequestStatus;
  limit?: number;
  offset?: number;
}) {
  const { data, error } = await supabase.functions.invoke("manage-resident-join-requests", {
    body: {
      action: "list",
      buildingSlug: options.buildingSlug,
      status: options.status,
      limit: options.limit ?? 50,
      offset: options.offset ?? 0,
    },
  });

  if (error) {
    throw new Error(error.message || "Unable to load resident join requests.");
  }

  if (data?.error) {
    throw new Error(String(data.error));
  }

  return data as {
    building: ManagedBuilding;
    requests: ResidentJoinRequest[];
    totalCount: number;
    summary: ResidentJoinRequestSummary;
  };
}

export async function updateResidentJoinRequestStatus(
  requestId: string,
  status: ResidentJoinRequestStatus,
) {
  const { data, error } = await supabase.functions.invoke("manage-resident-join-requests", {
    body: {
      action: "update",
      requestId,
      status,
    },
  });

  if (error) {
    throw new Error(error.message || "Unable to update resident join request.");
  }

  if (data?.error) {
    throw new Error(String(data.error));
  }

  return data as {
    success: true;
    request: ResidentJoinRequest;
  };
}
