import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const getDatePairKey = (user1Id: string, user2Id: string, matchType?: string | null) =>
    `${matchType === "friendship" ? "friendship" : "relationship"}:${[user1Id, user2Id].sort().join("-")}`;

export const useAdminDates = () => {
    const { toast } = useToast();
    const [dates, setDates] = useState<any[]>([]);
    const [dateMap, setDateMap] = useState<Map<string, any>>(new Map());
    const [userDateCounts, setUserDateCounts] = useState<Record<string, number>>({});
    const [completedDatesCount, setCompletedDatesCount] = useState(0);
    const [totalDatesCount, setTotalDatesCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const loadAllDates = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('dates')
                .select('*');

            if (error) throw error;

            const map = new Map();
            const counts: Record<string, number> = {};

            const userIds = Array.from(
                new Set(
                    (data || [])
                        .flatMap((date) => [date.user1_id, date.user2_id])
                        .filter(Boolean)
                )
            );

            let profilesById = new Map<string, any>();
            if (userIds.length > 0) {
                const [{ data: profilesData, error: profilesError }, { data: privateRows }] = await Promise.all([
                    supabase
                        .from("profiles")
                        .select("id, first_name, photo_url")
                        .in("id", userIds),
                    supabase
                        .from("private_profile_data" as any)
                        .select("user_id, last_name")
                        .in("user_id", userIds),
                ]);
                if (profilesError) throw profilesError;
                const privateByUser = new Map((privateRows || []).map((r: any) => [r.user_id, r]));
                profilesById = new Map(
                    (profilesData || []).map((profile) => [
                        profile.id,
                        { ...profile, last_name: privateByUser.get(profile.id)?.last_name ?? null },
                    ])
                );
            }

            const enrichedDates = (data || []).map((date) => ({
                ...date,
                user1_profile: profilesById.get(date.user1_id) || null,
                user2_profile: profilesById.get(date.user2_id) || null,
            }));

            // Auto-complete dates whose END time has passed (start + the min of
            // both users' chosen durations, default 60 min) and status is still
            // confirmed. Mirrors the server-side send-feedback-reminders job so a
            // date is only ever completed after it actually ends.
            const now = new Date();
            const nowMs = now.getTime();
            const pastStartConfirmed = enrichedDates.filter(
                (date) => date.status === "confirmed" && date.date_time && new Date(date.date_time).getTime() < nowMs
            );
            if (pastStartConfirmed.length > 0) {
                const candidateIds = pastStartConfirmed.map((d) => d.id);
                const { data: prefRows } = await supabase
                    .from("date_activity_preferences")
                    .select("date_id, user_id, preferences")
                    .in("date_id", candidateIds);
                const durByKey = new Map<string, number>();
                (prefRows || []).forEach((r: any) => {
                    const raw = r.preferences?.duration;
                    const dur = typeof raw === "number" ? raw : parseInt(String(raw ?? ""), 10);
                    if (Number.isFinite(dur) && dur > 0) durByKey.set(`${r.date_id}:${r.user_id}`, dur);
                });
                const datesToComplete = pastStartConfirmed.filter((date) => {
                    const d1 = durByKey.get(`${date.id}:${date.user1_id}`) ?? 60;
                    const d2 = durByKey.get(`${date.id}:${date.user2_id}`) ?? 60;
                    const endMs = new Date(date.date_time).getTime() + Math.min(d1, d2) * 60 * 1000;
                    return endMs < nowMs;
                });
                if (datesToComplete.length > 0) {
                    const completedAt = new Date().toISOString();
                    await supabase
                        .from("dates")
                        .update({ status: "completed", completed_or_cancelled_at: completedAt })
                        .in("id", datesToComplete.map((d) => d.id));
                    datesToComplete.forEach((date) => { date.status = "completed"; (date as any).completed_or_cancelled_at = completedAt; });
                }
            }

            enrichedDates.forEach(date => {
                const key = getDatePairKey(date.user1_id, date.user2_id, date.match_type);
                map.set(key, date);

                if (date.status === 'completed') {
                    counts[date.user1_id] = (counts[date.user1_id] || 0) + 1;
                    counts[date.user2_id] = (counts[date.user2_id] || 0) + 1;
                }
            });
            setDates(enrichedDates);
            setDateMap(map);
            setUserDateCounts(counts);
            setTotalDatesCount(enrichedDates.length);
            setCompletedDatesCount(enrichedDates.filter((date) => date.status === "completed").length);
        } catch (error: any) {
            console.error('Error loading dates:', error);
            toast({
                title: "Error",
                description: "Failed to load dates",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAllDates();
    }, []);

    return { dates, dateMap, userDateCounts, completedDatesCount, totalDatesCount, loading, refreshDates: loadAllDates };
};
