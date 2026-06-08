/*
  admin-fix-venue-dates

  Finds all future non-cancelled dates that reference a given venue (by ID or
  by location name substring), re-runs venue selection for each one, updates
  venue_options / clears the stale location, and emails both participants.

  POST body:
  {
    dryRun?: boolean          // default false — pass true to preview without writing
    venueId?: string          // find dates where venue_options contains this ID or confirmed_venue_id matches
    locationSearch?: string   // fallback: ilike match on location column
  }
*/

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { authenticateEdgeRequest } from "../_shared/auth.ts";
import { selectTopTwoVenues } from "../_shared/venue-scoring.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};


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

    const body = await req.json().catch(() => ({}));
    const dryRun: boolean = body.dryRun ?? false;
    const venueId: string | undefined = body.venueId;
    const locationSearch: string | undefined = body.locationSearch;

    if (!venueId && !locationSearch) {
      return new Response(
        JSON.stringify({ error: "Provide either venueId or locationSearch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = auth.context!.supabase;
    const cronSecret = Deno.env.get("CRON_SECRET") ?? "";

    // 1. Find affected future dates
    let query = supabase
      .from("dates")
      .select("id, user1_id, user2_id, location, address, date_time, first_possible_day, status, timezone, venue_options, confirmed_venue_id")
      .not("status", "in", '("completed","cancelled","auto_cancelled")')
      .order("date_time", { ascending: true, nullsFirst: false });

    if (venueId) {
      // Match dates that have this venue in venue_options OR as confirmed_venue_id
      query = query.or(`venue_options.cs.{${venueId}},confirmed_venue_id.eq.${venueId}`);
    } else {
      query = query.ilike("location", `%${locationSearch}%`);
    }

    const { data: affectedDates, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    if (!affectedDates || affectedDates.length === 0) {
      return new Response(
        JSON.stringify({ message: "No affected dates found.", updated: [], dryRun }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Fetch all active venues once
    const { data: venues, error: venuesError } = await supabase
      .from("venues")
      .select("id, type, latitude, longitude, timezone, price_range, name, is_partner, avg_feedback_score");
    if (venuesError) throw venuesError;

    const results: any[] = [];

    for (const date of affectedDates) {
      const { user1_id, user2_id } = date;

      // Fetch user locations + preferences in parallel
      const [
        { data: userData },
        { data: user1Prefs },
        { data: user2Prefs },
        { data: profiles },
      ] = await Promise.all([
        supabase
          .from("private_profile_data")
          .select("user_id, latitude, longitude")
          .in("user_id", [user1_id, user2_id]),
        supabase
          .from("date_activity_preferences")
          .select("preferences")
          .eq("date_id", "default")
          .eq("user_id", user1_id)
          .maybeSingle(),
        supabase
          .from("date_activity_preferences")
          .select("preferences")
          .eq("date_id", "default")
          .eq("user_id", user2_id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("id, first_name")
          .in("id", [user1_id, user2_id]),
      ]);

      const { venueOptions, timezone } = selectTopTwoVenues(
        venues || [],
        userData || [],
        user1Prefs,
        user2Prefs,
      );

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.first_name]));
      const user1Name = profileMap.get(user1_id) ?? "there";
      const user2Name = profileMap.get(user2_id) ?? "there";

      const removedVenueName = venueId
        ? (venues || []).find((v: any) => v.id === venueId)?.name ?? venueId
        : date.location;

      const result = {
        dateId: date.id,
        oldLocation: removedVenueName,
        newVenueOptions: venueOptions,
        newVenueNames: (venues || [])
          .filter((v: any) => venueOptions.includes(v.id))
          .map((v: any) => v.name),
        status: date.status,
        dateTime: date.date_time,
        dryRun,
      };

      if (!dryRun) {
        // Update the date: new venue options, clear stale location/address
        const { error: updateError } = await supabase
          .from("dates")
          .update({
            venue_options: venueOptions.length > 0 ? venueOptions : null,
            location: null,
            address: null,
            ...(timezone ? { timezone } : {}),
          })
          .eq("id", date.id);

        if (updateError) {
          result["error"] = updateError.message;
          results.push(result);
          continue;
        }

        // Email both users
        const emailContent = `<p>We've updated your venue suggestions for your upcoming date with <strong>{{partnerName}}</strong>.</p>
<p>One of the previously suggested venues is no longer available, so we've refreshed your options. Head to the app to see your new venue suggestions — your date details are otherwise unchanged.</p>
<div style="text-align: center; margin: 30px 0;">
  <a href="https://yourorbiit.com/dates" style="background: linear-gradient(135deg, #e9d5ff 0%, #c4b5fd 100%); border: 1px solid #a78bfa; color: #111827 !important; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block;">View My Date</a>
</div>`;

        await supabase.functions.invoke("send-user-emails", {
          body: {
            emailType: "blank_announcement",
            emailSubject: "Your venue suggestions have been updated 📍",
            recipients: [
              {
                userId: user1_id,
                customData: {
                  content: emailContent.replace("{{partnerName}}", user2Name),
                  subjectHeader: "Venue Update",
                },
              },
              {
                userId: user2_id,
                customData: {
                  content: emailContent.replace("{{partnerName}}", user1Name),
                  subjectHeader: "Venue Update",
                },
              },
            ],
          },
          headers: { "X-Cron-Secret": cronSecret },
        });

        result["emailsSent"] = true;
      }

      results.push(result);
    }

    return new Response(
      JSON.stringify({
        message: dryRun
          ? `Dry run: found ${results.length} affected date(s).`
          : `Updated ${results.length} date(s) and sent emails.`,
        updated: results,
        dryRun,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in admin-fix-venue-dates:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
