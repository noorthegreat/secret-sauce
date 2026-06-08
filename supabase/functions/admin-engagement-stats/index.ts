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

// Inactivity tracking only starts from this date
// (first full week where the auto-pause rule applies)
const INACTIVITY_START_DATE = "2026-03-23";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateEdgeRequest(req, { requireAdmin: true });
    if (auth.error) {
      return json({ error: auth.error.message }, auth.error.status);
    }

    const supabase = auth.context!.supabase;
    const currentWeek = weekStart(new Date());
    const LAUNCH_DATE = "2026-03-02";
    const lookbackStart = LAUNCH_DATE;

    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, first_name, is_paused, created_at, photo_url, date_penalty_count")
      .order("first_name", { ascending: true });

    if (profilesError) throw profilesError;

    const { data: privateRows } = await supabase
      .from("private_profile_data")
      .select("user_id, last_name, email");

    const privateByUser = new Map((privateRows || []).map((r: any) => [r.user_id, r]));

    const studentDomains = ["ethz.ch", "uzh.ch", "zhaw.ch"];
    const studentProfiles = (profiles || []).filter((p: any) => {
      const priv = privateByUser.get(p.id);
      if (!priv?.email) return false;
      const domain = priv.email.split("@")[1]?.toLowerCase();
      return studentDomains.some((d: string) => domain === d || domain?.endsWith("." + d));
    });

    // Fetch interactions + matches in parallel
    const [
      { data: likes },
      { data: dislikes },
      { data: friendshipLikes },
      { data: friendshipDislikes },
      { data: matches },
      { data: dates },
    ] = await Promise.all([
      supabase.from("likes").select("user_id, created_at").gte("created_at", lookbackStart),
      supabase.from("dislikes").select("user_id, created_at").gte("created_at", lookbackStart),
      supabase.from("friendship_likes").select("user_id, created_at").gte("created_at", lookbackStart),
      supabase.from("friendship_dislikes").select("user_id, created_at").gte("created_at", lookbackStart),
      supabase.from("match_history").select("user_id, matched_user_id, created_at").gte("created_at", lookbackStart),
      supabase.from("dates").select("user1_id, user2_id, status, created_at, completed_or_cancelled_at, match_type, user1_followup_preference, user2_followup_preference"),
    ]);

    type WeeklyData = {
      interactions: number;
      likes: number;
      dislikes: number;
      matchesReceived: number;
      datesCompleted: number;
    };

    const userWeekly = new Map<string, Map<string, WeeklyData>>();
    const userLastActivity = new Map<string, string>();
    const weeklyMutualOutcomes = new Map<string, number>();
    const mutualOutcomeSummary = {
      total: 0,
      relationship: 0,
      friendship: 0,
    };

    const ensureWeek = (userId: string, week: string): WeeklyData => {
      if (!userWeekly.has(userId)) userWeekly.set(userId, new Map());
      const weeks = userWeekly.get(userId)!;
      if (!weeks.has(week)) weeks.set(week, { interactions: 0, likes: 0, dislikes: 0, matchesReceived: 0, datesCompleted: 0 });
      return weeks.get(week)!;
    };

    const updateLastActivity = (userId: string, dateStr: string | null) => {
      if (!dateStr) return;
      const current = userLastActivity.get(userId);
      if (!current || dateStr > current) userLastActivity.set(userId, dateStr);
    };

    const allLikes = [
      ...(likes || []),
      ...(friendshipLikes || []),
    ];
    const allDislikes = [
      ...(dislikes || []),
      ...(friendshipDislikes || []),
    ];

    for (const row of allLikes) {
      if (!row.created_at) continue;
      const week = weekStart(new Date(row.created_at));
      if (week < lookbackStart) continue;
      const wd = ensureWeek(row.user_id, week);
      wd.interactions++;
      wd.likes++;
      updateLastActivity(row.user_id, row.created_at);
    }

    for (const row of allDislikes) {
      if (!row.created_at) continue;
      const week = weekStart(new Date(row.created_at));
      if (week < lookbackStart) continue;
      const wd = ensureWeek(row.user_id, week);
      wd.interactions++;
      wd.dislikes++;
      updateLastActivity(row.user_id, row.created_at);
    }

    for (const m of matches || []) {
      if (!m.created_at) continue;
      const week = weekStart(new Date(m.created_at));
      if (week < lookbackStart) continue;
      // match_history is bidirectional (A→B and B→A rows per pair).
      // Process only one direction (user_id < matched_user_id) to deduplicate,
      // then credit both users so neither side gets missed.
      if (m.user_id < m.matched_user_id) {
        ensureWeek(m.user_id, week).matchesReceived++;
        ensureWeek(m.matched_user_id, week).matchesReceived++;
      }
    }

    for (const d of dates || []) {
      const dateStr = d.completed_or_cancelled_at || d.created_at;
      if (d.status === "completed" && dateStr) {
        const week = weekStart(new Date(dateStr));
        ensureWeek(d.user1_id, week).datesCompleted++;
        ensureWeek(d.user2_id, week).datesCompleted++;
        updateLastActivity(d.user1_id, dateStr);
        updateLastActivity(d.user2_id, dateStr);

        const isRelationshipMutualMatch =
          d.match_type === "relationship" &&
          d.user1_followup_preference === "match" &&
          d.user2_followup_preference === "match";

        const isFriendshipMutualMatch =
          d.match_type === "friendship" &&
          d.user1_followup_preference === "friend" &&
          d.user2_followup_preference === "friend";

        if (isRelationshipMutualMatch || isFriendshipMutualMatch) {
          weeklyMutualOutcomes.set(week, (weeklyMutualOutcomes.get(week) || 0) + 1);
          mutualOutcomeSummary.total++;

          if (isRelationshipMutualMatch) mutualOutcomeSummary.relationship++;
          if (isFriendshipMutualMatch) mutualOutcomeSummary.friendship++;
        }
      }
    }

    // Generate sorted week labels
    const allWeeks: string[] = [];
    {
      const d = new Date(lookbackStart);
      const end = new Date(currentWeek);
      while (d <= end) {
        allWeeks.push(d.toISOString().slice(0, 10));
        d.setUTCDate(d.getUTCDate() + 7);
      }
    }

    // Weeks eligible for inactivity counting (>= INACTIVITY_START_DATE, excluding current)
    const inactivityWeeks = allWeeks.filter((w) => w >= INACTIVITY_START_DATE && w < currentWeek);

    const users = studentProfiles.map((p: any) => {
      const priv = privateByUser.get(p.id);
      const weeks = userWeekly.get(p.id) || new Map();

      let totalInteractions = 0;
      let totalMatches = 0;
      let totalDatesCompleted = 0;

      for (const w of allWeeks) {
        const data = weeks.get(w) || { interactions: 0, matchesReceived: 0, datesCompleted: 0 };
        totalInteractions += data.interactions;
        totalMatches += data.matchesReceived;
        totalDatesCompleted += data.datesCompleted;
      }

      // Count consecutive inactive weeks from most recent backwards,
      // but SKIP weeks where user got 0 matches (nothing to interact with)
      let consecutiveInactive = 0;
      for (let i = inactivityWeeks.length - 1; i >= 0; i--) {
        const w = inactivityWeeks[i];
        const data = weeks.get(w);
        const hadMatches = data && data.matchesReceived > 0;

        // Skip weeks with no matches — user couldn't interact
        if (!hadMatches) continue;

        // User had matches but didn't interact
        if (!data || data.interactions === 0) {
          consecutiveInactive++;
        } else {
          break;
        }
      }

      // Determine engagement status
      let status: "active" | "warning" | "at_risk" | "inactive" = "active";
      if (inactivityWeeks.length > 0) {
        if (consecutiveInactive >= 3) status = "inactive";
        else if (consecutiveInactive >= 2) status = "at_risk";
        else if (consecutiveInactive >= 1) status = "warning";
      }

      return {
        id: p.id,
        first_name: p.first_name || "",
        last_name: priv?.last_name || null,
        email: priv?.email || null,
        photo_url: p.photo_url || null,
        is_paused: p.is_paused === true,
        created_at: p.created_at,
        last_activity: userLastActivity.get(p.id) || null,
        total_interactions_12w: totalInteractions,
        total_matches_12w: totalMatches,
        total_dates_completed: totalDatesCompleted,
        consecutive_inactive_weeks: consecutiveInactive,
        status,
      };
    });

    // Aggregate weekly totals
    const studentIds = new Set(studentProfiles.map((p: any) => p.id));
    const weeklyTotals = allWeeks.map((week) => {
      let interactions = 0;
      let totalLikes = 0;
      let totalDislikes = 0;
      let matchesReceived = 0;
      let datesCompleted = 0;
      let activeUsers = 0;

      for (const [userId, weeks] of userWeekly) {
        if (!studentIds.has(userId)) continue;
        const wd = weeks.get(week);
        if (wd) {
          interactions += wd.interactions;
          totalLikes += wd.likes;
          totalDislikes += wd.dislikes;
          matchesReceived += wd.matchesReceived;
          datesCompleted += wd.datesCompleted;
          if (wd.interactions > 0) activeUsers++;
        }
      }

      return {
        week,
        interactions,
        likes: totalLikes,
        dislikes: totalDislikes,
        matchesReceived,
        datesCompleted,
        mutualOutcomes: weeklyMutualOutcomes.get(week) || 0,
        activeUsers,
      };
    });

    // Status summary
    const nonPaused = users.filter((u: any) => !u.is_paused);
    const statusSummary = {
      active: nonPaused.filter((u: any) => u.status === "active").length,
      warning: nonPaused.filter((u: any) => u.status === "warning").length,
      at_risk: nonPaused.filter((u: any) => u.status === "at_risk").length,
      inactive: nonPaused.filter((u: any) => u.status === "inactive").length,
      paused: users.filter((u: any) => u.is_paused).length,
    };

    // Penalty stats
    const allProfiles = profiles || [];
    const usersWithStrikes = allProfiles.filter((p: any) => (p.date_penalty_count || 0) > 0).length;
    const penaltyPaused = allProfiles.filter((p: any) => p.is_paused && (p.date_penalty_count || 0) >= 3).length;

    return json({
      users,
      weeklyTotals,
      statusSummary,
      mutualOutcomeSummary,
      weeks: allWeeks,
      currentWeek,
      inactivityStartDate: INACTIVITY_START_DATE,
      inactivityWeeksTracked: inactivityWeeks.length,
      usersWithStrikes,
      penaltyPaused,
    });
  } catch (error: any) {
    console.error("admin-engagement-stats error:", error);
    return json({ error: error.message || "Unknown error" }, 400);
  }
});
