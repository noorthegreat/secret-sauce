import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, RefreshCw, Trash2 } from "lucide-react";
import { fetchAdminAllInteractions } from "@/lib/admin-interactions";
import { MatchComparisonDialog } from "@/components/admin/MatchComparisonDialog";

type EventMatch = any;

type EventInfo = {
    id: string;
    name: string | null;
    active: boolean | null;
    start_date: string | null;
    end_date: string | null;
};

type EventStatus = "upcoming" | "ongoing" | "ended" | "unknown";

const loadPrivilegedUserIds = async (): Promise<Set<string>> => {
    const { data: roleRows, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "test"]);
    if (error) throw error;
    return new Set((roleRows || []).map((row: { user_id: string }) => row.user_id));
};

const getEventStatus = (event: EventInfo | undefined, nowMs: number): EventStatus => {
    if (!event) return "unknown";
    const end = event.end_date ? new Date(event.end_date).getTime() : null;
    const start = event.start_date ? new Date(event.start_date).getTime() : null;
    if (end != null && end < nowMs) return "ended";
    if (start != null && start > nowMs) return "upcoming";
    return "ongoing";
};

const formatEventDate = (event: EventInfo | undefined): string => {
    const raw = event?.start_date || event?.end_date;
    if (!raw) return "";
    try {
        return new Date(raw).toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    } catch {
        return "";
    }
};

const STATUS_BADGE: Record<EventStatus, { label: string; variant: "default" | "secondary" | "outline" }> = {
    ongoing: { label: "Ongoing", variant: "default" },
    upcoming: { label: "Upcoming", variant: "secondary" },
    ended: { label: "Ended", variant: "outline" },
    unknown: { label: "Unknown event", variant: "outline" },
};

