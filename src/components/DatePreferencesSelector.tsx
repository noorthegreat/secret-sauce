import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Slider } from "@/components/ui/slider.tsx";
import { cn } from "@/lib/utils.ts";
import { Coffee, Martini, UtensilsCrossed, TreePine, Clock, DollarSign, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client.ts";
import { useToast } from "@/hooks/use-toast.ts";

export interface DatePreferences {
    duration: number; // minutes: 30, 60, 90, 120
    spending: number; // 0 = free, up to 80
    venue_type: "coffee" | "bar" | "restaurant" | "activity";
}

interface DatePreferencesSelectorProps {
    dateId: string;
    userId: string;
    readOnly?: boolean;
    matchPreferences?: DatePreferences | null;
    matchName?: string;
    onPreferencesChange?: (prefs: DatePreferences) => void;
}

const DURATION_OPTIONS = [
    { value: 30, label: "30 min" },
    { value: 60, label: "1 hour" },
    { value: 90, label: "1.5 hours" },
    { value: 120, label: "2 hours" },
];

const VENUE_OPTIONS = [
    { value: "coffee" as const, label: "Coffee", icon: Coffee },
    { value: "bar" as const, label: "Bar", icon: Martini },
    { value: "restaurant" as const, label: "Restaurant", icon: UtensilsCrossed },
    { value: "activity" as const, label: "Activity", icon: TreePine },
];

const DEFAULT_PREFERENCES: DatePreferences = {
    duration: 60,
    spending: 20,
    venue_type: "coffee",
};

const formatSpending = (value: number): string => {
    if (value === 0) return "Free";
    if (value >= 80) return "80+ CHF";
    return `${value} CHF`;
};

const getSpendingLabel = (value: number): string => {
    if (value === 0) return "Free";
    if (value <= 15) return "$";
    if (value <= 35) return "$$";
    if (value <= 60) return "$$$";
    return "$$$$";
};

export const resolvePreferences = (
    prefs1: DatePreferences | null,
    prefs2: DatePreferences | null
): DatePreferences => {
    const p1 = prefs1 || DEFAULT_PREFERENCES;
    const p2 = prefs2 || DEFAULT_PREFERENCES;

    const venuePriority: Record<string, number> = { coffee: 0, bar: 1, restaurant: 2, activity: 3 };
    return {
        duration: Math.min(p1.duration, p2.duration),
        spending: Math.min(p1.spending, p2.spending),
        // Lower-commitment venue wins (coffee < bar < restaurant < activity)
        venue_type: venuePriority[p1.venue_type] <= venuePriority[p2.venue_type] ? p1.venue_type : p2.venue_type,
    };
};

export const DatePreferencesSelector = ({
    dateId,
    userId,
    readOnly = false,
    matchPreferences,
    matchName,
    onPreferencesChange,
}: DatePreferencesSelectorProps) => {
    const { toast } = useToast();
    const [preferences, setPreferences] = useState<DatePreferences>(DEFAULT_PREFERENCES);
    const [savedPreferences, setSavedPreferences] = useState<DatePreferences | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const isDirty = savedPreferences === null ||
        preferences.duration !== savedPreferences.duration ||
        preferences.spending !== savedPreferences.spending ||
        preferences.venue_type !== savedPreferences.venue_type;

    useEffect(() => {
        loadPreferences();
    }, [dateId, userId]);

    const loadPreferences = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("date_activity_preferences")
                .select("preferences")
                .eq("date_id", dateId)
                .eq("user_id", userId)
                .maybeSingle();

            if (error) throw error;

            if (data?.preferences && typeof data.preferences === "object") {
                const prefs = data.preferences as Record<string, unknown>;
                const loaded: DatePreferences = {
                    duration: typeof prefs.duration === "number" ? prefs.duration : DEFAULT_PREFERENCES.duration,
                    spending: typeof prefs.spending === "number" ? prefs.spending : DEFAULT_PREFERENCES.spending,
                    venue_type: ["coffee", "bar", "restaurant", "activity"].includes(prefs.venue_type as string)
                        ? (prefs.venue_type as DatePreferences["venue_type"])
                        : DEFAULT_PREFERENCES.venue_type,
                };
                setPreferences(loaded);
                setSavedPreferences(loaded);
                onPreferencesChange?.(loaded);
            }
        } catch (error: any) {
            console.error("Error loading date preferences:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from("date_activity_preferences")
                .upsert(
                    {
                        date_id: dateId,
                        user_id: userId,
                        preferences: preferences as any,
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: "date_id,user_id" }
                );

            if (error) throw error;

            setSavedPreferences({ ...preferences });
            onPreferencesChange?.(preferences);
            toast({
                title: "Preferences saved",
                description: "Your date preferences have been updated.",
            });
        } catch (error: any) {
            console.error("Error saving date preferences:", error);
            toast({
                title: "Error",
                description: "Could not save preferences. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <Card className="border-border/50">
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-border/50">
            <CardHeader className="md:p-0 py-0 md:pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Date Preferences
                </CardTitle>
            </CardHeader>
            <CardContent className="md:p-0 space-y-6">
                {/* Duration */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Duration</label>
                    <div className="grid grid-cols-4 gap-2">
                        {DURATION_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                disabled={readOnly}
                                onClick={() => setPreferences((p) => ({ ...p, duration: opt.value }))}
                                className={cn(
                                    "py-2 px-1 text-sm rounded-md border transition-colors",
                                    preferences.duration === opt.value
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-background border-border hover:bg-accent text-foreground",
                                    readOnly && "opacity-60 cursor-not-allowed"
                                )}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    {matchPreferences && (
                        <p className="text-xs text-muted-foreground">
                            {matchName} chose: {DURATION_OPTIONS.find((o) => o.value === matchPreferences.duration)?.label || "—"}
                        </p>
                    )}
                </div>

                {/* Spending */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Budget
                        <span className="text-muted-foreground font-normal">
                            — {formatSpending(preferences.spending)}
                        </span>
                    </label>
                    <Slider
                        value={[preferences.spending]}
                        min={0}
                        max={80}
                        step={5}
                        onValueChange={([val]) => setPreferences((p) => ({ ...p, spending: val }))}
                        disabled={readOnly}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Free</span>
                        <span>80+ CHF</span>
                    </div>
                    {matchPreferences && (
                        <p className="text-xs text-muted-foreground">
                            {matchName}'s budget: {formatSpending(matchPreferences.spending)}
                        </p>
                    )}
                </div>

                {/* Venue Type */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Venue Type</label>
                    <div className="grid grid-cols-4 gap-2">
                        {VENUE_OPTIONS.map((opt) => {
                            const Icon = opt.icon;
                            return (
                                <button
                                    key={opt.value}
                                    disabled={readOnly}
                                    onClick={() => setPreferences((p) => ({ ...p, venue_type: opt.value }))}
                                    className={cn(
                                        "py-3 px-1 text-xs rounded-md border transition-colors flex flex-col items-center gap-1.5",
                                        preferences.venue_type === opt.value
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "bg-background border-border hover:bg-accent text-foreground",
                                        readOnly && "opacity-60 cursor-not-allowed"
                                    )}
                                >
                                    <Icon className="w-5 h-5" />
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>
                    {matchPreferences && (
                        <p className="text-xs text-muted-foreground">
                            {matchName} chose: {VENUE_OPTIONS.find((o) => o.value === matchPreferences.venue_type)?.label || "—"}
                        </p>
                    )}
                </div>

                {/* Save Button */}
                {!readOnly && (
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={!isDirty || isSaving}
                        className="w-full"
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        Save Preferences
                    </Button>
                )}
            </CardContent>
        </Card>
    );
};
