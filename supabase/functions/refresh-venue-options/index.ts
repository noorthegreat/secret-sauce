/**
 * Re-selects venue_options for a date based on both users' submitted availability.
 * Called after a user saves availability and the other user has already submitted.
 *
 * Flow:
 *   1. Verify caller is part of the date
 *   2. Require both users to have submitted availability
 *   3. Filter all venues to those with at least one slot that overlaps both users' free time
 *   4. Re-run the scoring algorithm on the filtered set
 *   5. Update venue_options on the date and return the new venue details
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { selectTopTwoVenues } from "../_shared/venue-scoring.ts";
import { authenticateEdgeRequest } from "../_shared/auth.ts";
import { venueHasValidSlotForSchedulingWeek } from "../_shared/venue-scheduling-week.ts";
import { zurichIsoDateOffsetFromToday } from "../_shared/zurich-time.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const auth = await authenticateEdgeRequest(req, { allowCronSecret: true });
        if (auth.error) {
            return new Response(JSON.stringify({ error: auth.error.message }), {
                status: auth.error.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }
        const { supabase, user, isAdmin } = auth.context!;

        const { dateId } = await req.json();
        if (!dateId) {
            return new Response(JSON.stringify({ error: "dateId required" }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Fetch the date
        const { data: date, error: dateError } = await supabase
            .from('dates')
            .select('id, user1_id, user2_id, user1_availability, user2_availability, first_possible_day')
            .eq('id', dateId)
            .single();

        if (dateError || !date) {
            return new Response(JSON.stringify({ error: "Date not found" }), {
                status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Verify caller is part of the date or is an admin
        if (!isAdmin && (!user || (date.user1_id !== user.id && date.user2_id !== user.id))) {
            return new Response(JSON.stringify({ error: "Forbidden" }), {
                status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Need both users' availability to filter meaningfully
        const u1Avail = date.user1_availability as Record<string, number[]> | null;
        const u2Avail = date.user2_availability as Record<string, number[]> | null;
        if (!u1Avail || !u2Avail) {
            return new Response(JSON.stringify({ skipped: true, reason: "Waiting for both users to submit availability" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // If first_possible_day is in the past, advance it to today so the venue filter
        // uses a relevant scheduling window rather than a stale historical week.
        let effectiveFirstDay = date.first_possible_day as string | null;
        if (effectiveFirstDay) {
            const todayZurich = zurichIsoDateOffsetFromToday(new Date(), 0);
            if (effectiveFirstDay < todayZurich) {
                console.log(`Advancing stale first_possible_day from ${effectiveFirstDay} to ${todayZurich}`);
                effectiveFirstDay = todayZurich;
                const { error: advanceError } = await supabase
                    .from('dates')
                    .update({ first_possible_day: effectiveFirstDay })
                    .eq('id', dateId);
                if (advanceError) console.error('Failed to advance first_possible_day:', advanceError);
            }
        }

        // Fetch all data in parallel
        const [
            { data: venues, error: venuesError },
            { data: userData },
            { data: user1Prefs },
            { data: user2Prefs },
        ] = await Promise.all([
            supabase.from('venues').select('id, type, latitude, longitude, timezone, price_range, is_partner, avg_feedback_score, hours, open_public_holidays, restrict_to_weekdays'),
            supabase.from('private_profile_data').select('user_id, latitude, longitude').in('user_id', [date.user1_id, date.user2_id]),
            supabase.from('date_activity_preferences').select('preferences').eq('date_id', 'default').eq('user_id', date.user1_id).maybeSingle(),
            supabase.from('date_activity_preferences').select('preferences').eq('date_id', 'default').eq('user_id', date.user2_id).maybeSingle(),
        ]);

        if (venuesError || !venues) throw venuesError ?? new Error("No venues found");

        // Filter to venues that have at least one slot during shared availability
        const availableVenues = venues.filter((v) =>
            v.hours &&
            venueHasValidSlotForSchedulingWeek(
                u1Avail,
                u2Avail,
                {
                    hours: v.hours as Record<string, { start: number; end: number } | null>,
                    open_public_holidays: v.open_public_holidays,
                    restrict_to_weekdays: v.restrict_to_weekdays,
                },
                effectiveFirstDay,
            )
        );

        console.log(`Venues with valid slots: ${availableVenues.length} / ${venues.length}`);

        if (availableVenues.length === 0) {
            // No venue open during shared time — keep existing options rather than clearing them
            return new Response(JSON.stringify({ skipped: true, reason: "No venues open during shared availability" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Re-run the scoring on the availability-filtered set
        const { venueOptions, timezone } = selectTopTwoVenues(
            availableVenues,
            userData ?? [],
            user1Prefs,
            user2Prefs,
        );

        if (venueOptions.length === 0) {
            return new Response(JSON.stringify({ skipped: true, reason: "Scoring returned no venues" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Persist the updated venue options. Also clear no_overlap_warning_sent_at so
        // the janitor's no-overlap warning/cancel cycle resets if availability changes
        // later cause a date to get stuck again.
        const updatePayload: Record<string, unknown> = {
            venue_options: venueOptions,
            no_overlap_warning_sent_at: null,
        };
        if (timezone) updatePayload.timezone = timezone;

        const { error: updateError } = await supabase
            .from('dates')
            .update(updatePayload)
            .eq('id', dateId);

        if (updateError) throw updateError;

        // Track selection counts
        await Promise.all(
            venueOptions.map(async (id: string) => {
                try {
                    await supabase.rpc('increment_venue_times_selected', { venue_id: id });
                } catch (e) {
                    console.error("Failed to increment times_selected for", id, e);
                }
            })
        );

        // Return full venue details so the frontend can update immediately without a re-fetch
        const { data: venueDetails } = await supabase
            .from('venues')
            .select('*')
            .in('id', venueOptions);

        const sortedDetails = (venueDetails ?? []).sort(
            (a: any, b: any) => venueOptions.indexOf(a.id) - venueOptions.indexOf(b.id)
        );

        return new Response(
            JSON.stringify({ success: true, venueOptions, venueDetails: sortedDetails }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('Error:', error);
        const message =
            error instanceof Error
                ? error.message
                : (error && (error.message || error.error_description || error.hint))
                  || JSON.stringify(error);
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
