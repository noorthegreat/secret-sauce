/*
Function that runs when someone likes a match whose already liked them back.
We do this server side for added security.
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { authenticateEdgeRequest } from "../_shared/auth.ts";
import { getDateWindowStartFromWeeklyDrop } from "../_shared/zurich-time.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

type MatchType = "relationship" | "friendship";

function normalizeMatchType(value: unknown): MatchType {
    return value === "friendship" ? "friendship" : "relationship";
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const auth = await authenticateEdgeRequest(req, {
            allowCronSecret: true,
            allowServiceRole: true,
        });
        if (auth.error) {
            return new Response(JSON.stringify({ error: auth.error.message }), {
                status: auth.error.status,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const supabase = auth.context!.supabase;

        const { userId, matchedUserId, email_both, matchType: rawMatchType, forceCreate, eventId } = await req.json();
        const matchType = normalizeMatchType(rawMatchType);
        const likesTable = matchType === "friendship" ? "friendship_likes" : "likes";
        const canForceCreate = !!forceCreate && (auth.context!.isAdmin || auth.context!.isInternal);

        if (!userId || !matchedUserId) {
            throw new Error("Missing userId or matchedUserId");
        }

        if (!auth.context!.isInternal && !auth.context!.isAdmin && auth.context!.user?.id !== userId) {
            return new Response(JSON.stringify({ error: "Forbidden" }), {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        if (canForceCreate) {
            const { data: existingMatch, error: existingMatchError } = await supabase
                .from("matches")
                .select("id")
                .or(`and(user_id.eq.${userId},matched_user_id.eq.${matchedUserId}),and(user_id.eq.${matchedUserId},matched_user_id.eq.${userId})`)
                .eq("match_type", matchType)
                .limit(1)
                .maybeSingle();

            if (existingMatchError) throw existingMatchError;

            if (!existingMatch) {
                return new Response(
                    JSON.stringify({ matched: false, error: "No active match exists for this pair and match type" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            const { error: backfillLikeError } = await supabase
                .from(likesTable)
                .upsert([
                    { user_id: userId, liked_user_id: matchedUserId },
                    { user_id: matchedUserId, liked_user_id: userId },
                ], { onConflict: "user_id,liked_user_id" });

            if (backfillLikeError) throw backfillLikeError;
        } else {
            // 1. Mutual like check
            const { data: likeData, error: likeError } = await supabase
                .from(likesTable)
                .select("id")
                .eq("user_id", matchedUserId)
                .eq("liked_user_id", userId)
                .maybeSingle();

            if (likeError) throw likeError;

            const { data: otherLikeData, error: otherLikeError } = await supabase
                .from(likesTable)
                .select("id")
                .eq("user_id", userId)
                .eq("liked_user_id", matchedUserId)
                .maybeSingle();

            if (otherLikeError) throw otherLikeError;

            if (!otherLikeData || !likeData) {
                return new Response(
                    JSON.stringify({ matched: false, message: "Not a mutual like yet" }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
        }

        const { error: resetCounterError } = await supabase
            .from("unanswered_like_rematch_counts")
            .upsert([
                {
                    user_id: userId,
                    matched_user_id: matchedUserId,
                    match_type: matchType,
                    unanswered_like_count: 0,
                    updated_at: new Date().toISOString(),
                },
                {
                    user_id: matchedUserId,
                    matched_user_id: userId,
                    match_type: matchType,
                    unanswered_like_count: 0,
                    updated_at: new Date().toISOString(),
                },
            ], { onConflict: "user_id,matched_user_id,match_type" });

        if (resetCounterError) {
            console.error("Failed to reset unanswered like rematch counters:", resetCounterError);
        }

        // 2. If this is an event match, check schedule_dates setting and fetch event details
        let eventData: { start_date: string | null; end_date: string | null; timezone: string; venue_name: string | null; venue_address: string | null; metadata: any } | null = null;
        if (eventId) {
            const { data: ev } = await supabase
                .from("events")
                .select("start_date, end_date, timezone, venue_name, venue_address, metadata")
                .eq("id", eventId)
                .single();

            eventData = ev;
            const meta = (ev?.metadata || {}) as Record<string, unknown>;
            if (meta.schedule_dates === false) {
                return new Response(
                    JSON.stringify({ matched: true, dateId: null, message: "Mutual like recorded. No date scheduling for this event." }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
        }

        // 3. Check if a date already exists
        const { data: existingDate, error: dateError } = await supabase
            .from("dates")
            .select("id")
            .or(`and(user1_id.eq.${userId},user2_id.eq.${matchedUserId}),and(user1_id.eq.${matchedUserId},user2_id.eq.${userId})`)
            .eq("match_type", matchType)
            .not("status", "eq", "auto_cancelled")
            .maybeSingle();

        if (dateError) throw dateError;

        if (existingDate) {
            return new Response(
                JSON.stringify({ matched: true, dateId: existingDate.id, message: "Date already exists" }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 4. Create a new date
        const now = new Date();
        let firstPossibleDay: string;
        let venueOptions: string[] | null = null;
        let selectedTimezone: string | null = null;
        let dateTime: string | null = null;
        let location: string | null = null;
        let address: string | null = null;

        if (eventData) {
            if (!eventData.start_date) {
                throw new Error("This event cannot auto-schedule dates until a start time is set.");
            }
            // Event date: constrain to event time window
            firstPossibleDay = eventData.start_date.split("T")[0];
            dateTime = eventData.start_date; // Date is at the event start
            selectedTimezone = eventData.timezone || null;
            location = eventData.venue_name || null;
            address = eventData.venue_address || null;
            console.log(`Event date: scheduled at event time ${eventData.start_date}`);
        } else {
            // Regular weekly date: use the weekly drop window
            firstPossibleDay = getDateWindowStartFromWeeklyDrop(now);
            // Venue selection is deferred — refresh-venue-options runs once both users submit availability
        }

        const { data: newDate, error: createError } = await supabase
            .from("dates")
            .insert({
                user1_id: userId,
                user2_id: matchedUserId,
                match_type: matchType,
                first_possible_day: firstPossibleDay,
                venue_options: venueOptions,
                timezone: selectedTimezone,
                ...(dateTime ? { date_time: dateTime } : {}),
                ...(location ? { location } : {}),
                ...(address ? { address } : {}),
            })
            .select("id")
            .single();

        if (createError) throw createError;

        // Pre-fill availability for test/admin users so the other person gets instant overlap
        try {
            const { data: testRoles } = await supabase
                .from("user_roles")
                .select("user_id")
                .in("user_id", [userId, matchedUserId])
                .in("role", ["test", "admin"]);

            if (testRoles && testRoles.length > 0) {
                const allSlots = Array.from({ length: 48 }, (_, i) => i);
                const fullWeekAvail = Object.fromEntries(
                    Array.from({ length: 7 }, (_, day) => [String(day), allSlots])
                );
                const testUserIds = new Set(testRoles.map((r: any) => r.user_id));

                // Pre-fill availability for test/admin users only
                const updates: Record<string, any> = {};
                if (testUserIds.has(userId)) updates.user1_availability = fullWeekAvail;
                if (testUserIds.has(matchedUserId)) updates.user2_availability = fullWeekAvail;

                if (Object.keys(updates).length > 0) {
                    await supabase.from("dates").update(updates).eq("id", newDate.id);
                    console.log("Pre-filled availability for test/admin users");
                }
            }
        } catch (e) {
            console.error("Error pre-filling test user availability:", e);
        }

        // 4. Send email to the OTHER user (matchedUserId)
        // The current user (userId) sees the popup, so they don't need an email immediately (or maybe they do, but per requirements: "doesn't need to email both as one user already got the popup notification")

        // Fetch user names for the email
        const { data: userProfile } = await supabase.from("profiles").select("first_name").eq("id", userId).single();
        const { data: matchedUserProfile } = await supabase.from("profiles").select("first_name").eq("id", matchedUserId).single();

        if (userProfile && matchedUserProfile) {
            console.log("Match created, sending email to ", matchedUserId)
            await supabase.functions.invoke("send-user-emails", {
                headers: {
                    "X-Cron-Secret": Deno.env.get("CRON_SECRET") || ""
                },
                body: {
                    emailType: "new_date",
                    recipients: [
                        {
                            userId: matchedUserId,
                            customData: {
                                partnerName: userProfile.first_name,
                                firstDay: firstPossibleDay
                            }
                        },
                        ...(email_both ? [{
                            userId: userId,
                            customData: {
                                partnerName: matchedUserProfile.first_name,
                                firstDay: firstPossibleDay
                            }
                        }] : [])
                    ]
                }
            });
        }

        return new Response(
            JSON.stringify({ matched: true, dateId: newDate.id, matchType, message: "Date created!" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});

