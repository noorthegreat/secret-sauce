import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { Sparkles, Clock } from "lucide-react";
import ProfileViewDialog from "@/components/ProfileViewDialog";
import DateCreatedDialog from "@/components/matches/DateCreatedDialog";
import MatchCard, { Match } from "@/components/matches/MatchCard";
import HowOrbiitWorksDialog from "@/components/HowOrbiitWorksDialog";
import { canAccessDating } from "@/lib/dating-eligibility";
import { currentZurichCycleStartMs, nextZurichMondayMidnightMs } from "@/lib/zurich-time";
import StudentEmailVerificationCard from "@/components/StudentEmailVerificationCard";
import { syncProfileEmailFromAuth } from "@/lib/profile-email";
import { buildEventPath, formatEventDateTime } from "@/lib/events";
import { useTranslation, Trans } from "react-i18next";
import { revalidatePhotoUrls } from "@/lib/photoValidation";

// The one-time extension is now disabled and weekly decisions are back to Monday only.
const ONE_TIME_DECISION_EXTENSION_ENABLED = false;
const ONE_TIME_DECISION_EXTENSION_START_UTC_MS = Date.UTC(2026, 2, 9, 8, 0, 0, 0);
const ONE_TIME_DECISION_EXTENSION_END_UTC_MS = Date.UTC(2026, 2, 11, 0, 0, 0, 0);

