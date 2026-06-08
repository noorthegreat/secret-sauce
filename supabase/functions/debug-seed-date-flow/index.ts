import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = authData.user.id;

    const body = await req.json().catch(() => ({}));
    const seedDate: boolean = body?.seedDate ?? false;
    const seedPartnerVote: boolean = body?.seedPartnerVote ?? false;

    // Admin check
    const { data: hasAdminRole } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!hasAdminRole) {
      return new Response(JSON.stringify({ error: "Admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find ONE eligible test/admin user to match with
    const { data: roleRows, error: roleRowsError } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["test", "admin"]);
    if (roleRowsError) throw roleRowsError;

    const eligibleRoleUserIds = Array.from(
      new Set((roleRows || []).map((r: { user_id: string }) => r.user_id)),
    ).filter((id) => id !== userId);

    if (eligibleRoleUserIds.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: "No eligible test/admin users found. Create at least one additional test/admin user.",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: candidateProfiles, error: candidatesError } = await supabase
      .from("profiles")
      .select("id")
      .in("id", eligibleRoleUserIds)
      .eq("completed_questionnaire", true)
      .neq("is_paused", true)
      .limit(1);

    if (candidatesError) throw candidatesError;
    if (!candidateProfiles || candidateProfiles.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: "No eligible test/admin users with completed questionnaire found.",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const matchedUserId = candidateProfiles[0].id;

    // Step 1: Clean up any existing matches, likes, dislikes, and dates between the pair
    const pairFilter = `and(user_id.eq.${userId},matched_user_id.eq.${matchedUserId}),and(user_id.eq.${matchedUserId},matched_user_id.eq.${userId})`;
    const pairFilterLikes = `and(user_id.eq.${userId},liked_user_id.eq.${matchedUserId}),and(user_id.eq.${matchedUserId},liked_user_id.eq.${userId})`;
    const pairFilterDislikes = `and(user_id.eq.${userId},disliked_user_id.eq.${matchedUserId}),and(user_id.eq.${matchedUserId},disliked_user_id.eq.${userId})`;
    const pairFilterDates = `and(user1_id.eq.${userId},user2_id.eq.${matchedUserId}),and(user1_id.eq.${matchedUserId},user2_id.eq.${userId})`;

    await Promise.all([
      supabase.from("matches").delete().or(pairFilter),
      supabase.from("likes").delete().or(pairFilterLikes),
      supabase.from("dislikes").delete().or(pairFilterDislikes),
      supabase.from("dates").delete().or(pairFilterDates),
    ]);

    // Step 2: Create ONE mutual match pair
    const { error: insertMatchesError } = await supabase.from("matches").insert([
      {
        user_id: userId,
        matched_user_id: matchedUserId,
        compatibility_score: 99,
        from_algorithm: "relationship",
        match_type: "relationship",
      },
      {
        user_id: matchedUserId,
        matched_user_id: userId,
        compatibility_score: 99,
        from_algorithm: "relationship",
        match_type: "relationship",
      },
    ]);
    if (insertMatchesError) throw insertMatchesError;

    // Step 3: Create mutual likes (the matched user already likes you)
    const { error: likesError } = await supabase.from("likes").insert([
      { user_id: matchedUserId, liked_user_id: userId },
      // Also like them back so a date doesn't get created via the normal flow later.
      { user_id: userId, liked_user_id: matchedUserId },
    ]);
    if (likesError) throw likesError;

    let dateId: string | null = null;
    if (seedDate) {
      const firstPossibleDay = new Date().toISOString().split("T")[0];

      // Pick 2 venues with slot-format open hours (0–47) and set as venue_options.
      const { data: venues, error: venuesError } = await supabase
        .from("venues")
        .select("id, hours")
        .not("hours", "is", null)
        .limit(50);
      if (venuesError) throw venuesError;

      const hasAnyOpenHours = (hours: any) => {
        if (!hours || typeof hours !== "object") return false;
        for (const day of ["0", "1", "2", "3", "4", "5", "6"]) {
          const h = (hours as any)[day];
          if (!h || typeof h !== "object") continue;
          const start = Number((h as any).start);
          const end = Number((h as any).end);
          if (Number.isFinite(start) && Number.isFinite(end) && end > start) return true;
        }
        return false;
      };

      // DateView overlap uses 30-min slots (0–47). Ensure venue hours are in slot format too,
      // otherwise overlap will always be null (old 0–23 hour format).
      const hasSlotFormatHours = (hours: any) => {
        if (!hours || typeof hours !== "object") return false;
        for (const day of ["0", "1", "2", "3", "4", "5", "6"]) {
          const h = (hours as any)[day];
          if (!h || typeof h !== "object") continue;
          const start = Number((h as any).start);
          const end = Number((h as any).end);
          if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
          // slot-format hours typically reach up to 48; old hour-format tops out at 23
          if (start >= 24 || end > 24) return true;
        }
        return false;
      };

      const goodVenues = (venues || [])
        .filter((v: any) => hasAnyOpenHours(v.hours))
        .filter((v: any) => hasSlotFormatHours(v.hours));
      const venueOptions = goodVenues.slice(0, 2).map((v: any) => v.id).filter(Boolean);

      // Give the debug partner a LIMITED availability — the full open hours of a
      // seeded venue, but on only 2 weekdays — so the no-overlap chips (B1) and
      // the could-flex fallback (B2) are actually reachable while testing.
      // (Previously the partner was free all week, so overlap was automatic and
      // those paths could never be exercised.)
      const refHours = (goodVenues[0]?.hours ?? null) as Record<string, { start: number; end: number } | null> | null;
      const partnerAvail: Record<string, number[]> = {};
      if (refHours) {
        let daysAdded = 0;
        for (const day of ["2", "4", "6", "1", "3", "5", "0"]) { // prefer Tue, Thu, Sat
          if (daysAdded >= 2) break;
          const h = refHours[day];
          if (!h || typeof h !== "object") continue;
          const start = Number(h.start);
          const end = Number(h.end);
          if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
          const slots: number[] = [];
          for (let s = start; s < end; s++) slots.push(s);
          if (slots.length) { partnerAvail[day] = slots; daysAdded++; }
        }
      }
      if (Object.keys(partnerAvail).length === 0) {
        // Fallback if no venue hours resolved: Thu 18:00–21:00 and Sat 13:00–17:00.
        partnerAvail["4"] = [36, 37, 38, 39, 40, 41];
        partnerAvail["6"] = [26, 27, 28, 29, 30, 31, 32, 33];
      }

      const { data: newDate, error: dateError } = await supabase
        .from("dates")
        .insert({
          user1_id: userId,
          user2_id: matchedUserId,
          match_type: "relationship",
          first_possible_day: firstPossibleDay,
          // Debug flow goal:
          // - you (user1) will enter availability manually
          // - debug partner (user2) already has availability so overlap exists immediately
          user1_availability: {}, // you enter availability manually in the planner
          user2_availability: partnerAvail,
          // Seed venue options up-front; DateView only shows voting UI after the current user adds availability.
          venue_options: venueOptions.length >= 2 ? venueOptions : null,
          status: "pending",
          // Do NOT set confirmed_venue_id — it should only be set when BOTH users have voted.
          confirmed_venue_id: null,
          ...(seedPartnerVote && venueOptions.length >= 1 ? { user2_venue_vote: venueOptions[0] } : {}),
          user1_venue_vote: null,
        })
        .select("id")
        .single();
      if (dateError) throw dateError;
      dateId = newDate?.id ?? null;
    }

    return new Response(
      JSON.stringify({
        success: true,
        matchesCreated: 1,
        matchedUserId,
        dateId,
        seedDate,
        seedPartnerVote,
        message: "1 debug match created. The other user already likes you — just like them back to trigger the date flow.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
