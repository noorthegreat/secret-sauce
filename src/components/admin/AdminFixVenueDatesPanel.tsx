import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { AlertTriangle, CheckCircle2, Eye, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminVenues } from "@/hooks/admin/useAdminVenues";

interface FixResult {
    dateId: string;
    oldLocation: string | null;
    newVenueOptions: string[];
    newVenueNames: string[];
    status: string;
    dateTime: string | null;
    dryRun: boolean;
    emailsSent?: boolean;
    error?: string;
}

export const AdminFixVenueDatesPanel = () => {
    const { toast } = useToast();
    const { venues, loading: venuesLoading } = useAdminVenues();
    const [selectedVenueId, setSelectedVenueId] = useState<string>("");
    const [isRunning, setIsRunning] = useState(false);
    const [results, setResults] = useState<FixResult[] | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [lastWasDryRun, setLastWasDryRun] = useState(true);

    const run = async (dryRun: boolean) => {
        if (!selectedVenueId) {
            toast({ title: "Select a venue first", variant: "destructive" });
            return;
        }
        setIsRunning(true);
        setResults(null);
        setMessage(null);
        try {
            const { data, error } = await supabase.functions.invoke("admin-fix-venue-dates", {
                body: { dryRun, venueId: selectedVenueId },
            });

            if (error) {
                if (error instanceof FunctionsHttpError) {
                    const body = await error.context.json();
                    throw new Error(body?.error || error.message);
                }
                throw error;
            }
            if (data?.error) throw new Error(data.error);

            setResults(data.updated || []);
            setMessage(data.message);
            setLastWasDryRun(dryRun);

            toast({
                title: dryRun ? "Dry run complete" : "Fix applied",
                description: data.message,
            });
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setIsRunning(false);
        }
    };

    const selectedVenueName = venues.find((v: any) => v.id === selectedVenueId)?.name;

    return (
        <Card className="border-orange-300/50">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700">
                    <Wrench className="w-5 h-5" />
                    Replace Venue on Upcoming Dates
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    Finds all future non-cancelled dates that reference a given venue (in their venue
                    options or as the confirmed venue), re-runs venue selection to replace it, and
                    emails both users.
                </p>

                <div className="flex gap-3 items-end">
                    <div className="flex-1 space-y-1.5">
                        <label className="text-sm font-medium">Venue to replace</label>
                        <Select
                            value={selectedVenueId}
                            onValueChange={setSelectedVenueId}
                            disabled={venuesLoading || isRunning}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a venue…" />
                            </SelectTrigger>
                            <SelectContent>
                                {venues.map((v: any) => (
                                    <SelectItem key={v.id} value={v.id}>
                                        {v.name}
                                        {v.is_partner && " ★"}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={() => run(true)}
                        disabled={isRunning || !selectedVenueId}
                        className="flex items-center gap-2"
                    >
                        <Eye className="w-4 h-4" />
                        {isRunning && lastWasDryRun ? "Running..." : "Dry Run"}
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => run(false)}
                        disabled={isRunning || !selectedVenueId}
                        className="flex items-center gap-2"
                    >
                        <Wrench className="w-4 h-4" />
                        {isRunning && !lastWasDryRun ? "Applying..." : "Apply Fix + Email Users"}
                    </Button>
                </div>

                {message && (
                    <p className={cn(
                        "text-sm font-medium",
                        lastWasDryRun ? "text-blue-600" : "text-green-600"
                    )}>
                        {message}
                    </p>
                )}

                {results && results.length > 0 && (
                    <div className="space-y-2 mt-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            {lastWasDryRun ? "Would update" : "Updated"} {results.length} date(s)
                            {selectedVenueName && ` referencing "${selectedVenueName}"`}
                        </p>
                        {results.map((r) => (
                            <div
                                key={r.dateId}
                                className={cn(
                                    "rounded-lg border p-3 text-sm space-y-1",
                                    r.error ? "border-destructive/50 bg-destructive/5" : "border-border bg-muted/30"
                                )}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-mono text-xs text-muted-foreground">{r.dateId}</span>
                                    <div className="flex items-center gap-1">
                                        <span className={cn(
                                            "text-xs px-1.5 py-0.5 rounded font-medium",
                                            r.status === "confirmed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                                        )}>
                                            {r.status}
                                        </span>
                                        {!r.dryRun && !r.error && (
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        )}
                                        {r.error && (
                                            <AlertTriangle className="w-4 h-4 text-destructive" />
                                        )}
                                    </div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    <span className="line-through">{r.oldLocation || "—"}</span>
                                    {" → "}
                                    <span className="text-foreground font-medium">
                                        {r.newVenueNames.length > 0 ? r.newVenueNames.join(", ") : "No replacement found"}
                                    </span>
                                </div>
                                {r.dateTime && (
                                    <div className="text-xs text-muted-foreground">
                                        Scheduled: {new Date(r.dateTime).toLocaleString()}
                                    </div>
                                )}
                                {r.error && (
                                    <div className="text-xs text-destructive">{r.error}</div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {results && results.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">No affected dates found.</p>
                )}
            </CardContent>
        </Card>
    );
};
