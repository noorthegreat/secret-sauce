/**
 * admin-override-date-slot
 *
 * Admin-only tool to force a pending date into a specific time slot window
 * (via availability) and refresh venue options so users can vote.
 *
 * This does NOT directly set date_time because DateView hides venue voting once date_time exists.
 * Instead it constrains both users' availability to the requested slot(s) so the normal flow
 * can confirm after both votes.
 *
 * POST body:
 * {
 *   dateId: string,
 *   dateISO: string,          // e.g. "2026-04-20" (YYYY-MM-DD)
 *   weekdayIndex?: number,    // 0=Sun..6=Sat; default derived from dateISO in Europe/Zurich
 *   startSlot: number,        // 0..47 (30-min slots)
 *   durationMinutes: number   // e.g. 60
 * }
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { authenticateEdgeRequest } from "../_shared/auth.ts";
import { jsWeekdayFromIsoDateInZurich } from "../_shared/zurich-time.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const isValidIsoDate = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await authenticateEdgeRequest(req, { requireAdmin: true });
    if (auth.error) {
      return new Response(JSON.stringify({ error: auth.error.message }), {
        status: auth.error.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = auth.context!.supabase;

    const body = await req.json().catch(() => ({}));
    const dateId: string | undefined = body?.dateId;
    const dateISO: string | undefined = body?.dateISO;
    const startSlot: number | undefined = body?.startSlot;
    const durationMinutes: number | undefined = body?.durationMinutes;
    const weekdayIndexOverride: number | undefined = body?.weekdayIndex;

    if (!dateId || typeof dateId !== "string") {
      return new Response(JSON.stringify({ error: "dateId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!isValidIsoDate(dateISO)) {
      return new Response(JSON.stringify({ error: "dateISO required (YYYY-MM-DD)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof startSlot !== "number" || !Number.isFinite(startSlot) || startSlot < 0 || startSlot > 47) {
      return new Response(JSON.stringify({ error: "startSlot must be 0..47" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof durationMinutes !== "number" || !Number.isFinite(durationMinutes) || durationMinutes <= 0 || durationMinutes > 6 * 60) {
      return new Response(JSON.stringify({ error: "durationMinutes must be between 1 and 360" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const durationSlots = Math.ceil(durationMinutes / 30);
    const endSlotInclusive = startSlot + durationSlots - 1;
    if (endSlotInclusive > 47) {
      return new Response(JSON.stringify({ error: "slot range exceeds day (endSlot > 47)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const slots = Array.from({ length: durationSlots }, (_, i) => startSlot + i);

    const weekdayIndex = (() => {
      if (typeof weekdayIndexOverride === "number" && Number.isFinite(weekdayIndexOverride) && weekdayIndexOverride >= 0 && weekdayIndexOverride <= 6) {
        return weekdayIndexOverride;
      }
      return jsWeekdayFromIsoDateInZurich(dateISO);
    })();

    const availability: Record<string, number[]> = {
      "0": [],
      "1": [],
      "2": [],
      "3": [],
      "4": [],
      "5": [],
      "6": [],
      [String(weekdayIndex)]: slots,
    };

    // Reset the date back to "pending vote" state and constrain availabilities.
    const { data: updated, error: updateError } = await supabase
      .from("dates")
      .update({
        status: "pending",
        first_possible_day: dateISO,
        date_time: null,
        location: null,
        address: null,
        timezone: null,
        venue_options: null,
        confirmed_venue_id: null,
        user1_venue_vote: null,
        user2_venue_vote: null,
        user1_confirmed: false,
        user2_confirmed: false,
        user1_availability: availability,
        user2_availability: availability,
      })
      .eq("id", dateId)
      .select("id, user1_id, user2_id")
      .maybeSingle();

    if (updateError) throw updateError;
    if (!updated) {
      return new Response(JSON.stringify({ error: "Date not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Now refresh venues so voting UI can appear.
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    // Important: Edge gateway JWT verification happens *before* our auth helper runs.
    // So we must call refresh-venue-options with a real JWT (the same admin JWT that invoked this function),
    // not the service role key (which is not a JWT).
    const incomingAuth = req.headers.get("Authorization") ?? "";
    const refreshRes = await fetch(`${supabaseUrl}/functions/v1/refresh-venue-options`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": incomingAuth,
        ...(anonKey ? { "apikey": anonKey } : {}),
      },
      body: JSON.stringify({ dateId }),
    });
    const refreshText = await refreshRes.text();
    const refreshData = (() => {
      try { return JSON.parse(refreshText); } catch { return { raw: refreshText }; }
    })();

    if (!refreshRes.ok) {
      return new Response(
        JSON.stringify({ success: false, dateId, updated: true, venueRefresh: refreshData, error: "refresh-venue-options returned non-2xx" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // If venues were found, email both users to vote.
    const venuesFound = !!(refreshData?.success && !refreshData?.skipped && Array.isArray(refreshData?.venueOptions) && refreshData.venueOptions.length > 0);
    if (venuesFound) {
      // Fetch first names for nicer email personalization (optional best-effort).
      const userIds = [updated.user1_id, updated.user2_id].filter(Boolean);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name")
        .in("id", userIds);
      const nameById = new Map((profiles || []).map((p: any) => [p.id, p.first_name]));
      const user1Name = nameById.get(updated.user1_id) ?? "";
      const user2Name = nameById.get(updated.user2_id) ?? "";

      await supabase.functions.invoke("send-user-emails", {
        body: {
          dateId,
          emailType: "venue_vote",
          recipients: [
            { userId: updated.user1_id, customData: { partnerName: user2Name } },
            { userId: updated.user2_id, customData: { partnerName: user1Name } },
          ],
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        dateId,
        dateISO,
        weekdayIndex,
        startSlot,
        endSlotInclusive,
        durationMinutes,
        venueRefresh: refreshData,
        emailedVenueVote: venuesFound,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

