// src/pages/DatesList.tsx
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Hammer, CalendarOff, Sparkles, Calendar, ArrowRight, MapPin, CalendarCheck, Building2, AlertTriangle, Trash2, Phone } from "lucide-react";
import { AvailabilityPlanner, Availability, Venue, calculateLargestOverlap } from "@/components/AvailabilityPlanner";
import { LongPressButton } from "@/components/ui/long-press-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import Footer from "./Footer";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, type Locale } from "date-fns";
import { de as deLocale, enUS as enLocale, fr as frLocale, it as itLocale } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { canAccessDating } from "@/lib/dating-eligibility";
import StudentEmailVerificationCard from "@/components/StudentEmailVerificationCard";
import { syncProfileEmailFromAuth } from "@/lib/profile-email";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { DateFeedbackDialog } from "@/components/DateFeedbackDialog";
import { DateContinuationFeedbackDialog } from "@/components/DateContinuationFeedbackDialog";

// ---------- types & helpers (unchanged) ----------

type DateType = {
    id: string;
    date_time: string | null;
    location: string | null;
    first_possible_day: string | null;
    match_type: "relationship" | "friendship";
    user1_id: string;
    user2_id: string;
    user1_confirmed: boolean;
    user2_confirmed: boolean;
    status: "pending" | "confirmed" | "limbo" | "completed" | "cancelled" | "auto_cancelled";
    user1_feedback: string | null;
    user2_feedback: string | null;
    user1_followup_preference: "match" | "friend" | "pass" | null;
    user2_followup_preference: "match" | "friend" | "pass" | null;
    matched_user: {
        id: string;
        first_name: string;
        additional_photos: string[] | null;
    };
    venue_options?: string[] | null;
    address: string | null;
    hasMyAvailability?: boolean;
    hasOverlap?: boolean;
    user1_share_phone: boolean;
    user2_share_phone: boolean;
    timezone?: string | null;
    hasContinuationFeedback?: boolean;
    continuationFeedbackStatus?: string | null;
};

const UPCOMING_DATE_STATUSES: DateType["status"][] = ["pending", "confirmed", "limbo"];
const CANCELLED_DATE_STATUSES: DateType["status"][] = ["cancelled", "auto_cancelled"];
const VALID_DATE_STATUSES = new Set<DateType["status"]>([
    "pending",
    "confirmed",
    "limbo",
    "completed",
    "cancelled",
    "auto_cancelled",
]);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeAvailability = (value: unknown): Availability => {
    if (!isPlainObject(value)) return {};
    return Object.entries(value).reduce<Availability>((acc, [day, slots]) => {
        if (!Array.isArray(slots)) return acc;
        const normalizedSlots = slots
            .filter((slot): slot is number => typeof slot === "number" && Number.isFinite(slot))
            .sort((a, b) => a - b);
        if (normalizedSlots.length > 0) acc[day] = normalizedSlots;
        return acc;
    }, {});
};

const normalizeVenueOptions = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value.filter((venueId): venueId is string => typeof venueId === "string" && venueId.trim().length > 0);
};

const normalizeDateStatus = (status: unknown): DateType["status"] => {
    if (typeof status === "string" && VALID_DATE_STATUSES.has(status as DateType["status"])) {
        return status as DateType["status"];
    }
    return "pending";
};

