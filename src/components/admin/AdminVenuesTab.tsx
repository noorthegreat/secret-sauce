import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Scissors, Trash2, Pencil, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";
import { Venue } from "@/components/AvailabilityPlanner";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import { useAdminVenues } from "@/hooks/admin/useAdminVenues";
import { AdminFixVenueDatesPanel } from "@/components/admin/AdminFixVenueDatesPanel";

export const AdminVenuesTab = () => {
    const { venues, refreshVenues: onVenuesChange, loading } = useAdminVenues();
    const { toast } = useToast();
    const [importQuery, setImportQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [searchResults, setSearchResults] = useState<any[] | null>(null);

    const [editingVenue, setEditingVenue] = useState<string | null>(null);
    const [editType, setEditType] = useState("");
    const [editPrice, setEditPrice] = useState("");
    const [editIsPartner, setEditIsPartner] = useState(false);
    const [editNotes, setEditNotes] = useState("");

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading venues...</div>;
    }

    const handleSearchVenues = async (overrideQuery?: string) => {
        const q = overrideQuery ?? importQuery;
        if (!q) return;
        setIsSearching(true);
        setSearchResults(null);
        try {
            const { data, error } = await supabase.functions.invoke('add-venue-places', {
                body: { query: q, mode: "search" }
            });
            if (error) {
                if (error instanceof FunctionsHttpError) {
                    const errorBody = await error.context.json();
                    throw new Error(errorBody?.error || error.message);
                }
                throw error;
            }
            if (data.error) throw new Error(data.error);
            setSearchResults(data.results || []);
        } catch (error: any) {
            toast({ title: "Search Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddVenue = async (result: any) => {
        setIsAdding(true);
        try {
            const { data, error } = await supabase.functions.invoke('add-venue-places', {
                body: { placeId: result.placeId, query: result.name }
            });
            if (error) {
                if (error instanceof FunctionsHttpError) {
                    const errorBody = await error.context.json();
                    throw new Error(errorBody?.error || error.message);
                }
                throw error;
            }
            if (data.error) throw new Error(data.error);
            toast({ title: "Success", description: `${result.name} added successfully` });
            setSearchResults(null);
            setImportQuery("");
            onVenuesChange();
        } catch (error: any) {
            toast({ title: "Error", description: "Failed to add venue: " + error.message, variant: "destructive" });
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteVenue = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this venue?")) return;

        try {
            const { error } = await supabase.from('venues').delete().eq('id', id);
            if (error) throw error;

            toast({
                title: "Success",
                description: "Venue deleted successfully",
            });

            onVenuesChange();
        } catch (error: any) {
            toast({
                title: "Error",
                description: "Failed to delete venue: " + error.message,
                variant: "destructive",
            });
        }
    };

    const handleStartEdit = (venue: Venue) => {
        setEditingVenue(venue.id);
        setEditType(venue.type);
        setEditPrice(venue.price_range?.toString() ?? "");
        setEditIsPartner((venue as any).is_partner ?? false);
        setEditNotes((venue as any).notes ?? "");
    };

    const handleSaveEdit = async (venueId: string) => {
        try {
            const updates: any = { type: editType, is_partner: editIsPartner, notes: editNotes || null };
            if (editPrice !== "") {
                updates.price_range = parseInt(editPrice, 10);
            } else {
                updates.price_range = null;
            }
            const { error } = await supabase.from('venues').update(updates).eq('id', venueId);
            if (error) throw error;

            toast({ title: "Success", description: "Venue updated" });
            setEditingVenue(null);
            onVenuesChange();
        } catch (error: any) {
            toast({ title: "Error", description: "Failed to update: " + error.message, variant: "destructive" });
        }
    };

    const handleSplitVenue = async (venue: Venue) => {
        if (!window.confirm(`Split "${venue.name}" into separate Coffee and Bar venues? (Splits at 4PM)`)) return;

        const truncateHours = (hours: any, type: "coffee" | "bar") => {
            const newHours: any = {};
            Object.keys(hours).forEach(day => {
                const slot = hours[day];
                if (!slot) {
                    newHours[day] = null;
                    return;
                }

                if (type === "coffee") {
                    const newEnd = Math.min(slot.end, 32);
                    if (slot.start >= newEnd) {
                        newHours[day] = null;
                    } else {
                        newHours[day] = { start: slot.start, end: newEnd };
                    }
                } else {
                    const newStart = Math.max(slot.start, 34);
                    if (newStart >= slot.end) {
                        newHours[day] = null;
                    } else {
                        newHours[day] = { start: newStart, end: slot.end };
                    }
                }
            });
            return newHours;
        };

        const coffeeVenue = {
            ...venue,
            id: undefined,
            name: `${venue.name} (Coffee)`,
            type: "coffee",
            hours: truncateHours(venue.hours, "coffee"),
            created_at: new Date().toISOString()
        };

        const cleanVenue = (v: any) => {
            const { id, created_at, ...rest } = v;
            return { ...rest, created_at: new Date().toISOString() };
        };

        const barVenue = {
            ...venue,
            id: undefined,
            name: `${venue.name} (Bar)`,
            type: "bar",
            hours: truncateHours(venue.hours, "bar"),
            created_at: new Date().toISOString()
        };

        try {
            const { error: error1 } = await supabase.from('venues').insert(cleanVenue(coffeeVenue));
            if (error1) throw error1;

            const { error: error2 } = await supabase.from('venues').insert(cleanVenue(barVenue));
            if (error2) throw error2;

            toast({
                title: "Success",
                description: "Venue split successfully",
            });

            onVenuesChange();
        } catch (error: any) {
            toast({
                title: "Error",
                description: "Failed to split venue: " + error.message,
                variant: "destructive",
            });
        }
    };

    const handleTruncateAllVenues = async () => {
        if (!window.confirm("Are you sure you want to TRUNCATE hours for ALL venues? This cannot be undone.")) return;

        try {
            const updates = venues.map(venue => {
                if (!venue.hours) return null;

                const newHours: any = {};
                let hasChanges = false;
                const isCoffee = venue.type === 'coffee';
                const isBar = venue.type === 'bar';

                if (!isCoffee && !isBar) return null;

                Object.keys(venue.hours).forEach(day => {
                    const slot = venue.hours[day];
                    if (!slot) {
                        newHours[day] = null;
                        return;
                    }

                    if (isCoffee) {
                        const limit = 33;
                        if (slot.end > limit) {
                            const newEnd = limit;
                            if (slot.start >= newEnd) {
                                newHours[day] = null;
                            } else {
                                newHours[day] = { start: slot.start, end: newEnd };
                            }
                            hasChanges = true;
                        } else {
                            newHours[day] = slot;
                        }
                    } else if (isBar) {
                        const limit = 34;
                        if (slot.start < limit) {
                            const newStart = limit;
                            if (newStart >= slot.end) {
                                newHours[day] = null;
                            } else {
                                newHours[day] = { start: newStart, end: slot.end };
                            }
                            hasChanges = true;
                        } else {
                            newHours[day] = slot;
                        }
                    }
                });

                if (hasChanges) {
                    return {
                        id: venue.id,
                        hours: newHours
                    };
                }
                return null;
            }).filter(Boolean);

            if (updates.length === 0) {
                toast({
                    title: "No changes needed",
                    description: "All venues already meet the criteria.",
                });
                return;
            }

            // @ts-ignore
            await Promise.all(updates.map(update =>
                supabase.from('venues').update({ hours: update!.hours }).eq('id', update!.id)
            ));

            toast({
                title: "Success",
                description: `Updated hours for ${updates.length} venues.`,
            });

            onVenuesChange();
        } catch (error: any) {
            toast({
                title: "Error",
                description: "Failed to truncate venues: " + error.message,
                variant: "destructive",
            });
        }
    };

    return (
        <div className="space-y-6">
            <AdminFixVenueDatesPanel />

            <Card>
                <CardHeader>
                    <CardTitle>Add New Venue</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-4">
                        <input
                            type="text"
                            placeholder="Search for Venue (Name or Address)"
                            className="flex-1 px-3 py-2 border rounded-md"
                            value={importQuery}
                            onChange={(e) => setImportQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearchVenues()}
                        />
                        <Button
                            onClick={handleSearchVenues}
                            disabled={isSearching || !importQuery}
                        >
                            {isSearching ? "Searching..." : "Search"}
                        </Button>
                    </div>

                    {searchResults !== null && (
                        <div className="space-y-2">
                            {searchResults.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No results found.</p>
                            ) : (
                                searchResults.map((result: any) => (
                                    <div key={result.placeId} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                        {result.photoUrl && (
                                            <img src={result.photoUrl} alt={result.name} className="w-16 h-16 rounded-md object-cover shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{result.name}</p>
                                            <p className="text-sm text-muted-foreground truncate">{result.address}</p>
                                            <div className="flex gap-2 mt-1">
                                                <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium uppercase", {
                                                    "bg-orange-100 text-orange-800": result.inferredType === "coffee",
                                                    "bg-purple-100 text-purple-800": result.inferredType === "bar",
                                                    "bg-rose-100 text-rose-800": result.inferredType === "restaurant",
                                                    "bg-emerald-100 text-emerald-800": result.inferredType === "activity",
                                                })}>
                                                    {result.inferredType}
                                                </span>
                                                {result.priceRange !== null && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {result.priceRange === 0 ? "Free" : `~${result.priceRange} CHF`}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => handleAddVenue(result)}
                                            disabled={isAdding}
                                        >
                                            {isAdding ? "Adding..." : "Add"}
                                        </Button>
                                    </div>
                                ))
                            )}
                            <Button variant="ghost" size="sm" onClick={() => setSearchResults(null)} className="text-muted-foreground">
                                Clear results
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Bulk Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <Button
                        variant="destructive"
                        onClick={handleTruncateAllVenues}
                        className="w-full"
                    >
                        <Scissors className="mr-2 h-4 w-4" />
                        Truncate All Hours (Coffee &lt; 4:30PM, Bar &gt; 5PM)
                    </Button>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {venues.map((venue) => (
                    <Card key={venue.id} className={cn("overflow-hidden border-2", {
                        "border-orange-300/60": venue.type === "coffee",
                        "border-purple-300/60": venue.type === "bar",
                        "border-rose-300/60": venue.type === "restaurant",
                        "border-emerald-300/60": venue.type === "activity",
                    })}>
                        <div className="h-48 w-full relative">
                            <img
                                src={venue.image}
                                alt={venue.name}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute top-2 right-2 flex gap-1">
                                {(venue as any).is_partner && (
                                    <span className="px-2 py-1 rounded text-xs font-bold bg-amber-400 text-amber-900">Partner</span>
                                )}
                                <span className={cn("px-2 py-1 rounded text-xs font-bold uppercase", {
                                    "bg-orange-100 text-orange-800": venue.type === "coffee",
                                    "bg-purple-100 text-purple-800": venue.type === "bar",
                                    "bg-rose-100 text-rose-800": venue.type === "restaurant",
                                    "bg-emerald-100 text-emerald-800": venue.type === "activity",
                                })}>
                                    {venue.type}
                                    {venue.price_range !== null && venue.price_range !== undefined && (
                                        <span className="ml-1 opacity-70">
                                            {venue.price_range === 0 ? "Free" : `~${venue.price_range} CHF`}
                                        </span>
                                    )}
                                </span>
                            </div>
                        </div>
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start gap-2">
                                <div className="flex-1 min-w-0">
                                    <CardTitle className="text-lg truncate">{venue.name}</CardTitle>
                                    <a href={venue.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate block">
                                        {venue.website}
                                    </a>
                                </div>
                                <div className="flex gap-1 -mt-1 -mr-2">
                                    {editingVenue === venue.id ? (
                                        <>
                                            <Button variant="ghost" size="icon" className="text-green-600 hover:bg-green-50" onClick={() => handleSaveEdit(venue.id)}>
                                                <Check className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-muted" onClick={() => setEditingVenue(null)}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => handleStartEdit(venue)} title="Edit type & price">
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => handleSplitVenue(venue)} title="Split into Coffee/Bar">
                                                <Scissors className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90 hover:bg-destructive/10" onClick={() => handleDeleteVenue(venue.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                            {editingVenue === venue.id && (
                                <div className="flex flex-col gap-2 mt-2">
                                    <div className="flex gap-2">
                                        <Select value={editType} onValueChange={setEditType}>
                                            <SelectTrigger className="w-32 h-8 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="coffee">Coffee</SelectItem>
                                                <SelectItem value="bar">Bar</SelectItem>
                                                <SelectItem value="restaurant">Restaurant</SelectItem>
                                                <SelectItem value="activity">Activity</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            type="number"
                                            placeholder="Price (CHF)"
                                            value={editPrice}
                                            onChange={(e) => setEditPrice(e.target.value)}
                                            className="w-28 h-8 text-xs"
                                            min={0}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            id={`partner-${venue.id}`}
                                            checked={editIsPartner}
                                            onCheckedChange={setEditIsPartner}
                                        />
                                        <label htmlFor={`partner-${venue.id}`} className="text-xs font-medium cursor-pointer">
                                            Partner venue
                                        </label>
                                    </div>
                                    <textarea
                                        placeholder="Notes (e.g. semester hours, access restrictions)"
                                        value={editNotes}
                                        onChange={(e) => setEditNotes(e.target.value)}
                                        className="w-full text-xs border rounded-md px-2 py-1 resize-none h-16"
                                    />
                                </div>
                            )}
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                            <p className="text-muted-foreground">{venue.address}</p>
                            {(venue as any).notes && (
                                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                                    {(venue as any).notes}
                                </p>
                            )}

                            {venue.latitude && venue.longitude && (
                                <div className="flex gap-2 text-xs font-mono bg-muted p-2 rounded">
                                    <div>Lat: {venue.latitude.toFixed(4)}</div>
                                    <div>Lng: {venue.longitude.toFixed(4)}</div>
                                </div>
                            )}
                            {(venue as any).avg_feedback_score !== null && (venue as any).avg_feedback_score !== undefined && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    ⭐ {((venue as any).avg_feedback_score as number).toFixed(1)} / 5
                                    <span className="opacity-60">({(venue as any).feedback_count ?? 0} rating{(venue as any).feedback_count !== 1 ? "s" : ""})</span>
                                </div>
                            )}

                            {venue.timezone && (
                                <div className="text-xs text-muted-foreground">
                                    Timezone: <span className="font-semibold">{venue.timezone}</span>
                                </div>
                            )}

                            <div className="pt-2 border-t mt-2">
                                <p className="font-semibold mb-1">Hours:</p>
                                <div className="grid grid-cols-2 gap-1 text-xs">
                                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => {
                                        const slots = venue.hours?.[i.toString()];
                                        if (!slots) return <div key={day}><span className="w-8 inline-block">{day}:</span> Closed</div>;

                                        const formatSlot = (slot: number) => {
                                            const totalMinutes = slot * 30;
                                            const h = Math.floor(totalMinutes / 60) % 24;
                                            const m = totalMinutes % 60;
                                            const ampm = h >= 12 ? 'PM' : 'AM';
                                            const h12 = h % 12 || 12;
                                            return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
                                        };

                                        return (
                                            <div key={day}>
                                                <span className="w-8 inline-block font-medium">{day}:</span> {formatSlot(slots.start)} - {formatSlot(slots.end)}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};
