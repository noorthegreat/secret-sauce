import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Play, Bug, AlertTriangle, Download, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { AppEvent } from "@/lib/events";

interface EventAttendeeUser {
    user_id: string;
    first_name: string;
    last_name: string | null;
    email: string | null;
}

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Hungarian algorithm for maximum weight bipartite matching (O(n^3)).
// Returns assignment where result[i] = j means row i is matched to column j.
function hungarianMaxWeight(weights: number[][]): number[] {
    const n = weights.length;
    if (n === 0) return [];
    const INF = 1e15;
    const u = new Array(n + 1).fill(0);
    const v = new Array(n + 1).fill(0);
    const p = new Array(n + 1).fill(0);
    const way = new Array(n + 1).fill(0);
    for (let i = 1; i <= n; i++) {
        p[0] = i;
        let j0 = 0;
        const minVal = new Array(n + 1).fill(INF);
        const used = new Array(n + 1).fill(false);
        do {
            used[j0] = true;
            const i0 = p[j0];
            let delta = INF;
            let j1 = -1;
            for (let j = 1; j <= n; j++) {
                if (!used[j]) {
                    const cur = -weights[i0 - 1][j - 1] - u[i0] - v[j];
                    if (cur < minVal[j]) { minVal[j] = cur; way[j] = j0; }
                    if (minVal[j] < delta) { delta = minVal[j]; j1 = j; }
                }
            }
            for (let j = 0; j <= n; j++) {
                if (used[j]) { u[p[j]] += delta; v[j] -= delta; }
                else minVal[j] -= delta;
            }
            j0 = j1!;
        } while (p[j0] !== 0);
        do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
    }
    const result = new Array(n).fill(-1);
    for (let j = 1; j <= n; j++) if (p[j] !== 0) result[p[j] - 1] = j - 1;
    return result;
}