const parseDateTime = (value: string | null | undefined): Date | null => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseFirstPossibleDay = (value: string | null | undefined): Date | null => {
    if (!value) return null;
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getDateMatchType = (value: unknown): DateType["match_type"] =>
    value === "friendship" ? "friendship" : "relationship";

const getLikesTable = (matchType: DateType["match_type"]) =>
    matchType === "friendship" ? "friendship_likes" : "likes";

const hasMutualPositiveOutcome = (date: Pick<DateType, "match_type" | "user1_followup_preference" | "user2_followup_preference">) => {
    if (date.match_type === "friendship") {
        return date.user1_followup_preference === "friend" && date.user2_followup_preference === "friend";
    }
    return date.user1_followup_preference === "match" && date.user2_followup_preference === "match";
};

// ---------- locale helper ----------
// Maps the active i18next language to a date-fns Locale.
// Keep this small and explicit; expand as you add languages.
const dateFnsLocaleFor = (lng: string): Locale => {
    const base = lng.split("-")[0].toLowerCase();
    switch (base) {
        case "de": return deLocale;
        case "fr": return frLocale;
        case "it": return itLocale;
        default: return enLocale;
    }
};

// ---------- small presentational components ----------

const ConfirmationBadge = ({ isConfirmed, who }: { isConfirmed: boolean; who: string }) => {
    const { t } = useTranslation("datesList");
    const status = isConfirmed
        ? t("card.confirmation.confirmed")
        : t("card.confirmation.pending");
    return (
        <div className={cn(
            "flex items-center gap-2 px-3 py-1 rounded-sm text-sm font-medium",
            isConfirmed ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
        )}>
            {isConfirmed ? <CalendarCheck className="w-4 h-4" /> : <div className="w-2 h-2 rounded-full bg-current" />}
            <span>{t("card.confirmation.label", { who, status })}</span>
        </div>
    );
};

const PhoneBadge = ({ isShared, who }: { isShared: boolean; who: string }) => {
    const { t } = useTranslation("datesList");
    const status = isShared
        ? t("card.phone.shared")
        : t("card.phone.hidden");
    return (
        <div className={cn(
            "mt-2 flex items-center gap-2 px-3 py-1 rounded-sm text-sm font-medium border border-border/50",
            isShared ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "bg-muted text-muted-foreground opacity-70"
        )}>
            <Phone className="w-3 h-3" />
            <span className="text-xs">{t("card.phone.label", { who, status })}</span>
        </div>
    );
};

// ---------- DateList ----------

const DateList = ({
    dates,
    emptyTitleKey,
    emptyDescriptionKey,
    navigate,
    userId,
    isCancelled = false,
    isAdmin = false,
    onDelete,
    onMarkCompleted,
    onOpenContinuationFeedback,
}: {
    dates: DateType[];
    /** i18n key (within `datesList` namespace) for the empty-state title */
    emptyTitleKey: string;
    /** i18n key (within `datesList` namespace) for the empty-state description */
    emptyDescriptionKey: string;
    navigate: any;
    userId: string | null;
    isCancelled?: boolean;
    isAdmin?: boolean;
    onDelete?: (date: DateType) => void;
    onMarkCompleted?: (date: DateType) => void;
    onOpenContinuationFeedback?: (date: DateType) => void;
}) => {
    const { t, i18n } = useTranslation("datesList");
    const dfLocale = dateFnsLocaleFor(i18n.language);
    const [feedbackDate, setFeedbackDate] = useState<DateType | null>(null);

    if (dates.length === 0) {
        return (
            <Card className="text-center p-12 shadow-xl border-border/50">
                <CalendarOff className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <CardTitle className="mb-2">{t(emptyTitleKey)}</CardTitle>
                <CardDescription>{t(emptyDescriptionKey)}</CardDescription>
            </Card>
        );
    }

    return (
        <div className="grid gap-6">
            {dates.map((date) => {
                const scheduledAt = parseDateTime(date.date_time);
                const firstPossibleDay = parseFirstPossibleDay(date.first_possible_day);
                const matchType = getDateMatchType(date.match_type);
                const isFriendshipDate = matchType === "friendship";
                const partnerName = date.matched_user.first_name || t("card.unknownUser");
                const youLabel = t("card.you");

                const youConfirmed = date.user1_id === userId ? date.user1_confirmed : date.user2_confirmed;
                const partnerConfirmed = date.user1_id === userId ? date.user2_confirmed : date.user1_confirmed;
                const youSharePhone = date.user1_id === userId ? date.user1_share_phone : date.user2_share_phone;
                const partnerSharePhone = date.user1_id === userId ? date.user2_share_phone : date.user1_share_phone;

                return (
                    <Card
                        key={date.id}
                        className={cn(
                            "shadow-lg border-border/50 transition-transform",
                            !isCancelled && "cursor-pointer hover:scale-[1.01]"
                        )}
                        onClick={() => !isCancelled && navigate(`/dates/${date.id}`)}
                    >
                        <CardContent className="relative">
                            {isAdmin && onDelete && (
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-2 right-2 z-50 h-8 w-8"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(date);
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}

                            {isCancelled ? (
                                <>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className="text-2xl font-semibold tracking-tight">
                                            {t("card.title", { name: partnerName })}
                                        </span>
                                        {isFriendshipDate && (
                                            <span className="text-xs font-semibold uppercase px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                                                {t("card.badge.friendship")}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-sm font-normal px-2 py-1 bg-destructive/10 text-destructive rounded-full border border-destructive/20 ml-2">
                                        {t("card.badge.cancelled")}
                                    </span>

                                    <div className="bg-muted/50 p-4 rounded-lg space-y-2 mt-4">
                                        <div className="flex items-center gap-2 text-destructive font-medium">
                                            <AlertTriangle className="w-4 h-4" />
                                            <span>{t("card.cancellation.reasonLabel")}</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground italic">
                                            "{date.user1_feedback || date.user2_feedback || t("card.cancellation.noReason")}"
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div className="flex md:flex-row flex-col justify-between gap-6 md:gap-10">
                                    <div>
                                        <div className="flex items-center gap-3 flex-wrap">
                                                <span className="text-2xl font-semibold tracking-tight">
                                                    {t("card.title", { name: partnerName })}
                                                </span>
                                            {isFriendshipDate && (
                                                <span className="text-xs font-semibold uppercase px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                                                        {t("card.badge.friendship")}
                                                </span>
                                            )}
                                        </div>

                                        <div className="my-2 md:w-80 flex flex-col gap-2">
                                            {scheduledAt ? (
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4" />
                                                        <span>
                                                            {format(scheduledAt, "PPPp", { locale: dfLocale })}
                                                            {" – "}
                                                            {format(new Date(scheduledAt.getTime() + 60 * 60 * 1000), "p", { locale: dfLocale })}
                                                        </span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col p-2 gap-2 rounded-sm text-sm font-medium bg-muted text-muted-foreground">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4" />
                                                                <span>{t("card.schedule.pending")}</span>
                                                    </div>
                                                    {firstPossibleDay && (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-4" />
                                                            <span className="text-sm font-bold">
                                                                        {t("card.schedule.window", {
                                                                            start: format(firstPossibleDay, "MMM d", { locale: dfLocale }),
                                                                            end: format(addDays(firstPossibleDay, 6), "MMM d", { locale: dfLocale }),
                                                                        })}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
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

                                        <div>
                                            <div className="flex items-center gap-2 justify-center">
                                                <div>
                                                        <ConfirmationBadge isConfirmed={youConfirmed} who={youLabel} />
                                                        <PhoneBadge isShared={youSharePhone} who={youLabel} />
                                                </div>
                                                <div>
                                                        <ConfirmationBadge isConfirmed={partnerConfirmed} who={partnerName} />
                                                        <PhoneBadge isShared={partnerSharePhone} who={partnerName} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col justify-between">
                                            {date.status === "confirmed" && (
                                            <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 p-3 rounded-lg text-sm flex items-start gap-2 max-w-sm">
                                                <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
                                                    <span>
                                                        {t("card.statusMessage.confirmed")}
                                                        <br /><br />
                                                        {t("card.statusMessage.confirmedFooter")}
                                                </span>
                                            </div>
                                        )}
                                            {date.status === "pending" && (
                                            <div className="bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 p-3 rounded-lg text-sm flex items-start gap-2 max-w-sm">
                                                <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
                                                <div className="flex flex-col gap-2">
                                                        <span>
                                                            {t("card.statusMessage.pendingIntro")}
                                                            <br /><br />
                                                            {t("card.statusMessage.pendingFooter")}
                                                    </span>
                                                    {!isCancelled && (
                                                            (!date.hasMyAvailability ||
                                                                (date.hasOverlap && !youConfirmed)) && (
                                                            <div className="flex justify-end">
                                                                    <div className="flex items-center gap-2 text-center text-xs font-bold p-2 px-4 bg-linear-to-r from-backgrounda to-backgroundc text-white rounded-full">
                                                                        {date.hasMyAvailability
                                                                            ? t("card.cta.confirm")
                                                                            : t("card.cta.addAvailability")}
                                                                        <ArrowRight className="w-4 h-4" />
                                                                </div>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {!isCancelled && date.status !== "completed" && scheduledAt && new Date() > scheduledAt && (
                                            <div className="mt-4 flex justify-end">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (onMarkCompleted) onMarkCompleted(date);
                                                    }}
                                                    className="gap-2"
                                                >
                                                    <CalendarCheck className="w-4 h-4" />
                                                        {t("card.actions.markCompleted")}
                                                </Button>
                                            </div>
                                        )}

                                        {date.status === "completed" && (
                                            <div className="mt-4 space-y-2">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className="w-full"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setFeedbackDate(date);
                                                    }}
                                                >
                                                    <Sparkles className="w-4 h-4 mr-2" />
                                                        {t("card.actions.giveFeedback")}
                                                </Button>
                                                {hasMutualPositiveOutcome(date) && onOpenContinuationFeedback && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-full"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onOpenContinuationFeedback(date);
                                                        }}
                                                    >
                                                            {t(
                                                                `card.followUp.${date.match_type}.${date.hasContinuationFeedback ? "update" : "share"}`
                                                            )}
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
            <DateFeedbackDialog
                date={feedbackDate as any}
                isOpen={!!feedbackDate}
                onClose={() => setFeedbackDate(null)}
                currentUserId={userId}
            />
        </div>
    );
};

// ---------- DatesList ----------

const DatesList = () => {
    const { t } = useTranslation("datesList");
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { toast } = useToast();
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [dates, setDates] = useState<DateType[]>([]);
    const [userId, setUserId] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("upcoming");
    const [canDate, setCanDate] = useState(true);
    const [pendingFeedbackCount, setPendingFeedbackCount] = useState(0);
    const [continuationFeedbackDate, setContinuationFeedbackDate] = useState<DateType | null>(null);

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
            if (!followupSet || !hasAnswers) pendingCount += 1;
        }
        return pendingCount;
    };

    useEffect(() => {
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (!session) { navigate("/auth"); return; }
            setUserId(session.user.id);
            setUserEmail(session.user.email ?? null);
            await syncProfileEmailFromAuth(session.user.id, session.user.email);
            const userCanDate = canAccessDating(session.user);
            setCanDate(userCanDate);
            setPendingFeedbackCount(0);

            const { data: hasAdminRole } = await supabase.rpc("has_role", {
                _user_id: session.user.id,
                _role: "admin",
            });
            setIsAdmin(!!hasAdminRole);

            if (userCanDate || hasAdminRole) {
                await loadDates(session.user.id);
                try {
                    const pending = await getPendingFeedbackCount(session.user.id);
                    setPendingFeedbackCount(pending);
                } catch (error) {
                    console.error("Error checking feedback completion gate:", error);
                }
            } else {
                setDates([]);
            }
            setIsLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (!session) { navigate("/auth"); return; }
            void (async () => {
                setUserId(session.user.id);
                setUserEmail(session.user.email ?? null);
                await syncProfileEmailFromAuth(session.user.id, session.user.email);
                const userCanDate = canAccessDating(session.user);
                setCanDate(userCanDate);
                setPendingFeedbackCount(0);

                const { data: hasAdminRole } = await supabase.rpc("has_role", {
                    _user_id: session.user.id,
                    _role: "admin",
                });
                setIsAdmin(!!hasAdminRole);

                if (userCanDate || hasAdminRole) {
                    await loadDates(session.user.id);
                    try {
                        const pending = await getPendingFeedbackCount(session.user.id);
                        setPendingFeedbackCount(pending);
                    } catch (error) {
                        console.error("Error checking feedback completion gate:", error);
                    }
                } else {
                    setDates([]);
                }
            })();
        });

        return () => subscription.unsubscribe();
    }, [navigate]);

    const loadDates = async (currentUserId: string) => {
        try {
            const { data: venuesData, error: venuesError } = await supabase.from("venues").select("*");
            if (venuesError) throw venuesError;

            const venuesMap: Record<string, Venue> = {};
            venuesData?.forEach((v) => {
                venuesMap[v.type] = { ...v, hours: v.hours as any };
            });

            const { data: datesData, error: datesError } = await supabase
                .from("dates")
                .select("*")
                .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)
                .order("date_time", { ascending: true });

            if (datesError) throw datesError;
            if (!datesData || datesData.length === 0) { setDates([]); return; }

            const dateIds = datesData.map((date) => date.id);
            const matchedUserIds = datesData.map((d) => d.user1_id === currentUserId ? d.user2_id : d.user1_id);

            const { data: profilesData, error: profilesError } = await supabase
                .from("profiles")
                .select("id, first_name, additional_photos")
                .in("id", matchedUserIds);

            if (profilesError) throw profilesError;

            const { data: continuationFeedbackRows, error: continuationFeedbackError } = await (supabase as any)
                .from("date_continuation_feedback")
                .select("date_id, status")
                .eq("user_id", currentUserId)
                .in("date_id", dateIds);

            if (continuationFeedbackError) throw continuationFeedbackError;

            const continuationFeedbackByDate = new Map<string, { status: string }>(
                (continuationFeedbackRows || []).map((row: any) => [row.date_id, row])
            );

            const combinedDates = datesData.map((date) => {
                const matchedUserId = date.user1_id === currentUserId ? date.user2_id : date.user1_id;
                const profile = profilesData?.find((p) => p.id === matchedUserId);

                const isUser1 = date.user1_id === currentUserId;
                const myAvail = normalizeAvailability(isUser1 ? date.user1_availability : date.user2_availability);
                const partnerAvail = normalizeAvailability(isUser1 ? date.user2_availability : date.user1_availability);

                const hasMyAvailability = Object.values(myAvail).some((slots: number[]) => slots && slots.length > 0);

                let currentVenuesMap = venuesMap;
                const venueOptions = normalizeVenueOptions(date.venue_options);
                if (venueOptions.length > 0) {
                    currentVenuesMap = {};
                    venueOptions.forEach((venueId: string) => {
                        const venue = venuesData?.find((v) => v.id === venueId);
                        if (venue) currentVenuesMap[venue.type] = { ...venue, hours: venue.hours as any };
                    });
                }

                const overlap = calculateLargestOverlap(
                    myAvail, partnerAvail, currentVenuesMap, undefined, 30,
                    date.first_possible_day ?? null,
                );

                return {
                    id: date.id,
                    date_time: date.date_time,
                    location: date.location,
                    first_possible_day: date.first_possible_day,
                    match_type: getDateMatchType(date.match_type),
                    user1_id: date.user1_id,
                    user2_id: date.user2_id,
                    user1_confirmed: date.user1_confirmed,
                    user2_confirmed: date.user2_confirmed,
                    status: normalizeDateStatus(date.status),
                    user1_feedback: date.user1_feedback,
                    user2_feedback: date.user2_feedback,
                    user1_followup_preference: date.user1_followup_preference,
                    user2_followup_preference: date.user2_followup_preference,
                    address: date.address,
                    matched_user: profile || {
                        id: matchedUserId,
                        // Note: this is a *fallback display name*, not English copy.
                        // We translate it at render time via t("card.unknownUser").
                        first_name: "",
                        additional_photos: null,
                    },
                    hasMyAvailability,
                    hasOverlap: !!overlap,
                    user1_share_phone: date.user1_share_phone || false,
                    user2_share_phone: date.user2_share_phone || false,
                    timezone: date.timezone,
                    hasContinuationFeedback: continuationFeedbackByDate.has(date.id),
                    continuationFeedbackStatus: continuationFeedbackByDate.get(date.id)?.status || null,
                };
            });

            setDates(combinedDates);
        } catch (error: any) {
            console.error("Error loading dates:", error);
            toast({
                title: t("toast.errorLoading.title"),
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const handleDeleteDate = async (date: DateType) => {
        if (!confirm(t("delete.confirm"))) return;

        try {
            const likesTable = getLikesTable(getDateMatchType(date.match_type));

            const { error: deleteLikesError } = await supabase
                .from(likesTable)
                .delete()
                .or(`and(user_id.eq.${date.user1_id},liked_user_id.eq.${date.user2_id}),and(user_id.eq.${date.user2_id},liked_user_id.eq.${date.user1_id})`);

            if (deleteLikesError) console.error(deleteLikesError);

            const { error } = await supabase.from("dates").delete().eq("id", date.id);
            if (error) throw error;

            toast({
                title: t("toast.deleted.title"),
                description: t("toast.deleted.description"),
            });

            if (userId) loadDates(userId);
        } catch (error: any) {
            console.error("Error deleting date:", error);
            toast({
                title: t("toast.errorDeleting.title"),
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const handleMarkCompleted = async (date: DateType) => {
        try {
            const completedAt = new Date().toISOString();
            const { error } = await supabase
                .from("dates")
                .update({ status: "completed", completed_or_cancelled_at: completedAt })
                .eq("id", date.id);

            if (error) throw error;

            toast({
                title: t("toast.markedCompleted.title"),
                description: t("toast.markedCompleted.description"),
            });

            setDates((prev) => prev.map((d) =>
                d.id === date.id ? { ...d, status: "completed", completed_or_cancelled_at: completedAt } : d
            ));
            setActiveTab("completed");
        } catch (error: any) {
            console.error("Error updating date:", error);
            toast({
                title: t("toast.errorMarkingCompleted.title"),
                description: t("toast.errorMarkingCompleted.description"),
                variant: "destructive",
            });
        }
    };

    useEffect(() => {
        const followupDateId = searchParams.get("followup");
        if (!followupDateId || continuationFeedbackDate) return;

        const targetDate = dates.find((date) => date.id === followupDateId);
        if (!targetDate || targetDate.status !== "completed" || !hasMutualPositiveOutcome(targetDate)) return;

        setActiveTab("completed");
        setContinuationFeedbackDate(targetDate);
    }, [dates, searchParams, continuationFeedbackDate]);

    const handleOpenContinuationFeedback = (date: DateType) => {
        setActiveTab("completed");
        setContinuationFeedbackDate(date);
    };

    const handleCloseContinuationFeedback = () => {
        setContinuationFeedbackDate(null);
        if (searchParams.get("followup")) {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete("followup");
            setSearchParams(nextParams, { replace: true });
        }
    };

    if (isLoading) {
        return (
            <>
                <div className="flex items-center justify-center min-h-[50vh]">
                    <div className="text-center space-y-4">
                        <Sparkles className="w-12 h-12 mx-auto text-white animate-pulse" />
                        <p className="text-white">{t("loading")}</p>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <div className="p-4 py-12">
                <div className="max-w-4xl mx-auto space-y-12">
                    {!canDate && !isAdmin && (
                        <StudentEmailVerificationCard currentEmail={userEmail} />
                    )}

                    {pendingFeedbackCount > 0 && (canDate || isAdmin) && (
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-400 p-4 rounded-md">
                            <div className="flex items-start gap-3">
                                <Sparkles className="h-5 w-5 text-indigo-400 mt-0.5 shrink-0" />
                                <p className="text-sm text-indigo-800 dark:text-indigo-200">
                                    <Trans
                                        i18nKey="datesList:pendingFeedback"
                                        count={pendingFeedbackCount}
                                        values={{ count: pendingFeedbackCount }}
                                        components={{ bold: <span className="font-semibold" /> }}
                                    />
                                </p>
                            </div>
                        </div>
                    )}

                    {(canDate || isAdmin) && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h1 className="text-3xl font-bold text-white">{t("yourDates")}</h1>
                            </div>

                            <div className="bg-muted/10 border border-border/30 rounded-lg p-4 mb-6 text-sm text-white/80 space-y-1">
                                <p className="font-medium text-white">{t("managingTip.title")}</p>
                                <p>
                                    <Trans
                                        i18nKey="datesList:managingTip.body"
                                        components={{ bold: <strong /> }}
                                    />
                                </p>
                            </div>

                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="grid w-full grid-cols-3 mb-8">
                                    <TabsTrigger value="upcoming">{t("tabs.upcoming")}</TabsTrigger>
                                    <TabsTrigger value="completed">{t("tabs.completed")}</TabsTrigger>
                                    <TabsTrigger value="cancelled">{t("tabs.cancelled")}</TabsTrigger>
                                </TabsList>

                                <TabsContent value="upcoming" className="space-y-6">
                                    <DateList
                                        dates={dates.filter((d) => UPCOMING_DATE_STATUSES.includes(d.status))}
                                        emptyTitleKey="empty.upcoming.title"
                                        emptyDescriptionKey="empty.upcoming.description"
                                        navigate={navigate}
                                        userId={userId}
                                        isAdmin={isAdmin}
                                        onDelete={handleDeleteDate}
                                        onMarkCompleted={handleMarkCompleted}
                                    />
                                </TabsContent>

                                <TabsContent value="completed" className="space-y-6">
                                    <DateList
                                        dates={dates.filter((d) => d.status === "completed")}
                                        emptyTitleKey="empty.completed.title"
                                        emptyDescriptionKey="empty.completed.description"
                                        navigate={navigate}
                                        userId={userId}
                                        isAdmin={isAdmin}
                                        onDelete={handleDeleteDate}
                                        onOpenContinuationFeedback={handleOpenContinuationFeedback}
                                    />
                                </TabsContent>

                                <TabsContent value="cancelled" className="space-y-6">
                                    <DateList
                                        dates={dates.filter((d) => CANCELLED_DATE_STATUSES.includes(d.status))}
                                        emptyTitleKey="empty.cancelled.title"
                                        emptyDescriptionKey="empty.cancelled.description"
                                        navigate={navigate}
                                        userId={userId}
                                        isCancelled
                                        isAdmin={isAdmin}
                                        onDelete={handleDeleteDate}
                                    />
                                </TabsContent>
                            </Tabs>
                        </div>
                    )}
                </div>
            </div>
            <DateContinuationFeedbackDialog
                date={continuationFeedbackDate}
                isOpen={!!continuationFeedbackDate}
                onClose={handleCloseContinuationFeedback}
                currentUserId={userId}
                onSubmitted={() => {
                    if (userId) void loadDates(userId);
                }}
            />
        </>
    );
};

export default DatesList;