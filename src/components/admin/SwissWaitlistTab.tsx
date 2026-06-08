import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, Check } from "lucide-react";
import { format } from "date-fns";

type WaitlistEntry = {
    id: string;
    first_name: string;
    email: string;
    city: string;
    institution_name: string;
    institution_type: string;
    consent_to_updates: boolean;
    created_at: string;
};

type GroupedByUniversity = {
    institution_name: string;
    institution_type: string;
    entries: WaitlistEntry[];
};

type GroupedByCity = {
    city: string;
    total: number;
    universities: GroupedByUniversity[];
};

export const SwissWaitlistTab = () => {
    const [entries, setEntries] = useState<WaitlistEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            const { data, error } = await (supabase as any)
                .from("swiss_waitlist_entries")
                .select("id, first_name, email, city, institution_name, institution_type, consent_to_updates, created_at")
                .order("city", { ascending: true })
                .order("institution_name", { ascending: true })
                .order("created_at", { ascending: false });

            if (!error) setEntries(data || []);
            setIsLoading(false);
        };
        load();
    }, []);

    const grouped = useMemo<GroupedByCity[]>(() => {
        const cityMap = new Map<string, Map<string, WaitlistEntry[]>>();

        for (const entry of entries) {
            if (!cityMap.has(entry.city)) cityMap.set(entry.city, new Map());
            const uniMap = cityMap.get(entry.city)!;
            if (!uniMap.has(entry.institution_name)) uniMap.set(entry.institution_name, []);
            uniMap.get(entry.institution_name)!.push(entry);
        }

        return Array.from(cityMap.entries()).map(([city, uniMap]) => ({
            city,
            total: Array.from(uniMap.values()).reduce((sum, e) => sum + e.length, 0),
            universities: Array.from(uniMap.entries()).map(([institution_name, uniEntries]) => ({
                institution_name,
                institution_type: uniEntries[0].institution_type,
                entries: uniEntries,
            })),
        }));
    }, [entries]);

    if (isLoading) {
        return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    if (entries.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Switzerland Waitlist</CardTitle>
                    <CardDescription>No signups yet.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Switzerland Waitlist</h2>
                <Badge variant="secondary">{entries.length} total signups</Badge>
            </div>

            {grouped.map((cityGroup) => (
                <Card key={cityGroup.city}>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{cityGroup.city}</CardTitle>
                            <Badge>{cityGroup.total} signups</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {cityGroup.universities.map((uniGroup) => (
                            <div key={uniGroup.institution_name} className="rounded-lg border p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{uniGroup.institution_name}</span>
                                        <Badge variant="outline" className="text-xs capitalize">
                                            {uniGroup.institution_type}
                                        </Badge>
                                    </div>
                                    <Badge variant="secondary">{uniGroup.entries.length}</Badge>
                                </div>
                                <div className="divide-y">
                                    {uniGroup.entries.map((entry) => (
                                        <div key={entry.id} className="flex items-center justify-between py-2 text-sm">
                                            <div className="flex items-center gap-3">
                                                <span className="font-medium">{entry.first_name}</span>
                                                <a
                                                    href={`mailto:${entry.email}`}
                                                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                                                >
                                                    <Mail className="h-3 w-3" />
                                                    {entry.email}
                                                </a>
                                                {entry.consent_to_updates && (
                                                    <span className="flex items-center gap-1 text-xs text-green-600">
                                                        <Check className="h-3 w-3" /> notify
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                {format(new Date(entry.created_at), "MMM d, yyyy")}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};
