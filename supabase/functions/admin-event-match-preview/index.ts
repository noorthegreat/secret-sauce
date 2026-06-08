import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { authenticateEdgeRequest } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateEdgeRequest(req, { requireAdmin: true });
    if (auth.error) {
      return new Response(JSON.stringify({ error: auth.error.message }), {
        status: auth.error.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { eventId } = await req.json();
    if (typeof eventId !== "string" || !UUID_PATTERN.test(eventId.trim())) {
      return new Response(JSON.stringify({ error: "Invalid eventId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = auth.context!.supabase;

    const { data: matchRows, error: matchesError } = await supabase
      .from("matches")
      .select("user_id, matched_user_id, compatibility_score, match_type")
      .eq("from_algorithm", "event")
      .eq("event_id", eventId.trim())
      .order("compatibility_score", { ascending: false });

    if (matchesError) throw matchesError;

    const dedupedRows = (matchRows || []).filter((row, index, allRows) => {
      const pairKey = [row.user_id, row.matched_user_id].sort().join(":");
      return (
        index ===
        allRows.findIndex(
          (candidate) =>
            [candidate.user_id, candidate.matched_user_id].sort().join(":") === pairKey,
        )
      );
    });

    if (dedupedRows.length === 0) {
      return new Response(JSON.stringify({ matches: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userIds = Array.from(
      new Set(
        dedupedRows.flatMap((row) => [row.user_id, row.matched_user_id]).filter(Boolean),
      ),
    );

    const [
      { data: profileRows, error: profileError },
      { data: privateRows, error: privateError },
    ] = await Promise.all([
      supabase.from("profiles").select("id, first_name").in("id", userIds),
      supabase
        .from("private_profile_data")
        .select("user_id, last_name, email")
        .in("user_id", userIds),
    ]);

    if (profileError) throw profileError;
    if (privateError) throw privateError;

    const profilesById = new Map((profileRows || []).map((row: any) => [row.id, row]));
    const privateByUserId = new Map((privateRows || []).map((row: any) => [row.user_id, row]));

    const matches = dedupedRows
      .map((row: any) => {
        const user1Profile = profilesById.get(row.user_id);
        const user2Profile = profilesById.get(row.matched_user_id);
        const user1Private = privateByUserId.get(row.user_id);
        const user2Private = privateByUserId.get(row.matched_user_id);

        if (!user1Profile || !user2Profile) return null;

        return {
          user1_id: row.user_id,
          user2_id: row.matched_user_id,
          compatibility_score: Number(row.compatibility_score || 0),
          match_type: row.match_type === "friendship" ? "friendship" : "relationship",
          user1_profile: {
            id: row.user_id,
            first_name: user1Profile.first_name || "Unknown",
            last_name: user1Private?.last_name ?? null,
            email: user1Private?.email ?? null,
          },
          user2_profile: {
            id: row.matched_user_id,
            first_name: user2Profile.first_name || "Unknown",
            last_name: user2Private?.last_name ?? null,
            email: user2Private?.email ?? null,
          },
        };
      })
      .filter(Boolean);

    return new Response(JSON.stringify({ matches }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in admin-event-match-preview:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
