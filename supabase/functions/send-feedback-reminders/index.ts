import { authenticateEdgeRequest } from "../_shared/auth.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const log = (msg: string, data?: any) => console.log(`[FeedbackReminders] ${msg}`, data ?? "");
const errorLog = (msg: string, err?: any) => console.error(`[FeedbackReminders] ERROR: ${msg}`, err ?? "");

const DEFAULT_DURATION_MIN = 60;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_WEEK_MS = 7 * ONE_DAY_MS;
// Don't retroactively chase feedback for dates that ended a long time ago.
const FEEDBACK_RECENCY_MS = 30 * ONE_DAY_MS;

// Stage → emailType. 1 = initial request, 2 = +1 day reminder, 3 = +1 week (final).
const STAGE_EMAIL_TYPE: Record<number, string> = {
    1: "feedback_request",
    2: "feedback_reminder_1d",
    3: "feedback_reminder_7d",
};

type DurationMap = Map<string, number>; // `${dateId}:${userId}` -> duration minutes

/** Fetch each user's chosen duration (minutes) for the given dates. */
async function loadDurations(supabase: any, dateIds: string[]): Promise<DurationMap> {
    const map: DurationMap = new Map();
    if (dateIds.length === 0) return map;
    const { data, error } = await supabase
        .from("date_activity_preferences")
        .select("date_id, user_id, preferences")
        .in("date_id", dateIds);
    if (error) {
        errorLog("Failed to load date_activity_preferences", error);
        return map;
    }
    for (const row of data ?? []) {
        const raw = (row.preferences as any)?.duration;
        const dur = typeof raw === "number" ? raw : parseInt(String(raw ?? ""), 10);
        if (Number.isFinite(dur) && dur > 0) {
            map.set(`${row.date_id}:${row.user_id}`, dur);
        }
    }
    return map;
}

/** Effective date length = min of both users' chosen durations (default 60 each). */
function resolvedDurationMin(durations: DurationMap, dateId: string, u1: string, u2: string): number {
    const d1 = durations.get(`${dateId}:${u1}`) ?? DEFAULT_DURATION_MIN;
    const d2 = durations.get(`${dateId}:${u2}`) ?? DEFAULT_DURATION_MIN;
    return Math.min(d1, d2);
}

/** End time of a date = start (date_time) + resolved duration. */
function endTimeMs(dateTime: string, durationMin: number): number {
    return new Date(dateTime).getTime() + durationMin * 60 * 1000;
}

/**
 * One-time backlog catch-up: email every user who still owes feedback on a
 * completed date. Independent of the per-stage cadence and recency window —
 * de-duplicated to a single email per user (their most recent owed date is used
 * for the partner name; the CTA links to /dates where they see all pending
 * feedback). Admin/test accounts are excluded. Does not advance reminder stages.
 */