export const AdminEventMatchesTab = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [eventMatches, setEventMatches] = useState<EventMatch[]>([]);
    const [eventsById, setEventsById] = useState<Map<string, EventInfo>>(new Map());
    const [selectedMatch, setSelectedMatch] = useState<EventMatch | null>(null);
    const [isComparisonOpen, setIsComparisonOpen] = useState(false);
    const [deletingPairKey, setDeletingPairKey] = useState<string | null>(null);
    const [showPast, setShowPast] = useState(false);

    const getPairKey = (userId: string, matchedUserId: string) =>
        [userId, matchedUserId].sort().join("-");

    useEffect(() => {
        loadEventMatches();
    }, []);

    const loadEventMatches = async () => {
        try {
            setLoading(true);

            const [privilegedIds, { data: matchesData, error: matchesError }, { data: eventsData, error: eventsError }] =
                await Promise.all([
                    loadPrivilegedUserIds(),
                    supabase
                        .from("matches")
                        .select("id, user_id, matched_user_id, compatibility_score, match_type, from_algorithm, event_id")
                        .eq("from_algorithm", "event")
                        .order("compatibility_score", { ascending: false }),
                    supabase
                        .from("events")
                        .select("id, name, active, start_date, end_date"),
                ]);

            if (matchesError) throw matchesError;
            if (eventsError) throw eventsError;

            const eventsMap = new Map<string, EventInfo>(
                (eventsData || []).map((e: any) => [e.id, e as EventInfo]),
            );
            setEventsById(eventsMap);

            if (!matchesData || matchesData.length === 0) {
                setEventMatches([]);
                return;
            }

            const seenPairs = new Set<string>();
            const uniqueMatches = matchesData.filter((match) => {
                const pairKey = getPairKey(match.user_id, match.matched_user_id);
                if (seenPairs.has(pairKey)) return false;
                seenPairs.add(pairKey);
                return true;
            });

            const userIds = new Set<string>();
            uniqueMatches.forEach((match) => {
                userIds.add(match.user_id);
                userIds.add(match.matched_user_id);
            });

            const [{ data: profilesData, error: profilesError }, { data: privateData }] = await Promise.all([
                supabase
                    .from("profiles")
                    .select("id, first_name, age, additional_photos, created_at, bio")
                    .in("id", Array.from(userIds)),
                supabase
                    .from("private_profile_data" as any)
                    .select("user_id, last_name, email, latitude, longitude")
                    .in("user_id", Array.from(userIds)),
            ]);

            if (profilesError) throw profilesError;

            const privateByUser = new Map((privateData || []).map((r: any) => [r.user_id, r]));
            const profilesMap = new Map();
            (profilesData || []).forEach((profile: any) => {
                profilesMap.set(profile.id, { ...profile, ...(privateByUser.get(profile.id) || {}) });
            });

            // Event matches can legitimately involve non-student attendees, so
            // unlike the weekly tab we only filter out admin/test accounts here.
            const filteredMatches = uniqueMatches.filter(
                (match) =>
                    !privilegedIds.has(match.user_id) && !privilegedIds.has(match.matched_user_id),
            );

            const interactionData = await fetchAdminAllInteractions();

            const likePairs = new Set<string>();
            interactionData.relationshipLikes?.forEach((like) => {
                likePairs.add(`${like.user_id}-${like.other_user_id}`);
            });
            const friendshipLikePairs = new Set<string>();
            interactionData.friendshipLikes?.forEach((like) => {
                friendshipLikePairs.add(`${like.user_id}-${like.other_user_id}`);
            });
            const dislikePairs = new Set<string>();
            interactionData.relationshipDislikes?.forEach((dislike) => {
                dislikePairs.add(`${dislike.user_id}-${dislike.other_user_id}`);
            });
            const friendshipDislikePairs = new Set<string>();
            interactionData.friendshipDislikes?.forEach((dislike) => {
                friendshipDislikePairs.add(`${dislike.user_id}-${dislike.other_user_id}`);
            });

            const enrichedMatches = filteredMatches.map((match) => ({
                ...(match.match_type === "friendship"
                    ? {
                        user1_liked_user2: friendshipLikePairs.has(`${match.user_id}-${match.matched_user_id}`),
                        user2_liked_user1: friendshipLikePairs.has(`${match.matched_user_id}-${match.user_id}`),
                        user1_disliked_user2: friendshipDislikePairs.has(`${match.user_id}-${match.matched_user_id}`),
                        user2_disliked_user1: friendshipDislikePairs.has(`${match.matched_user_id}-${match.user_id}`),
                    }
                    : {
                        user1_liked_user2: likePairs.has(`${match.user_id}-${match.matched_user_id}`),
                        user2_liked_user1: likePairs.has(`${match.matched_user_id}-${match.user_id}`),
                        user1_disliked_user2: dislikePairs.has(`${match.user_id}-${match.matched_user_id}`),
                        user2_disliked_user1: dislikePairs.has(`${match.matched_user_id}-${match.user_id}`),
                    }),
                id: match.id,
                user_id: match.user_id,
                matched_user_id: match.matched_user_id,
                compatibility_score: match.compatibility_score,
                match_type: match.match_type || "relationship",
                from_algorithm: match.from_algorithm || "event",
                event_id: match.event_id,
                user_profile: profilesMap.get(match.user_id) || null,
                matched_user_profile: profilesMap.get(match.matched_user_id) || null,
            }));

            setEventMatches(enrichedMatches);
        } catch (error: any) {
            toast({
                title: "Error",
                description: "Failed to load event matches: " + error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleMatchClick = (match: EventMatch) => {
        setSelectedMatch(match);
        setIsComparisonOpen(true);
    };

    const handleDeleteMatch = async (match: EventMatch) => {
        const userA = match.user_profile?.first_name || "User A";
        const userB = match.matched_user_profile?.first_name || "User B";
        if (!window.confirm(`Delete match between ${userA} and ${userB}?`)) return;

        const pairKey = getPairKey(match.user_id, match.matched_user_id);
        setDeletingPairKey(pairKey);

        try {
            const { error: matchDeleteError } = await supabase
                .from("matches")
                .delete()
                .or(
                    `and(user_id.eq.${match.user_id},matched_user_id.eq.${match.matched_user_id}),and(user_id.eq.${match.matched_user_id},matched_user_id.eq.${match.user_id})`,
                );
            if (matchDeleteError) throw matchDeleteError;

            setEventMatches((prev) =>
                prev.filter((m) => getPairKey(m.user_id, m.matched_user_id) !== pairKey),
            );
            if (
                selectedMatch &&
                getPairKey(selectedMatch.user_id, selectedMatch.matched_user_id) === pairKey
            ) {
                setIsComparisonOpen(false);
                setSelectedMatch(null);
            }

            toast({
                title: "Match deleted",
                description: `Removed ${userA} and ${userB} from each other's matches.`,
            });
        } catch (error: any) {
            toast({ title: "Delete failed", description: error.message, variant: "destructive" });
        } finally {
            setDeletingPairKey(null);
        }
    };

    // Group matches by event, order live events first, ended events last.
    const groups = useMemo(() => {
        const nowMs = Date.now();
        const byEvent = new Map<string, EventMatch[]>();
        for (const match of eventMatches) {
            const key = match.event_id || "__none__";
            if (!byEvent.has(key)) byEvent.set(key, []);
            byEvent.get(key)!.push(match);
        }

        const result = Array.from(byEvent.entries()).map(([eventId, matches]) => {
            const event = eventId === "__none__" ? undefined : eventsById.get(eventId);
            const status = getEventStatus(event, nowMs);
            return {
                eventId,
                event,
                status,
                name: event?.name || (eventId === "__none__" ? "Unassigned event" : "Unknown event"),
                dateLabel: formatEventDate(event),
                matches,
            };
        });

        const rank: Record<EventStatus, number> = { ongoing: 0, upcoming: 1, unknown: 2, ended: 3 };
        result.sort((a, b) => {
            if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
            return a.name.localeCompare(b.name);
        });
        return result;
    }, [eventMatches, eventsById]);

    const visibleGroups = useMemo(
        () => (showPast ? groups : groups.filter((g) => g.status !== "ended")),
        [groups, showPast],
    );

    const endedCount = useMemo(() => groups.filter((g) => g.status === "ended").length, [groups]);
    const totalVisibleMatches = useMemo(
        () => visibleGroups.reduce((sum, g) => sum + g.matches.length, 0),
        [visibleGroups],
    );

    const renderMatchCard = (match: EventMatch, eventName: string) => (
        <Card
            key={match.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleMatchClick(match)}
        >
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-primary">{match.compatibility_score}% Match</span>
                    <div className="flex items-center gap-2">
                        <div className="text-xs text-muted-foreground">
                            {match.user1_liked_user2 && match.user2_liked_user1 ? (
                                <span className="text-green-600">Both liked</span>
                            ) : match.user1_liked_user2 ? (
                                <span>{match.user_profile?.first_name} liked</span>
                            ) : match.user2_liked_user1 ? (
                                <span>{match.matched_user_profile?.first_name} liked</span>
                            ) : match.user1_disliked_user2 && match.user2_disliked_user1 ? (
                                <span className="text-red-600">Both disliked</span>
                            ) : match.user1_disliked_user2 ? (
                                <span className="text-red-600">{match.user_profile?.first_name} disliked</span>
                            ) : match.user2_disliked_user1 ? (
                                <span className="text-red-600">
                                    {match.matched_user_profile?.first_name} disliked
                                </span>
                            ) : (
                                <span className="text-orange-600">No interactions yet</span>
                            )}
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMatch(match);
                            }}
                            disabled={deletingPairKey === getPairKey(match.user_id, match.matched_user_id)}
                            title="Delete Match"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <Badge variant="secondary" className="mt-2 w-fit gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {eventName}
                </Badge>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4 mb-3">
                    <img
                        src={match.user_profile?.additional_photos?.[0] || "/placeholder.svg"}
                        alt={match.user_profile?.first_name}
                        className="w-16 h-16 rounded-full object-cover"
                    />
                    <div>
                        <p className="font-semibold">
                            {match.user_profile?.first_name} {match.user_profile?.last_name}
                        </p>
                        {match.user_profile?.age && (
                            <p className="text-sm text-muted-foreground">Age {match.user_profile.age}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <img
                        src={match.matched_user_profile?.additional_photos?.[0] || "/placeholder.svg"}
                        alt={match.matched_user_profile?.first_name}
                        className="w-16 h-16 rounded-full object-cover"
                    />
                    <div>
                        <p className="font-semibold">
                            {match.matched_user_profile?.first_name} {match.matched_user_profile?.last_name}
                        </p>
                        {match.matched_user_profile?.age && (
                            <p className="text-sm text-muted-foreground">
                                Age {match.matched_user_profile.age}
                            </p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-6">
            <MatchComparisonDialog
                match={selectedMatch}
                open={isComparisonOpen}
                onOpenChange={setIsComparisonOpen}
            />

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                            <CardTitle>Event Matches ({totalVisibleMatches})</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                Matches created for a specific event, grouped and labeled by event. These are
                                separate from the weekly Monday drop.
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            {endedCount > 0 && (
                                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                                    <Switch checked={showPast} onCheckedChange={setShowPast} />
                                    Show past events ({endedCount})
                                </label>
                            )}
                            <Button variant="outline" size="sm" onClick={loadEventMatches} disabled={loading}>
                                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                                Refresh
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-sm text-muted-foreground">Loading event matches…</p>
                    ) : visibleGroups.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            {endedCount > 0
                                ? "No matches for current events. Toggle “Show past events” to see matches from events that have ended."
                                : "No event matches yet."}
                        </p>
                    ) : (
                        <div className="space-y-8">
                            {visibleGroups.map((group) => {
                                const badge = STATUS_BADGE[group.status];
                                return (
                                    <div key={group.eventId}>
                                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                                            <h3 className="text-lg font-semibold">{group.name}</h3>
                                            <Badge variant={badge.variant}>{badge.label}</Badge>
                                            {group.dateLabel && (
                                                <span className="text-sm text-muted-foreground">
                                                    {group.dateLabel}
                                                </span>
                                            )}
                                            <span className="text-sm text-muted-foreground">
                                                · {group.matches.length} match
                                                {group.matches.length === 1 ? "" : "es"}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {group.matches.map((match) => renderMatchCard(match, group.name))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
