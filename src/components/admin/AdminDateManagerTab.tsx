import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

import { useAdminDates } from "@/hooks/admin/useAdminDates";
import { useAdminMutualLikes } from "@/hooks/admin/useAdminMutualLikes";
import { useAdminVenues } from "@/hooks/admin/useAdminVenues";
import { fetchAdminLookupUsers } from "@/lib/admin-interactions";

interface AdminDateManagerTabProps {
    onViewDateAsUser: (dateId: string, userId: string) => void;
    onEmailDate: (date: any) => void;
}

const getDateMatchType = (value?: string | null): "relationship" | "friendship" =>
    value === "friendship" ? "friendship" : "relationship";

const getPairKey = (user1Id: string, user2Id: string, matchType: "relationship" | "friendship" = "relationship") =>
    `${matchType}:${[user1Id, user2Id].sort().join("-")}`;

export const AdminDateManagerTab = ({ onViewDateAsUser, onEmailDate }: AdminDateManagerTabProps) => {
    const { toast } = useToast();
    const [isCreatingDate, setIsCreatingDate] = useState(false);
    const [sendingAvailabilityReminderDateId, setSendingAvailabilityReminderDateId] = useState<string | null>(null);
    const [bulkSendingAvailability, setBulkSendingAvailability] = useState(false);
    const [refreshingVenueDateId, setRefreshingVenueDateId] = useState<string | null>(null);
    const [resetVenuelessState, setResetVenuelessState] = useState<"idle" | "previewing" | "applying">("idle");
    const [resetVenuelessPreview, setResetVenuelessPreview] = useState<any[] | null>(null);
    const [dateTypeFilter, setDateTypeFilter] = useState<"all" | "relationship" | "friendship">("all");
    const [mutualLikeTypeFilter, setMutualLikeTypeFilter] = useState<"all" | "relationship" | "friendship">("all");
    const [statusView, setStatusView] = useState<"all" | "completed" | "cancelled" | "auto_cancelled">("completed");
    const [mutualLookupQuery, setMutualLookupQuery] = useState("");
    const [isMutualLookupLoading, setIsMutualLookupLoading] = useState(false);
    const [mutualLookupResults, setMutualLookupResults] = useState<any[]>([]);
    const { historicalMutualLikes, refreshMutualLikes, loading: likesLoading } = useAdminMutualLikes();
    const { dates, dateMap, refreshDates, completedDatesCount, totalDatesCount, loading: datesLoading } = useAdminDates();
    const { venues } = useAdminVenues();
    const venueNameMap = useMemo(() => new Map((venues || []).map((v: any) => [v.id, v.name])), [venues]);

    const normalizeToSlots = (avail: any): Record<string, number[]> => {
        if (!avail || typeof avail !== "object") return {};
        const values = Object.values(avail).flatMap((v: any) => Array.isArray(v) ? v : []);
        // If any value >= 24, it's already slot format (0–47).
        const isSlotFormat = values.some((n: any) => typeof n === "number" && n >= 24);
        if (isSlotFormat) return avail as Record<string, number[]>;
        // Old hour format (0–23): expand hour h -> [h*2, h*2+1]
        const out: Record<string, number[]> = {};
        for (const [day, hours] of Object.entries(avail)) {
            const arr = Array.isArray(hours) ? (hours as any[]) : [];
            out[day] = arr
                .filter((h) => typeof h === "number")
                .flatMap((h: number) => [h * 2, h * 2 + 1]);
        }
        return out;
    };

    const hasAnySharedSlot = (a: any, b: any) => {
        const aSlots = normalizeToSlots(a);
        const bSlots = normalizeToSlots(b);
        for (const day of ["0", "1", "2", "3", "4", "5", "6"]) {
            const arrA = aSlots[day] ?? [];
            const arrB = bSlots[day] ?? [];
            if (arrA.length === 0 || arrB.length === 0) continue;
            const setB = new Set(arrB);
            if (arrA.some((s) => setB.has(s))) return true;
        }
        return false;
    };

    const needsAttentionCounts = useMemo(() => {
        const hasAvailability = (value: any) =>
            !!value && typeof value === "object" && Object.keys(value).length > 0;

        let confirmedMissingVenueId = 0;
        let pendingNeedsVenueOptions = 0;
        let pendingVenueVotedNoDateTime = 0;
        let pendingBothAvailNoVotes = 0;

        for (const d of dates || []) {
            if (d.status === "confirmed" && !d.confirmed_venue_id) confirmedMissingVenueId++;
            if (d.status === "pending" && !d.date_time) {
                const hasBothAvail = hasAvailability(d.user1_availability) && hasAvailability(d.user2_availability);
                const hasShared = hasBothAvail && hasAnySharedSlot(d.user1_availability, d.user2_availability);
                const hasVenueOptions = Array.isArray(d.venue_options) && d.venue_options.length > 0;
                const hasBothVotes = !!d.user1_venue_vote && !!d.user2_venue_vote;

                if (d.confirmed_venue_id && !d.date_time) pendingVenueVotedNoDateTime++;
                if (hasShared && !hasVenueOptions) pendingNeedsVenueOptions++;
                if (hasBothAvail && hasVenueOptions && !hasBothVotes && !d.confirmed_venue_id) pendingBothAvailNoVotes++;
            }
        }

        return {
            confirmedMissingVenueId,
            pendingNeedsVenueOptions,
            pendingVenueVotedNoDateTime,
            pendingBothAvailNoVotes,
        };
    }, [dates]);

    const extractFunctionErrorMessage = async (error: any) => {
        const response = error?.context as Response | undefined;
        if (!response) return error?.message || "Failed to create date";

        try {
            const payload = await response.json();
            return payload?.error || payload?.message || error?.message || "Failed to create date";
        } catch {
            return error?.message || "Failed to create date";
        }
    };

    const onDateChange = () => {
        refreshDates();
        refreshMutualLikes();
    };

    const getStatusLabel = (status?: string) => {
        if (!status) return "unknown";
        if (status === "confirmed") return "scheduled";
        return status.replace(/_/g, " ");
    };

    const getStatusBadgeClass = (status?: string) => {
        switch (status) {
            case "confirmed":
                return "bg-green-100 text-green-800";
            case "pending":
            case "limbo":
                return "bg-yellow-100 text-yellow-800";
            case "cancelled":
            case "auto_cancelled":
                return "bg-red-100 text-red-800";
            case "completed":
                return "bg-blue-100 text-blue-800";
            default:
                return "bg-gray-100 text-gray-500";
        }
    };

    const hasUserCancellationReason = (date: any) => {
        return !!((date.user1_feedback || date.user2_feedback || "").trim());
    };

    const isAutoCancelledDate = (date: any) =>
        date.status === "auto_cancelled" || (date.status === "cancelled" && !hasUserCancellationReason(date));

    const isUserCancelledDate = (date: any) =>
        date.status === "cancelled" && hasUserCancellationReason(date);

    const getAutoCancelReason = (date: any) => {
        const saved = (date.user1_feedback || date.user2_feedback || "").trim();
        if (saved) return saved;
        return "Auto cancelled: Expired pending date window (>10 days from first possible day)";
    };

    const getDisplayedStatusLabel = (date: any) => {
        if (isAutoCancelledDate(date)) return "auto cancelled";
        if (isUserCancelledDate(date)) return "cancelled";
        if (date.status === "pending" && date.confirmed_venue_id && !date.date_time) return "venue voted";
        return getStatusLabel(date.status);
    };

    const getDisplayedStatusBadgeClass = (date: any) => {
        if (date.status === "pending" && date.confirmed_venue_id && !date.date_time) return "bg-blue-50 text-blue-700";
        return getStatusBadgeClass(date.status);
    };

    const hasAvailability = (value: any) =>
        !!value && typeof value === "object" && Object.keys(value).length > 0;

    const getMissingAvailabilityRecipients = (date: any) => {
        if (date.status !== "pending") return [];

        const recipients = [];

        if (!hasAvailability(date.user1_availability)) {
            recipients.push({
                userId: date.user1_id,
                customData: {
                    partnerName: date.user2_profile?.first_name || "your match",
                },
            });
        }

        if (!hasAvailability(date.user2_availability)) {
            recipients.push({
                userId: date.user2_id,
                customData: {
                    partnerName: date.user1_profile?.first_name || "your match",
                },
            });
        }

        return recipients;
    };

    const getMissingAvailabilityNames = (date: any) => {
        const names: string[] = [];
        if (date.status !== "pending") return names;
        if (!hasAvailability(date.user1_availability)) {
            names.push(date.user1_profile?.first_name || "User 1");
        }
        if (!hasAvailability(date.user2_availability)) {
            names.push(date.user2_profile?.first_name || "User 2");
        }
        return names;
    };

    const allDatesSorted = [...dates]
        .sort((a, b) => {
            const aDate = new Date(a.date_time || a.first_possible_day || a.created_at || 0).getTime();
            const bDate = new Date(b.date_time || b.first_possible_day || b.created_at || 0).getTime();
            return bDate - aDate;
        });

    const filteredDates = useMemo(() => {
        return allDatesSorted.filter((date) => {
            const statusMatches =
                statusView === "all"
                    ? true
                    : statusView === "auto_cancelled"
                        ? isAutoCancelledDate(date)
                        : statusView === "cancelled"
                            ? isUserCancelledDate(date)
                            : date.status === statusView;
            const typeMatches = dateTypeFilter === "all" ? true : (date.match_type || "relationship") === dateTypeFilter;
            return statusMatches && typeMatches;
        });
    }, [allDatesSorted, statusView, dateTypeFilter]);

    const statusCounts = filteredDates.reduce<Record<string, number>>((acc, date) => {
        const label = getDisplayedStatusLabel(date);
        acc[label] = (acc[label] || 0) + 1;
        return acc;
    }, {});

    const mutualLikeByPair = useMemo(() => {
        const map = new Map<string, any>();
        for (const pair of historicalMutualLikes) {
            const key = getPairKey(pair.user_id, pair.matched_user_id, getDateMatchType(pair.match_type));
            map.set(key, pair);
        }
        return map;
    }, [historicalMutualLikes]);

    const formatFollowup = (value?: string | null) => {
        if (!value) return "No feedback yet";
        if (value === "match") return "Match again";
        if (value === "friend") return "Be friends";
        if (value === "pass") return "Pass";
        return value;
    };

    const summarizeOutcome = (date: any) => {
        if (isAutoCancelledDate(date)) return "Auto cancelled";
        if (isUserCancelledDate(date)) return "Cancelled by user";
        const p1 = date.user1_followup_preference;
        const p2 = date.user2_followup_preference;
        if (!p1 && !p2) return "Pending both feedbacks";
        if (p1 === "match" && p2 === "match") return "Mutual match";
        if (p1 === "friend" && p2 === "friend") return "Mutual friendship";
        if (p1 === "pass" && p2 === "pass") return "Both passed";
        if ((p1 === "pass" && !p2) || (p2 === "pass" && !p1)) return "One-sided pass";
        if (!p1 || !p2) return "Waiting for one side";
        return "Mixed preferences";
    };

    const mutualLikeCardSource = useMemo(() => {
        const pairs = [...historicalMutualLikes];
        const seenKeys = new Set(
            historicalMutualLikes.map((pair: any) =>
                getPairKey(pair.user_id, pair.matched_user_id, getDateMatchType(pair.match_type))
            )
        );

        for (const date of dates) {
            const matchType = getDateMatchType(date.match_type);
            const pairKey = getPairKey(date.user1_id, date.user2_id, matchType);

            if (seenKeys.has(pairKey)) continue;
            if (date.status !== "pending" && date.status !== "confirmed") continue;

            pairs.push({
                id: `date:${date.id}`,
                user_id: date.user1_id,
                matched_user_id: date.user2_id,
                match_type: matchType,
                user_profile: date.user1_profile,
                matched_user_profile: date.user2_profile,
                user1_like_date: null,
                user2_like_date: null,
            });
            seenKeys.add(pairKey);
        }

        return pairs;
    }, [historicalMutualLikes, dates]);

    const mutualLikeVisiblePairs = mutualLikeCardSource.filter((pair: any) => {
        const pairMatchType = getDateMatchType(pair.match_type);
        if (mutualLikeTypeFilter !== "all" && pairMatchType !== mutualLikeTypeFilter) {
            return false;
        }

        const key = getPairKey(pair.user_id, pair.matched_user_id, pairMatchType);
        const existingDate = dateMap.get(key);
        if (!existingDate) return true; // no date yet
        return existingDate.status === "confirmed" || existingDate.status === "pending";
    });

    const runMutualLookup = async (queryOverride?: string) => {
        const query = (queryOverride ?? mutualLookupQuery).trim();
        if (!query) {
            setMutualLookupResults([]);
            return;
        }

        setIsMutualLookupLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke("admin-search-users", {
                body: { query },
            });
            if (error) throw error;

            const users = data?.users || [];
            if (users.length === 0) {
                setMutualLookupResults([]);
                return;
            }

            const userIds = users.map((user: any) => user.id);
            const interactionData = await fetchAdminLookupUsers(userIds);
            const interactionsByUserId = new Map((interactionData.users || []).map((entry) => [entry.userId, entry]));

            const partnerIds = new Set<string>();
            for (const entry of interactionData.users || []) {
                (entry.outgoingLikes || []).forEach((like) => partnerIds.add(like.other_user_id));
                (entry.incomingLikes || []).forEach((like) => partnerIds.add(like.other_user_id));
                (entry.outgoingFriendshipLikes || []).forEach((like) => partnerIds.add(like.other_user_id));
                (entry.incomingFriendshipLikes || []).forEach((like) => partnerIds.add(like.other_user_id));
            }
            userIds.forEach((id: string) => partnerIds.delete(id));

            let partnerProfilesMap = new Map<string, any>();
            if (partnerIds.size > 0) {
                const ids = Array.from(partnerIds);
                const [{ data: partnerProfiles, error: partnerProfilesError }, { data: partnerPrivate, error: partnerPrivateError }] = await Promise.all([
                    supabase
                        .from("profiles")
                        .select("id, first_name, photo_url")
                        .in("id", ids),
                    supabase
                        .from("private_profile_data" as any)
                        .select("user_id, last_name")
                        .in("user_id", ids),
                ]);

                if (partnerProfilesError) throw partnerProfilesError;
                if (partnerPrivateError) throw partnerPrivateError;

                const partnerPrivateByUser = new Map((partnerPrivate || []).map((row: any) => [row.user_id, row]));
                partnerProfilesMap = new Map(
                    (partnerProfiles || []).map((profile: any) => [
                        profile.id,
                        { ...profile, last_name: partnerPrivateByUser.get(profile.id)?.last_name ?? null },
                    ])
                );
            }

            const results = users.map((user: any) => {
                const interactionEntry = interactionsByUserId.get(user.id) || {
                    outgoingLikes: [],
                    incomingLikes: [],
                    outgoingFriendshipLikes: [],
                    incomingFriendshipLikes: [],
                };
                const outgoing = interactionEntry.outgoingLikes || [];
                const incoming = interactionEntry.incomingLikes || [];
                const incomingByUser = new Map(incoming.map((like: any) => [like.other_user_id, like]));
                const outgoingFriendship = interactionEntry.outgoingFriendshipLikes || [];
                const incomingFriendship = interactionEntry.incomingFriendshipLikes || [];
                const incomingFriendshipByUser = new Map(incomingFriendship.map((like: any) => [like.other_user_id, like]));

                const relationshipMutualPartners = outgoing
                    .filter((like: any) => incomingByUser.has(like.other_user_id))
                    .map((like: any) => {
                        const partnerId = like.other_user_id;
                        const reverseLike = incomingByUser.get(partnerId);
                        const pairKey = getPairKey(user.id, partnerId, "relationship");
                        const existingDate = dateMap.get(pairKey);
                        const partnerProfile = partnerProfilesMap.get(partnerId);
                        const partnerName = `${partnerProfile?.first_name || "Unknown"} ${partnerProfile?.last_name || ""}`.trim();

                        return {
                            connectionType: "relationship" as const,
                            partnerId,
                            partnerName,
                            likeDate: like.created_at,
                            reverseLikeDate: reverseLike?.created_at || null,
                            existingDate,
                        };
                    })
                    .sort((a: any, b: any) => a.partnerName.localeCompare(b.partnerName, undefined, { sensitivity: "base" }));

                const friendshipMutualPartners = outgoingFriendship
                    .filter((like: any) => incomingFriendshipByUser.has(like.other_user_id))
                    .map((like: any) => {
                        const partnerId = like.other_user_id;
                        const reverseLike = incomingFriendshipByUser.get(partnerId);
                        const pairKey = getPairKey(user.id, partnerId, "friendship");
                        const existingDate = dateMap.get(pairKey);
                        const partnerProfile = partnerProfilesMap.get(partnerId);
                        const partnerName = `${partnerProfile?.first_name || "Unknown"} ${partnerProfile?.last_name || ""}`.trim();

                        return {
                            connectionType: "friendship" as const,
                            partnerId,
                            partnerName,
                            likeDate: like.created_at,
                            reverseLikeDate: reverseLike?.created_at || null,
                            existingDate,
                        };
                    })
                    .sort((a: any, b: any) => a.partnerName.localeCompare(b.partnerName, undefined, { sensitivity: "base" }));

                return {
                    user,
                    outgoingLikes: outgoing.length,
                    incomingLikes: incoming.length,
                    outgoingFriendshipLikes: outgoingFriendship.length,
                    incomingFriendshipLikes: incomingFriendship.length,
                    relationshipMutualPartners,
                    friendshipMutualPartners,
                };
            });

            setMutualLookupResults(results);
        } catch (error: any) {
            console.error("Mutual lookup failed:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to inspect mutual likes",
                variant: "destructive",
            });
            setMutualLookupResults([]);
        } finally {
            setIsMutualLookupLoading(false);
        }
    };

    const sortedAllMutualPairs = [...mutualLikeVisiblePairs].sort((a, b) => {
        const keyA = getPairKey(a.user_id, a.matched_user_id, getDateMatchType(a.match_type));
        const keyB = getPairKey(b.user_id, b.matched_user_id, getDateMatchType(b.match_type));
        const dateA = dateMap.get(keyA);
        const dateB = dateMap.get(keyB);
        const timeA = dateA?.date_time || dateA?.first_possible_day || a.user1_like_date || a.user2_like_date;
        const timeB = dateB?.date_time || dateB?.first_possible_day || b.user1_like_date || b.user2_like_date;
        return new Date(timeB || 0).getTime() - new Date(timeA || 0).getTime();
    });

    const cancelledDates = dates.filter((d: any) => d.status === "cancelled" || d.status === "auto_cancelled");
    const userCancelledDates = cancelledDates.filter((d: any) => isUserCancelledDate(d));
    const autoCancelledDates = cancelledDates.filter((d: any) => isAutoCancelledDate(d));
    const cancellationReasonCounts = cancelledDates.reduce<Record<string, number>>((acc, d: any) => {
        const reason = isAutoCancelledDate(d)
            ? getAutoCancelReason(d)
            : ((d.user1_feedback || d.user2_feedback || "No reason provided").trim());
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
    }, {});

    const handleAdminCreateDate = async (match: any) => {
        setIsCreatingDate(true);
        try {
            const matchType = getDateMatchType(match.match_type);
            const { data, error } = await supabase.functions.invoke("check-match-and-create-date", {
                body: {
                    userId: match.user_id,
                    matchedUserId: match.matched_user_id,
                    matchType,
                    email_both: true,
                },
            });

            if (error) {
                const message = await extractFunctionErrorMessage(error);
                throw new Error(message);
            }
            if (data?.error) throw new Error(data.error);

            toast({
                title: "Success",
                description: "Date created and emails sent.",
            });
            onDateChange();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to create date",
                variant: "destructive",
            });
        } finally {
            setIsCreatingDate(false);
        }
    };

    const handleSendMissingAvailabilityReminder = async (date: any) => {
        const recipients = getMissingAvailabilityRecipients(date);
        const missingNames = getMissingAvailabilityNames(date);

        if (recipients.length === 0) {
            toast({
                title: "Nothing to send",
                description: "Both users have already added availability for this date.",
            });
            return;
        }

        setSendingAvailabilityReminderDateId(date.id);
        try {
            const { error } = await supabase.functions.invoke("send-user-emails", {
                body: {
                    emailType: "date_missing_availability",
                    recipients,
                },
            });

            if (error) throw error;

            const { error: updateError } = await supabase
                .from("dates")
                .update({ reminder_missing_availability_sent: true })
                .eq("id", date.id);

            if (updateError) {
                console.error("Failed to mark missing-availability reminder as sent:", updateError);
            }

            toast({
                title: "Reminder sent",
                description: `Sent availability reminder to ${missingNames.join(" and ")}.`,
            });
            onDateChange();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to send availability reminder",
                variant: "destructive",
            });
        } finally {
            setSendingAvailabilityReminderDateId(null);
        }
    };

    const datesMissingAvailability = dates.filter((d: any) =>
        d.status === "pending" && (
            !hasAvailability(d.user1_availability) ||
            !hasAvailability(d.user2_availability)
        )
    );

    const missingAvailabilityCounts = useMemo(() => {
        let user1Missing = 0;
        let user2Missing = 0;
        let bothMissing = 0;
        let totalRecipients = 0;

        for (const d of datesMissingAvailability) {
            const u1Missing = !hasAvailability(d.user1_availability);
            const u2Missing = !hasAvailability(d.user2_availability);
            if (u1Missing) user1Missing++;
            if (u2Missing) user2Missing++;
            if (u1Missing && u2Missing) bothMissing++;
            totalRecipients += getMissingAvailabilityRecipients(d).length;
        }

        return { user1Missing, user2Missing, bothMissing, totalRecipients };
    }, [datesMissingAvailability]);

    const handleBulkSendMissingAvailability = async () => {
        if (datesMissingAvailability.length === 0 || bulkSendingAvailability) return;
        setBulkSendingAvailability(true);
        let sentDates = 0;
        let sentRecipients = 0;
        const errors: string[] = [];

        for (const d of datesMissingAvailability) {
            const recipients = getMissingAvailabilityRecipients(d);
            if (recipients.length === 0) continue;
            try {
                const { error } = await supabase.functions.invoke("send-user-emails", {
                    body: {
                        emailType: "date_missing_availability",
                        recipients,
                    },
                });
                if (error) throw error;
                sentDates++;
                sentRecipients += recipients.length;

                const { error: updateError } = await supabase
                    .from("dates")
                    .update({ reminder_missing_availability_sent: true })
                    .eq("id", d.id);
                if (updateError) {
                    console.error("Failed to mark missing-availability reminder as sent:", updateError);
                }
            } catch (e: any) {
                const msg = e?.message || String(e);
                errors.push(`${(d.id || "").slice(0, 8)}: ${msg}`);
            }
        }

        if (errors.length > 0) {
            toast({
                title: `Missing availability emails: ${sentDates} date(s) ok, ${errors.length} failed`,
                description: errors[0],
                variant: "destructive",
            });
        } else {
            toast({
                title: "Missing availability emails sent",
                description: `Sent ${sentRecipients} email(s) across ${sentDates} date(s).`,
            });
        }

        setBulkSendingAvailability(false);
        onDateChange();
    };

    const handleRefreshVenueOptions = async (date: any) => {
        setRefreshingVenueDateId(date.id);
        try {
            const { data, error } = await supabase.functions.invoke("refresh-venue-options", {
                body: { dateId: date.id },
            });
            if (error) throw error;
            if (data?.skipped) {
                toast({ title: "Skipped", description: data.reason || "No venues found for overlap" });
            } else {
                toast({ title: "Venues refreshed", description: `Options set: ${(data?.venueOptions || []).length} venue(s)` });
                onDateChange();
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to refresh venues", variant: "destructive" });
        } finally {
            setRefreshingVenueDateId(null);
        }
    };

    const handleResetVenuelessDates = async (dryRun: boolean) => {
        setResetVenuelessState(dryRun ? "previewing" : "applying");
        try {
            const { data, error } = await supabase.functions.invoke("admin-reset-venue-less-dates", {
                body: { dryRun },
            });
            if (error) throw error;
            if (dryRun) {
                setResetVenuelessPreview(data?.updated ?? []);
                toast({
                    title: `Dry run: ${data?.updated?.length ?? 0} date(s) affected`,
                    description: "Review below, then click Apply to fix them.",
                });
            } else {
                setResetVenuelessPreview(null);
                toast({
                    title: `Fixed ${data?.updated?.length ?? 0} date(s)`,
                    description: "Dates reset to pending and emails sent.",
                });
                onDateChange();
            }
        } catch (e: any) {
            toast({ title: "Error", description: e.message || "Failed", variant: "destructive" });
        } finally {
            setResetVenuelessState("idle");
        }
    };

    const datesNeedingVenueRefresh = dates.filter(d =>
        d.status === "pending" && !d.date_time && !d.venue_options?.length &&
        hasAvailability(d.user1_availability) && hasAvailability(d.user2_availability) &&
        hasAnySharedSlot(d.user1_availability, d.user2_availability)
    );

    const handleBulkRefreshVenues = async () => {
        if (datesNeedingVenueRefresh.length === 0) return;
        let succeeded = 0;
        let skipped = 0;
        const errors: string[] = [];
        for (const date of datesNeedingVenueRefresh) {
            setRefreshingVenueDateId(date.id);
            try {
                const { data, error } = await supabase.functions.invoke("refresh-venue-options", {
                    body: { dateId: date.id },
                });
                if (error) {
                    const msg = error?.message || JSON.stringify(error);
                    console.error("refresh-venue-options error for", date.id, error);
                    errors.push(`${date.id.slice(0, 8)}: ${msg}`);
                } else if (data?.skipped) {
                    skipped++;
                } else {
                    succeeded++;
                }
            } catch (e: any) {
                const msg = e?.message || String(e);
                console.error("Failed to refresh venues for date", date.id, e);
                errors.push(`${date.id.slice(0, 8)}: ${msg}`);
            }
        }
        setRefreshingVenueDateId(null);
        if (errors.length > 0) {
            toast({
                title: `Venue refresh: ${succeeded} updated, ${skipped} skipped, ${errors.length} errored`,
                description: errors[0],
                variant: "destructive",
            });
        } else {
            toast({ title: "Bulk venue refresh done", description: `${succeeded} updated, ${skipped} skipped (no overlap)` });
        }
        onDateChange();
    };

    if (datesLoading || likesLoading) {
        return <div className="p-8 text-center text-muted-foreground">Loading date manager...</div>;
    }

    return (
        <div className="space-y-6">
            <Card className="border-amber-200">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Needs attention</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Quick counts for date states that typically need admin intervention.
                    </p>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="rounded border p-3">
                        <div className="text-xs text-muted-foreground uppercase">Confirmed missing venue</div>
                        <div className="text-2xl font-bold">{needsAttentionCounts.confirmedMissingVenueId}</div>
                        <div className="text-xs text-muted-foreground mt-1">Use “Find bad confirms” / “Fix … date(s)”</div>
                    </div>
                    <div className="rounded border p-3">
                        <div className="text-xs text-muted-foreground uppercase">Pending needs venues</div>
                        <div className="text-2xl font-bold">{needsAttentionCounts.pendingNeedsVenueOptions}</div>
                        <div className="text-xs text-muted-foreground mt-1">Use “Fix venues (…)” bulk refresh</div>
                    </div>
                    <div className="rounded border p-3">
                        <div className="text-xs text-muted-foreground uppercase">Venue voted, no time</div>
                        <div className="text-2xl font-bold">{needsAttentionCounts.pendingVenueVotedNoDateTime}</div>
                        <div className="text-xs text-muted-foreground mt-1">Usually resolves on user open</div>
                    </div>
                    <div className="rounded border p-3">
                        <div className="text-xs text-muted-foreground uppercase">Both avail, no votes</div>
                        <div className="text-2xl font-bold">{needsAttentionCounts.pendingBothAvailNoVotes}</div>
                        <div className="text-xs text-muted-foreground mt-1">Users need to vote</div>
                    </div>
                    </div>

                    <div className="rounded border p-3">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div>
                                <div className="text-xs text-muted-foreground uppercase">Missing availability (pending)</div>
                                <div className="text-2xl font-bold">{datesMissingAvailability.length}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    User1 missing: {missingAvailabilityCounts.user1Missing} · User2 missing: {missingAvailabilityCounts.user2Missing} · Both missing: {missingAvailabilityCounts.bothMissing}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    Total recipients: {missingAvailabilityCounts.totalRecipients}
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void handleBulkSendMissingAvailability()}
                                disabled={bulkSendingAvailability || datesMissingAvailability.length === 0}
                            >
                                {bulkSendingAvailability ? "Sending..." : `Email missing availability (${missingAvailabilityCounts.totalRecipients})`}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-2 flex-wrap">
                {datesNeedingVenueRefresh.length > 0 && (
                    <Button variant="outline" size="sm" onClick={() => void handleBulkRefreshVenues()} disabled={!!refreshingVenueDateId} className="text-blue-600 border-blue-200">
                        {refreshingVenueDateId ? "Refreshing..." : `Fix venues (${datesNeedingVenueRefresh.length})`}
                    </Button>
                )}
                {resetVenuelessPreview === null ? (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleResetVenuelessDates(true)}
                        disabled={resetVenuelessState !== "idle"}
                        className="text-orange-600 border-orange-200"
                    >
                        {resetVenuelessState === "previewing" ? "Checking..." : "Find bad confirms"}
                    </Button>
                ) : (
                    <>
                        <span className="text-sm text-muted-foreground self-center">
                            {resetVenuelessPreview.length} bad confirmed date(s) found
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setResetVenuelessPreview(null)}
                            className="text-muted-foreground"
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => void handleResetVenuelessDates(false)}
                            disabled={resetVenuelessState === "applying" || resetVenuelessPreview.length === 0}
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                        >
                            {resetVenuelessState === "applying" ? "Fixing..." : `Fix ${resetVenuelessPreview.length} date(s)`}
                        </Button>
                    </>
                )}
                <Button variant="outline" size="sm" onClick={onDateChange} disabled={datesLoading}>
                    <RefreshCw className={`h-4 w-4 mr-1 ${datesLoading ? "animate-spin" : ""}`} /> Refresh
                </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Total Dates</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalDatesCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Total Completed Dates</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{completedDatesCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Filtered Dates</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{filteredDates.length}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Dates ({filteredDates.length})</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Completed dates with full details, mutual-like history, and outcome.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant={statusView === "all" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setStatusView("all")}
                        >
                            All Statuses
                        </Button>
                        <Button
                            variant={statusView === "completed" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setStatusView("completed")}
                        >
                            Completed Only
                        </Button>
                        <Button
                            variant={statusView === "cancelled" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setStatusView("cancelled")}
                        >
                            Cancelled
                        </Button>
                        <Button
                            variant={statusView === "auto_cancelled" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setStatusView("auto_cancelled")}
                        >
                            Auto Cancelled
                        </Button>
                        <Button
                            variant={dateTypeFilter === "all" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setDateTypeFilter("all")}
                        >
                            Romantic + Friendship
                        </Button>
                        <Button
                            variant={dateTypeFilter === "relationship" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setDateTypeFilter("relationship")}
                        >
                            Romantic
                        </Button>
                        <Button
                            variant={dateTypeFilter === "friendship" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setDateTypeFilter("friendship")}
                        >
                            Friendship
                        </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                        {Object.entries(statusCounts)
                            .sort((a, b) => b[1] - a[1])
                            .map(([status, count]) => (
                                <span key={status} className="px-2 py-1 rounded bg-muted">
                                    {status.toUpperCase()}: {count}
                                </span>
                            ))}
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>When</TableHead>
                                <TableHead>Where</TableHead>
                                <TableHead>Users</TableHead>
                                <TableHead>Mutual Likes</TableHead>
                                <TableHead>Outcome</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date ID / Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredDates.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                                        No dates found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredDates.map((date) => {
                                    const dateMatchType = getDateMatchType(date.match_type);
                                    const mutualLike = mutualLikeByPair.get(getPairKey(date.user1_id, date.user2_id, dateMatchType));
                                    const user1Name = `${date.user1_profile?.first_name || "Unknown"} ${date.user1_profile?.last_name || ""}`.trim();
                                    const user2Name = `${date.user2_profile?.first_name || "Unknown"} ${date.user2_profile?.last_name || ""}`.trim();
                                    const when = date.date_time || date.first_possible_day;
                                    const cancellationReason = (date.user1_feedback || date.user2_feedback || "No reason provided").trim();
                                    const isCancelled = isUserCancelledDate(date);
                                    const isAutoCancelled = isAutoCancelledDate(date);
                                    const missingAvailabilityNames = getMissingAvailabilityNames(date);
                                    const missingAvailabilityRecipients = getMissingAvailabilityRecipients(date);

                                    return (
                                        <TableRow key={date.id}>
                                            <TableCell className="text-sm">
                                                <div>{when ? format(new Date(when), "MMM d, yyyy h:mm a") : "Unknown"}</div>
                                                {date.timezone && <div className="text-xs text-muted-foreground">{date.timezone}</div>}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                <div>{date.location || date.address || (
                                                    date.confirmed_venue_id
                                                        ? `Confirmed: ${venueNameMap.get(date.confirmed_venue_id) ?? date.confirmed_venue_id}`
                                                        : date.venue_options?.length > 0 && !date.date_time
                                                            ? `Voting: ${date.venue_options.map((id: string) => venueNameMap.get(id) ?? id).join(", ")}`
                                                            : "No location"
                                                )}</div>
                                                {date.activity && <div className="text-xs text-muted-foreground">{date.activity}</div>}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                <div>{user1Name}</div>
                                                <div className="text-muted-foreground">{user2Name}</div>
                                                <div className="flex gap-2 mt-1">
                                                    <Button size="sm" variant="outline" onClick={() => onViewDateAsUser(date.id, date.user1_id)}>View as {date.user1_profile?.first_name || "User 1"}</Button>
                                                    <Button size="sm" variant="outline" onClick={() => onViewDateAsUser(date.id, date.user2_id)}>View as {date.user2_profile?.first_name || "User 2"}</Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {mutualLike ? (
                                                    <>
                                                        <div>{dateMatchType === "friendship" ? "U1 waved" : "U1 liked"}: {mutualLike.user1_like_date ? format(new Date(mutualLike.user1_like_date), "MMM d, yyyy") : "Unknown"}</div>
                                                        <div>{dateMatchType === "friendship" ? "U2 waved" : "U2 liked"}: {mutualLike.user2_like_date ? format(new Date(mutualLike.user2_like_date), "MMM d, yyyy") : "Unknown"}</div>
                                                    </>
                                                ) : (
                                                    <span className="text-muted-foreground">Not found</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {isCancelled ? (
                                                    <>
                                                        <div className="font-medium">Cancelled by user</div>
                                                        <div className="text-xs text-muted-foreground truncate" title={cancellationReason}>
                                                            Reason: {cancellationReason}
                                                        </div>
                                                    </>
                                                ) : isAutoCancelled ? (
                                                    <>
                                                        <div className="font-medium">Auto cancelled</div>
                                                        <div className="text-xs text-muted-foreground truncate" title={getAutoCancelReason(date)}>
                                                            Reason: {getAutoCancelReason(date)}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="font-medium">{summarizeOutcome(date)}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {date.user1_profile?.first_name || "User 1"}: {formatFollowup(date.user1_followup_preference)}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {date.user2_profile?.first_name || "User 2"}: {formatFollowup(date.user2_followup_preference)}
                                                        </div>
                                                    </>
                                                )}
                                            </TableCell>
                                            <TableCell className="uppercase text-xs font-semibold">
                                                {(date.match_type || "relationship") === "friendship" ? "FRIENDSHIP" : "ROMANTIC"}
                                            </TableCell>
                                            <TableCell className="uppercase text-xs font-semibold">{getDisplayedStatusLabel(date)}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                <div>{date.id}</div>
                                                {missingAvailabilityNames.length > 0 && (
                                                    <div className="mt-1">
                                                        Missing availability: {missingAvailabilityNames.join(", ")}
                                                    </div>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="px-0 h-6"
                                                    onClick={() => onEmailDate(date)}
                                                >
                                                    Email both
                                                </Button>
                                                {missingAvailabilityRecipients.length > 0 && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="px-0 h-6 block"
                                                        onClick={() => void handleSendMissingAvailabilityReminder(date)}
                                                        disabled={sendingAvailabilityReminderDateId === date.id}
                                                    >
                                                        {sendingAvailabilityReminderDateId === date.id
                                                            ? "Sending..."
                                                            : `Email missing availability${missingAvailabilityRecipients.length > 1 ? ` (${missingAvailabilityRecipients.length})` : ""}`}
                                                    </Button>
                                                )}
                                                {date.status === "pending" && !date.date_time && hasAvailability(date.user1_availability) && hasAvailability(date.user2_availability) && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="px-0 h-6 block text-blue-600"
                                                        onClick={() => void handleRefreshVenueOptions(date)}
                                                        disabled={refreshingVenueDateId === date.id}
                                                    >
                                                        {refreshingVenueDateId === date.id ? "Refreshing..." : "Refresh venues"}
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Cancelled Breakdown</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        User-cancelled means one side provided a cancellation reason. Auto/system means no user reason was saved.
                    </p>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Card className="border-border/60">
                            <CardContent className="p-3">
                                <p className="text-xs text-muted-foreground">Total Cancelled</p>
                                <p className="text-xl font-semibold">{cancelledDates.length}</p>
                            </CardContent>
                        </Card>
                        <Card className="border-border/60">
                            <CardContent className="p-3">
                                <p className="text-xs text-muted-foreground">Cancelled By User</p>
                                <p className="text-xl font-semibold">{userCancelledDates.length}</p>
                            </CardContent>
                        </Card>
                        <Card className="border-border/60">
                            <CardContent className="p-3">
                                <p className="text-xs text-muted-foreground">Auto / System Cancelled</p>
                                <p className="text-xl font-semibold">{autoCancelledDates.length}</p>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="space-y-2">
                        {Object.entries(cancellationReasonCounts)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 8)
                            .map(([reason, count]) => (
                                <div key={reason} className="flex justify-between gap-2 text-sm border rounded px-2 py-1">
                                    <span className="truncate">{reason}</span>
                                    <span className="font-semibold">{count}</span>
                                </div>
                            ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Mutual-Like Pairs</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Shows romantic and friendship mutuals with no date yet, or with a pending/scheduled date.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant={mutualLikeTypeFilter === "all" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setMutualLikeTypeFilter("all")}
                        >
                            Romantic + Friendship
                        </Button>
                        <Button
                            variant={mutualLikeTypeFilter === "relationship" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setMutualLikeTypeFilter("relationship")}
                        >
                            Romantic
                        </Button>
                        <Button
                            variant={mutualLikeTypeFilter === "friendship" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setMutualLikeTypeFilter("friendship")}
                        >
                            Friendship
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mb-6">
                        <Card className="border-border/60">
                            <CardHeader>
                                <CardTitle className="text-base">Mutual-Like Lookup</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Shows actual reciprocal likes or waves only. Active matches without likes are handled in User Match Debug.
                                </p>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex gap-3">
                                    <Input
                                        value={mutualLookupQuery}
                                        onChange={(e) => setMutualLookupQuery(e.target.value)}
                                        placeholder="Search a user by name or email"
                                        onKeyDown={(e) => e.key === "Enter" && void runMutualLookup()}
                                    />
                                    <Button onClick={() => void runMutualLookup()} disabled={isMutualLookupLoading || !mutualLookupQuery.trim()}>
                                        {isMutualLookupLoading ? "Checking..." : "Check"}
                                    </Button>
                                </div>

                                {mutualLookupResults.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        {isMutualLookupLoading ? "Checking..." : "No matching users found."}
                                    </p>
                                ) : (
                                    <div className="space-y-4">
                                        {mutualLookupResults.map((result: any) => {
                                            const userName = `${result.user.first_name || ""} ${result.user.last_name || ""}`.trim();

                                            return (
                                                <Card key={result.user.id} className="border-border/60">
                                                    <CardContent className="p-4 space-y-3">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div>
                                                                <p className="font-semibold">{userName || result.user.id}</p>
                                                                <p className="text-xs text-muted-foreground">{result.user.id}</p>
                                                            </div>
                                                        </div>

                                                        {result.relationshipMutualPartners.length === 0 && result.friendshipMutualPartners.length === 0 ? (
                                                            <p className="text-sm text-muted-foreground">No current mutual-like partners.</p>
                                                        ) : (
                                                            <div className="space-y-2">
                                        {result.relationshipMutualPartners.map((partner: any) => (
                                                                    <div key={`${result.user.id}-${partner.partnerId}`} className="rounded border p-3 space-y-2">
                                                                        <div className="flex items-center justify-between gap-3">
                                                                            <div>
                                                                                <p className="font-medium">{partner.partnerName}</p>
                                                                                <p className="text-xs text-muted-foreground">{partner.partnerId}</p>
                                                                            </div>
                                                                            <div className={`px-2 py-1 rounded text-xs font-bold uppercase ${getStatusBadgeClass(partner.existingDate?.status)}`}>
                                                                                {partner.existingDate ? getStatusLabel(partner.existingDate.status) : "no date yet"}
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-xs font-semibold text-muted-foreground uppercase">Romantic mutual like</div>
                                                                        <div className="text-xs text-muted-foreground">
                                                                            <div>User liked them: {partner.likeDate ? format(new Date(partner.likeDate), "MMM d, yyyy") : "Unknown"}</div>
                                                                            <div>They liked user: {partner.reverseLikeDate ? format(new Date(partner.reverseLikeDate), "MMM d, yyyy") : "Unknown"}</div>
                                                                        </div>
                                                                        <div className="flex gap-2">
                                                                            {partner.existingDate ? (
                                                                                <>
                                                                                    <Button
                                                                                        variant="outline"
                                                                                        size="sm"
                                                                                        className="flex-1"
                                                                                        onClick={() => onViewDateAsUser(partner.existingDate.id, result.user.id)}
                                                                                    >
                                                                                        View Date
                                                                                    </Button>
                                                                                    <Button
                                                                                        size="sm"
                                                                                        className="flex-1"
                                                                                        onClick={() => onEmailDate(partner.existingDate)}
                                                                                    >
                                                                                        Email Both
                                                                                    </Button>
                                                                                    {getMissingAvailabilityRecipients(partner.existingDate).length > 0 && (
                                                                                        <Button
                                                                                            size="sm"
                                                                                            variant="outline"
                                                                                            className="flex-1"
                                                                                            onClick={() => void handleSendMissingAvailabilityReminder(partner.existingDate)}
                                                                                            disabled={sendingAvailabilityReminderDateId === partner.existingDate.id}
                                                                                        >
                                                                                            {sendingAvailabilityReminderDateId === partner.existingDate.id
                                                                                                ? "Sending..."
                                                                                                : "Email Missing Availability"}
                                                                                        </Button>
                                                                                    )}
                                                                                </>
                                                                            ) : (
                                                                                <Button
                                                                                    size="sm"
                                                                                    className="flex-1"
                                                                                    onClick={() => handleAdminCreateDate({
                                                                                        user_id: result.user.id,
                                                                                        matched_user_id: partner.partnerId,
                                                                                        match_type: "relationship",
                                                                                    })}
                                                                                >
                                                                                    Create Date & Email Both
                                                                                </Button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}

                                                                {result.friendshipMutualPartners.map((partner: any) => (
                                                                    <div key={`friendship-${result.user.id}-${partner.partnerId}`} className="rounded border p-3 space-y-2">
                                                                        <div className="flex items-center justify-between gap-3">
                                                                            <div>
                                                                                <p className="font-medium">{partner.partnerName}</p>
                                                                                <p className="text-xs text-muted-foreground">{partner.partnerId}</p>
                                                                            </div>
                                                                            <div className="px-2 py-1 rounded text-xs font-bold uppercase bg-blue-100 text-blue-800">
                                                                                friendship mutual
                                                                            </div>
                                                                        </div>
                                                                <div className="text-xs font-semibold text-muted-foreground uppercase">Friendship mutual like</div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    <div>User waved first: {partner.likeDate ? format(new Date(partner.likeDate), "MMM d, yyyy") : "Unknown"}</div>
                                                                    <div>They waved back: {partner.reverseLikeDate ? format(new Date(partner.reverseLikeDate), "MMM d, yyyy") : "Unknown"}</div>
                                                                </div>
                                                                        <div className="flex gap-2">
                                                                            {partner.existingDate ? (
                                                                                <>
                                                                                    <Button
                                                                                        variant="outline"
                                                                                        size="sm"
                                                                                        className="flex-1"
                                                                                        onClick={() => onViewDateAsUser(partner.existingDate.id, result.user.id)}
                                                                                    >
                                                                                        View Date
                                                                                    </Button>
                                                                                    <Button
                                                                                        size="sm"
                                                                                        className="flex-1"
                                                                                        onClick={() => onEmailDate(partner.existingDate)}
                                                                                    >
                                                                                        Email Both
                                                                                    </Button>
                                                                                    {getMissingAvailabilityRecipients(partner.existingDate).length > 0 && (
                                                                                        <Button
                                                                                            size="sm"
                                                                                            variant="outline"
                                                                                            className="flex-1"
                                                                                            onClick={() => void handleSendMissingAvailabilityReminder(partner.existingDate)}
                                                                                            disabled={sendingAvailabilityReminderDateId === partner.existingDate.id}
                                                                                        >
                                                                                            {sendingAvailabilityReminderDateId === partner.existingDate.id
                                                                                                ? "Sending..."
                                                                                                : "Email Missing Availability"}
                                                                                        </Button>
                                                                                    )}
                                                                                </>
                                                                            ) : (
                                                                                <Button
                                                                                    size="sm"
                                                                                    className="flex-1"
                                                                                    onClick={() => handleAdminCreateDate({
                                                                                        user_id: result.user.id,
                                                                                        matched_user_id: partner.partnerId,
                                                                                        match_type: "friendship",
                                                                                    })}
                                                                                >
                                                                                    Create Date & Email Both
                                                                                </Button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sortedAllMutualPairs.map((match: any) => {
                            const pairMatchType = getDateMatchType(match.match_type);
                            const pairKey = getPairKey(match.user_id, match.matched_user_id, pairMatchType);
                            const existingDate = dateMap.get(pairKey);
                            const usersInPair = [
                                { id: match.user_id, profile: match.user_profile, likeDate: match.user1_like_date },
                                { id: match.matched_user_id, profile: match.matched_user_profile, likeDate: match.user2_like_date },
                            ].sort((u1, u2) =>
                                (u1.profile?.first_name || "").localeCompare(u2.profile?.first_name || "", undefined, { sensitivity: "base" })
                            );

                            return (
                                <Card key={match.id} className="overflow-hidden">
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-center">
                                            <div className="text-sm font-bold text-primary">
                                                {pairMatchType === "friendship" ? "Friendship Mutual" : "Mutual Like"}
                                            </div>
                                            {existingDate ? (
                                                <div className={`px-2 py-1 rounded text-xs font-bold uppercase ${getDisplayedStatusBadgeClass(existingDate)}`}>
                                                    {getDisplayedStatusLabel(existingDate)}
                                                </div>
                                            ) : (
                                                <div className="px-2 py-1 rounded text-xs font-bold uppercase bg-gray-100 text-gray-500">
                                                    No Date Yet
                                                </div>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {usersInPair.map((u) => (
                                            <div key={u.id} className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <img src={u.profile?.photo_url || "/placeholder.svg"} className="w-8 h-8 rounded-full object-cover" />
                                                    <span className="text-sm font-medium">{u.profile?.first_name}</span>
                                                    <span className="text-xs text-muted-foreground">{u.profile?.id}</span>
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {pairMatchType === "friendship" ? "Waved" : "Liked"}: {u.likeDate ? format(new Date(u.likeDate), "MMM d, yyyy") : "Unknown"}
                                                </div>
                                            </div>
                                        ))}
                                        {existingDate && (
                                            <div className="text-xs space-y-1 bg-muted/50 p-2 rounded">
                                                <div className="font-semibold">
                                                    {existingDate.status === "pending" ? "Scheduling:" : "Date Details:"}
                                                </div>
                                                <div>
                                                    {existingDate.date_time
                                                        ? format(new Date(existingDate.date_time), "MMM d, yyyy h:mm a")
                                                        : existingDate.first_possible_day
                                                            ? `Window starts: ${format(new Date(existingDate.first_possible_day), "MMM d, yyyy")}`
                                                            : "Pending date time"}
                                                </div>
                                                <div className="text-muted-foreground">
                                                    {existingDate.location || existingDate.address || existingDate.confirmed_venue_id
                                                        ? (existingDate.location || existingDate.address || `Confirmed: ${venueNameMap.get(existingDate.confirmed_venue_id) ?? existingDate.confirmed_venue_id}`)
                                                        : (existingDate.venue_options?.length > 0 && !existingDate.date_time
                                                            ? `Voting: ${existingDate.venue_options.map((id: string) => venueNameMap.get(id) ?? id).join(", ")}`
                                                            : "No location yet")
                                                    }
                                                </div>
                                                <div className="text-muted-foreground">
                                                    Outcome: {summarizeOutcome(existingDate)}
                                                </div>
                                                {getMissingAvailabilityNames(existingDate).length > 0 && (
                                                    <div className="text-muted-foreground">
                                                        Missing availability: {getMissingAvailabilityNames(existingDate).join(", ")}
                                                    </div>
                                                )}
                                                <div className="flex gap-2 pt-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-6 text-xs flex-1"
                                                        onClick={() => onViewDateAsUser(existingDate.id, usersInPair[0].id)}
                                                    >
                                                        View as {usersInPair[0].profile?.first_name || "User 1"}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-6 text-xs flex-1"
                                                        onClick={() => onViewDateAsUser(existingDate.id, usersInPair[1].id)}
                                                    >
                                                        View as {usersInPair[1].profile?.first_name || "User 2"}
                                                    </Button>
                                                </div>
                                                {existingDate.status === "pending" && !existingDate.date_time && hasAvailability(existingDate.user1_availability) && hasAvailability(existingDate.user2_availability) && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-full h-6 text-xs text-blue-600 border-blue-200"
                                                        onClick={() => void handleRefreshVenueOptions(existingDate)}
                                                        disabled={refreshingVenueDateId === existingDate.id}
                                                    >
                                                        {refreshingVenueDateId === existingDate.id ? "Refreshing..." : "Refresh venues"}
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                        <Button
                                            onClick={() => existingDate ? onEmailDate(existingDate) : handleAdminCreateDate({ ...match, match_type: pairMatchType })}
                                            disabled={isCreatingDate}
                                            size="sm"
                                            className="w-full"
                                        >
                                            {existingDate ? "Email Both" : "Create Date & Email Both"}
                                        </Button>
                                        {existingDate && getMissingAvailabilityRecipients(existingDate).length > 0 && (
                                            <Button
                                                onClick={() => void handleSendMissingAvailabilityReminder(existingDate)}
                                                disabled={sendingAvailabilityReminderDateId === existingDate.id}
                                                size="sm"
                                                variant="outline"
                                                className="w-full"
                                            >
                                                {sendingAvailabilityReminderDateId === existingDate.id
                                                    ? "Sending..."
                                                    : `Email Missing Availability${getMissingAvailabilityRecipients(existingDate).length > 1 ? ` (${getMissingAvailabilityRecipients(existingDate).length})` : ""}`}
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