export const DryRunPanel = () => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isForcingWeeklyDrop, setIsForcingWeeklyDrop] = useState(false);
    const [debugUserId, setDebugUserId] = useState("b7fcb0f9-41c0-4c5d-87df-2fd08d539a91");
    const [algorithm, setAlgorithm] = useState("all");
    const [events, setEvents] = useState<AppEvent[]>([]);
    const [selectedEventId, setSelectedEventId] = useState("");
    const [maxMatchesPerUser, setMaxMatchesPerUser] = useState("1");
    const [onlyShowDebugMatches, setOnlyShowDebugMatches] = useState(false);
    const [sendEmails, setSendEmails] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [weeklyDropResult, setWeeklyDropResult] = useState<any>(null);
    const [eventAttendees, setEventAttendees] = useState<EventAttendeeUser[]>([]);
    const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<Set<string>>(new Set());
    const [isLoadingAttendees, setIsLoadingAttendees] = useState(false);
    const [desiredCount, setDesiredCount] = useState("30");
    const [optimalSubset, setOptimalSubset] = useState<{ women: any[]; men: any[] } | null>(null);
    const [roundsCount, setRoundsCount] = useState(8);
    const [speedDatingParticipants, setSpeedDatingParticipants] = useState<{ men: any[]; women: any[] } | null>(null);
    const [speedDatingSchedule, setSpeedDatingSchedule] = useState<{
        round: number;
        pairs: { manId: string; manName: string; womanId: string; womanName: string; score: number }[];
    }[] | null>(null);

    const selectedEvent = useMemo(
        () => events.find((event) => event.id === selectedEventId) || null,
        [events, selectedEventId]
    );

    useEffect(() => {
        const loadEvents = async () => {
            const nowIso = new Date().toISOString();
            const { data, error } = await supabase
                .from("events")
                .select("*")
                .eq("active", true)
                .or(`start_date.gte.${nowIso},start_date.is.null`)
                .order("is_featured", { ascending: false })
                .order("start_date", { ascending: false, nullsFirst: false });

            if (error) {
                console.error("Failed to load events for matching", error);
                return;
            }

            const loadedEvents = (data || []) as AppEvent[];
            setEvents(loadedEvents);

            if (!selectedEventId && loadedEvents.length > 0) {
                const nextEvent = loadedEvents.find((event) => event.active) || loadedEvents[0];
                setSelectedEventId(nextEvent.id);
                setMaxMatchesPerUser(String(nextEvent.max_matches_per_user || 1));
            }
        };

        loadEvents();
    }, []);

    useEffect(() => {
        if (selectedEvent) {
            setMaxMatchesPerUser(String(selectedEvent.max_matches_per_user || 1));
        }
    }, [selectedEvent]);

    useEffect(() => {
        if (algorithm !== "event" || !selectedEventId) {
            setEventAttendees([]);
            setSelectedAttendeeIds(new Set());
            return;
        }
        const loadAttendees = async () => {
            setIsLoadingAttendees(true);
            const { data: enrollments } = await supabase
                .from("event_enrollments")
                .select("user_id, profiles:user_id(first_name)")
                .eq("event_id", selectedEventId);
            if (!enrollments || enrollments.length === 0) {
                setEventAttendees([]);
                setSelectedAttendeeIds(new Set());
                setIsLoadingAttendees(false);
                return;
            }
            const userIds = enrollments.map((e: any) => e.user_id);
            const { data: privateRows } = await supabase
                .from("private_profile_data" as any)
                .select("user_id, last_name, email")
                .in("user_id", userIds);
            const privateMap = new Map((privateRows || []).map((r: any) => [r.user_id, r]));
            const attendees: EventAttendeeUser[] = enrollments.map((e: any) => ({
                user_id: e.user_id,
                first_name: (e.profiles as any)?.first_name || "Unknown",
                last_name: privateMap.get(e.user_id)?.last_name || null,
                email: privateMap.get(e.user_id)?.email || null,
            }));
            attendees.sort((a, b) => a.first_name.localeCompare(b.first_name));
            setEventAttendees(attendees);
            setSelectedAttendeeIds(new Set(attendees.map((a) => a.user_id)));
            setIsLoadingAttendees(false);
        };
        loadAttendees();
    }, [algorithm, selectedEventId]);

    const downloadMatchesCSV = () => {
        const candidates = results?.candidates;
        if (!candidates?.length) return;
        const headers = ["User 1 Name", "User 1 Email", "User 2 Name", "User 2 Email", "Score", "Match Type", "Algorithm"];
        const rows = candidates.map((m: any) => [
            m.user1_name || "",
            m.user1_email || "",
            m.user2_name || "",
            m.user2_email || "",
            m.compatibility_score ?? "",
            m.match_type || "",
            m.from_algorithm || "",
        ]);
        const csv = [headers, ...rows].map((r) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `matches_${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
    };

    const computeOptimalSubset = () => {
        const candidates = results?.candidates;
        if (!candidates?.length) return;
        const n = Math.max(2, parseInt(desiredCount) || 30);
        const perGender = Math.floor(n / 2);

        // Build per-user score sum and gender from candidates
        const userScore: Record<string, number> = {};
        const userGender: Record<string, string> = {};
        const userMeta: Record<string, { name: string; email: string }> = {};

        for (const m of candidates) {
            userScore[m.user1_id] = (userScore[m.user1_id] || 0) + (m.compatibility_score || 0);
            userScore[m.user2_id] = (userScore[m.user2_id] || 0) + (m.compatibility_score || 0);
            userGender[m.user1_id] = m.user1_gender || "Unknown";
            userGender[m.user2_id] = m.user2_gender || "Unknown";
            userMeta[m.user1_id] = { name: m.user1_name || m.user1_id, email: m.user1_email || "" };
            userMeta[m.user2_id] = { name: m.user2_name || m.user2_id, email: m.user2_email || "" };
        }

        const sorted = Object.entries(userScore)
            .map(([id, score]) => ({ id, score, gender: userGender[id], ...userMeta[id] }))
            .sort((a, b) => b.score - a.score);

        const allWomen = sorted.filter(u => u.gender === "Woman");
        const allMen = sorted.filter(u => u.gender === "Man");
        const women = allWomen.slice(0, perGender);
        const menCount = n - women.length;
        const men = allMen.slice(0, menCount);
        setOptimalSubset({ women, men });
    };

    const downloadSubsetCSV = () => {
        if (!optimalSubset) return;
        const all = [
            ...optimalSubset.women.map(u => ({ ...u, gender: "Woman" })),
            ...optimalSubset.men.map(u => ({ ...u, gender: "Man" })),
        ];
        const headers = ["Name", "Email", "Gender", "Compatibility Score"];
        const rows = all.map(u => [u.name, u.email, u.gender, Math.round(u.score)]);
        const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `optimal_attendees_${desiredCount}_${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
    };

    const generateSpeedDatingSchedule = () => {
        if (!results?.candidates) return;

        // Extract all unique M/F users from man-woman candidate pairs
        const userScore: Record<string, number> = {};
        const userGender: Record<string, string> = {};
        const userMeta: Record<string, { name: string; email: string }> = {};

        for (const c of results.candidates) {
            if (c.user1_gender !== "Man" && c.user1_gender !== "Woman") continue;
            if (c.user2_gender !== "Man" && c.user2_gender !== "Woman") continue;
            if (c.user1_gender === c.user2_gender) continue; // skip same-gender pairs
            userScore[c.user1_id] = (userScore[c.user1_id] || 0) + (c.compatibility_score || 0);
            userScore[c.user2_id] = (userScore[c.user2_id] || 0) + (c.compatibility_score || 0);
            userGender[c.user1_id] = c.user1_gender;
            userGender[c.user2_id] = c.user2_gender;
            userMeta[c.user1_id] = { name: c.user1_name || c.user1_id, email: c.user1_email || "" };
            userMeta[c.user2_id] = { name: c.user2_name || c.user2_id, email: c.user2_email || "" };
        }

        const sorted = Object.entries(userScore)
            .map(([id, score]) => ({ id, score, gender: userGender[id], ...userMeta[id] }))
            .sort((a, b) => b.score - a.score);

        const allWomen = sorted.filter(u => u.gender === "Woman");
        const allMen = sorted.filter(u => u.gender === "Man");
        // Max equal group: take top scorers from the larger gender to match the smaller
        const N = Math.min(allWomen.length, allMen.length);
        const women = allWomen.slice(0, N);
        const men = allMen.slice(0, N);

        if (N < roundsCount) {
            toast({
                title: "Not enough participants",
                description: `Need at least ${roundsCount} per gender but only found ${N}. Reduce rounds or get more attendees to fill out the questionnaire.`,
                variant: "destructive",
            });
            return;
        }

        // Build man→woman compatibility lookup
        const compat: Record<string, Record<string, number>> = {};
        for (const c of results.candidates) {
            if (c.user1_gender === c.user2_gender) continue;
            const isUser1Man = c.user1_gender === "Man";
            const manId = isUser1Man ? c.user1_id : c.user2_id;
            const womanId = isUser1Man ? c.user2_id : c.user1_id;
            if (!compat[manId]) compat[manId] = {};
            compat[manId][womanId] = c.compatibility_score ?? 0;
        }

        const usedPairs = new Set<string>();
        const schedule: NonNullable<typeof speedDatingSchedule> = [];

        for (let r = 0; r < roundsCount; r++) {
            const weights = men.map((man: any) =>
                women.map((woman: any) => {
                    const key = `${man.id}:${woman.id}`;
                    if (usedPairs.has(key)) return -1e9;
                    return compat[man.id]?.[woman.id] ?? 0;
                })
            );

            const assignment = hungarianMaxWeight(weights);
            const pairs = assignment.map((womanIdx, manIdx) => ({
                manId: men[manIdx].id,
                manName: men[manIdx].name,
                womanId: women[womanIdx].id,
                womanName: women[womanIdx].name,
                score: compat[men[manIdx].id]?.[women[womanIdx].id] ?? 0,
            }));

            pairs.forEach(pair => usedPairs.add(`${pair.manId}:${pair.womanId}`));
            schedule.push({ round: r + 1, pairs });
        }

        setSpeedDatingParticipants({ men, women });
        setSpeedDatingSchedule(schedule);
    };

    const downloadScheduleCSV = () => {
        if (!speedDatingSchedule || !speedDatingParticipants) return;
        // Sheet 1: participants, Sheet 2: schedule — exported as one CSV with sections
        const participantRows = [
            ["PARTICIPANTS"],
            ["Gender", "Name", "Email", "Compatibility Score"],
            ...speedDatingParticipants.women.map((u: any) => ["Woman", u.name, u.email, Math.round(u.score)]),
            ...speedDatingParticipants.men.map((u: any) => ["Man", u.name, u.email, Math.round(u.score)]),
            [],
            ["SCHEDULE"],
            ["Round", "Man", "Woman", "Compatibility Score"],
            ...speedDatingSchedule.flatMap(({ round, pairs }) =>
                pairs.map(p => [round, p.manName, p.womanName, Math.round(p.score)])
            ),
        ];
        const csv = participantRows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `speed_dating_${roundsCount}rounds_${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
    };

    const runMatching = async (isDryRun: boolean = true) => {
        if (algorithm === "event" && !selectedEventId) {
            toast({
                title: "Select an event",
                description: "Event matching must be scoped to one event.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        setResults(null);
        try {
            const headers: Record<string, string> = {
                'x-algorithm': algorithm,
                'dry-run': isDryRun ? 'true' : 'false',
                'x-send-emails': sendEmails ? 'true' : 'false'
            };

            if (algorithm === "event") {
                headers["x-max-matches-per-user"] = String(Math.max(1, Number(maxMatchesPerUser) || 1));
            }

            const { data, error } = await supabase.functions.invoke('match-users', {
                body: {
                    debug_user_id: debugUserId || undefined,
                    event_id: algorithm === "event" ? selectedEventId : undefined,
                    user_id_filter: algorithm === "event" && selectedAttendeeIds.size > 0 && selectedAttendeeIds.size < eventAttendees.length
                        ? Array.from(selectedAttendeeIds)
                        : undefined,
                },
                headers,
            });

            if (error) throw error;


            let parsedData = data;
            if (typeof data === 'string') {
                try {
                    parsedData = JSON.parse(data);
                } catch (e) {
                    console.error("Failed to parse response data:", e);
                }
            }

            // Transform data to match UI expectations
            const rawStats = parsedData.stats || {};
            const matches = parsedData.matches || [];
            const candidates = parsedData.candidates || matches;

            const aggregatedStats = {
                processed_count: 0,
                failures: {} as Record<string, number>,
                ruleStats: {
                    dealbreakers: {} as Record<string, any>,
                    modifiers: {} as Record<string, any>
                }
            };

            Object.entries(rawStats).forEach(([algo, s]: any) => {
                aggregatedStats.processed_count += s.processed_count || 0;

                // Merge failures
                Object.entries(s.failures || {}).forEach(([k, v]: any) => {
                    aggregatedStats.failures[k] = (aggregatedStats.failures[k] || 0) + v;
                });

                // Merge dealbreakers
                Object.entries(s.ruleStats?.dealbreakers || {}).forEach(([k, v]: any) => {
                    const key = `${k} (${algo})`;
                    // Handle both old format (number) and new format (object)
                    const currentStats = aggregatedStats.ruleStats.dealbreakers[key] || { pass: 0, fail: 0 };

                    if (typeof v === 'number') {
                        currentStats.fail += v;
                    } else {
                        currentStats.pass += v.pass || 0;
                        currentStats.fail += v.fail || 0;
                    }
                    aggregatedStats.ruleStats.dealbreakers[key] = currentStats;
                });

                // Merge modifiers
                Object.entries(s.ruleStats?.modifiers || {}).forEach(([k, v]: any) => {
                    const key = `${k} (${algo})`;
                    if (!aggregatedStats.ruleStats.modifiers[key]) {
                        aggregatedStats.ruleStats.modifiers[key] = { ...v };
                    } else {
                        const existing = aggregatedStats.ruleStats.modifiers[key];
                        existing.totalScore += v.totalScore;
                        existing.count += v.count;
                        existing.min = Math.min(existing.min, v.min);
                        existing.max = Math.max(existing.max, v.max);
                    }
                });
            });

            const processedResults = {
                usersProcessed: aggregatedStats.processed_count, // Actual number of pairs checked for debug user
                pairsFound: matches.length,
                totalMatchesWouldCreate: matches.length,
                debugStats: aggregatedStats,
                matches: matches,
                candidates: candidates
            };

            setResults(processedResults);

            toast({
                title: isDryRun ? "Dry Run Complete" : "Matching Complete",
                description: `Found ${matches.length} matches.`,
            });
        } catch (error: any) {
            console.error("Matching error:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to run matching",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const forceWeeklyDropNow = async () => {
        setIsForcingWeeklyDrop(true);
        setWeeklyDropResult(null);
        try {
            const { data, error } = await supabase.functions.invoke('daily-cron', {
                body: { force_weekly_drop: true },
                headers: {
                    'dry-run': 'false'
                }
            });

            if (error) throw error;

            const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
            setWeeklyDropResult(parsedData);

            toast({
                title: "Weekly drop forced",
                description: parsedData?.message || "Forced weekly match drop completed.",
            });
        } catch (error: any) {
            console.error("Force weekly drop error:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to force weekly drop",
                variant: "destructive"
            });
        } finally {
            setIsForcingWeeklyDrop(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-start gap-4 bg-muted p-4 rounded-lg border">
                <div className="flex-1 min-w-[200px] space-y-2">
                    <label className="text-sm font-medium">Debug User ID (Optional)</label>
                    <Input
                        placeholder="b7fcb0f9-41c0-4c5d-87df-2fd08d539a91"
                        value={debugUserId}
                        onChange={(e) => setDebugUserId(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">b7fcb0f9-41c0-4c5d-87df-2fd08d539a91<br />9f4e3b19-a9e9-4030-94b2-ea92c030675a</p>
                </div>

                <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium">Algorithm</label>
                    <Select value={algorithm} onValueChange={setAlgorithm}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select algorithm" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Algorithms</SelectItem>
                            <SelectItem value="relationship">Relationship Daily</SelectItem>
                            <SelectItem value="friendship">Friendship Daily</SelectItem>
                            <SelectItem value="event">Event (Friendship & Relationship)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {algorithm === "event" && (
                    <div className="flex-1 space-y-2">
                        <label className="text-sm font-medium">Event</label>
                        <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select event" />
                            </SelectTrigger>
                            <SelectContent>
                                {events.map((event) => (
                                    <SelectItem key={event.id} value={event.id}>
                                        {event.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Only attendees from the selected event will be matched.
                        </p>
                    </div>
                )}

                {algorithm === "event" && (
                    <div className="flex-1 space-y-2">
                        <label className="text-sm font-medium">Max Matches Per User</label>
                        <Input
                            type="number"
                            min={1}
                            max={20}
                            value={maxMatchesPerUser}
                            onChange={(event) => setMaxMatchesPerUser(event.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Defaults to the selected event config. In combined mode, this cap is shared across romantic and friendship event matches.
                        </p>
                    </div>
                )}

                <div className="flex-1 min-w-[200px] flex flex-col justify-end pb-2 space-y-2">
                    <div className="flex items-center gap-2">
                        <Switch
                            id="send-emails"
                            checked={sendEmails}
                            onCheckedChange={setSendEmails}
                        />
                        <Label htmlFor="send-emails">Send Match Emails</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {algorithm === "event"
                            ? "If enabled, attendees will receive the event pairing email and then view their pairings on /matches."
                            : "If enabled, users will receive the normal weekly match emails."}
                    </p>
                </div>

                {algorithm === "event" && eventAttendees.length > 0 && (
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium flex items-center gap-1">
                                <Users className="h-3 w-3" /> Attendees ({selectedAttendeeIds.size}/{eventAttendees.length})
                            </label>
                            <div className="flex gap-1">
                                <button className="text-xs text-primary underline" onClick={() => setSelectedAttendeeIds(new Set(eventAttendees.map(a => a.user_id)))}>All</button>
                                <span className="text-xs text-muted-foreground">/</span>
                                <button className="text-xs text-primary underline" onClick={() => setSelectedAttendeeIds(new Set())}>None</button>
                            </div>
                        </div>
                        <ScrollArea className="h-[140px] rounded-md border p-2">
                            {isLoadingAttendees ? (
                                <div className="flex justify-center p-2"><Loader2 className="h-4 w-4 animate-spin" /></div>
                            ) : (
                                <div className="space-y-1">
                                    {eventAttendees.map((a) => (
                                        <div key={a.user_id} className="flex items-center gap-2">
                                            <Checkbox
                                                id={a.user_id}
                                                checked={selectedAttendeeIds.has(a.user_id)}
                                                onCheckedChange={(checked) => {
                                                    setSelectedAttendeeIds(prev => {
                                                        const next = new Set(prev);
                                                        if (checked) next.add(a.user_id); else next.delete(a.user_id);
                                                        return next;
                                                    });
                                                }}
                                            />
                                            <label htmlFor={a.user_id} className="text-xs cursor-pointer">
                                                {a.first_name} {a.last_name || ""} <span className="text-muted-foreground">{a.email}</span>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                )}

                <div className="flex flex-col gap-2">
                    <Button
                        onClick={() => runMatching(true)}
                        disabled={isLoading}
                        className="min-w-[150px]"
                        variant="secondary"
                    >
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                        Run Dry Run
                    </Button>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                disabled={isLoading}
                                className="min-w-[150px]"
                                variant="destructive"
                            >
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                                Run Real Match
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will run the matching algorithm for REAL.
                                    It will DELETE existing matches for the selected algorithm and create NEW matches.
                                    Emails may be sent to users.
                                    This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => runMatching(false)}>
                                    Yes, Run Matching
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <Switch
                    id="debug-filter"
                    checked={onlyShowDebugMatches}
                    onCheckedChange={setOnlyShowDebugMatches}
                />
                <Label htmlFor="debug-filter">Only show matches involving Debug User</Label>
            </div>

            <Card className="border-orange-300/60">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        Weekly Drop Override
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                        Admin-only override. Runs real relationship matching now, even outside Mon 00:00–Tue 12:00 (Zurich time) window.
                        This replaces current matches and can send emails.
                    </p>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                disabled={isLoading || isForcingWeeklyDrop}
                                variant="destructive"
                            >
                                {isForcingWeeklyDrop ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                                Force Weekly Drop Now
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Force weekly drop now?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will run real matching immediately, outside schedule, delete existing matches, create new ones, and may send emails.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={forceWeeklyDropNow}>
                                    Yes, Force Drop
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    {weeklyDropResult && (
                        <div className="text-sm rounded-md bg-muted p-3 border space-y-1">
                            <p className="font-medium">{weeklyDropResult.message || "Override completed."}</p>
                            {weeklyDropResult.totalMatchesCreated !== undefined && (
                                <p className="text-muted-foreground">✅ Matches created: <span className="font-mono font-bold">{weeklyDropResult.totalMatchesCreated}</span> ({weeklyDropResult.totalMatchesCreated / 2} pairs)</p>
                            )}
                            {weeklyDropResult.usersProcessed !== undefined && (
                                <p className="text-muted-foreground">👥 Users processed: <span className="font-mono">{weeklyDropResult.usersProcessed}</span></p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {results && (
                <div className="grid md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">Overview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <dt className="text-muted-foreground">Users Processed</dt>
                                    <dd className="font-mono text-xl">{results.usersProcessed}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">Pairs Found</dt>
                                    <dd className="font-mono text-xl">{results.pairsFound}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">Matches Created</dt>
                                    <dd className="font-mono text-xl">{results.totalMatchesWouldCreate || 0}</dd>
                                </div>
                            </dl>
                        </CardContent>
                    </Card>

                    {results.debugStats && (
                        <Card className="border-orange-200 bg-orange-50/10 col-span-1 md:col-span-2">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Bug className="h-4 w-4 text-orange-500" />
                                    Debug Stats for User
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div>
                                            <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Process Count</div>
                                            <div className="font-mono">{results.debugStats.processed_count} pairs evaluated</div>
                                        </div>

                                        <div>
                                            <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Failures Overview</div>
                                            <ScrollArea className="h-[200px] w-full rounded-md border p-2">
                                                <div className="text-xs space-y-1">
                                                    {Object.entries(results.debugStats.failures || {}).sort(([, a]: any, [, b]: any) => b - a).map(([reason, count]: any) => (
                                                        <div key={reason} className="flex justify-between">
                                                            <span className="break-all mr-2">{reason}</span>
                                                            <Badge variant="secondary">{count}</Badge>
                                                        </div>
                                                    ))}
                                                    {Object.keys(results.debugStats.failures || {}).length === 0 && (
                                                        <span className="text-green-600">No failures recorded</span>
                                                    )}
                                                </div>
                                            </ScrollArea>
                                        </div>
                                    </div>

                                    {results.debugStats.ruleStats && (
                                        <div className="space-y-4">
                                            <div>
                                                <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Dealbreaker Rules (Top Rejections)</div>
                                                <ScrollArea className="h-[120px] w-full rounded-md border p-2">
                                                    <div className="text-xs space-y-1">
                                                        {Object.entries(results.debugStats.ruleStats.dealbreakers || {})
                                                            .sort(([, a]: any, [, b]: any) => b.fail - a.fail)
                                                            .map(([rule, stats]: any) => (
                                                                <div key={rule} className="flex justify-between items-center">
                                                                    <span className="font-medium truncate flex-1">{rule}</span>
                                                                    <div className="flex gap-2 text-xs font-mono ml-2">
                                                                        <span className="text-green-600">Pass: {stats.pass}</span>
                                                                        <span className="text-red-500">Fail: {stats.fail}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        {Object.keys(results.debugStats.ruleStats.dealbreakers || {}).length === 0 && (
                                                            <span className="text-muted-foreground italic">No dealbreakers triggered</span>
                                                        )}
                                                    </div>
                                                </ScrollArea>
                                            </div>

                                            <div>
                                                <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Modifier Impact (Avg Score)</div>
                                                <ScrollArea className="h-[120px] w-full rounded-md border p-2">
                                                    <div className="text-xs space-y-1">
                                                        {Object.entries(results.debugStats.ruleStats.modifiers || {})
                                                            .map(([rule, stats]: any) => ({
                                                                rule,
                                                                avg: stats.totalScore / stats.count,
                                                                ...stats
                                                            }))
                                                            .sort((a: any, b: any) => b.avg - a.avg)
                                                            .map((item: any) => (
                                                                <div key={item.rule} className="flex justify-between items-center">
                                                                    <span className="font-medium truncate flex-1" title={`Min: ${item.min.toFixed(0)}, Max: ${item.max.toFixed(0)}`}>{item.rule}</span>
                                                                    <span className={`font-mono ml-2 ${item.avg > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                                                                        +{item.avg.toFixed(1)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        {Object.keys(results.debugStats.ruleStats.modifiers || {}).length === 0 && (
                                                            <span className="text-muted-foreground italic">No modifiers applied</span>
                                                        )}
                                                    </div>
                                                </ScrollArea>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="md:col-span-2 border-green-200">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Final Selected Pairs ({results.matches?.length ?? 0})</CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">The pairs that would actually be created (after per-user limits applied).</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => {
                                const pairs = results.matches;
                                if (!pairs?.length) return;
                                const headers = ["User 1 Name", "User 1 Email", "User 2 Name", "User 2 Email", "Score", "Match Type"];
                                const rows = pairs.map((m: any) => [m.user1_name || "", m.user1_email || "", m.user2_name || "", m.user2_email || "", m.compatibility_score ?? "", m.match_type || ""]);
                                const csv = [headers, ...rows].map((r: any[]) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
                                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement("a");
                                link.href = url;
                                link.download = `final_pairs_${new Date().toISOString().split("T")[0]}.csv`;
                                link.click();
                            }} disabled={!results.matches?.length}>
                                <Download className="h-4 w-4 mr-1" /> Download CSV
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[300px]">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 sticky top-0">
                                        <tr>
                                            <th className="text-left p-2">#</th>
                                            <th className="text-left p-2">User 1</th>
                                            <th className="text-left p-2">User 2</th>
                                            <th className="text-right p-2">Score</th>
                                            <th className="text-left p-2">Type</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(results.matches || []).map((m: any, i: number) => (
                                            <tr key={i} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                                                <td className="p-2 text-muted-foreground text-xs">{i + 1}</td>
                                                <td className="p-2 font-medium">{m.user1_name} <span className="text-xs text-muted-foreground">{m.user1_email}</span></td>
                                                <td className="p-2 font-medium">{m.user2_name} <span className="text-xs text-muted-foreground">{m.user2_email}</span></td>
                                                <td className="p-2 text-right font-mono">{m.compatibility_score}%</td>
                                                <td className="p-2"><Badge variant={m.match_type === "friendship" ? "outline" : "default"} className="text-xs">{m.match_type}</Badge></td>
                                            </tr>
                                        ))}
                                        {!results.matches?.length && (
                                            <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No pairs selected.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    <Card className="md:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>All Compatible Candidates ({results.candidates?.length ?? 0})</CardTitle>
                            <Button variant="outline" size="sm" onClick={downloadMatchesCSV} disabled={!results.candidates?.length}>
                                <Download className="h-4 w-4 mr-1" /> Download CSV
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[400px]">
                                <Accordion type="single" collapsible>
                                    {results.candidates
                                        ?.filter((match: any) => {
                                            if (!onlyShowDebugMatches) return true;
                                            if (!debugUserId) return true;
                                            return match.user1_id === debugUserId || match.user2_id === debugUserId;
                                        })
                                        .map((match: any, i: number) => (
                                            <AccordionItem key={i} value={`item-${i}`}>
                                                <AccordionTrigger className="hover:no-underline">
                                                    <div className="flex items-center gap-4 w-full pr-4">
                                                        <div className="flex items-center gap-2 flex-1 text-left">
                                                            <Badge variant={match.compatibility_score > 80 ? "default" : "secondary"}>
                                                                {match.compatibility_score}%
                                                            </Badge>
                                                            <span className="font-semibold">{match.user1_name}</span>
                                                            <span className="text-muted-foreground text-xs">&</span>
                                                            <span className="font-semibold">{match.user2_name}</span>
                                                        </div>
                                                        <div className="text-xs text-muted-foreground hidden sm:block">
                                                            Prev Matches: {match.times_user1_matched_user2}
                                                        </div>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent>
                                                    <div className="grid grid-cols-2 gap-4 text-xs p-2 bg-muted/20 rounded-md">
                                                        <div>
                                                            <strong>User 1 ({match.user1_name}):</strong>
                                                            <ul className="list-disc list-inside mt-1 text-muted-foreground">
                                                                <li>Gender: {match.user1_gender}</li>
                                                                <li>Options avail: {match.user1_options}</li>
                                                                <li>Min prev matches: {match.user1_min}</li>
                                                                <li>Liked match? {match.user1_liked_user2 ? 'Yes' : 'No'}</li>
                                                            </ul>
                                                        </div>
                                                        <div>
                                                            <strong>User 2 ({match.user2_name}):</strong>
                                                            <ul className="list-disc list-inside mt-1 text-muted-foreground">
                                                                <li>Gender: {match.user2_gender}</li>
                                                                <li>Options avail: {match.user2_options}</li>
                                                                <li>Min prev matches: {match.user2_min}</li>
                                                                <li>Liked match? {match.user2_liked_user1 ? 'Yes' : 'No'}</li>
                                                            </ul>
                                                        </div>
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                </Accordion>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                    {algorithm === "event" && results?.candidates?.length > 0 && (
                        <Card className="md:col-span-2 border-violet-200">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="h-5 w-5 text-violet-500" />
                                        Optimal Attendee Selector
                                    </CardTitle>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Picks the most compatible N/2 women and N/2 men based on aggregate compatibility scores.
                                    </p>
                                </div>
                                {optimalSubset && (
                                    <Button variant="outline" size="sm" onClick={downloadSubsetCSV}>
                                        <Download className="h-4 w-4 mr-1" /> Download List
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-end gap-3">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium">Desired attendees</label>
                                        <Input
                                            type="number"
                                            min={2}
                                            step={2}
                                            value={desiredCount}
                                            onChange={e => setDesiredCount(e.target.value)}
                                            className="w-28"
                                        />
                                        <p className="text-xs text-muted-foreground">Must be even (N/2 per gender)</p>
                                    </div>
                                    <Button onClick={computeOptimalSubset} variant="secondary">
                                        Find Optimal Subset
                                    </Button>
                                </div>

                                {optimalSubset && (
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {[
                                            { label: "Women", data: optimalSubset.women, color: "text-pink-600" },
                                            { label: "Men", data: optimalSubset.men, color: "text-blue-600" },
                                        ].map(({ label, data, color }) => (
                                            <div key={label}>
                                                <div className={`text-sm font-semibold mb-2 ${color}`}>{label} ({data.length})</div>
                                                <ScrollArea className="h-[250px] rounded-md border">
                                                    <table className="w-full text-xs">
                                                        <thead className="bg-muted/50 sticky top-0">
                                                            <tr>
                                                                <th className="text-left p-2">Name</th>
                                                                <th className="text-left p-2">Email</th>
                                                                <th className="text-right p-2">Score</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {data.map((u, i) => (
                                                                <tr key={u.id} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                                                                    <td className="p-2 font-medium">{u.name}</td>
                                                                    <td className="p-2 text-muted-foreground">{u.email}</td>
                                                                    <td className="p-2 text-right font-mono">{Math.round(u.score)}</td>
                                                                </tr>
                                                            ))}
                                                            {data.length === 0 && (
                                                                <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">No {label.toLowerCase()} found in candidates</td></tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </ScrollArea>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                    {algorithm === "event" && results?.candidates?.length > 0 && (
                        <Card className="md:col-span-2 border-fuchsia-200">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="h-5 w-5 text-fuchsia-500" />
                                        Speed Dating Round Schedule
                                    </CardTitle>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Auto-selects the max equal M/F group (most compatible), then schedules rounds with no repeated pairs.
                                    </p>
                                </div>
                                {speedDatingSchedule && (
                                    <Button variant="outline" size="sm" onClick={downloadScheduleCSV}>
                                        <Download className="h-4 w-4 mr-1" /> Download CSV
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-end gap-3">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium">Number of rounds</label>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={30}
                                            value={roundsCount}
                                            onChange={e => {
                                                setRoundsCount(Math.max(1, parseInt(e.target.value) || 1));
                                                setSpeedDatingSchedule(null);
                                                setSpeedDatingParticipants(null);
                                            }}
                                            className="w-24"
                                        />
                                    </div>
                                    <Button onClick={generateSpeedDatingSchedule} variant="secondary">
                                        Generate Schedule
                                    </Button>
                                </div>

                                {speedDatingParticipants && speedDatingSchedule && (
                                    <div className="space-y-6">
                                        <div className="text-sm font-medium text-muted-foreground">
                                            {speedDatingParticipants.women.length} women + {speedDatingParticipants.men.length} men — {speedDatingSchedule.length} rounds of {speedDatingParticipants.men.length} pairs each
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4">
                                            {[
                                                { label: "Women", data: speedDatingParticipants.women, color: "text-pink-600" },
                                                { label: "Men", data: speedDatingParticipants.men, color: "text-blue-600" },
                                            ].map(({ label, data, color }) => (
                                                <div key={label}>
                                                    <div className={`text-sm font-semibold mb-2 ${color}`}>{label} ({data.length})</div>
                                                    <ScrollArea className="h-[200px] rounded-md border">
                                                        <table className="w-full text-xs">
                                                            <thead className="bg-muted/50 sticky top-0">
                                                                <tr>
                                                                    <th className="text-left p-2">Name</th>
                                                                    <th className="text-left p-2">Email</th>
                                                                    <th className="text-right p-2">Score</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {data.map((u: any, i: number) => (
                                                                    <tr key={u.id} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                                                                        <td className="p-2 font-medium">{u.name}</td>
                                                                        <td className="p-2 text-muted-foreground">{u.email}</td>
                                                                        <td className="p-2 text-right font-mono">{Math.round(u.score)}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </ScrollArea>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="space-y-3">
                                            {speedDatingSchedule.map(({ round, pairs }) => (
                                                <div key={round}>
                                                    <div className="text-sm font-semibold mb-1 text-fuchsia-600">Round {round}</div>
                                                    <table className="w-full text-xs border rounded-md overflow-hidden">
                                                        <thead className="bg-muted/50">
                                                            <tr>
                                                                <th className="text-left p-2 text-blue-600">Man</th>
                                                                <th className="text-left p-2 text-pink-600">Woman</th>
                                                                <th className="text-right p-2">Compat.</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {pairs.map((pair, i) => (
                                                                <tr key={pair.manId} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                                                                    <td className="p-2 font-medium">{pair.manName}</td>
                                                                    <td className="p-2 font-medium">{pair.womanName}</td>
                                                                    <td className="p-2 text-right font-mono">{Math.round(pair.score)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
};
