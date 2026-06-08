import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { authenticateEdgeRequest } from "../_shared/auth.ts";
import { zurichWeekStart as weekStart } from "../_shared/zurich-time.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Only start counting inactivity from this date onwards
// (first full week where users have had matches to interact with)
const INACTIVITY_START_DATE = "2026-03-23";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateEdgeRequest(req, {
      requireAdmin: true,
      allowCronSecret: true,
    });
    if (auth.error) {
      return json({ error: auth.error.message }, auth.error.status);
    }

    const supabase = auth.context!.supabase;

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run === true;

    const now = new Date();
    const currentWeek = weekStart(now);

    // Don't run inactivity checks until we have enough history
    if (currentWeek < INACTIVITY_START_DATE) {
      return json({
        message: `Inactivity tracking starts ${INACTIVITY_START_DATE}, skipping`,
        warned: 0,
        paused: 0,
      });
    }

    const lookbackWeeks = 4;
    const lookbackDate = new Date(now);
    lookbackDate.setUTCDate(lookbackDate.getUTCDate() - lookbackWeeks * 7);
    const lookbackStart = weekStart(lookbackDate);

    // Get all active (non-paused) profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, first_name, is_paused")
      .eq("is_paused", false);

    if (profilesError) throw profilesError;
    if (!profiles || profiles.length === 0) {
      return json({ message: "No active profiles found", warned: 0, paused: 0 });
    }

    const userIds = profiles.map((p: any) => p.id);

    // Fetch interactions AND matches in parallel
    const [
      { data: likes },
      { data: dislikes },
      { data: friendshipLikes },
      { data: friendshipDislikes },
      { data: matches },
    ] = await Promise.all([
      supabase.from("likes").select("user_id, created_at").gte("created_at", lookbackStart).in("user_id", userIds),
      supabase.from("dislikes").select("user_id, created_at").gte("created_at", lookbackStart).in("user_id", userIds),
      supabase.from("friendship_likes").select("user_id, created_at").gte("created_at", lookbackStart).in("user_id", userIds),
      supabase.from("friendship_dislikes").select("user_id, created_at").gte("created_at", lookbackStart).in("user_id", userIds),
      supabase.from("matches").select("user_id, matched_user_id, created_at").gte("created_at", lookbackStart),
    ]);

    // Build per-user weekly activity (interactions)
    const userWeeklyActivity = new Map<string, Set<string>>();

    const allInteractions = [
      ...(likes || []),
      ...(dislikes || []),
      ...(friendshipLikes || []),
      ...(friendshipDislikes || []),
    ];

    for (const row of allInteractions) {
      if (!row.created_at) continue;
      const week = weekStart(new Date(row.created_at));
      if (!userWeeklyActivity.has(row.user_id)) {
        userWeeklyActivity.set(row.user_id, new Set());
      }
      userWeeklyActivity.get(row.user_id)!.add(week);
    }

    // Build per-user weekly matches received
    // A user received matches if they appear as user_id OR matched_user_id
    const userWeeklyMatches = new Map<string, Set<string>>();

    for (const m of matches || []) {
      if (!m.created_at) continue;
      const week = weekStart(new Date(m.created_at));
      for (const uid of [m.user_id, m.matched_user_id]) {
        if (!userWeeklyMatches.has(uid)) {
          userWeeklyMatches.set(uid, new Set());
        }
        userWeeklyMatches.get(uid)!.add(week);
      }
    }

    // Generate the last 3 complete weeks (not including current week),
    // but only weeks >= INACTIVITY_START_DATE
    const recentWeeks: string[] = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i * 7);
      const w = weekStart(d);
      if (w >= INACTIVITY_START_DATE) {
        recentWeeks.push(w);
      }
    }

    if (recentWeeks.length === 0) {
      return json({
        message: `No eligible weeks since ${INACTIVITY_START_DATE} yet`,
        warned: 0,
        paused: 0,
      });
    }

    // Classify users and persist consecutive_inactive_weeks
    const warningUsers: Array<{ id: string; first_name: string; consecutive_weeks: number }> = [];
    const autoPauseUsers: Array<{ id: string; first_name: string; consecutive_weeks: number }> = [];
    const weekUpdates: Array<{ id: string; weeks: number }> = [];

    for (const profile of profiles) {
      const activeWeeks = userWeeklyActivity.get(profile.id) || new Set();
      const matchWeeks = userWeeklyMatches.get(profile.id) || new Set();

      // Count consecutive inactive weeks from most recent,
      // but SKIP weeks where the user received 0 matches (they couldn't interact)
      let consecutiveInactive = 0;
      for (const week of recentWeeks) {
        // If user got no matches this week, don't count it against them
        if (!matchWeeks.has(week)) {
          continue;
        }
        // User had matches but didn't interact
        if (!activeWeeks.has(week)) {
          consecutiveInactive++;
        } else {
          break;
        }
      }

      // Always track the value for persistence
      weekUpdates.push({ id: profile.id, weeks: consecutiveInactive });

      if (consecutiveInactive >= 3) {
        autoPauseUsers.push({
          id: profile.id,
          first_name: profile.first_name || "User",
          consecutive_weeks: consecutiveInactive,
        });
      } else if (consecutiveInactive >= 2) {
        warningUsers.push({
          id: profile.id,
          first_name: profile.first_name || "User",
          consecutive_weeks: consecutiveInactive,
        });
      }
    }

    console.log(`Inactivity check: ${warningUsers.length} to warn, ${autoPauseUsers.length} to auto-pause (dry_run: ${dryRun}, weeks checked: ${recentWeeks.join(",")})`);

    if (dryRun) {
      return json({
        dry_run: true,
        weeks_checked: recentWeeks,
        warning_users: warningUsers,
        auto_pause_users: autoPauseUsers,
        warning_count: warningUsers.length,
        auto_pause_count: autoPauseUsers.length,
      });
    }

    // Persist consecutive_inactive_weeks to profiles
    for (const upd of weekUpdates) {
      await supabase
        .from("profiles")
        .update({ consecutive_inactive_weeks: upd.weeks } as any)
        .eq("id", upd.id);
    }

    // Send warning emails
    if (warningUsers.length > 0) {
      const cronSecret = Deno.env.get("CRON_SECRET");
      await supabase.functions.invoke("send-user-emails", {
        body: {
          emailType: "inactivity_warning",
          recipients: warningUsers.map((u) => ({
            userId: u.id,
            customData: { inactiveWeeks: u.consecutive_weeks },
          })),
        },
        headers: cronSecret ? { "X-Cron-Secret": cronSecret } : {},
      }).catch((err: any) => console.error("Failed to send warning emails:", err));
    }

    // Auto-pause users with 3+ consecutive inactive weeks
    if (autoPauseUsers.length > 0) {
      const pauseIds = autoPauseUsers.map((u) => u.id);

      const { error: pauseError } = await supabase
        .from("profiles")
        .update({ is_paused: true })
        .in("id", pauseIds);

      if (pauseError) {
        console.error("Failed to auto-pause users:", pauseError);
      } else {
        console.log(`Auto-paused ${pauseIds.length} users`);
      }

      const cronSecret = Deno.env.get("CRON_SECRET");
      await supabase.functions.invoke("send-user-emails", {
        body: {
          emailType: "inactivity_paused",
          recipients: autoPauseUsers.map((u) => ({
            userId: u.id,
            customData: { inactiveWeeks: u.consecutive_weeks },
          })),
        },
        headers: cronSecret ? { "X-Cron-Secret": cronSecret } : {},
      }).catch((err: any) => console.error("Failed to send auto-pause emails:", err));
    }

    return json({
      success: true,
      warned: warningUsers.length,
      paused: autoPauseUsers.length,
      warning_users: warningUsers.map((u) => u.id),
      auto_pause_users: autoPauseUsers.map((u) => u.id),
    });
  } catch (error: any) {
    console.error("check-user-inactivity error:", error);
    return json({ error: error.message || "Unknown error" }, 400);
  }
});
