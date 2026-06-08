import { authenticateEdgeRequest } from "../_shared/auth.ts";
import { getDateWindowStartFromWeeklyDrop, zurichIsoDateOffsetFromToday } from "../_shared/zurich-time.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

type MatchType = "relationship" | "friendship";

// Console log wrapper to prevent "console is not defined" errors in some edge environments (though Deno usually supports it)
const log = (msg: string, data?: any) => console.log(`[CheckMutualLikes] ${msg}`, data || "");
const errorLog = (msg: string, err?: any) => console.error(`[CheckMutualLikes] ERROR: ${msg}`, err || "");

interface Action {
    type: 'create_date' | 'cancel_date';
    description: string;
    details: any;
}

const getLikesTable = (matchType: MatchType) =>
    matchType === "friendship" ? "friendship_likes" : "likes";

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const auth = await authenticateEdgeRequest(req, { allowCronSecret: true });
        if (auth.error) {
            return new Response(JSON.stringify({ error: auth.error.message }), {
                status: auth.error.status,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        if (!auth.context!.isInternal && !auth.context!.isAdmin) {
            return new Response(JSON.stringify({ error: "Forbidden" }), {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const supabase = auth.context!.supabase;

        let body: any = {};
        try {
            const text = await req.text();
            if (text) body = JSON.parse(text);
        } catch (e) {
            // Body might be empty
        }

        let dryRun = true;
        if (body.dry_run === false) dryRun = false;

        log(`Starting check... Dry Run: ${dryRun}`);

        const actions: Action[] = [];
        let datesCreated = 0;
        let datesCancelled = 0;

        // ==========================================
        // PART 1: Check Mutual Likes -> Create Date
        // ==========================================

        for (const matchType of ["relationship", "friendship"] as MatchType[]) {
            const likesTable = getLikesTable(matchType);
            const { data: allLikes, error: likesError } = await supabase
                .from(likesTable)
                .select("user_id, liked_user_id, created_at");

            if (likesError) throw likesError;

            const likeMap = new Map<string, Set<string>>();
            if (allLikes) {
                for (const l of allLikes) {
                    if (!likeMap.has(l.user_id)) likeMap.set(l.user_id, new Set());
                    likeMap.get(l.user_id)?.add(l.liked_user_id);
                }
            }

            const mutualMatches: { u1: string, u2: string }[] = [];
            const processedPairs = new Set<string>();

            if (allLikes) {
                for (const l of allLikes) {
                    const u1 = l.user_id;
                    const u2 = l.liked_user_id;
                    const pairKey = `${matchType}:${[u1, u2].sort().join(":")}`;
                    if (processedPairs.has(pairKey)) continue;

                    if (likeMap.get(u2)?.has(u1)) {
                        mutualMatches.push({ u1, u2 });
                        processedPairs.add(pairKey);
                    }
                }
            }

            log(`Found ${mutualMatches.length} ${matchType} mutual match pairs.`);

            for (const pair of mutualMatches) {
                const { data: existingDate } = await supabase
                    .from("dates")
                    .select("id")
                    .or(`and(user1_id.eq.${pair.u1},user2_id.eq.${pair.u2}),and(user1_id.eq.${pair.u2},user2_id.eq.${pair.u1})`)
                    .eq("match_type", matchType)
                    .not("status", "eq", "auto_cancelled")
                    .maybeSingle();

                if (existingDate) continue;

                // Check if this pair has an event match — if so, respect schedule_dates setting
                const { data: eventMatch } = await supabase
                    .from("matches")
                    .select("event_id")
                    .eq("from_algorithm", "event")
                    .eq("match_type", matchType)
                    .or(`and(user_id.eq.${pair.u1},matched_user_id.eq.${pair.u2}),and(user_id.eq.${pair.u2},matched_user_id.eq.${pair.u1})`)
                    .not("event_id", "is", null)
                    .limit(1)
                    .maybeSingle();

                if (eventMatch?.event_id) {
                    const { data: eventData } = await supabase
                        .from("events")
                        .select("metadata")
                        .eq("id", eventMatch.event_id)
                        .single();

                    const meta = (eventData?.metadata || {}) as Record<string, unknown>;
                    if (meta.schedule_dates === false) {
                        log(`Skipping date creation for event match ${pair.u1} <-> ${pair.u2}: schedule_dates is OFF`);
                        continue;
                    }
                }

                const [{ data: u1Profile }, { data: u1Private }] = await Promise.all([
                    supabase.from("profiles").select("first_name").eq("id", pair.u1).single(),
                    supabase.from("private_profile_data").select("last_name, email").eq("user_id", pair.u1).single(),
                ]);
                const [{ data: u2Profile }, { data: u2Private }] = await Promise.all([
                    supabase.from("profiles").select("first_name").eq("id", pair.u2).single(),
                    supabase.from("private_profile_data").select("last_name, email").eq("user_id", pair.u2).single(),
                ]);
                const u1ProfileFull = u1Profile ? { ...u1Profile, ...u1Private } : null;
                const u2ProfileFull = u2Profile ? { ...u2Profile, ...u2Private } : null;

                if (!u1ProfileFull || !u2ProfileFull) {
                    log(`Skipping ${matchType} match ${pair.u1} <-> ${pair.u2}: One or both profiles not found.`);
                    continue;
                }

                const u1Name = `${u1ProfileFull.first_name} ${u1ProfileFull.last_name ?? ""}`.trim() || pair.u1;
                const u2Name = `${u2ProfileFull.first_name} ${u2ProfileFull.last_name ?? ""}`.trim() || pair.u2;

                log(`New ${matchType} mutual match found: ${u1Name} <-> ${u2Name}`);

                if (dryRun) {
                    actions.push({
                        type: 'create_date',
                        description: `Would create ${matchType} date for ${u1Name} and ${u2Name}`,
                        details: {
                            match_type: matchType,
                            user1: { id: pair.u1, name: u1Name, email: u1ProfileFull?.email },
                            user2: { id: pair.u2, name: u2Name, email: u2ProfileFull?.email },
                            estimated_first_day: getDateWindowStartFromWeeklyDrop(new Date()),
                            emails_to_send: [u1ProfileFull?.email, u2ProfileFull?.email].filter(Boolean)
                        }
                    });
                    continue;
                }

                log(`Creating ${matchType} date for pair: ${pair.u1} <-> ${pair.u2}`);
                const { data: result, error: invokeError } = await supabase.functions.invoke('check-match-and-create-date', {
                    body: {
                        userId: pair.u1,
                        matchedUserId: pair.u2,
                        matchType,
                        email_both: true,
                        eventId: eventMatch?.event_id || undefined,
                    }
                });

                if (invokeError) throw new Error(`Failed to invoke creation params for ${pair.u1}-${pair.u2}-${matchType}: ${invokeError.message || invokeError}`);
                if (result?.error) throw new Error(`Creation function returned error for ${pair.u1}-${pair.u2}-${matchType}: ${result.error}`);

                if (result?.matched) {
                    datesCreated++;
                    log(`Date created successfully via invoke: ${result?.message}`);
                }
            }
        }

        // ==========================================
        // PART 2: Warn & Clean up Stale Dates
        // ==========================================

        log("Checking for stale pending dates...");

        const today = new Date();
        const WARNING_DAYS = 5;
        const CANCEL_DAYS = 7;
        const MAX_PENALTIES_BEFORE_PAUSE = 3;

        const warningCutoffStr = zurichIsoDateOffsetFromToday(today, -WARNING_DAYS);
        const cancelCutoffStr = zurichIsoDateOffsetFromToday(today, -CANCEL_DAYS);

        const NO_OVERLAP_GRACE_DAYS = 7;
        const noOverlapCancelCutoff = new Date(today.getTime() - NO_OVERLAP_GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString();

        // Fetch all pending dates older than 5 days (covers both warning and cancel)
        const { data: staleDates, error: staleError } = await supabase
            .from("dates")
            .select("id, user1_id, user2_id, status, first_possible_day, match_type, user1_availability, user2_availability, venue_options, no_overlap_warning_sent_at, created_at")
            .eq("status", "pending")
            .lt("first_possible_day", warningCutoffStr);

        if (staleError) throw staleError;

        let datesWarned = 0;
        let usersPenalized = 0;
        let usersPaused = 0;

        log(`Found ${staleDates?.length || 0} stale pending dates (>= ${WARNING_DAYS} days).`);

        if (staleDates && staleDates.length > 0) {
            for (const date of staleDates) {
                // Determine who is missing availability
                const u1HasAvail = date.user1_availability && typeof date.user1_availability === 'object' && Object.keys(date.user1_availability).length > 0;
                const u2HasAvail = date.user2_availability && typeof date.user2_availability === 'object' && Object.keys(date.user2_availability).length > 0;

                // If both have availability:
                //   - venue_options populated → frontend voting flow handles it, skip.
                //   - venue_options empty → initial venue selection failed (e.g. no overlap
                //     in the original first_possible_day week). Re-invoke refresh-venue-options,
                //     which auto-advances stale first_possible_day and retries against the
                //     current scheduling week.
                //
                // If retry also returns "no overlap", run the no-overlap warning/cancel cycle:
                //   - First detection: send no-overlap email, stamp no_overlap_warning_sent_at.
                //   - Still no overlap 7+ days later: auto-cancel + email both (no penalty,
                //     neither user is at fault — their availabilities just don't intersect).
                //   - Venue eventually found: refresh-venue-options clears the timestamp.
                if (u1HasAvail && u2HasAvail) {
                    const venueOpts = (date as any).venue_options;
                    const hasVenue = Array.isArray(venueOpts) && venueOpts.length > 0;
                    if (hasVenue) continue;

                    if (dryRun) {
                        actions.push({
                            type: 'create_date',
                            description: `Would retry venue selection for stuck date ${date.id} (both users have availability, venue_options empty)`,
                            details: {
                                date_id: date.id,
                                first_possible_day: date.first_possible_day,
                                no_overlap_warning_sent_at: (date as any).no_overlap_warning_sent_at,
                            },
                        });
                        continue;
                    }

                    let retryData: any = null;
                    try {
                        const { data, error: retryError } = await supabase.functions.invoke(
                            'refresh-venue-options',
                            {
                                body: { dateId: date.id },
                                headers: { 'X-Cron-Secret': Deno.env.get('CRON_SECRET') ?? '' },
                            },
                        );
                        retryData = data;
                        if (retryError) {
                            errorLog(`Failed to retry venue selection for date ${date.id}`, retryError);
                            continue;
                        }
                        log(`Retried venue selection for stuck date ${date.id}`, retryData);
                    } catch (e) {
                        errorLog(`Exception retrying venue selection for date ${date.id}`, e);
                        continue;
                    }

                    const noOverlap = retryData?.skipped === true
                        && typeof retryData?.reason === 'string'
                        && /no venues open during shared availability/i.test(retryData.reason);

                    if (!noOverlap) continue; // succeeded, or some other transient skip

                    // Fetch names + private email for the no-overlap path
                    const [{ data: p1 }, { data: p2 }] = await Promise.all([
                        supabase.from("profiles").select("first_name").eq("id", date.user1_id).single(),
                        supabase.from("profiles").select("first_name").eq("id", date.user2_id).single(),
                    ]);

                    const warningSentAt = (date as any).no_overlap_warning_sent_at as string | null;
                    const matchType: MatchType = (date.match_type === "friendship" ? "friendship" : "relationship");

                    if (!warningSentAt) {
                        // First detection: email both with no_overlap + stamp timestamp
                        if (p1 && p2) {
                            try {
                                await supabase.functions.invoke("send-user-emails", {
                                    headers: { "X-Cron-Secret": Deno.env.get("CRON_SECRET") || "" },
                                    body: {
                                        emailType: "no_overlap",
                                        recipients: [
                                            { userId: date.user1_id, customData: { partnerName: p2.first_name } },
                                            { userId: date.user2_id, customData: { partnerName: p1.first_name } },
                                        ],
                                    },
                                });
                            } catch (e) {
                                errorLog(`Failed to send no_overlap email for date ${date.id}`, e);
                            }
                        }
                        const { error: stampError } = await supabase
                            .from("dates")
                            .update({ no_overlap_warning_sent_at: new Date().toISOString() })
                            .eq("id", date.id);
                        if (stampError) errorLog(`Failed to stamp no_overlap_warning_sent_at for ${date.id}`, stampError);
                        else log(`Sent no-overlap warning for date ${date.id}`);
                    } else if (warningSentAt < noOverlapCancelCutoff) {
                        // 7+ days since warning, still stuck → cancel + email both
                        const cancelReason = `Auto cancelled: No shared availability after ${NO_OVERLAP_GRACE_DAYS}+ days`;
                        const cancelledAt = new Date().toISOString();

                        const { error: updateError } = await supabase
                            .from("dates")
                            .update({
                                status: 'auto_cancelled',
                                completed_or_cancelled_at: cancelledAt,
                                user1_feedback: cancelReason,
                                user2_feedback: cancelReason,
                            })
                            .eq("id", date.id);

                        if (updateError) {
                            errorLog(`Failed to cancel no-overlap date ${date.id}`, updateError);
                            continue;
                        }

                        // Delete likes so users can rematch in a future drop
                        const likesTable = getLikesTable(matchType);
                        await supabase.from(likesTable).delete()
                            .or(`and(user_id.eq.${date.user1_id},liked_user_id.eq.${date.user2_id}),and(user_id.eq.${date.user2_id},liked_user_id.eq.${date.user1_id})`);

                        datesCancelled++;
                        log(`Auto-cancelled no-overlap date ${date.id} (warning was ${warningSentAt})`);

                        if (p1 && p2) {
                            try {
                                await supabase.functions.invoke("send-user-emails", {
                                    headers: { "X-Cron-Secret": Deno.env.get("CRON_SECRET") || "" },
                                    body: {
                                        emailType: "auto-cancelled-date",
                                        recipients: [
                                            { userId: date.user1_id, customData: { partnerName: p2.first_name } },
                                            { userId: date.user2_id, customData: { partnerName: p1.first_name } },
                                        ],
                                    },
                                });
                            } catch (e) {
                                errorLog(`Failed to send cancellation email for no-overlap date ${date.id}`, e);
                            }
                        }
                    } else {
                        log(`No-overlap date ${date.id} still in grace period (warned ${warningSentAt})`);
                    }
                    continue;
                }

                // Identify the inactive user(s)
                const inactiveUserIds: string[] = [];
                if (!u1HasAvail) inactiveUserIds.push(date.user1_id);
                if (!u2HasAvail) inactiveUserIds.push(date.user2_id);

                const [{ data: p1 }, { data: p1Private }] = await Promise.all([
                    supabase.from("profiles").select("first_name, date_penalty_count").eq("id", date.user1_id).single(),
                    supabase.from("private_profile_data").select("email").eq("user_id", date.user1_id).single(),
                ]);
                const [{ data: p2 }, { data: p2Private }] = await Promise.all([
                    supabase.from("profiles").select("first_name, date_penalty_count").eq("id", date.user2_id).single(),
                    supabase.from("private_profile_data").select("email").eq("user_id", date.user2_id).single(),
                ]);

                const isExpired = date.first_possible_day <= cancelCutoffStr;

                if (isExpired) {
                    // ========== 7+ days: AUTO-CANCEL + PENALIZE ==========
                    if (dryRun) {
                        actions.push({
                            type: 'cancel_date',
                            description: `Would cancel expired date ${date.id} & penalize inactive user(s)`,
                            details: {
                                date_id: date.id,
                                first_possible_day: date.first_possible_day,
                                user1: { id: date.user1_id, name: p1?.first_name, email: p1Private?.email, has_availability: !!u1HasAvail, penalty_count: (p1 as any)?.date_penalty_count ?? 0 },
                                user2: { id: date.user2_id, name: p2?.first_name, email: p2Private?.email, has_availability: !!u2HasAvail, penalty_count: (p2 as any)?.date_penalty_count ?? 0 },
                                inactive_users: inactiveUserIds,
                                reason: `Expired (>${CANCEL_DAYS} days since first possible day, missing availability)`,
                            }
                        });
                        continue;
                    }

                    const autoCancelReason = `Auto cancelled: Missing availability after ${CANCEL_DAYS}+ days`;
                    const autoCancelledAt = new Date().toISOString();

                    // 1. Cancel Date
                    const { error: updateError } = await supabase
                        .from("dates")
                        .update({
                            status: 'auto_cancelled',
                            completed_or_cancelled_at: autoCancelledAt,
                            user1_feedback: autoCancelReason,
                            user2_feedback: autoCancelReason
                        })
                        .eq("id", date.id);

                    if (updateError) throw new Error(`Failed to cancel date ${date.id}: ${updateError.message}`);

                    // 2. Delete Likes
                    const likesTable = getLikesTable((date.match_type === "friendship" ? "friendship" : "relationship") as MatchType);
                    const { error: deleteLikesError } = await supabase
                        .from(likesTable)
                        .delete()
                        .or(`and(user_id.eq.${date.user1_id},liked_user_id.eq.${date.user2_id}),and(user_id.eq.${date.user2_id},liked_user_id.eq.${date.user1_id})`);

                    if (deleteLikesError) throw new Error(`Failed to delete likes for date ${date.id}: ${deleteLikesError.message}`);

                    datesCancelled++;

                    // 3. Penalize inactive user(s) and check for auto-pause
                    for (const inactiveId of inactiveUserIds) {
                        const currentPenalty = inactiveId === date.user1_id
                            ? ((p1 as any)?.date_penalty_count ?? 0)
                            : ((p2 as any)?.date_penalty_count ?? 0);
                        const newPenalty = currentPenalty + 1;

                        const updateFields: Record<string, any> = { date_penalty_count: newPenalty };
                        if (newPenalty >= MAX_PENALTIES_BEFORE_PAUSE) {
                            updateFields.is_paused = true;
                            usersPaused++;
                            log(`Auto-pausing user ${inactiveId} (${newPenalty} penalties)`);
                        }

                        const { error: penaltyError } = await supabase
                            .from("profiles")
                            .update(updateFields)
                            .eq("id", inactiveId);

                        if (penaltyError) {
                            errorLog(`Failed to penalize user ${inactiveId}`, penaltyError);
                        } else {
                            usersPenalized++;
                        }
                    }

                    // 4. Notify Users
                    if (p1 && p2) {
                        await supabase.functions.invoke("send-user-emails", {
                            headers: { "X-Cron-Secret": Deno.env.get("CRON_SECRET") || "" },
                            body: {
                                emailType: "auto-cancelled-date",
                                recipients: [
                                    { userId: date.user1_id, customData: { partnerName: p2.first_name } },
                                    { userId: date.user2_id, customData: { partnerName: p1.first_name } }
                                ]
                            }
                        });
                    }

                    // 5. Send strike warning and/or auto-pause email to inactive user(s)
                    for (const inactiveId of inactiveUserIds) {
                        const currentPenalty = inactiveId === date.user1_id
                            ? ((p1 as any)?.date_penalty_count ?? 0)
                            : ((p2 as any)?.date_penalty_count ?? 0);
                        const newPenalty = currentPenalty + 1;
                        const inactiveProfile = inactiveId === date.user1_id ? p1 : p2;
                        const partnerProfile = inactiveId === date.user1_id ? p2 : p1;

                        if (newPenalty >= MAX_PENALTIES_BEFORE_PAUSE) {
                            await supabase.functions.invoke("send-user-emails", {
                                headers: { "X-Cron-Secret": Deno.env.get("CRON_SECRET") || "" },
                                body: {
                                    emailType: "availability_strike_paused",
                                    recipients: [{ userId: inactiveId }]
                                }
                            }).catch((err: any) => errorLog(`Failed to send pause email to ${inactiveId}`, err));
                        } else if (inactiveProfile && partnerProfile) {
                            await supabase.functions.invoke("send-user-emails", {
                                headers: { "X-Cron-Secret": Deno.env.get("CRON_SECRET") || "" },
                                body: {
                                    emailType: "availability_strike_warning",
                                    recipients: [{
                                        userId: inactiveId,
                                        customData: {
                                            partnerName: partnerProfile.first_name,
                                            strikeCount: newPenalty
                                        }
                                    }]
                                }
                            }).catch((err: any) => errorLog(`Failed to send strike warning email to ${inactiveId}`, err));
                        }
                    }
                } else {
                    // ========== 5-7 days: SEND WARNING EMAIL ==========
                    if (dryRun) {
                        actions.push({
                            type: 'cancel_date' as const,
                            description: `Would send deadline warning for date ${date.id} to inactive user(s)`,
                            details: {
                                date_id: date.id,
                                first_possible_day: date.first_possible_day,
                                user1: { id: date.user1_id, name: p1?.first_name, email: p1Private?.email, has_availability: !!u1HasAvail },
                                user2: { id: date.user2_id, name: p2?.first_name, email: p2Private?.email, has_availability: !!u2HasAvail },
                                inactive_users: inactiveUserIds,
                                action: "warning_email",
                                reason: `${WARNING_DAYS}+ days since first possible day, missing availability`,
                            }
                        });
                        continue;
                    }

                    // Send warning email to each inactive user
                    const warningRecipients = inactiveUserIds.map(inactiveId => {
                        const partnerName = inactiveId === date.user1_id ? p2?.first_name : p1?.first_name;
                        return {
                            userId: inactiveId,
                            customData: { partnerName: partnerName || "your match" }
                        };
                    });

                    if (warningRecipients.length > 0) {
                        await supabase.functions.invoke("send-user-emails", {
                            headers: { "X-Cron-Secret": Deno.env.get("CRON_SECRET") || "" },
                            body: {
                                emailType: "date_availability_deadline_warning",
                                recipients: warningRecipients
                            }
                        }).catch((err: any) => errorLog(`Failed to send warning emails for date ${date.id}`, err));

                        datesWarned++;
                    }
                }
            }
        }

        return new Response(JSON.stringify({
            success: true,
            dry_run: dryRun,
            datesCreated: dryRun ? 0 : datesCreated,
            datesCancelled: dryRun ? 0 : datesCancelled,
            datesWarned: dryRun ? 0 : datesWarned,
            usersPenalized: dryRun ? 0 : usersPenalized,
            usersPaused: dryRun ? 0 : usersPaused,
            actions: actions,
            message: dryRun
                ? `Dry Run: Found ${actions.length} potential actions.`
                : `Created ${datesCreated} dates, Cancelled ${datesCancelled} expired dates, Warned ${datesWarned} dates, Penalized ${usersPenalized} users, Paused ${usersPaused} users.`
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (error: any) {
        errorLog("Internal Error", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
