import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.25.76";
import { authenticateEdgeRequest, canManageBuilding } from "../_shared/auth.ts";
import { UUID_PATTERN, resolveBuildingByRef } from "../_shared/buildings.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const listSchema = z.object({
  action: z.literal("list"),
  buildingId: z.string().trim().optional(),
  buildingSlug: z.string().trim().optional(),
  status: z.enum(["pending_review", "approved", "rejected", "withdrawn"]).optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

const updateSchema = z.object({
  action: z.literal("update"),
  requestId: z.string().trim().regex(UUID_PATTERN, "Invalid requestId"),
  status: z.enum(["pending_review", "approved", "rejected", "withdrawn"]),
});

const requestSchema = z.union([listSchema, updateSchema]);

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const auth = await authenticateEdgeRequest(req, {
      requireAdmin: false,
      allowServiceRole: false,
    });

    if (auth.error) {
      return jsonResponse(auth.error.status, { error: auth.error.message });
    }

    const body = await req.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return jsonResponse(400, { error: "Invalid request body." });
    }

    const context = auth.context!;
    const supabase = context.supabase;

    if (parsed.data.action === "list") {
      const building = await resolveBuildingByRef(supabase, {
        buildingId: parsed.data.buildingId,
        buildingSlug: parsed.data.buildingSlug,
      });

      if (!building) {
        return jsonResponse(404, { error: "Building not found." });
      }

      if (!canManageBuilding(context, building.id)) {
        return jsonResponse(403, { error: "Forbidden" });
      }

      let query = supabase
        .from("resident_join_requests")
        .select("*", { count: "exact" })
        .eq("building_id", building.id)
        .order("created_at", { ascending: false })
        .range(parsed.data.offset, parsed.data.offset + parsed.data.limit - 1);

      if (parsed.data.status) {
        query = query.eq("status", parsed.data.status);
      }

      const [{ data: requests, error: requestsError, count }, { data: summaryRows, error: summaryError }] = await Promise.all([
        query,
        supabase
          .from("resident_join_requests")
          .select("status")
          .eq("building_id", building.id),
      ]);

      if (requestsError) {
        throw requestsError;
      }

      if (summaryError) {
        throw summaryError;
      }

      const summary = {
        pending_review: 0,
        approved: 0,
        rejected: 0,
        withdrawn: 0,
      };

      for (const row of summaryRows ?? []) {
        const status = row.status as keyof typeof summary;
        if (status in summary) {
          summary[status] += 1;
        }
      }

      return jsonResponse(200, {
        building,
        requests: requests ?? [],
        totalCount: count ?? 0,
        summary,
      });
    }

    const { data: existingRequest, error: requestLookupError } = await supabase
      .from("resident_join_requests")
      .select("id, building_id, status")
      .eq("id", parsed.data.requestId)
      .maybeSingle();

    if (requestLookupError) {
      throw requestLookupError;
    }

    if (!existingRequest) {
      return jsonResponse(404, { error: "Join request not found." });
    }

    if (!canManageBuilding(context, existingRequest.building_id)) {
      return jsonResponse(403, { error: "Forbidden" });
    }

    const { data: updatedRequest, error: updateError } = await supabase
      .from("resident_join_requests")
      .update({
        status: parsed.data.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.requestId)
      .select("*")
      .single();

    if (updateError) {
      throw updateError;
    }

    return jsonResponse(200, {
      success: true,
      request: updatedRequest,
    });
  } catch (error) {
    console.error("Error in manage-resident-join-requests:", error);
    return jsonResponse(500, {
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});
