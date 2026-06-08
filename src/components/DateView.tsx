import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import { Button } from "@/components/ui/button.tsx";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { supabase } from "@/integrations/supabase/client.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { X, Sparkles, Calendar, Clock, MapPin, CalendarCheck, Building2, Mail, Trash2, RotateCcw, AlertTriangle, MoreVertical, CheckCircle2, Store } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { useToast } from "@/hooks/use-toast.ts";
import { DateTime } from "luxon";
import {
    SCHEDULING_TIMEZONE,
    meetingDateForWeekday,
    dateTimeFromDayAndSlot,
    addCalendarDaysScheduling,
    startOfSchedulingDay,
} from "@/lib/appScheduling.ts";
import { AvailabilityPlanner, Availability, Venue, calculateLargestOverlap, findViableSlotsForAvailability, mergeAvailability, subtractAvailability, Overlap } from "@/components/AvailabilityPlanner.tsx";
import { cn } from "@/lib/utils.ts";
import { LongPressButton } from "@/components/ui/long-press-button.tsx";
import overlapExample from "@/assets/overlapExample.png";
import { VenueCard } from "@/components/VenueCard.tsx";
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

import ProfileViewDialog from "@/components/ProfileViewDialog.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { DatePreferencesSelector, DatePreferences } from "@/components/DatePreferencesSelector.tsx";

export type DateType = {
    id: string;
    date_time: string | null;
    location: string | null;
    first_possible_day: string | null;
    match_type: "relationship" | "friendship";
    user1_id: string;
    user2_id: string;
    user1_confirmed: boolean;
    user2_confirmed: boolean;
    matched_user: {
        id: string;
        first_name: string;
        last_name: string;
        phone_number: string | null;
        age: number | null;
        latitude: number | null;
        longitude: number | null;
        bio: string | null;
        additional_photos: string[] | null;
        created_at: string;
    };
    address: string | null;
    who_rescheduled: string | null;
    reschedule_reason: string | null;
    venue_options: string[] | null;
    user1_venue_vote: string | null;
    user2_venue_vote: string | null;
    confirmed_venue_id: string | null;
    user1_share_phone: boolean;
    user2_share_phone: boolean;
    timezone: string | null;
    status: "pending" | "confirmed" | "limbo" | "completed" | "cancelled" | "auto_cancelled";
    reschedule_count: number | null;
    user1_reschedule_count?: number | null;
    user2_reschedule_count?: number | null;
    activity: string | null;
};

// Locale-aware time formatter — replaces the old AM/PM-only helper.
const formatTimeForLocale = (slot: number, lng: string) => {
    const hourVal = Math.floor(slot / 2);
    const minuteVal = (slot % 2) * 30;
    const d = new Date();
    d.setHours(hourVal, minuteVal, 0, 0);
    return new Intl.DateTimeFormat(lng, { hour: "numeric", minute: "2-digit" }).format(d);
};

const ConfirmationStatusCard = ({ isConfirmed, isActive, label }: { isConfirmed: boolean; isActive: boolean; label: string }) => {
    const { t } = useTranslation("dateView");
    return (
        <Card className={cn(
            "p-4 flex flex-col items-center justify-center gap-2 transition-colors",
            isActive ? "bg-green-50 border-green-200" : "",
            isConfirmed ? "bg-green-50/50 border-green-200/50" : "bg-muted/10"
        )}>
            <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                isConfirmed ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground"
            )}>
                {isConfirmed ? <CalendarCheck className="w-5 h-5" /> : <div className="w-2 h-2 rounded-full bg-current" />}
            </div>
            <p className="font-medium text-sm">{label}</p>
            <p className="text-xs text-muted-foreground">
                {isConfirmed ? t("confirmationCard.confirmed") : t("confirmationCard.pending")}
            </p>
        </Card>
    );
};

// Helper: Check if confirmation status has changed and reload if needed
const checkConfirmationChanged = async (
    dateId: string,
    localDate: DateType,
    toast: ReturnType<typeof useToast>["toast"],
    t: ReturnType<typeof useTranslation>["t"],
): Promise<boolean> => {
    try {
        const { data, error } = await supabase
            .from("dates")
            .select("user1_confirmed, user2_confirmed")
            .eq("id", dateId)
            .single();

        if (error) throw error;

        const hasChanged =
            data.user1_confirmed !== localDate.user1_confirmed ||
            data.user2_confirmed !== localDate.user2_confirmed;

        if (hasChanged) {
            window.location.reload();
            toast({
                title: t("toast.confirmationUpdated.title"),
                description: t("toast.confirmationUpdated.description"),
                variant: "destructive",
            });
            return true;
        }
        return false;
    } catch (error: any) {
        console.error("Error checking confirmation status:", error);
        toast({
            title: t("toast.confirmationCheckError.title"),
            description: t("toast.confirmationCheckError.description"),
            variant: "destructive",
        });
        return true;
    }
};

const getMatchedUserId = (date: DateType, userId: string): string =>
    date.user1_id === userId ? date.user2_id : date.user1_id;

const isUser1 = (date: DateType, userId: string): boolean =>
    userId === date.user1_id;

const getViewerRescheduleCount = (date: DateType, viewerId: string): number => {
    const fallbackTotal = date.reschedule_count || 0;
    if (viewerId === date.user1_id) return date.user1_reschedule_count ?? fallbackTotal;
    if (viewerId === date.user2_id) return date.user2_reschedule_count ?? fallbackTotal;
    return fallbackTotal;
};

const getDateMatchType = (value: unknown): DateType["match_type"] =>
    value === "friendship" ? "friendship" : "relationship";

const getSafeDateActivity = (venueType: string | null | undefined): string | null => {
    switch (venueType) {
        case "coffee": return "coffee";
        case "restaurant": return "food";
        case "bar": return "bar";
        default: return null;
    }
};

const getLikesTable = (matchType: DateType["match_type"]) =>
    matchType === "friendship" ? "friendship_likes" : "likes";

interface DateViewProps {
    dateId: string;
    viewerId: string;
    readOnly?: boolean;
}