async function runCatchup(supabase: any, internalHeaders: Record<string, string>, dryRun: boolean) {
    const { data: roleRows } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "test"]);
    const privileged = new Set((roleRows ?? []).map((r: any) => r.user_id));

    const { data: completed, error } = await supabase
        .from("dates")
        .select("id, date_time, user1_id, user2_id, user1_followup_preference, user2_followup_preference")
        .eq("status", "completed");
    if (error) throw error;
    const dates = completed ?? [];
    if (dates.length === 0) return { catchupUsers: 0, owingPairs: 0 };

    const { data: answers } = await supabase
        .from("date_feedback_answers")
        .select("date_id, user_id")
        .in("date_id", dates.map((d: any) => d.id));
    const answered = new Set<string>((answers ?? []).map((a: any) => `${a.user_id}:${a.date_id}`));

    // Owing (user,date) pairs, de-duplicated to most-recent owed date per user.
    const byUser = new Map<string, { partnerId: string; dateTime: string | null }>();
    let owingPairs = 0;
    for (const d of dates) {
        const sides = [
            { uid: d.user1_id, partnerId: d.user2_id, pref: d.user1_followup_preference },
            { uid: d.user2_id, partnerId: d.user1_id, pref: d.user2_followup_preference },
        ];
        for (const s of sides) {
            if (privileged.has(s.uid)) continue;
            const submitted = !!s.pref && answered.has(`${s.uid}:${d.id}`);
            if (submitted) continue;
            owingPairs++;
            const cur = byUser.get(s.uid);
            if (!cur || (d.date_time && (!cur.dateTime || d.date_time > cur.dateTime))) {
                byUser.set(s.uid, { partnerId: s.partnerId, dateTime: d.date_time });
            }
        }
    }

    const partnerIds = Array.from(new Set(Array.from(byUser.values()).map((v) => v.partnerId)));
    const { data: profiles } = partnerIds.length
        ? await supabase.from("profiles").select("id, first_name").in("id", partnerIds)
        : { data: [] };
    const nameById = new Map<string, string>((profiles ?? []).map((p: any) => [p.id, p.first_name]));

    const recipients = Array.from(byUser.entries()).map(([uid, v]) => ({
        userId: uid,
        customData: { partnerName: nameById.get(v.partnerId) || "your match" },
    }));

    if (!dryRun && recipients.length > 0) {
        const { error: sendErr } = await supabase.functions.invoke("send-user-emails", {
            headers: internalHeaders,
            body: { emailType: "feedback_request", recipients },
        });
        if (sendErr) throw sendErr;
    }

    return { catchupUsers: recipients.length, owingPairs };
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const auth = await authenticateEdgeRequest(req, { allowCronSecret: true });
        if (auth.error) {
            return new Response(JSON.stringify({ error: auth.error.message }), {
                status: auth.error.status,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }
        if (!auth.context!.isInternal && !auth.context!.isAdmin) {
            return new Response(JSON.stringify({ error: "Forbidden" }), {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const supabase = auth.context!.supabase;
        const internalHeaders = { "X-Cron-Secret": Deno.env.get("CRON_SECRET") ?? "" };

        // Default to dry run; the cron job passes { dry_run: false } to actually send.
        let dryRun = true;
        let catchup = false;
        try {
            const text = await req.text();
            if (text) {
                const body = JSON.parse(text);
                if (body.dry_run === false) dryRun = false;
                if (body.catchup === true) catchup = true;
            }
        } catch {
            // empty body -> keep dryRun = true
        }

        // One-time backlog catch-up: email everyone who still owes feedback on a
        // completed date (ignores the per-stage cadence + recency window the
        // regular run uses). Triggered manually with { catchup: true }.
        if (catchup) {
            const cu = await runCatchup(supabase, internalHeaders, dryRun);
            log(`Catch-up (dryRun=${dryRun})`, cu);
            return new Response(
                JSON.stringify({ message: "Feedback catch-up processed", results: { dryRun, mode: "catchup", ...cu } }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
        }

        const nowMs = Date.now();
        const nowIso = new Date(nowMs).toISOString();
        log(`Starting (dryRun=${dryRun}) at ${nowIso}`);

        const results = {
            dryRun,
            autoCompleted: 0,
            initialSent: 0,
            reminder1dSent: 0,
            reminder7dSent: 0,
            skippedTooOld: 0,
            errors: [] as string[],
        };

        // ── Phase 0: auto-complete confirmed dates whose END time has passed ──
        const { data: confirmedPast, error: confirmedErr } = await supabase
            .from("dates")
            .select("id, user1_id, user2_id, date_time")
            .eq("status", "confirmed")
            .lt("date_time", nowIso);
        if (confirmedErr) throw confirmedErr;

        if (confirmedPast && confirmedPast.length > 0) {
            const durs = await loadDurations(supabase, confirmedPast.map((d: any) => d.id));
            const toComplete = confirmedPast.filter((d: any) => {
                if (!d.date_time) return false;
                const end = endTimeMs(d.date_time, resolvedDurationMin(durs, d.id, d.user1_id, d.user2_id));
                return end < nowMs; // only once the date is actually over
            });
            if (toComplete.length > 0) {
                if (!dryRun) {
                    const { error: completeErr } = await supabase
                        .from("dates")
                        .update({ status: "completed", completed_or_cancelled_at: nowIso })
                        .in("id", toComplete.map((d: any) => d.id));
                    if (completeErr) {
                        errorLog("Failed to auto-complete dates", completeErr);
                        results.errors.push(`auto-complete: ${completeErr.message}`);
                    }
                }
                results.autoCompleted = toComplete.length;
                log(`Auto-completed ${toComplete.length} date(s) past their end time`);
            }
        }

        // ── Phase 1: per-user feedback cadence on completed dates ──
        const recencyCutoffIso = new Date(nowMs - FEEDBACK_RECENCY_MS).toISOString();
        const { data: completedDates, error: completedErr } = await supabase
            .from("dates")
            .select(
                "id, user1_id, user2_id, date_time, user1_followup_preference, user2_followup_preference, user1_feedback_reminder_stage, user2_feedback_reminder_stage",
            )
            .eq("status", "completed")
            .not("date_time", "is", null)
            .lt("date_time", nowIso);
        if (completedErr) throw completedErr;

        const recent: any[] = [];
        for (const d of completedDates ?? []) {
            if (d.date_time >= recencyCutoffIso) recent.push(d);
            else results.skippedTooOld++;
        }

        if (recent.length > 0) {
            const dateIds = recent.map((d) => d.id);
            const durations = await loadDurations(supabase, dateIds);

            // Which (user,date) pairs already have at least one answer?
            const { data: answers, error: answersErr } = await supabase
                .from("date_feedback_answers")
                .select("date_id, user_id")
                .in("date_id", dateIds);
            if (answersErr) throw answersErr;
            const answered = new Set<string>((answers ?? []).map((a: any) => `${a.user_id}:${a.date_id}`));

            // Names for partnerName in the emails.
            const userIds = Array.from(new Set(recent.flatMap((d) => [d.user1_id, d.user2_id])));
            const { data: profiles, error: profilesErr } = await supabase
                .from("profiles")
                .select("id, first_name")
                .in("id", userIds);
            if (profilesErr) throw profilesErr;
            const nameById = new Map<string, string>((profiles ?? []).map((p: any) => [p.id, p.first_name]));

            const stageRecipients: Record<number, any[]> = { 1: [], 2: [], 3: [] };
            const stageUpdates: Record<number, { user1: string[]; user2: string[] }> = {
                1: { user1: [], user2: [] },
                2: { user1: [], user2: [] },
                3: { user1: [], user2: [] },
            };

            for (const d of recent) {
                const end = endTimeMs(d.date_time, resolvedDurationMin(durations, d.id, d.user1_id, d.user2_id));
                const elapsed = nowMs - end;
                if (elapsed < 0) continue; // date not actually over yet (manually completed early)

                const dueStage = elapsed >= ONE_WEEK_MS ? 3 : elapsed >= ONE_DAY_MS ? 2 : 1;

                const sides = [
                    {
                        col: "user1" as const,
                        uid: d.user1_id,
                        partnerId: d.user2_id,
                        pref: d.user1_followup_preference,
                        stage: d.user1_feedback_reminder_stage ?? 0,
                    },
                    {
                        col: "user2" as const,
                        uid: d.user2_id,
                        partnerId: d.user1_id,
                        pref: d.user2_followup_preference,
                        stage: d.user2_feedback_reminder_stage ?? 0,
                    },
                ];

                for (const side of sides) {
                    const hasSubmitted = !!side.pref && answered.has(`${side.uid}:${d.id}`);
                    if (hasSubmitted) continue; // already gave feedback -> stop emailing
                    if (dueStage <= side.stage) continue; // this stage (or later) already sent

                    stageRecipients[dueStage].push({
                        userId: side.uid,
                        customData: { partnerName: nameById.get(side.partnerId) || "your match" },
                    });
                    stageUpdates[dueStage][side.col].push(d.id);
                }
            }

            for (const stage of [1, 2, 3] as const) {
                const recipients = stageRecipients[stage];
                if (recipients.length === 0) continue;

                if (dryRun) {
                    log(`[dryRun] would send ${recipients.length} ${STAGE_EMAIL_TYPE[stage]} email(s)`);
                } else {
                    const { error: sendErr } = await supabase.functions.invoke("send-user-emails", {
                        headers: internalHeaders,
                        body: { emailType: STAGE_EMAIL_TYPE[stage], recipients },
                    });
                    if (sendErr) {
                        errorLog(`Failed to send ${STAGE_EMAIL_TYPE[stage]} emails`, sendErr);
                        results.errors.push(`${STAGE_EMAIL_TYPE[stage]}: ${sendErr.message}`);
                        continue; // don't advance stage if the send failed -> retried next run
                    }
                    for (const col of ["user1", "user2"] as const) {
                        const ids = stageUpdates[stage][col];
                        if (ids.length === 0) continue;
                        const { error: updErr } = await supabase
                            .from("dates")
                            .update({ [`${col}_feedback_reminder_stage`]: stage })
                            .in("id", ids);
                        if (updErr) {
                            errorLog(`Failed to advance ${col} stage to ${stage}`, updErr);
                            results.errors.push(`stage-update ${col}->${stage}: ${updErr.message}`);
                        }
                    }
                }

                if (stage === 1) results.initialSent = recipients.length;
                else if (stage === 2) results.reminder1dSent = recipients.length;
                else results.reminder7dSent = recipients.length;
            }
        }

        log("Done", results);
        return new Response(JSON.stringify({ message: "Feedback reminders processed", results }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error: any) {
        errorLog("Fatal", error);
        return new Response(JSON.stringify({ error: error?.message ?? "Unknown error" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