const Matches = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [selectedMatchType, setSelectedMatchType] = useState<'relationship' | 'friendship'>('relationship');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isTestUser, setIsTestUser] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [timeProgress, setTimeProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [isDecisionWindow, setIsDecisionWindow] = useState(false);
  const [showDateDialog, setShowDateDialog] = useState(false);
  const [newDateMatch, setNewDateMatch] = useState<any>(null);
  const [newDateMatchType, setNewDateMatchType] = useState<'relationship' | 'friendship'>('relationship');
  const [isCreatingDate, setIsCreatingDate] = useState(false);
  const [hasEventEnrollment, setHasEventEnrollment] = useState(false);
  const [showIntroDialog, setShowIntroDialog] = useState(false);
  const [canDate, setCanDate] = useState(true);
  const [pendingFeedbackCount, setPendingFeedbackCount] = useState(0);
  const { t } = useTranslation("matches");
  const getPendingFeedbackCount = async (currentUserId: string): Promise<number> => {
    const { data: completedDates, error: datesError } = await supabase
      .from("dates")
      .select("id, user1_id, user2_id, user1_followup_preference, user2_followup_preference")
      .eq("status", "completed")
      .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`);

    if (datesError) throw datesError;
    if (!completedDates || completedDates.length === 0) return 0;

    const completedDateIds = completedDates.map((d) => d.id);

    // @ts-ignore - Generated types can lag behind migrations in some environments
    const { data: answers, error: answersError } = await (supabase as any)
      .from("date_feedback_answers")
      .select("date_id")
      .eq("user_id", currentUserId)
      .in("date_id", completedDateIds);

    if (answersError) throw answersError;

    const answeredDateIds = new Set<string>((answers || []).map((a: { date_id: string }) => a.date_id));

    let pendingCount = 0;
    for (const date of completedDates) {
      const isUser1 = date.user1_id === currentUserId;
      const followupSet = isUser1 ? !!date.user1_followup_preference : !!date.user2_followup_preference;
      const hasAnswers = answeredDateIds.has(date.id);
      if (!followupSet || !hasAnswers) {
        pendingCount += 1;
      }
    }

    return pendingCount;
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      const { data: hasTestRole } = await supabase.rpc('has_role', {
        _user_id: session.user.id,
        _role: 'test'
      });

      if (hasTestRole) {
        setIsTestUser(true);
      }

      const { data: hasAdminRole } = await supabase.rpc('has_role', {
        _user_id: session.user.id,
        _role: 'admin'
      });

      if (hasAdminRole) {
        setIsAdmin(true);
      }
      setUser(session.user);
      await syncProfileEmailFromAuth(session.user.id, session.user.email);
      const userCanDate = canAccessDating(session.user);
      setCanDate(userCanDate);
      setPendingFeedbackCount(0);

      // Check pause & penalty status
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_paused")
        .eq("id", session.user.id)
        .single();

      // @ts-ignore - columns may not be in generated types yet
      const penaltyCount = (profile as any)?.date_penalty_count ?? 0;
      const inactiveWeeks = (profile as any)?.consecutive_inactive_weeks ?? 0;

      const patchedUser = {
        ...session.user,
        user_metadata: {
          ...session.user.user_metadata,
          is_paused: !!profile?.is_paused,
          penalty_paused: profile?.is_paused && penaltyCount >= 3,
          auto_paused: profile?.is_paused && (penaltyCount >= 3 || inactiveWeeks >= 3),
          date_penalty_count: penaltyCount,
          consecutive_inactive_weeks: inactiveWeeks,
        }
      };
      setUser(patchedUser as User);

      const resolvedTest = !!hasTestRole;
      const resolvedAdmin = !!hasAdminRole;
      await loadMatches(session.user.id, { isTestUser: resolvedTest, isAdmin: resolvedAdmin });
      void checkEventEnrollment(session.user.id);

      if (!userCanDate) {
        return;
      }

      try {
        const pending = await getPendingFeedbackCount(session.user.id);
        setPendingFeedbackCount(pending);
      } catch (error) {
        console.error("Error checking feedback completion gate:", error);
      }
      checkIntroDialog(session.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        void syncProfileEmailFromAuth(session.user.id, session.user.email);
        setCanDate(canAccessDating(session.user));
        void (async () => {
          if (!canAccessDating(session.user)) {
            setPendingFeedbackCount(0);
            return;
          }
          try {
            const pending = await getPendingFeedbackCount(session.user.id);
            setPendingFeedbackCount(pending);
          } catch (error) {
            console.error("Error checking feedback completion gate:", error);
          }
        })();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const calculateWeeklyWindow = () => {
      const now = new Date();
      const nowMs = now.getTime();
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      const cycleStart = currentZurichCycleStartMs();
      const nextDrop = nextZurichMondayMidnightMs();
      const mondayDecisionWindowEnd = cycleStart + (36 * 60 * 60 * 1000); // Mon 00:00 → Tue 12:00 Zurich
      const isBaseDecisionWindowOpen = nowMs >= cycleStart && nowMs < mondayDecisionWindowEnd;
      const isOneTimeExtensionWindowOpen =
        ONE_TIME_DECISION_EXTENSION_ENABLED &&
        nowMs >= ONE_TIME_DECISION_EXTENSION_START_UTC_MS &&
        nowMs < ONE_TIME_DECISION_EXTENSION_END_UTC_MS;

      const progress = Math.min(100, Math.max(0, ((nowMs - cycleStart) / weekMs) * 100));
      const timeLeftMs = nextDrop - nowMs;
      const days = Math.floor(timeLeftMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeLeftMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeftMs % (1000 * 60)) / 1000);

      setTimeProgress(progress);
      setTimeRemaining(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      setIsDecisionWindow(isBaseDecisionWindowOpen || isOneTimeExtensionWindowOpen);
    };

    calculateWeeklyWindow();
    const interval = setInterval(calculateWeeklyWindow, 1000);

    return () => clearInterval(interval);
  }, []);

  const loadMatches = async (
    userId: string,
    roles?: { isTestUser: boolean; isAdmin: boolean },
  ) => {
    const effectiveTest = roles?.isTestUser ?? isTestUser;
    const effectiveAdmin = roles?.isAdmin ?? isAdmin;
    setIsLoading(true);
    try {
      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select("id, compatibility_score, matched_user_id, from_algorithm, match_type, event_id")
        .eq("user_id", userId)
        .order("compatibility_score", { ascending: false });

      if (matchesError) throw matchesError;

      if (!matchesData || matchesData.length === 0) {
        setMatches([]);
        return;
      }
      const temp_disable_matches = false;
      if (!effectiveTest && temp_disable_matches) {
        setMatches([]);
        return;
      }

      const matchedUserIds = matchesData.map((m) => m.matched_user_id);
      const eventIds = Array.from(
        new Set(matchesData.map((match) => match.event_id).filter(Boolean))
      ) as string[];

      const [
        { data: profilesData, error: profilesError },
        eventsResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, first_name, bio, age, photo_url, additional_photos, created_at")
          .in("id", matchedUserIds),
        eventIds.length > 0
          ? supabase
            .from("events")
            .select("id, name, slug, start_date, timezone, metadata")
            .in("id", eventIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (profilesError) throw profilesError;
      if (eventsResult.error) throw eventsResult.error;

      const eventsById = new Map(
        ((eventsResult.data || []) as Array<{ id: string; name: string; slug: string; start_date: string; timezone: string; metadata: any }>).map((event) => [event.id, event])
      );

      // Get likes data
      const { data: myLikesData } = await supabase
        .from("likes")
        .select("liked_user_id")
        .eq("user_id", userId)
        .in("liked_user_id", matchedUserIds);

      const { data: theirLikesData } = await supabase
        .from("likes")
        .select("user_id")
        .eq("liked_user_id", userId)
        .in("user_id", matchedUserIds);

      const { data: myFriendLikesData } = await supabase
        .from("friendship_likes")
        .select("liked_user_id")
        .eq("user_id", userId)
        .in("liked_user_id", matchedUserIds);

      const { data: theirFriendLikesData } = await supabase
        .from("friendship_likes")
        .select("user_id")
        .eq("liked_user_id", userId)
        .in("user_id", matchedUserIds);

      const myLikes = new Set(myLikesData?.map((l) => l.liked_user_id) || []);
      const theirLikes = new Set(theirLikesData?.map((l) => l.user_id) || []);
      const myFriendLikes = new Set(myFriendLikesData?.map((l) => l.liked_user_id) || []);
      const theirFriendLikes = new Set(theirFriendLikesData?.map((l) => l.user_id) || []);

      const combinedMatches = matchesData.map((match) => {
        const profile = profilesData?.find((p) => p.id === match.matched_user_id);
        const isFriendship = match.match_type === "friendship";
        const activeMyLikes = isFriendship ? myFriendLikes : myLikes;
        const activeTheirLikes = isFriendship ? theirFriendLikes : theirLikes;
        const event = match.event_id ? eventsById.get(match.event_id) : null;
        const eventMeta = (event?.metadata || {}) as Record<string, unknown>;

        return {
          id: match.id,
          compatibility_score: match.compatibility_score,
          matched_user: (profile ? { ...profile, last_name: "", latitude: null, longitude: null } : {
            id: match.matched_user_id,
            first_name: "Unknown User",
            last_name: "",
            bio: null,
            age: null,
            latitude: null,
            longitude: null,
          }) as any,
          isLikedByMe: activeMyLikes.has(match.matched_user_id),
          isLikedByThem: activeTheirLikes.has(match.matched_user_id),
          from_algorithm: (match.from_algorithm || "relationship") as Match["from_algorithm"],
          match_type: (match.match_type || "relationship") as Match["match_type"],
          event_id: match.event_id,
          event_name: event?.name || (match.from_algorithm === "event" ? t("events.fallbackName") : null),
          event_slug: event?.slug || null,
          event_start_date: event?.start_date || null,
          event_schedule_dates: eventMeta.schedule_dates !== false,
          event_show_matches: eventMeta.show_matches_to_users !== false,
        } satisfies Match;
      })
        // Filter out event matches where show_matches_to_users is false (unless admin)
        .filter((m) => m.from_algorithm !== "event" || m.event_show_matches || effectiveAdmin);

      setMatches(combinedMatches);
    } catch (error: any) {
      toast({
        title: t("toast.errorLoadingTitle"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkEventEnrollment = async (userId: string) => {
    try {
      const { data: enrollments, error } = await supabase
        .from("event_enrollments")
        .select("event_id")
        .eq("user_id", userId)
        .not("event_id", "is", null);

      if (error) throw error;

      const eventIds = Array.from(
        new Set((enrollments || []).map((entry: { event_id: string | null }) => entry.event_id).filter(Boolean))
      ) as string[];

      if (eventIds.length === 0) {
        setHasEventEnrollment(false);
        return;
      }

      const nowIso = new Date().toISOString();
      const { data: activeEvents, error: activeError } = await supabase
        .from("events")
        .select("id, metadata")
        .in("id", eventIds)
        .eq("active", true)
        .gte("start_date", nowIso);

      if (activeError) throw activeError;
      const hasMatchesEnabled = (activeEvents || []).some(
        (e) => (e.metadata as any)?.show_matches_to_users !== false
      );
      setHasEventEnrollment(hasMatchesEnabled);
    } catch (error) {
      console.error("Error checking event enrollment:", error);
    }
  };

  const checkIntroDialog = async (userId: string) => {
    try {
      // Check if user has seen the dialog in DB
      const { data, error } = await supabase
        .from("profiles")
        .select("has_seen_intro_dialog")
        .eq("id", userId)
        .single();

      if (error) {
        // Fallback to localStorage if column doesn't exist yet or other error
        console.log("Error checking intro dialog status, falling back to localStorage:", error);
        const hasSeenLocal = localStorage.getItem(`has_seen_intro_dialog_${userId}`);
        if (!hasSeenLocal) {
          setShowIntroDialog(true);
        }
        return;
      }

      // @ts-ignore - column might not exist in types yet
      if (!data?.has_seen_intro_dialog) {
        setShowIntroDialog(true);
      }
    } catch (error) {
      console.error("Error checking intro dialog:", error);
    }
  };

  const handleCloseIntroDialog = async (open: boolean) => {
    if (!open && user) {
      setShowIntroDialog(false);

      // Update DB
      try {
        const { error } = await supabase
          .from("profiles")
          // @ts-ignore - column might not exist in types yet
          .update({ has_seen_intro_dialog: true })
          .eq("id", user.id);

        if (error) throw error;
      } catch (error) {
        console.error("Error updating intro dialog status:", error);
        // Fallback to localStorage
        localStorage.setItem(`has_seen_intro_dialog_${user.id}`, "true");
      }
    } else {
      setShowIntroDialog(open);
    }
  };

  const handleLike = async (match: Match, event: React.MouseEvent) => {
    if (!user) return;
    event.stopPropagation();

    if (match.from_algorithm !== 'event' && !isDecisionWindow && !isAdmin && !isTestUser) {
      toast({
        title: t("toast.decisionClosed.title"),
        description: t("toast.decisionClosed.description"),
        variant: "destructive",
      });
      return;
    }

    // A paused account must reactivate before creating any new matches/dates.
    if (user.user_metadata?.is_paused && !isAdmin && !isTestUser) {
      toast({
        title: t("toast.pausedBlocked.title"),
        description: t("toast.pausedBlocked.description"),
        variant: "destructive",
      });
      return;
    }

    // Optimistically mark as liked so the button disables immediately
    setMatches((prev) =>
      prev.map((m) =>
        m.matched_user.id === match.matched_user.id ? { ...m, isLikedByMe: true } : m,
      ),
    );

    try {
      const likesTable = match.match_type === "friendship" ? "friendship_likes" : "likes";
      const dislikesTable = match.match_type === "friendship" ? "friendship_dislikes" : "dislikes";
      const { error: clearDislikeError } = await supabase
        .from(dislikesTable as any)
        .delete()
        .eq("user_id", user.id)
        .eq("disliked_user_id", match.matched_user.id);

      if (clearDislikeError) throw clearDislikeError;

      const { error } = await supabase
        .from(likesTable as any)
        .insert({ user_id: user.id, liked_user_id: match.matched_user.id });

      if (error) throw error;

      if (match.isLikedByThem && match.from_algorithm !== 'event') {
        // It's a mutual match for a weekly match. Create the shared date card.
        setNewDateMatch(match.matched_user);
        setNewDateMatchType(match.match_type === "friendship" ? "friendship" : "relationship");
        setShowDateDialog(true);
        setIsCreatingDate(true);

        const { error: funcError } = await supabase.functions.invoke('check-match-and-create-date', {
          body: {
            userId: user.id,
            matchedUserId: match.matched_user.id,
            matchType: match.match_type === "friendship" ? "friendship" : "relationship",
          }
        });

        if (funcError) {
          console.error("Error creating date:", funcError);
        }
        setIsCreatingDate(false);
      } else if (match.isLikedByThem && match.from_algorithm === 'event' && match.event_schedule_dates) {
        // Event match with date scheduling enabled
        setNewDateMatch(match.matched_user);
        setNewDateMatchType(match.match_type === "friendship" ? "friendship" : "relationship");
        setShowDateDialog(true);
        setIsCreatingDate(true);

        const { error: funcError } = await supabase.functions.invoke('check-match-and-create-date', {
          body: {
            userId: user.id,
            matchedUserId: match.matched_user.id,
            matchType: match.match_type === "friendship" ? "friendship" : "relationship",
            eventId: match.event_id,
          }
        });

        if (funcError) {
          console.error("Error creating event date:", funcError);
        }
        setIsCreatingDate(false);
      } else {
        toast({
          title: t("toast.liked.title"),
          description: match.match_type === "friendship"
            ? (match.isLikedByThem
              ? t("toast.liked.friendsMutual")
              : t("toast.liked.friendsPending"))
            : match.from_algorithm === 'event'
              ? (match.event_schedule_dates
                ? t("toast.liked.eventScheduled")
                : t("toast.liked.eventNoSchedule"))
              : t("toast.liked.weekly"),
        });
      }
    } catch (error: any) {
      setIsCreatingDate(false);
      // Revert optimistic like on failure
      setMatches((prev) =>
        prev.map((m) =>
          m.matched_user.id === match.matched_user.id ? { ...m, isLikedByMe: false } : m,
        ),
      );
      const isWindowClosed = typeof error?.message === "string" && error.message.includes("decision_window_closed");
      toast({
        title: isWindowClosed ? t("toast.decisionClosed.title") : t("toast.errorTitle"),
        description: isWindowClosed ? t("toast.decisionClosed.description") : error.message,
        variant: "destructive",
      });
    }
  };

  const handleDislike = async (matchId: string, matchedUserId: string, event: React.MouseEvent) => {
    if (!user) return;
    event.stopPropagation();

    const targetMatch = matches.find((m) => m.id === matchId);
    if (targetMatch && targetMatch.from_algorithm !== 'event' && !isDecisionWindow && !isAdmin && !isTestUser) {
      toast({
        title: t("toast.decisionClosed.title"),
        description: t("toast.decisionClosed.description"),
        variant: "destructive",
      });
      return;
    }

    try {
      // Remove matches for both users
      const { error: deleteError } = await supabase
        .from("matches")
        .delete()
        .or(`and(user_id.eq.${user.id},matched_user_id.eq.${matchedUserId}),and(user_id.eq.${matchedUserId},matched_user_id.eq.${user.id})`);

      if (deleteError) throw deleteError;

      const dislikesTable = targetMatch?.match_type === "friendship" ? "friendship_dislikes" : "dislikes";
      const likesTable = targetMatch?.match_type === "friendship" ? "friendship_likes" : "likes";

      const { error: clearLikeError } = await supabase
        .from(likesTable as any)
        .delete()
        .eq("user_id", user.id)
        .eq("liked_user_id", matchedUserId);

      if (clearLikeError) throw clearLikeError;

      // Remove any existing dislike first, then insert (avoids duplicate key + RLS issues with upsert)
      await supabase
        .from(dislikesTable as any)
        .delete()
        .eq("user_id", user.id)
        .eq("disliked_user_id", matchedUserId);

      const { error: dislikeError } = await supabase
        .from(dislikesTable as any)
        .insert({ user_id: user.id, disliked_user_id: matchedUserId });

      if (dislikeError) throw dislikeError;

      toast({
        title: t("toast.matchRemoved.title"),
        description: t("toast.matchRemoved.description"),
      });

      loadMatches(user.id);
    } catch (error: any) {
      const isEdgeReachabilityError =
        typeof error?.message === "string" &&
        error.message.includes("Failed to send a request to the Edge Function");

      toast({
        title: t("toast.errorTitle"),
        description: isEdgeReachabilityError
          ? t("toast.errorEdgeUnreachable")
          : error.message,
        variant: "destructive",
      });
    }
  };

  const handleReactivate = async () => {
    if (!user) return;
    try {
      // Read the current suspension state + photos. If the account was paused
      // for content reasons (requires_photo_revalidation=true), re-run strict
      // validation on every existing photo before allowing reactivation.
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        // @ts-ignore - new column not in generated types yet
        .select("requires_photo_revalidation, additional_photos")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      // @ts-ignore - new column
      const needsRevalidation = !!profile?.requires_photo_revalidation;
      const photos: string[] = (profile as any)?.additional_photos ?? [];

      if (needsRevalidation) {
        const { okCount, failures } = await revalidatePhotoUrls(photos, { strict: true });
        // Same minimum as ProfileSetup; if they have at least one passing photo we let them through.
        if (okCount === 0) {
          const firstError = failures[0]?.result;
          const errorKey = (firstError && !firstError.ok) ? firstError.errorKey : "noFaceFound";
          toast({
            title: t("toast.reactivateBlocked.title"),
            description: t(`toast.reactivateBlocked.${errorKey}`, { defaultValue: t("toast.reactivateBlocked.generic") }),
            variant: "destructive",
          });
          return;
        }
      }

      // @ts-ignore - columns may not be in generated types
      const { error } = await supabase
        .from("profiles")
        .update({
          is_paused: false,
          date_penalty_count: 0,
          consecutive_inactive_weeks: 0,
          // Clear the revalidation flag now that photos passed.
          ...(needsRevalidation ? { requires_photo_revalidation: false } : {}),
        } as any)
        .eq("id", user.id);

      if (error) throw error;

      setUser({
        ...user,
        user_metadata: {
          ...user.user_metadata,
          is_paused: false,
          penalty_paused: false,
          date_penalty_count: 0,
          consecutive_inactive_weeks: 0,
        }
      } as User);

      toast({
        title: t("toast.reactivated.title"),
        description: t("toast.reactivated.description"),
      });
    } catch (error: any) {
      toast({
        title: t("toast.errorTitle"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRecalculate = async () => {
    if (!user) return;

    try {
      toast({
        title: t("toast.recalculated.title"),
        description: t("toast.recalculated.description"),
      });

      await loadMatches(user.id, { isTestUser, isAdmin });
    } catch (error: any) {
      toast({
        title: t("toast.errorTitle"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDebugMatch = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke("debug-seed-date-flow", {
        body: { count: 1, seedDate: true, seedPartnerVote: true }
      });
      if (error) throw error;
      const payload = typeof data === "string" ? JSON.parse(data) : data;
      if (!payload?.success) throw new Error(payload?.error || "Failed to create debug data");

      toast({
        title: t("toast.debugCreated.title"),
        description: payload?.dateId
          ? t("toast.debugCreated.withDate")
          : t("toast.debugCreated.pending"),
      });
      await loadMatches(user.id, { isTestUser, isAdmin: true });
      if (payload?.dateId) {
        navigate(`/dates/${payload.dateId}`);
        return;
      }
    } catch (error: any) {
      let message = error?.message || "Unknown error";
      if (typeof error?.context?.json === "function") {
        try {
          const details = await error.context.json();
          if (details?.error) message = details.error;
        } catch {
          // keep existing message
        }
      }
      toast({
        title: t("toast.errorTitle"),
        description: message,
        variant: "destructive",
      });
    }
  };

  const [loadingProfileId, setLoadingProfileId] = useState<string | null>(null);

  const handleViewProfile = async (matchedUserId: string, matchType: 'relationship' | 'friendship' = 'relationship') => {
    setLoadingProfileId(matchedUserId);
    try {
      const [{ data, error }, { data: promptAnswers, error: promptError }] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("id", matchedUserId)
          .single(),
        supabase
          .from("personality_answers")
          .select("question_number, answer, answer_custom")
          .eq("user_id", matchedUserId)
          .in("question_number", [38, 39]),
      ]);

      if (error) throw error;
      if (promptError) throw promptError;

      const answerByQuestion = new Map<number, any>(
        (promptAnswers || []).map((a: any) => [a.question_number, a])
      );
      const threeWords = answerByQuestion.get(38)?.answer_custom || answerByQuestion.get(38)?.answer || null;
      const funFact = answerByQuestion.get(39)?.answer_custom || answerByQuestion.get(39)?.answer || null;

      setSelectedProfile({
        ...data,
        three_words_friends_describe: threeWords,
        fun_fact: funFact,
      });
      setSelectedMatchType(matchType);
      setIsProfileOpen(true);
    } catch (error: any) {
      toast({
        title: t("toast.errorTitle"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingProfileId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Sparkles className="w-12 h-12 mx-auto text-white animate-pulse" />
          <p className="text-white">{t("loading")}</p>
        </div>
      </div>
    );
  }

  const canSeeWeeklyMatches = isDecisionWindow || isAdmin || isTestUser;
  const eventMatches = matches.filter((match) => match.from_algorithm === "event");
  const groupedEventMatches = Array.from(
    eventMatches.reduce((groups, match) => {
      const key = match.event_id || "legacy-event";
      const existing = groups.get(key) || {
        key,
        name: match.event_name || t("events.fallbackName"),
        slug: match.event_slug || null,
        startDate: match.event_start_date || null,
        scheduleDates: match.event_schedule_dates ?? true,
        matches: [] as Match[],
      };
      existing.matches.push(match);
      groups.set(key, existing);
      return groups;
    }, new Map<string, { key: string; name: string; slug: string | null; startDate: string | null; scheduleDates: boolean; matches: Match[] }>())
  ).map(([, group]) => group).sort((a, b) => {
    const aTime = a.startDate ? new Date(a.startDate).getTime() : Number.MAX_SAFE_INTEGER;
    const bTime = b.startDate ? new Date(b.startDate).getTime() : Number.MAX_SAFE_INTEGER;
    return aTime - bTime || a.name.localeCompare(b.name);
  });
  const weeklyMatches = canSeeWeeklyMatches
    ? matches.filter((match) => match.from_algorithm !== "event")
    : [];

  return (
    <>
      <div className="p-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                {t("title")}
              </h1>
              <p className="text-white">
                {t("subtitle.weeklyDrop")}
                <br />
                {t("subtitle.decision")}
              </p>
            </div>
            <div className="flex gap-2">
              {isAdmin && (
                <Button variant="outline" onClick={handleDebugMatch} className="border-primary text-primary hover:bg-primary/10">
                  {t("buttons.debugMatch")}
                </Button>
              )}
            </div>
          </div>


          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t("countdown.next", { time: timeRemaining })}</span>
                </div>
                <span className="text-xs text-muted-foreground">{t("countdown.dropDayLabel")}</span>
              </div>
              <Progress value={timeProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {isDecisionWindow ? t("countdown.openNow") : t("countdown.closed")}
              </p>
            </CardContent>
          </Card>

          {user && (
            <div className="mb-6">
              {/* Auto-paused banner (penalties or inactivity) */}
              {user.user_metadata?.is_paused && user.user_metadata?.auto_paused && (
                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4 mb-4">
                  <div className="flex">
                    <div className="shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700 dark:text-red-200 font-semibold mb-1">{t("banners.autoPaused.title")}</p>
                      <p className="text-sm text-red-700 dark:text-red-200">
                        {user.user_metadata?.penalty_paused
                          ? t("banners.autoPaused.penalty")
                          : t("banners.autoPaused.inactivity")}
                      </p>
                      <Button
                        variant="outline"
                        className="mt-3 border-red-300 text-red-700 hover:bg-red-100 dark:border-red-600 dark:text-red-200 dark:hover:bg-red-900/40"
                        onClick={handleReactivate}
                      >
                        {t("buttons.reactivate")}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Self-paused banner */}
              {user.user_metadata?.is_paused && !user.user_metadata?.auto_paused && (
                <div className="bg-muted border-l-4 border-muted-foreground/30 p-4 mb-4">
                  <div className="flex">
                    <div className="shrink-0">
                      <svg className="h-5 w-5 text-muted-foreground" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-semibold text-foreground mb-1">{t("banners.selfPaused.title")}</p>
                      <p className="text-sm text-muted-foreground">
                        {t("banners.selfPaused.body")}
                      </p>
                      <Button
                        variant="outline"
                        className="mt-3"
                        onClick={handleReactivate}
                      >
                        {t("buttons.reactivate")}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Warning banners for users not yet paused but at risk */}
              {!user.user_metadata?.is_paused && (user.user_metadata?.consecutive_inactive_weeks >= 1 || user.user_metadata?.date_penalty_count > 0) && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 mb-4">
                  <div className="flex">
                    <div className="shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3 space-y-1">
                      <p className="text-sm text-yellow-700 dark:text-yellow-200 font-semibold">{t("banners.healthWarning.title")}</p>
                      {user.user_metadata?.consecutive_inactive_weeks >= 2 && (
                        <p className="text-sm text-yellow-700 dark:text-yellow-200">
                          <Trans
                            t={t}
                            i18nKey="banners.healthWarning.inactiveMulti"
                            values={{ count: user.user_metadata.consecutive_inactive_weeks }}
                            components={{ strong: <strong /> }}
                          />
                        </p>
                      )}
                      {user.user_metadata?.consecutive_inactive_weeks === 1 && (
                        <p className="text-sm text-yellow-700 dark:text-yellow-200">
                          {t("banners.healthWarning.inactiveOne")}
                        </p>
                      )}
                      {user.user_metadata?.date_penalty_count > 0 && (
                        <p className="text-sm text-yellow-700 dark:text-yellow-200">
                          <Trans
                            t={t}
                            i18nKey="banners.healthWarning.penalty"
                            values={{ count: user.user_metadata.date_penalty_count }}
                            components={{ strong: <strong /> }}
                          />
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {pendingFeedbackCount > 0 && (canDate || isAdmin) && (
                <div className="bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-400 p-4 mb-4">
                  <div className="flex">
                    <div className="shrink-0">
                      <Sparkles className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-indigo-800 dark:text-indigo-200">
                        <Trans
                          t={t}
                          i18nKey="banners.feedback.body"
                          count={pendingFeedbackCount}
                          values={{ count: pendingFeedbackCount }}
                          components={{ strong: <span className="font-semibold" /> }}
                        />
                      </p>
                      <Button
                        variant="outline"
                        className="mt-3 border-indigo-300 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-600 dark:text-indigo-200 dark:hover:bg-indigo-900/40"
                        onClick={() => navigate("/dates")}
                      >
                        {t("buttons.openDates")}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {!canDate && !isAdmin && (
            <StudentEmailVerificationCard
              currentEmail={user?.email}
              onOpenProfile={() => navigate("/profile-setup")}
            />
          )}

          {(hasEventEnrollment || eventMatches.length > 0) && (
            <div className="space-y-6 mb-12">
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-400" />
                <h2 className="text-2xl font-bold text-white">{t("events.heading")}</h2>
              </div>

              {/* Description varies per group, shown inline below */}

              {eventMatches.length === 0 ? (
                <Card className="p-8 text-center bg-purple-900/10 border-purple-500/20">
                  <p className="text-purple-200">
                    {t("events.empty")}
                  </p>
                </Card>
              ) : (
                <div className="space-y-8">
                  {groupedEventMatches.map((group) => (
                    <div key={group.key} className="space-y-4">
                      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h3 className="text-xl font-semibold text-white">{group.name}</h3>
                          {group.startDate && (
                            <p className="text-sm text-purple-200">
                              {formatEventDateTime(group.startDate)}
                            </p>
                          )}
                        </div>
                        {group.slug && (
                          <Button variant="outline" onClick={() => navigate(buildEventPath(group.slug))}>
                            {t("buttons.openEventPage")}
                          </Button>
                        )}
                      </div>
                      <Card className="border-purple-500/20 bg-purple-900/10">
                        <CardContent className="pt-4 pb-3">
                          <p className="text-sm text-purple-100">
                            {group.scheduleDates
                              ? t("events.scheduleEnabled")
                              : t("events.scheduleDisabled")}
                          </p>
                        </CardContent>
                      </Card>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {group.matches.map((match) => (
                          <MatchCard
                            key={match.id}
                            match={match}
                            onViewProfile={handleViewProfile}
                            onLike={handleLike}
                            onDislike={handleDislike}
                            variant="event"
                            showActions={group.scheduleDates}
                            canRespond={isAdmin || isTestUser || !user?.user_metadata?.is_paused}
                            isLoadingProfile={loadingProfileId === match.matched_user.id}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {(canDate || isAdmin) && (
            <div className="space-y-12">

              {/* Weekly Matches Section */}
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white">{t("weekly.heading")}</h2>

                {!canSeeWeeklyMatches ? (
                  <Card className="text-center p-12 shadow-xl border-border/50">
                    <Sparkles className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <CardTitle className="mb-2">{t("weekly.closed.title")}</CardTitle>
                    <CardDescription className="mb-6">
                      {t("weekly.closed.body")}
                    </CardDescription>
                  </Card>
                ) : weeklyMatches.length === 0 ? (
                  <Card className="text-center p-12 shadow-xl border-border/50">
                    <Sparkles className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <CardTitle className="mb-2">{t("weekly.empty.title")}</CardTitle>
                    <CardDescription className="mb-6">
                      {t("weekly.empty.body")}
                    </CardDescription>
                    <div className="flex gap-3 justify-center">
                      <Button className="bg-linear-to-r from-backgrounda to-backgroundc" onClick={() => navigate("/questionnaire-intro")}>{t("buttons.updateSurvey")}</Button>
                      <Button variant="outline" onClick={() => navigate("/profile-setup")}>
                        {t("buttons.editProfile")}
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {weeklyMatches.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        onViewProfile={handleViewProfile}
                        onLike={handleLike}
                        onDislike={handleDislike}
                        variant="default"
                        canRespond={isAdmin || isTestUser || (isDecisionWindow && !user?.user_metadata?.is_paused)}
                        isLoadingProfile={loadingProfileId === match.matched_user.id}
                      />
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

      </div >

      <ProfileViewDialog
        profile={selectedProfile}
        open={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        matchType={selectedMatchType}
      />


      <DateCreatedDialog
        open={showDateDialog}
        onOpenChange={setShowDateDialog}
        matchedUser={newDateMatch}
        connectionType={newDateMatchType}
        isCreatingDate={isCreatingDate}
      />

      <HowOrbiitWorksDialog
        open={showIntroDialog}
        onOpenChange={handleCloseIntroDialog}
      />
    </>
  );
};

export default Matches;