const loadLatestPrivateProfile = async (userId: string) => {
    const { data, error } = await supabase
        .from("private_profile_data" as any)
        .select("last_name, phone_number, latitude, longitude, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return data as any;
};

const DateView = ({ dateId, viewerId, readOnly: readOnlyProp = false }: DateViewProps) => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { t, i18n } = useTranslation("dateView");
    const lng = i18n.language;

    const [isLoading, setIsLoading] = useState(true);
    const [date, setDate] = useState<DateType | null>(null);
    const isCompleted = date?.status === "completed";
    const readOnly = readOnlyProp || isCompleted;
    const [availability, setAvailability] = useState<Availability>({});
    const [matchedAvailability, setMatchedAvailability] = useState<Availability>({});
    const [flexAvailability, setFlexAvailability] = useState<Availability>({});
    const [matchedFlex, setMatchedFlex] = useState<Availability>({});
    const [venues, setVenues] = useState<Record<string, Venue>>({});
    const [overlap, setOverlap] = useState<Overlap | null>(null);
    const [pendingAvailability, setPendingAvailability] = useState<{ dateId: string; availability: Availability } | null>(null);
    const [pendingAutoConfirm, setPendingAutoConfirm] = useState<{ dateId: string; availability: Availability; flex: Availability; newOverlap: Overlap } | null>(null);
    const [confirmingDateId, setConfirmingDateId] = useState<string | null>(null);
    const isConfirmingRef = useRef(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);
    const [cancellationReason, setCancellationReason] = useState("");
    const [rescheduleReason, setRescheduleReason] = useState("");
    const [selectedRescheduleDate, setSelectedRescheduleDate] = useState<string>("");
    const [isCancelling, setIsCancelling] = useState(false);
    const [matchDatePreferences, setMatchDatePreferences] = useState<DatePreferences | null>(null);
    const [userDatePreferences, setUserDatePreferences] = useState<DatePreferences | null>(null);
    const [venueOptionDetails, setVenueOptionDetails] = useState<Venue[]>([]);
    const [isVoting, setIsVoting] = useState(false);

    const [currentUser, setCurrentUser] = useState<any>(null);

    const resolvedDuration = (() => {
        const d1 = userDatePreferences?.duration ?? 60;
        const d2 = matchDatePreferences?.duration ?? 60;
        return Math.min(d1, d2);
    })();

    const resolvedSpending = (() => {
        const s1 = userDatePreferences?.spending ?? 20;
        const s2 = matchDatePreferences?.spending ?? 20;
        return Math.min(s1, s2);
    })();

    const resolvedVenueId = (() => {
        if (date?.confirmed_venue_id) return date.confirmed_venue_id;
        if (!date?.user1_venue_vote || !date?.user2_venue_vote) return null;
        const v1 = date.user1_venue_vote;
        const v2 = date.user2_venue_vote;
        if (v1 === v2) return v1;
        const d1 = venueOptionDetails.find(v => v.id === v1);
        const d2 = venueOptionDetails.find(v => v.id === v2);
        if (d1?.is_partner && !d2?.is_partner) return v1;
        if (d2?.is_partner && !d1?.is_partner) return v2;
        return date.venue_options?.[0] ?? v1;
    })();

    const resolvedVenueType = (() => {
        if (resolvedVenueId && venueOptionDetails.length > 0) {
            const winner = venueOptionDetails.find(v => v.id === resolvedVenueId);
            if (winner) return winner.type;
        }
        if (userDatePreferences && matchDatePreferences) {
            if (userDatePreferences.venue_type === matchDatePreferences.venue_type) return userDatePreferences.venue_type;
            const priority: Record<string, number> = { coffee: 0, bar: 1, restaurant: 2, activity: 3 };
            return priority[userDatePreferences.venue_type] <= priority[matchDatePreferences.venue_type]
                ? userDatePreferences.venue_type : matchDatePreferences.venue_type;
        }
        const prefs = userDatePreferences || matchDatePreferences;
        if (prefs) return prefs.venue_type;
        if (resolvedSpending <= 15) return "coffee" as const;
        return null;
    })();

    useEffect(() => {
        if (venueOptionDetails.length === 0) return;
        const newMap: Record<string, Venue> = {};
        if (resolvedVenueId) {
            const winner = venueOptionDetails.find(v => v.id === resolvedVenueId);
            if (winner) newMap[winner.type] = winner;
        } else {
            for (const v of venueOptionDetails) {
                if (!newMap[v.type]) newMap[v.type] = v;
            }
        }
        setVenues(newMap);
    }, [resolvedVenueId, venueOptionDetails]);

    // Firm-first overlap (B2): prefer where BOTH are firmly free; only fall back
    // to "could-flex" times when there's no firm match. Engine is untouched —
    // we just call it twice with different inputs.
    const bestOverlap = (
        firm: Availability,
        flex: Availability,
        matchUnion: Availability,
        matchFlex: Availability,
        venuesArg: Record<string, Venue>,
        venueType: string | null | undefined,
        duration: number,
        fpd: string | null,
        spending: number | null,
    ): Overlap | null => {
        const matchFirm = subtractAvailability(matchUnion, matchFlex);
        return (
            calculateLargestOverlap(firm, matchFirm, venuesArg, venueType, duration, fpd, spending) ??
            calculateLargestOverlap(mergeAvailability(firm, flex), matchUnion, venuesArg, venueType, duration, fpd, spending)
        );
    };

    useEffect(() => {
        if (date) {
            setOverlap(bestOverlap(availability, flexAvailability, matchedAvailability, matchedFlex, venues, resolvedVenueType, resolvedDuration, date.first_possible_day, resolvedSpending));
        }
    }, [availability, flexAvailability, matchedAvailability, matchedFlex, venues, date, resolvedVenueType, resolvedDuration, resolvedSpending]);

    useEffect(() => {
        if (!date?.user1_venue_vote || !date?.user2_venue_vote) return;
        if (!resolvedVenueId || !date || readOnly || date.date_time || pendingAutoConfirm) return;
        if (venueOptionDetails.length === 0) return;

        const winnerVenue = venueOptionDetails.find(v => v.id === resolvedVenueId);
        if (!winnerVenue) return;

        const freshOverlap = bestOverlap(
            availability, flexAvailability, matchedAvailability, matchedFlex,
            { [winnerVenue.type]: winnerVenue },
            winnerVenue.type,
            resolvedDuration, date.first_possible_day, resolvedSpending,
        );
        if (!freshOverlap) return;

        void confirmDate(date.id, freshOverlap, resolvedVenueId);
    }, [resolvedVenueId, date?.user1_venue_vote, date?.user2_venue_vote, venueOptionDetails]);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);

            const [{ data: userProfile }, userPrivate] = await Promise.all([
                supabase.from('profiles').select('first_name').eq('id', viewerId).maybeSingle(),
                loadLatestPrivateProfile(viewerId),
            ]);

            setCurrentUser(userProfile ? { ...userProfile, last_name: userPrivate?.last_name ?? null, phone_number: userPrivate?.phone_number ?? null } : null);

            if (dateId) {
                await loadDate(viewerId, dateId);
            }
            setIsLoading(false);
        };

        loadData();
    }, [dateId, viewerId]);

    const loadDate = async (currentUserId: string, dateId: string) => {
        try {
            const { data: dateData, error: dateError } = await supabase
                .from("dates").select("*").eq("id", dateId).single();

            if (dateError) throw dateError;

            if (!dateData) {
                toast({ title: t("toast.dateNotFound.title"), description: t("toast.dateNotFound.description"), variant: "destructive" });
                return;
            }

            if (!readOnly && dateData.user1_id !== currentUserId && dateData.user2_id !== currentUserId) {
                toast({ title: t("toast.unauthorized.title"), description: t("toast.unauthorized.description"), variant: "destructive" });
                return;
            }

            const venueOptionIds: string[] = dateData.venue_options ?? [];
            let venueOptionsFetched: Venue[] = [];

            if (venueOptionIds.length > 0) {
                const { data: optionVenues, error: optVenuesError } = await supabase
                    .from("venues").select("*").in("id", venueOptionIds);
                if (optVenuesError) throw optVenuesError;
                venueOptionsFetched = (optionVenues ?? []).map((v: any) => ({
                    ...v, hours: v.hours as Venue["hours"],
                })) as Venue[];
                venueOptionsFetched.sort(
                    (a, b) => venueOptionIds.indexOf(a.id) - venueOptionIds.indexOf(b.id)
                );
                setVenueOptionDetails(venueOptionsFetched);
            } else {
                setVenueOptionDetails([]);
            }

            if (venueOptionsFetched.length > 0) {
                const venuesMap: Record<string, Venue> = {};
                for (const v of venueOptionsFetched) {
                    if (!venuesMap[v.type]) venuesMap[v.type] = v;
                }
                setVenues(venuesMap);
            } else {
                const { data: venuesData, error: venuesError } = await supabase
                    .from("venues").select("*");
                if (venuesError) throw venuesError;

                const venuesMap: Record<string, Venue> = {};
                venuesData?.forEach((v: any) => {
                    const nextVenue = { ...v, hours: v.hours as Venue["hours"] } as Venue;
                    const existingVenue = venuesMap[v.type];
                    if (!existingVenue) { venuesMap[v.type] = nextVenue; return; }
                    const mergedHours: Venue["hours"] = { ...existingVenue.hours };
                    for (const [day, hours] of Object.entries(nextVenue.hours || {})) {
                        const existingHours = mergedHours[day];
                        if (!hours) continue;
                        if (!existingHours) { mergedHours[day] = hours; continue; }
                        mergedHours[day] = {
                            start: Math.min(existingHours.start, hours.start),
                            end: Math.max(existingHours.end, hours.end),
                        };
                    }
                    const existingPrice = existingVenue.price_range ?? Number.MAX_SAFE_INTEGER;
                    const nextPrice = nextVenue.price_range ?? Number.MAX_SAFE_INTEGER;
                    venuesMap[v.type] = nextPrice <= existingPrice
                        ? { ...nextVenue, hours: mergedHours }
                        : { ...existingVenue, hours: mergedHours };
                });
                setVenues(venuesMap);
            }

            const matchedUserId = dateData.user1_id === currentUserId ? dateData.user2_id : dateData.user1_id;

            const [{ data: profileData, error: profileError }, matchedPrivate] = await Promise.all([
                supabase
                    .from("profiles")
                    .select("id, first_name, age, bio, additional_photos, created_at")
                    .eq("id", matchedUserId)
                    .maybeSingle(),
                loadLatestPrivateProfile(matchedUserId),
            ]);

            if (profileError) throw profileError;

            const dateObj: DateType = {
                id: dateData.id,
                date_time: dateData.date_time,
                location: dateData.location,
                first_possible_day: dateData.first_possible_day,
                match_type: getDateMatchType(dateData.match_type),
                user1_id: dateData.user1_id,
                user2_id: dateData.user2_id,
                user1_confirmed: dateData.user1_confirmed,
                user2_confirmed: dateData.user2_confirmed,
                matched_user: profileData ? {
                    ...profileData,
                    last_name: matchedPrivate?.last_name ?? "",
                    phone_number: matchedPrivate?.phone_number ?? null,
                    latitude: matchedPrivate?.latitude ?? null,
                    longitude: matchedPrivate?.longitude ?? null,
                } : {
                    id: matchedUserId,
                    first_name: "",
                    last_name: "",
                    phone_number: null,
                    age: null,
                    latitude: null,
                    longitude: null,
                    bio: null,
                    additional_photos: null,
                    created_at: new Date().toISOString(),
                },
                address: dateData.address,
                who_rescheduled: dateData.who_rescheduled,
                reschedule_reason: dateData.reschedule_reason,
                venue_options: dateData.venue_options,
                user1_venue_vote: dateData.user1_venue_vote ?? null,
                user2_venue_vote: dateData.user2_venue_vote ?? null,
                confirmed_venue_id: dateData.confirmed_venue_id ?? null,
                user1_share_phone: dateData.user1_share_phone,
                user2_share_phone: dateData.user2_share_phone,
                timezone: dateData.timezone,
                status: dateData.status,
                reschedule_count: dateData.reschedule_count,
                user1_reschedule_count: dateData.user1_reschedule_count ?? null,
                user2_reschedule_count: dateData.user2_reschedule_count ?? null,
                activity: dateData.activity,
            };

            setDate(dateObj);

            const isUser1Local = currentUserId === dateData.user1_id;
            const myUnion = (isUser1Local ? dateData.user1_availability : dateData.user2_availability) as Availability || {};
            const matchedUnion = (isUser1Local ? dateData.user2_availability : dateData.user1_availability) as Availability || {};
            const myFlex = (isUser1Local ? (dateData as any).user1_flex_slots : (dateData as any).user2_flex_slots) as Availability || {};
            const matchedFlexLocal = (isUser1Local ? (dateData as any).user2_flex_slots : (dateData as any).user1_flex_slots) as Availability || {};
            setAvailability(subtractAvailability(myUnion, myFlex)); // firm = union minus flex
            setFlexAvailability(myFlex);
            setMatchedAvailability(matchedUnion);
            setMatchedFlex(matchedFlexLocal);

            const { data: matchPrefsData } = await supabase
                .from("date_activity_preferences")
                .select("preferences")
                .eq("date_id", dateId)
                .eq("user_id", matchedUserId)
                .maybeSingle();

            if (matchPrefsData?.preferences && typeof matchPrefsData.preferences === "object") {
                const prefs = matchPrefsData.preferences as Record<string, unknown>;
                setMatchDatePreferences({
                    duration: typeof prefs.duration === "number" ? prefs.duration : 60,
                    spending: typeof prefs.spending === "number" ? prefs.spending : 20,
                    venue_type: ["coffee", "bar", "restaurant", "activity"].includes(prefs.venue_type as string)
                        ? (prefs.venue_type as DatePreferences["venue_type"])
                        : "coffee",
                });
            }

        } catch (error: any) {
            console.error("Error loading date:", error);
            toast({
                title: t("toast.errorLoading.title"),
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const handleVenueVote = async (venueId: string) => {
        if (!date || !viewerId || readOnly || isVoting) return;
        const isUser1Voter = date.user1_id === viewerId;
        const voteField = isUser1Voter ? "user1_venue_vote" : "user2_venue_vote";
        const currentVote = isUser1Voter ? date.user1_venue_vote : date.user2_venue_vote;
        const newVote = currentVote === venueId ? null : venueId;

        setDate(prev => prev ? { ...prev, [voteField]: newVote } : null);
        setIsVoting(true);
        try {
            const partnerVote = isUser1Voter ? date.user2_venue_vote : date.user1_venue_vote;
            const updates: Record<string, any> = { [voteField]: newVote };

            if (newVote && partnerVote) {
                let winner = newVote === partnerVote ? newVote : null;
                if (!winner) {
                    const myVenue = venueOptionDetails.find(v => v.id === newVote);
                    const partnerVenue = venueOptionDetails.find(v => v.id === partnerVote);
                    if (myVenue?.is_partner && !partnerVenue?.is_partner) winner = newVote;
                    else if (partnerVenue?.is_partner && !myVenue?.is_partner) winner = partnerVote;
                    else winner = date.venue_options?.[0] ?? newVote;
                }
                updates.confirmed_venue_id = winner;
                setDate(prev => prev ? { ...prev, confirmed_venue_id: winner } : null);

                const winnerVenue = venueOptionDetails.find(v => v.id === winner);
                if (winnerVenue) {
                    const newOverlap = bestOverlap(
                        availability, flexAvailability, matchedAvailability, matchedFlex,
                        { [winnerVenue.type]: winnerVenue },
                        winnerVenue.type,
                        resolvedDuration, date.first_possible_day, resolvedSpending,
                    );
                    if (newOverlap) {
                        const { error } = await supabase.from("dates").update(updates).eq("id", date.id);
                        if (error) throw error;
                        await confirmDate(date.id, newOverlap, winner);
                        return;
                    }
                }
            } else if (!newVote) {
                updates.confirmed_venue_id = null;
                setDate(prev => prev ? { ...prev, confirmed_venue_id: null } : null);
            }

            const { error } = await supabase
                .from("dates").update(updates).eq("id", date.id);
            if (error) throw error;
        } catch (err: any) {
            setDate(prev => prev ? { ...prev, [voteField]: currentVote } : null);
            toast({ title: t("toast.voteError.title"), description: t("toast.voteError.description"), variant: "destructive" });
        } finally {
            setIsVoting(false);
        }
    };

    const refreshVenueOptions = async (dateId: string): Promise<boolean> => {
        try {
            const { data, error } = await supabase.functions.invoke('refresh-venue-options', {
                body: { dateId },
            });
            if (error || !data?.success) return false;

            const newDetails: Venue[] = (data.venueDetails ?? []).map((v: any) => ({
                ...v, hours: v.hours as Venue["hours"],
            }));
            if (newDetails.length > 0) {
                setVenueOptionDetails(newDetails);
                const newVenuesMap: Record<string, Venue> = {};
                for (const v of newDetails) {
                    if (!newVenuesMap[v.type]) newVenuesMap[v.type] = v;
                }
                setVenues(newVenuesMap);
                setDate(prev => prev ? { ...prev, venue_options: data.venueOptions } : null);
                return true;
            }
            return false;
        } catch (e) {
            console.error("Failed to refresh venue options:", e);
            return false;
        }
    };

    const saveAvailabilityToDb = async (
        dateId: string,
        newAvailability: Availability,
        newFlex: Availability,
        triggerVenueRefresh = false,
        preservePendingDialog = false,
    ): Promise<{ ok: boolean; venuesFound: boolean }> => {
        if (!viewerId || !date || readOnly) return { ok: false, venuesFound: false };

        if (await checkConfirmationChanged(dateId, date, toast, t)) return { ok: false, venuesFound: false };

        setAvailability(newAvailability);
        setFlexAvailability(newFlex);

        const isU1 = isUser1(date, viewerId);
        const updateField = isU1 ? "user1_availability" : "user2_availability";
        const flexField = isU1 ? "user1_flex_slots" : "user2_flex_slots";
        // The availability column keeps the FULL set (firm + flex) so the venue
        // engine is unchanged; flex_slots marks which of those are soft.
        const union = mergeAvailability(newAvailability, newFlex);

        const { error } = await supabase
            .from("dates").update({ [updateField]: union, [flexField]: newFlex }).eq("id", dateId);

        if (error) {
            console.error("Error saving availability:", error);
            toast({
                title: t("toast.errorSavingAvailability.title"),
                description: error.message,
                variant: "destructive",
            });
            setPendingAvailability(null);
            return { ok: false, venuesFound: false };
        } else {
            toast({
                title: t("toast.availabilitySaved.title"),
                description: t("toast.availabilitySaved.description"),
            });
            if (!preservePendingDialog) setPendingAvailability(null);
            if (triggerVenueRefresh) {
                const venuesFound = await refreshVenueOptions(dateId);
                return { ok: true, venuesFound };
            }
            return { ok: true, venuesFound: false };
        }
    };

    const handleSaveAvailability = async (dateId: string, newAvailability: Availability, newFlex: Availability) => {
        if (readOnly) return;

        const hasMatchedAvail = Object.values(matchedAvailability).some(slots => slots.length > 0);
        const newOverlap = bestOverlap(newAvailability, newFlex, matchedAvailability, matchedFlex, venues, resolvedVenueType, resolvedDuration, date.first_possible_day, resolvedSpending);

        if (hasMatchedAvail && !newOverlap) {
            setPendingAvailability({ dateId, availability: newAvailability });
        } else if (newOverlap) {
            const wouldChange = !date.date_time ||
                !overlap ||
                overlap.startDay !== newOverlap.startDay ||
                overlap.startSlot !== newOverlap.startSlot ||
                overlap.endSlot !== newOverlap.endSlot ||
                overlap.venue !== newOverlap.venue ||
                (date.activity && date.activity !== getSafeDateActivity(newOverlap.venue));

            if (wouldChange) {
                const hasVenueOptions = venueOptionDetails.length >= 2;
                const votingPending = hasVenueOptions && !resolvedVenueId;
                const needsVenueSelection = !hasVenueOptions && hasMatchedAvail;

                if (votingPending || needsVenueSelection) {
                    const { ok, venuesFound } = await saveAvailabilityToDb(dateId, newAvailability, newFlex, true);
                    if (!ok) return;
                    if (venuesFound && !date.date_time) {
                        const matchedUserId = getMatchedUserId(date, viewerId);
                        const myName = currentUser?.first_name ?? "";
                        const partnerName = date.matched_user.first_name;
                        await supabase.functions.invoke('send-user-emails', {
                            body: {
                                dateId,
                                emailType: 'venue_vote',
                                recipients: [
                                    { userId: viewerId, customData: { partnerName } },
                                    { userId: matchedUserId, customData: { partnerName: myName } },
                                ],
                            },
                        });
                        toast({
                            title: t("toast.availabilitySavedVote.title"),
                            description: t("toast.availabilitySavedVote.description"),
                        });
                    } else if (!venuesFound) {
                        const matchedUserId = getMatchedUserId(date, viewerId);
                        const myName = currentUser?.first_name ?? "";
                        const partnerName = date.matched_user.first_name;
                        await supabase.functions.invoke('send-user-emails', {
                            body: {
                                dateId,
                                emailType: 'no_overlap',
                                recipients: [
                                    { userId: viewerId, customData: { partnerName } },
                                    { userId: matchedUserId, customData: { partnerName: myName } },
                                ],
                            },
                        });
                        toast({
                            title: t("toast.noVenueAvailable.title"),
                            description: t("toast.noVenueAvailable.description"),
                            variant: "destructive",
                        });
                    }
                } else {
                    setPendingAutoConfirm({ dateId, availability: newAvailability, flex: newFlex, newOverlap });
                }
            } else {
                await saveAvailabilityToDb(dateId, newAvailability, newFlex, hasMatchedAvail);
            }
        } else {
            await saveAvailabilityToDb(dateId, newAvailability, hasMatchedAvail);
        }
    };

    // B1 — no-overlap recovery: surface the partner's own bookable times so the
    // user can one-tap add a matching slot (which creates an overlap) instead of
    // dead-ending. Empty if the partner hasn't entered availability yet.
    const partnerHasAvailability = Object.values(matchedAvailability).some((s) => s.length > 0);
    const partnerSuggestions: Overlap[] = partnerHasAvailability
        ? findViableSlotsForAvailability(matchedAvailability, venues, resolvedDuration, date?.first_possible_day, 4)
        : [];

    const handleAddSuggestedSlot = async (suggestion: Overlap) => {
        if (!date) return;
        const dayKey = suggestion.startDay.toString();
        const merged: Availability = { ...availability };
        const slots = new Set(merged[dayKey] || []);
        for (let slot = suggestion.startSlot; slot <= suggestion.endSlot; slot++) slots.add(slot);
        merged[dayKey] = Array.from(slots).sort((a, b) => a - b);
        setAvailability(merged);
        setPendingAvailability(null);
        await handleSaveAvailability(date.id, merged, flexAvailability);
    };

    const confirmDate = async (dateId: string, newOverlap: Overlap, confirmedVenueId?: string | null) => {
        if (!viewerId || !date) return;
        if (isConfirmingRef.current) return;
        isConfirmingRef.current = true;
        setConfirmingDateId(dateId);

        const finalDate = dateTimeFromDayAndSlot(date.first_possible_day, newOverlap.startDay, newOverlap.startSlot);

        const resolvedId = confirmedVenueId ?? resolvedVenueId;
        const venueData = (resolvedId ? venueOptionDetails.find(v => v.id === resolvedId) : null)
            ?? venues[newOverlap.venue];
        const updates = {
            user1_confirmed: true,
            user2_confirmed: true,
            status: "confirmed" as const,
            location: venueData?.name || t("autoConfirmDialog.tbd"),
            address: venueData?.address || null,
            date_time: finalDate.toISOString(),
            timezone: venueData?.timezone || "Europe/Zurich",
            activity: getSafeDateActivity(newOverlap.venue),
            ...(resolvedId ? { confirmed_venue_id: resolvedId } : {}),
        };

        setDate(prev => prev ? ({ ...prev, ...updates }) : null);

        try {
            const { error } = await supabase.from("dates").update(updates).eq("id", dateId);
            if (error) throw error;

            if (currentUser && updates.date_time) {
                const matchedUserId = getMatchedUserId(date, viewerId);
                const matchedUserName = date.matched_user.first_name;
                const displayZone = updates.timezone || SCHEDULING_TIMEZONE;
                const dt = DateTime.fromISO(updates.date_time, { zone: "utc" }).setZone(displayZone);
                const dateDetails = {
                    date: dt.toFormat("MMMM d"),
                    weekday: dt.toFormat("EEEE"),
                    time: dt.toFormat("h:mm a"),
                    locationName: updates.location,
                    locationAddress: updates.address,
                };
                await supabase.functions.invoke('send-user-emails', {
                    body: {
                        dateId,
                        emailType: 'date_confirmed_details',
                        recipients: [
                            { userId: viewerId, customData: { partnerName: matchedUserName, dateDetails } },
                            { userId: matchedUserId, customData: { partnerName: currentUser.first_name, dateDetails } },
                        ],
                    },
                });
            }

            toast({ title: t("toast.dateConfirmedAuto.title"), description: t("toast.dateConfirmedAuto.description") });
        } catch (error: any) {
            console.error("Error confirming date:", error);
            toast({ title: t("toast.errorSettingDate.title"), description: t("toast.errorSettingDate.description"), variant: "destructive" });
        } finally {
            setConfirmingDateId(null);
            isConfirmingRef.current = false;
        }
    };

    const handleAutoConfirm = async () => {
        if (!pendingAutoConfirm || !viewerId || readOnly || !date) return;

        const { dateId, availability: newAvailability, flex: newFlex, newOverlap } = pendingAutoConfirm;

        await saveAvailabilityToDb(dateId, newAvailability, newFlex);
        await confirmDate(dateId, newOverlap);

        setPendingAutoConfirm(null);
    };

    const handleCancelDate = async () => {
        if (!date || !viewerId || readOnly) return;
        let reason = cancellationReason;
        if (!reason.trim()) {
            reason = t("cancelDialog.noReason");
        }

        try {
            setIsCancelling(true);
            const cancelledAt = new Date().toISOString();
            const feedbackField = isUser1(date, viewerId) ? "user1_feedback" : "user2_feedback";
            const matchType = getDateMatchType(date.match_type);
            const likesTable = getLikesTable(matchType);

            const { error } = await supabase
                .from("dates")
                .update({
                    status: "cancelled",
                    completed_or_cancelled_at: cancelledAt,
                    [feedbackField]: reason
                })
                .eq("id", date.id);

            if (error) throw error;

            const matchedUserId = getMatchedUserId(date, viewerId);

            const { data: currentUserProfile } = await supabase
                .from('profiles').select('first_name').eq('id', viewerId).single();

            if (currentUserProfile) {
                const { error: emailError } = await supabase.functions.invoke('send-user-emails', {
                    body: {
                        dateId: date.id,
                        emailType: 'date_cancelled',
                        recipients: [
                            {
                                userId: matchedUserId,
                                customData: {
                                    partnerName: currentUserProfile.first_name,
                                    cancellationReason: reason
                                }
                            }
                        ]
                    }
                });

                if (emailError) console.error("Error sending cancellation email:", emailError);
            }

            const { error: deleteMatchError } = await supabase
                .from("matches")
                .delete()
                .or(`and(user_id.eq.${date.user1_id},matched_user_id.eq.${date.user2_id}),and(user_id.eq.${date.user2_id},matched_user_id.eq.${date.user1_id})`)
                .eq("match_type", matchType);

            if (deleteMatchError) console.error(deleteMatchError);

            const { error: deleteLikesError } = await supabase
                .from(likesTable)
                .delete()
                .or(`and(user_id.eq.${date.user1_id},liked_user_id.eq.${date.user2_id}),and(user_id.eq.${date.user2_id},liked_user_id.eq.${date.user1_id})`);

            if (deleteLikesError) console.error(deleteLikesError);

            toast({
                title: t("toast.dateCancelled.title"),
                description: t("toast.dateCancelled.description"),
            });
            setIsCancelDialogOpen(false);
            setCancellationReason("");
            navigate("/dates");

        } catch (error: any) {
            console.error("Error cancelling date:", error);
            toast({
                title: t("toast.errorCancelling.title"),
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsCancelling(false);
        }
    };

    const handleRescheduleDate = async () => {
        if (!date || !viewerId || !date.first_possible_day || readOnly) return;

        let newStartStr = selectedRescheduleDate;
        if (!newStartStr) newStartStr = addCalendarDaysScheduling(date.first_possible_day, 7);

        try {
            const newFirstPossibleDay = newStartStr;
            const newTotalRescheduleCount = (date.reschedule_count || 0) + 1;
            const viewerPrevCount = getViewerRescheduleCount(date, viewerId);
            const viewerNewCount = viewerPrevCount + 1;

            setDate(prev => prev ? ({
                ...prev,
                first_possible_day: newFirstPossibleDay,
                user1_confirmed: false,
                user2_confirmed: false,
                location: null,
                address: null,
                date_time: null,
                who_rescheduled: viewerId,
                status: 'pending',
                reschedule_reason: rescheduleReason,
                reschedule_count: newTotalRescheduleCount,
                user1_reschedule_count: viewerId === prev.user1_id ? viewerNewCount : prev.user1_reschedule_count ?? prev.reschedule_count ?? 0,
                user2_reschedule_count: viewerId === prev.user2_id ? viewerNewCount : prev.user2_reschedule_count ?? prev.reschedule_count ?? 0,
                venue_options: null,
                user1_venue_vote: null,
                user2_venue_vote: null,
                confirmed_venue_id: null,
            }) : null);
            setAvailability({});
            setMatchedAvailability({});
            setFlexAvailability({});
            setMatchedFlex({});
            setOverlap(null);
            setVenueOptionDetails([]);

            const { error: dateError } = await supabase
                .from("dates")
                .update({
                    first_possible_day: newFirstPossibleDay,
                    user1_confirmed: false,
                    user2_confirmed: false,
                    location: null,
                    address: null,
                    date_time: null,
                    who_rescheduled: viewerId,
                    status: 'pending',
                    reschedule_reason: rescheduleReason,
                    reschedule_count: newTotalRescheduleCount,
                    user1_reschedule_count: viewerId === date.user1_id ? viewerNewCount : (date.user1_reschedule_count ?? date.reschedule_count ?? 0),
                    user2_reschedule_count: viewerId === date.user2_id ? viewerNewCount : (date.user2_reschedule_count ?? date.reschedule_count ?? 0),
                    venue_options: null,
                    user1_venue_vote: null,
                    user2_venue_vote: null,
                    confirmed_venue_id: null,
                    user1_availability: {},
                    user2_availability: {},
                })
                .eq("id", date.id);

            if (dateError) throw dateError;

            if (currentUser && date && viewerId) {
                const matchedUserId = getMatchedUserId(date, viewerId);
                await supabase.functions.invoke('send-user-emails', {
                    body: {
                        dateId: date.id,
                        emailType: 'date_rescheduled',
                        recipients: [
                            {
                                userId: matchedUserId,
                                customData: {
                                    partnerName: currentUser.first_name,
                                    rescheduleReason
                                }
                            }
                        ]
                    }
                });
            }

            toast({
                title: t("toast.dateRescheduled.title"),
                description: t("toast.dateRescheduled.description"),
            });
            setIsRescheduleDialogOpen(false);

        } catch (error: any) {
            console.error("Error rescheduling date:", error);
            toast({
                title: t("toast.errorRescheduling.title"),
                description: error.message,
                variant: "destructive",
            });
            loadDate(viewerId, date.id);
        }
    };

    const handleConfirmDate = async (dateId: string) => {
        if (!viewerId || !date || !overlap || readOnly) return;

        if (await checkConfirmationChanged(dateId, date, toast, t)) return;

        const updateField = isUser1(date, viewerId) ? "user1_confirmed" : "user2_confirmed";
        const bothUsersConfirmed = isUser1(date, viewerId) ? date.user2_confirmed : date.user1_confirmed;

        let updates: any = { [updateField]: true };
        let optimisticUpdates: any = { [updateField]: true };

        if (bothUsersConfirmed && date.first_possible_day) {
            const finalDate = dateTimeFromDayAndSlot(date.first_possible_day, overlap.startDay, overlap.startSlot);
            const selectedVenue = venues[overlap.venue];
            const safeActivity = getSafeDateActivity(overlap.venue);

            updates.date_time = finalDate.toISOString();
            updates.location = selectedVenue?.name;
            updates.address = selectedVenue?.address;
            updates.activity = safeActivity;
            updates.status = "confirmed";
            updates.timezone = selectedVenue?.timezone || "Europe/Zurich";

            optimisticUpdates.date_time = finalDate.toISOString();
            optimisticUpdates.location = selectedVenue?.name;
            optimisticUpdates.address = selectedVenue?.address;
            optimisticUpdates.activity = safeActivity;
            optimisticUpdates.status = "confirmed";
            optimisticUpdates.timezone = selectedVenue?.timezone || "Europe/Zurich";
        }

        setDate(prev => prev ? ({ ...prev, ...optimisticUpdates }) : null);

        try {
            const { error } = await supabase.from("dates").update(updates).eq("id", dateId);
            if (error) throw error;

            if (!bothUsersConfirmed && currentUser) {
                const matchedUserId = getMatchedUserId(date, viewerId);
                await supabase.functions.invoke('send-user-emails', {
                    body: {
                        dateId,
                        emailType: 'first_confirm',
                        recipients: [
                            { userId: matchedUserId, customData: { partnerName: currentUser.first_name } }
                        ]
                    }
                });
            } else if (bothUsersConfirmed && currentUser && updates.date_time) {
                const matchedUserId = getMatchedUserId(date, viewerId);
                const matchedUserName = date.matched_user.first_name;

                const displayZone = updates.timezone || SCHEDULING_TIMEZONE;
                const dt = DateTime.fromISO(updates.date_time, { zone: "utc" }).setZone(displayZone);
                const dateString = dt.toFormat("MMMM d");
                const weekday = dt.toFormat("EEEE");
                const timeString = dt.toFormat("h:mm a");

                const dateDetails = {
                    date: dateString,
                    weekday: weekday,
                    time: timeString,
                    locationName: updates.location,
                    locationAddress: updates.address
                };

                await supabase.functions.invoke('send-user-emails', {
                    body: {
                        dateId,
                        emailType: 'date_confirmed_details',
                        recipients: [
                            { userId: viewerId, customData: { partnerName: matchedUserName, dateDetails } },
                            { userId: matchedUserId, customData: { partnerName: currentUser.first_name, dateDetails } }
                        ]
                    }
                });
            }

            toast({
                title: t("toast.dateConfirmedManual.title"),
                description: t("toast.dateConfirmedManual.description"),
            });
        } catch (error: any) {
            console.error("Error confirming date:", error);
            toast({
                title: t("toast.errorConfirming.title"),
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const handleTogglePhoneShare = async (checked: boolean) => {
        if (!date || !viewerId || readOnly) return;

        // Don't let someone "share" a number they don't have — the partner would
        // silently receive nothing in the reminder email.
        if (checked && !currentUser?.phone_number) {
            toast({
                title: t("toast.phoneMissing.title"),
                description: t("toast.phoneMissing.description"),
                variant: "destructive",
            });
            return;
        }

        const field = isUser1(date, viewerId) ? "user1_share_phone" : "user2_share_phone";
        setDate(prev => prev ? ({ ...prev, [field]: checked }) : null);

        const { error } = await supabase
            .from("dates").update({ [field]: checked }).eq("id", date.id);

        if (error) {
            console.error("Error updating phone share preference:", error);
            toast({
                title: t("toast.errorPreference.title"),
                description: t("toast.errorPreference.description"),
                variant: "destructive",
            });
            setDate(prev => prev ? ({ ...prev, [field]: !checked }) : null);
        }
        toast({
            title: t("toast.phoneShareUpdated.title"),
            description: t("toast.phoneShareUpdated.description"),
        });
    };

    const getCalendarDate = (startDay: number) => {
        const meetingDate = meetingDateForWeekday(date.first_possible_day, startDay);
        return DateTime.fromJSDate(meetingDate).setZone(SCHEDULING_TIMEZONE).setLocale(lng).toFormat("EEEE, MMM d");
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Sparkles className="w-12 h-12 text-primary animate-pulse" />
            </div>
        );
    }

    if (!date) {
        return (
            <div className="text-center p-8 text-white">{t("notFound")}</div>
        );
    }

    const dateMatchType = getDateMatchType(date.match_type);
    const isFriendshipDate = dateMatchType === "friendship";

    const confirmedTz = date.timezone || SCHEDULING_TIMEZONE;
    const confirmedStart = date.date_time
        ? DateTime.fromISO(date.date_time, { zone: "utc" }).setZone(confirmedTz).setLocale(lng)
        : null;
    const confirmedEnd =
        confirmedStart && resolvedDuration ? confirmedStart.plus({ minutes: resolvedDuration }) : null;

    const viewerRescheduleCount = getViewerRescheduleCount(date, viewerId);
    const rescheduleTitleKey =
        viewerRescheduleCount >= 2 ? "rescheduleDialog.titleLimit"
            : viewerRescheduleCount > 0 ? "rescheduleDialog.titleAgain"
                : "rescheduleDialog.title";

    return (
        <>
            <ProfileViewDialog
                profile={date.matched_user}
                open={isProfileOpen}
                onOpenChange={setIsProfileOpen}
            />

            {readOnly && (
                <div className={cn(
                    "border-l-4 p-4 mx-4 md:mx-0 mb-4 rounded-lg shadow-xs",
                    isCompleted ? "bg-green-100 border-green-500 text-green-700" : "bg-amber-100 border-amber-500 text-amber-700"
                )} role="alert">
                    <p className="font-bold">
                        {isCompleted ? t("banner.completed.title") : t("banner.readOnly.title")}
                    </p>
                    <p>
                        {isCompleted ? (
                            t("banner.completed.description")
                        ) : (
                            <Trans
                                i18nKey="banner.readOnly.description"
                                t={t}
                                values={{
                                    firstName: currentUser?.first_name ?? "",
                                    lastName: currentUser?.last_name ?? "",
                                }}
                                components={{ strong: <strong /> }}
                            />
                        )}
                    </p>
                </div>
            )}

            <Card className="shadow-lg border-border/50">
                <CardHeader>
                    <CardTitle className="flex justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Avatar className="h-16 w-16 border-2 border-primary/20 cursor-pointer" onClick={() => setIsProfileOpen(true)}>
                                <AvatarImage src={date.matched_user.additional_photos?.[0]} className="object-cover" />
                                <AvatarFallback>{date.matched_user.first_name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-2xl">
                                    {t("header.title", { name: date.matched_user.first_name })}
                                </span>
                                {isFriendshipDate && (
                                    <span className="text-xs font-semibold uppercase px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                                        {t("header.friendshipBadge")}
                                    </span>
                                )}
                            </div>
                        </div>

                        {!readOnly && (
                            <div className="flex gap-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="text-muted-foreground p-2">
                                            <MoreVertical className="w-5 h-5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuItem onClick={() => setIsRescheduleDialogOpen(true)} className="cursor-pointer">
                                            <RotateCcw className="w-4 h-4 mr-2" />
                                            <span>{t("menu.reschedule")}</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setIsCancelDialogOpen(true)} className="text-destructive focus:text-destructive cursor-pointer">
                                            <X className="w-4 h-4 mr-2" />
                                            <span>{t("menu.cancel")}</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>{t("cancelDialog.title")}</AlertDialogTitle>
                                            <AlertDialogDescription className="space-y-4">
                                                <p>
                                                    <Trans i18nKey="cancelDialog.intro" t={t} components={{ strong: <strong /> }} />
                                                </p>
                                                <div className="space-y-2">
                                                    <p className="text-sm font-medium text-foreground">{t("cancelDialog.reasonLabel")}</p>
                                                    <Textarea
                                                        placeholder={t("cancelDialog.reasonPlaceholder")}
                                                        value={cancellationReason}
                                                        onChange={(e) => setCancellationReason(e.target.value)}
                                                        className="bg-background"
                                                    />
                                                </div>
                                                <p>{t("cancelDialog.outro")}</p>
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>{t("cancelDialog.back")}</AlertDialogCancel>
                                            <LongPressButton
                                                onLongPress={handleCancelDate}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                progressColor="bg-red-700/60"
                                                disabled={isCancelling}
                                            >
                                                {isCancelling ? t("cancelDialog.cancelling") : t("cancelDialog.confirm")}
                                                {!isCancelling && <Trash2 className="ml-2 w-4 h-4" />}
                                            </LongPressButton>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>

                                <AlertDialog open={isRescheduleDialogOpen} onOpenChange={(open) => {
                                    setIsRescheduleDialogOpen(open);
                                    if (open && date?.first_possible_day) {
                                        setSelectedRescheduleDate(addCalendarDaysScheduling(date.first_possible_day, 7));
                                    }
                                }}>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>{t(rescheduleTitleKey)}</AlertDialogTitle>
                                            <AlertDialogDescription className="space-y-4">
                                                {viewerRescheduleCount >= 2 ? (
                                                    <div className="space-y-4">
                                                        <p className="text-base">{t("rescheduleDialog.limit.intro")}</p>
                                                        {date.who_rescheduled && (
                                                            <p className="text-sm text-muted-foreground">
                                                                <Trans
                                                                    i18nKey="rescheduleDialog.limit.lastBy"
                                                                    t={t}
                                                                    values={{
                                                                        who: date.who_rescheduled === viewerId
                                                                            ? t("rescheduleDialog.limit.you")
                                                                            : date.matched_user.first_name,
                                                                    }}
                                                                    components={{ strong: <strong /> }}
                                                                />
                                                            </p>
                                                        )}
                                                        {(date as any).reschedule_reason && (
                                                            <div className="bg-muted p-3 rounded-md italic text-muted-foreground">
                                                                "{(date as any).reschedule_reason}"
                                                            </div>
                                                        )}
                                                        <p className="text-sm text-muted-foreground">
                                                            {t("rescheduleDialog.limit.info")}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {viewerRescheduleCount > 0 && (
                                                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-sm mb-4">
                                                                <p className="font-bold">{t("rescheduleDialog.headsUp.label")}</p>
                                                                <p>{t("rescheduleDialog.headsUp.body")}</p>
                                                            </div>
                                                        )}
                                                        <p>{t("rescheduleDialog.confirmIntro")}</p>
                                                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 text-sm">
                                                            <p className="font-bold flex items-center gap-2">
                                                                <AlertTriangle className="w-4 h-4" />
                                                                {t("rescheduleDialog.warning.label")}
                                                            </p>
                                                            <ul className="list-disc list-inside mt-2 space-y-1">
                                                                <li>
                                                                    <Trans i18nKey="rescheduleDialog.warning.twice" t={t} components={{ strong: <strong /> }} />
                                                                </li>
                                                                <li>
                                                                    <Trans i18nKey="rescheduleDialog.warning.reEnter" t={t} components={{ strong: <strong /> }} />
                                                                </li>
                                                                <li>{t("rescheduleDialog.warning.reset")}</li>
                                                            </ul>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <p className="text-sm font-medium text-foreground">{t("rescheduleDialog.weekLabel")}</p>
                                                            <select
                                                                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                                value={selectedRescheduleDate}
                                                                onChange={(e) => setSelectedRescheduleDate(e.target.value)}
                                                            >
                                                                {[1, 2, 3, 4, 5, 6].map(weeksAhead => {
                                                                    if (!date.first_possible_day) return null;
                                                                    const newStart = startOfSchedulingDay(date.first_possible_day).plus({ days: weeksAhead * 7 }).setLocale(lng);
                                                                    const newEnd = newStart.plus({ days: 6 });
                                                                    const range = `${newStart.toFormat("MMM d")} - ${newEnd.toFormat("MMM d")} `;
                                                                    const value = newStart.toISODate()!;
                                                                    return (
                                                                        <option key={value} value={value}>
                                                                            {weeksAhead === 1
                                                                                ? t("rescheduleDialog.nextWeek", { range })
                                                                                : t("rescheduleDialog.weeksOut", { count: weeksAhead, range })}
                                                                        </option>
                                                                    );
                                                                })}
                                                            </select>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <p className="text-sm font-medium text-foreground">{t("rescheduleDialog.reasonLabel")}</p>
                                                            <Textarea
                                                                placeholder={t("rescheduleDialog.reasonPlaceholder")}
                                                                value={rescheduleReason}
                                                                onChange={(e) => setRescheduleReason(e.target.value)}
                                                                className="bg-background"
                                                            />
                                                        </div>

                                                        <p>{t("rescheduleDialog.notify")}</p>
                                                    </>
                                                )}
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>
                                                {viewerRescheduleCount >= 2 ? t("rescheduleDialog.close") : t("rescheduleDialog.back")}
                                            </AlertDialogCancel>
                                            {viewerRescheduleCount < 2 && (
                                                <LongPressButton
                                                    onLongPress={handleRescheduleDate}
                                                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                                                >
                                                    {t("rescheduleDialog.confirm")}
                                                    <Calendar className="ml-2 w-4 h-4" />
                                                </LongPressButton>
                                            )}
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        )}
                    </CardTitle>
                    <div className="space-y-1 text-sm text-muted-foreground mt-2">
                        <div className="flex items-center gap-2">
                            <div className="space-y-[0.3rem]">
                                {date.date_time && (
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        <span>{confirmedStart!.toFormat("EEEE, MMMM d, yyyy")}</span>
                                    </div>
                                )}
                                {date.date_time ? (
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        <span>
                                            {confirmedStart!.toFormat("t")}
                                            {resolvedDuration && confirmedEnd && ` – ${confirmedEnd.toFormat("t")} (${t("details.minutes", { count: resolvedDuration })})`}
                                        </span>
                                    </div>
                                ) : null}
                                {date.location && (
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4" />
                                        <span>{date.location}</span>
                                    </div>
                                )}
                                {date.address && (
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4" />
                                        <span>{date.address}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 md:p-6 px-0">

                    {venueOptionDetails.length >= 2 && !date.date_time && Object.keys(availability).length > 0 && (
                        <div className="px-6 space-y-3">
                            <div className="flex items-center gap-2">
                                <Store className="w-4 h-4 text-muted-foreground" />
                                <p className="font-semibold text-sm">{t("venueVote.heading")}</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {venueOptionDetails.map((venue) => {
                                    const myVote = date.user1_id === viewerId ? date.user1_venue_vote : date.user2_venue_vote;
                                    const partnerVote = date.user1_id === viewerId ? date.user2_venue_vote : date.user1_venue_vote;
                                    const isMyPick = myVote === venue.id;
                                    const isPartnerPick = partnerVote === venue.id;
                                    const bothVoted = !!myVote && !!partnerVote;
                                    const isWinner = resolvedVenueId === venue.id;
                                    return (
                                        <div key={venue.id} className="space-y-1.5">
                                            <VenueCard
                                                venue={venue}
                                                type={venue.type}
                                                className={cn(
                                                    "transition-all",
                                                    isMyPick && "ring-2 ring-primary ring-offset-1",
                                                    bothVoted && isWinner && "ring-2 ring-green-500 ring-offset-1",
                                                )}
                                                onClick={readOnly ? undefined : () => handleVenueVote(venue.id)}
                                            />
                                            <div className="flex items-center gap-2 px-1">
                                                {venue.is_partner && (
                                                    <span className="text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">
                                                        {t("venueVote.partnerBadge")}
                                                    </span>
                                                )}
                                                <div className="flex gap-1 ml-auto">
                                                    {isMyPick && (
                                                        <span className="text-xs text-primary font-medium flex items-center gap-0.5">
                                                            <CheckCircle2 className="w-3 h-3" /> {t("venueVote.youBadge")}
                                                        </span>
                                                    )}
                                                    {isPartnerPick && (
                                                        <span className="text-xs text-blue-500 font-medium flex items-center gap-0.5">
                                                            <CheckCircle2 className="w-3 h-3" /> {date.matched_user.first_name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {(() => {
                                    const myVote = date.user1_id === viewerId ? date.user1_venue_vote : date.user2_venue_vote;
                                    const partnerVote = date.user1_id === viewerId ? date.user2_venue_vote : date.user1_venue_vote;
                                    if (!myVote) return t("venueVote.instructions.vote");
                                    if (!partnerVote) return t("venueVote.instructions.waiting", { name: date.matched_user.first_name });
                                    if (myVote === partnerVote) return t("venueVote.instructions.match");
                                    return t("venueVote.instructions.different", {
                                        venue: venueOptionDetails.find(v => v.id === resolvedVenueId)?.name ?? t("venueVote.instructions.fallbackVenue"),
                                    });
                                })()}
                            </p>
                        </div>
                    )}

                    <div>
                        <DatePreferencesSelector
                            dateId={date.id}
                            userId={viewerId}
                            readOnly={readOnly}
                            matchPreferences={matchDatePreferences}
                            matchName={date.matched_user.first_name}
                            onPreferencesChange={setUserDatePreferences}
                        />
                    </div>

                    <div>
                        <div className="text-center text-muted-foreground flex items-center justify-center gap-2 px-6">
                            <p>
                                {t("planner.instructionsLine1")}<br />
                                {t("planner.instructionsLine2")}
                            </p>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                            <strong></strong>
                        </p>
                        <AvailabilityPlanner
                            initialAvailability={availability}
                            initialFlex={flexAvailability}
                            matchedUserAvailability={matchedAvailability}
                            onSave={(newFirm, newFlex) => handleSaveAvailability(date.id, newFirm, newFlex)}
                            venues={venues}
                            firstPossibleDay={date.first_possible_day}
                            readOnly={readOnly}
                        />
                    </div>

                    <div className="mt-6 mx-6 md:mx-0 flex items-center justify-between bg-muted/20 p-4 rounded-lg border border-border/50">
                        <div className="space-y-1">
                            <div className="flex flex-col gap-2">
                                <span className="font-medium text-sm">{t("phone.label")}</span>
                                <div className="pointer-events-none opacity-80">
                                    <PhoneInput
                                        country={"ch"}
                                        preferredCountries={['ch', 'de', 'us']}
                                        value={currentUser?.phone_number || ""}
                                        disabled={true}
                                        disableDropdown={true}
                                        containerStyle={{ border: 'none', padding: 0, margin: 0 }}
                                        inputStyle={{ background: 'transparent', border: 'none', paddingLeft: '40px', width: '100%', color: 'currentColor' }}
                                        buttonStyle={{ background: 'transparent', border: 'none' }}
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {t("phone.description")}
                            </p>
                        </div>
                        <Switch
                            checked={isUser1(date, viewerId) ? date.user1_share_phone : date.user2_share_phone}
                            onCheckedChange={handleTogglePhoneShare}
                            disabled={readOnly}
                        />
                    </div>
                    {(() => {
                        const partnerShares = isUser1(date, viewerId) ? date.user2_share_phone : date.user1_share_phone;
                        if (partnerShares) {
                            return (
                                <div className="mb-6 text-sm text-center p-2 bg-green-50 text-green-800 rounded-lg border border-green-200 mx-6 md:mx-0">
                                    {t("phone.matchShares", { name: date.matched_user.first_name })}
                                </div>
                            );
                        }
                        return null;
                    })()}

                </CardContent>
            </Card>

            <AlertDialog open={!!pendingAvailability} onOpenChange={(open) => !open && setPendingAvailability(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("noOverlapDialog.title")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("noOverlapDialog.intro")}
                            <br />
                            <i>{t("noOverlapDialog.tryAgain")}</i> <br />
                            <div className="m-4 flex justify-center">
                                <div className="rounded-md bg-muted p-2 flex-col">
                                    <div className="flex">
                                        <div>
                                            <strong>{t("noOverlapDialog.tipLabel")}</strong>{" "}
                                            <Trans
                                                i18nKey="noOverlapDialog.tipIntro"
                                                t={t}
                                                components={{ teal: <span className="text-teal-500 font-bold" /> }}
                                            />
                                        </div>
                                        <div className="ml-2 w-5 h-5 bg-teal-500/90 rounded"></div>
                                    </div>
                                    <div>
                                        <Trans
                                            i18nKey="noOverlapDialog.tipExplainer"
                                            t={t}
                                            components={{
                                                green: <span className="font-bold text-green-500" />,
                                                blue: <span className="font-bold text-blue-400" />,
                                            }}
                                        />
                                    </div>
                                    <div className="m-2 flex justify-center">
                                        <img src={overlapExample} alt={t("noOverlapDialog.tipImageAlt")} />
                                    </div>
                                    <div>{t("noOverlapDialog.tipImageCaption")}</div>
                                </div>
                            </div>

                            <Trans
                                i18nKey="noOverlapDialog.saveAnywayBody"
                                t={t}
                                values={{
                                    date: pendingAvailability && date?.first_possible_day
                                        ? startOfSchedulingDay(date.first_possible_day).setLocale(lng).toFormat("MMM d")
                                        : t("noOverlapDialog.fallbackDate"),
                                }}
                                components={{ strong: <strong /> }}
                            />
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {partnerSuggestions.length > 0 && (
                        <div className="rounded-md border border-teal-500/40 bg-teal-500/10 p-3">
                            <p className="font-semibold text-sm mb-1">
                                {t("noOverlapDialog.partnerFreeTitle", { name: date?.matched_user?.first_name ?? "" })}
                            </p>
                            <p className="text-xs text-muted-foreground mb-3">
                                {t("noOverlapDialog.partnerFreeHint")}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {partnerSuggestions.map((s, i) => (
                                    <Button
                                        key={`${s.startDay}-${s.startSlot}-${i}`}
                                        size="sm"
                                        variant="outline"
                                        className="border-teal-500/60"
                                        onClick={() => handleAddSuggestedSlot(s)}
                                    >
                                        + {getCalendarDate(s.startDay)} · {formatTimeForLocale(s.startSlot, lng)}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                    <AlertDialogFooter>
                        <AlertDialogAction>{t("noOverlapDialog.keepEditing")}</AlertDialogAction>
                        <AlertDialogAction
                            className="bg-white text-primary outline outline-1 hover:bg-primary/10"
                            onClick={async () => {
                                if (!pendingAvailability || !viewerId) return;

                                try {
                                    const { ok: savedOk } = await saveAvailabilityToDb(
                                        pendingAvailability.dateId,
                                        pendingAvailability.availability,
                                        flexAvailability,
                                        true,
                                        true,
                                    );
                                    if (!savedOk) return;

                                    const { error: resetError } = await supabase
                                        .from("dates")
                                        .update({
                                            user1_confirmed: false,
                                            user2_confirmed: false,
                                            location: null,
                                            address: null,
                                            date_time: null,
                                            status: "pending",
                                            confirmed_venue_id: null,
                                            user1_venue_vote: null,
                                            user2_venue_vote: null,
                                        })
                                        .eq("id", pendingAvailability.dateId);

                                    if (resetError) throw resetError;

                                    if (currentUser && date && viewerId) {
                                        const matchedUserId = getMatchedUserId(date, viewerId);
                                        await supabase.functions.invoke('send-user-emails', {
                                            body: {
                                                dateId: pendingAvailability.dateId,
                                                emailType: 'no_overlap',
                                                recipients: [
                                                    {
                                                        userId: matchedUserId,
                                                        customData: { partnerName: currentUser.first_name },
                                                    },
                                                ],
                                            },
                                        });
                                    }

                                    await loadDate(viewerId, pendingAvailability.dateId);
                                    setPendingAvailability(null);
                                } catch (err: any) {
                                    console.error("SaveAnyway overlap flow failed:", err);
                                    toast({
                                        title: t("toast.couldNotUpdateDate.title"),
                                        description: err?.message ?? t("toast.couldNotUpdateDate.fallback"),
                                        variant: "destructive",
                                    });
                                }
                            }}
                        >
                            {t("noOverlapDialog.saveAnywayButton")} <Mail className="ml-1 h-4 w-4" />
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!pendingAutoConfirm} onOpenChange={(open) => !open && setPendingAutoConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("autoConfirmDialog.title")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("autoConfirmDialog.intro")}
                            <br /><br />
                            <Trans
                                i18nKey="autoConfirmDialog.timeLine"
                                t={t}
                                values={{
                                    time: pendingAutoConfirm?.newOverlap ? formatTimeForLocale(pendingAutoConfirm.newOverlap.startSlot, lng) : "",
                                    date: pendingAutoConfirm?.newOverlap ? getCalendarDate(pendingAutoConfirm.newOverlap.startDay) : "",
                                }}
                                components={{ strong: <strong /> }}
                            />
                            <br />
                            <Trans
                                i18nKey="autoConfirmDialog.durationLine"
                                t={t}
                                values={{ minutes: resolvedDuration }}
                                components={{ strong: <strong /> }}
                            />
                            <br />
                            <Trans
                                i18nKey="autoConfirmDialog.locationLine"
                                t={t}
                                values={{
                                    location: pendingAutoConfirm?.newOverlap
                                        ? (venues[pendingAutoConfirm.newOverlap.venue]?.name || t("autoConfirmDialog.tbd"))
                                        : "",
                                }}
                                components={{ strong: <strong /> }}
                            />
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("autoConfirmDialog.cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleAutoConfirm}>
                            {t("autoConfirmDialog.confirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default DateView;