import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Loader2, MapPin } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import type { AppEvent } from "@/lib/events";
import { buildEventPath, formatEventDateTime, isEventEnrollmentOpen } from "@/lib/events";

const EventBanner = ({
    variant = "default",
    onEnrollmentChange,
}: {
    variant?: "default" | "public",
    onEnrollmentChange?: (isEnrolled: boolean) => void,
}) => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [enrolling, setEnrolling] = useState(false);
    const [event, setEvent] = useState<AppEvent | null>(null);
    const [isEnrolled, setIsEnrolled] = useState(false);
    const [sessionUser, setSessionUser] = useState<any>(null);

    useEffect(() => {
        const loadBanner = async () => {
            setLoading(true);
            try {
                const nowIso = new Date().toISOString();
                const [{ data: featuredEvent, error: eventError }, { data: { session } }] = await Promise.all([
                    supabase
                        .from("events")
                        .select("*")
                        .eq("active", true)
                        .eq("is_public", true)
                        .or(`start_date.gte.${nowIso},start_date.is.null`)
                        .order("is_featured", { ascending: false })
                        .order("start_date", { ascending: true, nullsFirst: false })
                        .limit(1)
                        .maybeSingle(),
                    supabase.auth.getSession(),
                ]);

                if (eventError) throw eventError;

                setEvent((featuredEvent || null) as AppEvent | null);
                setSessionUser(session?.user ?? null);

                if (featuredEvent && session?.user) {
                    const { data } = await supabase
                        .from("event_enrollments")
                        .select("id")
                        .eq("user_id", session.user.id)
                        .eq("event_id", featuredEvent.id)
                        .maybeSingle();

                    setIsEnrolled(!!data);
                } else {
                    setIsEnrolled(false);
                }
            } catch (error) {
                console.error("Error loading featured event banner:", error);
            } finally {
                setLoading(false);
            }
        };

        loadBanner();
    }, []);

    if (loading) {
        return (
            <div className="mb-6 flex items-center justify-center rounded-xl border border-border/60 bg-card/70 p-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!event) {
        return null;
    }

    const eventPath = buildEventPath(event.slug);
    const enrollmentOpen = isEventEnrollmentOpen(event);
    const venueLabel = [event.venue_name, event.city].filter(Boolean).join(", ");
    const imageSrc = event.flyer_image_url || event.hero_image_url || null;

    const openEventPage = () => navigate(eventPath);

    const toggleEnrollment = async (checked: boolean) => {
        if (!event) return;

        if (!sessionUser) {
            navigate("/auth");
            return;
        }

        if (!enrollmentOpen) {
            toast({
                title: "Enrollment closed",
                description: "This event is no longer accepting signups.",
                variant: "destructive",
            });
            return;
        }

        setEnrolling(true);

        try {
            if (!checked) {
                const { error } = await supabase
                    .from("event_enrollments")
                    .delete()
                    .eq("user_id", sessionUser.id)
                    .eq("event_id", event.id);

                if (error) throw error;

                setIsEnrolled(false);
                onEnrollmentChange?.(false);
                toast({
                    title: "Unenrolled",
                    description: `You were removed from ${event.name}.`,
                });
            } else {
                const { error } = await supabase
                    .from("event_enrollments")
                    .insert({
                        user_id: sessionUser.id,
                        event_id: event.id,
                        event_name: event.slug,
                    });

                if (error) throw error;

                setIsEnrolled(true);
                onEnrollmentChange?.(true);
                toast({
                    title: "You're in",
                    description: `You are signed up for ${event.name}.`,
                });
            }
        } catch (error: any) {
            toast({
                title: "Enrollment failed",
                description: error.message,
                variant: "destructive",
            });
            setIsEnrolled(!checked);
        } finally {
            setEnrolling(false);
        }
    };

    if (variant === "public") {
        return (
            <div
                onClick={openEventPage}
                className="mb-8 overflow-hidden rounded-xl border-2 border-violet-500/40 bg-linear-to-r from-violet-900/40 to-fuchsia-900/40 shadow-lg transition-all hover:border-violet-500 hover:shadow-violet-500/20"
            >
                <div className="flex flex-col-reverse md:flex-row items-center">
                    {imageSrc && (
                        <div className="md:w-1/3 relative min-h-[200px] md:min-h-[250px] m-2">
                            <img src={imageSrc} alt={event.name} className="h-full w-full rounded object-cover" />
                        </div>
                    )}

                    <div className="flex-1 p-6">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="rounded-full bg-violet-500 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                                    Featured Event
                                </span>
                                <span className="flex items-center gap-1 text-sm font-medium text-violet-200">
                                    <Clock className="h-3 w-3" /> {formatEventDateTime(event.start_date, event.timezone)}
                                </span>
                            </div>

                            <h3 className="text-2xl md:text-3xl font-bold text-white">{event.name}</h3>

                            {venueLabel && (
                                <div className="flex items-center gap-2 text-sm text-violet-200">
                                    <MapPin className="h-4 w-4" /> {venueLabel}
                                </div>
                            )}

                            <p className="max-w-lg text-gray-300">
                                {event.short_description || event.tagline || "Join the next curated Orbiit event."}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            onClick={openEventPage}
            className="mb-8 cursor-pointer overflow-hidden rounded-xl border-2 border-violet-500/50 transition-all hover:border-violet-500 hover:shadow-lg hover:shadow-violet-500/20"
        >
            <div className="absolute inset-0" />
            <div className="relative overflow-hidden rounded-xl">
                <div className="absolute inset-0 bg-linear-to-r from-violet-900/90 to-fuchsia-900/90 z-10" />
                <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.16),transparent_36%)]" />
                <div
                    className="absolute inset-0 z-0 bg-cover bg-center opacity-30 transition-opacity group-hover:opacity-40"
                    style={imageSrc ? { backgroundImage: `url(${imageSrc})` } : undefined}
                />

                <div className="relative z-20 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1 flex-1">
                        <div className="mb-2 flex items-center gap-2">
                            <span className="rounded-full bg-violet-500 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                                Featured Event
                            </span>
                            <span className="flex items-center gap-1 text-sm font-medium text-violet-200">
                                <Clock className="h-3 w-3" /> {formatEventDateTime(event.start_date, event.timezone)}
                            </span>
                        </div>
                        <h3 className="text-2xl font-bold text-white">{event.name}</h3>
                        <p className="text-violet-200">
                            {event.short_description || event.tagline || "Click to view the event details and sign up."}
                        </p>
                    </div>

                    <div
                        className="z-30 flex items-center gap-3 rounded-full border border-white/10 bg-black/40 px-4 py-2.5 shadow-xl backdrop-blur-md transition-all hover:bg-black/50"
                        onClick={(clickEvent) => clickEvent.stopPropagation()}
                    >
                        <div className="flex flex-col items-end">
                            <span className={`text-sm font-bold ${isEnrolled ? "text-white" : "text-white/80"}`}>
                                {isEnrolled ? "You're going" : enrollmentOpen ? "Are you going?" : "Enrollment closed"}
                            </span>
                            {venueLabel && <span className="text-xs text-white/60">{venueLabel}</span>}
                        </div>
                        {enrolling ? (
                            <Loader2 className="h-5 w-5 animate-spin text-white" />
                        ) : (
                            <Switch
                                checked={isEnrolled}
                                onCheckedChange={toggleEnrollment}
                                disabled={!enrollmentOpen}
                                className="border-2 border-transparent data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-white/20"
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventBanner;
