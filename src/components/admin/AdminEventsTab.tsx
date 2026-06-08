import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Save } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { AppEvent } from "@/lib/events";
import {
  buildEventPath,
  fromDateTimeLocalInput,
  slugifyEventName,
  toDateTimeLocalInput,
} from "@/lib/events";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type EventFormState = {
  name: string;
  slug: string;
  tagline: string;
  short_description: string;
  description: string;
  venue_name: string;
  venue_address: string;
  city: string;
  start_date: string;
  end_date: string;
  timezone: string;
  hero_image_url: string;
  flyer_image_url: string;
  cta_label: string;
  active: boolean;
  is_public: boolean;
  is_featured: boolean;
  matchmaking_enabled: boolean;
  matching_mode: string;
  max_matches_per_user: string;
  enrollment_opens_at: string;
  enrollment_closes_at: string;
  schedule_dates: boolean;
  show_matches_to_users: boolean;
};

const createEmptyForm = (): EventFormState => ({
  name: "",
  slug: "",
  tagline: "",
  short_description: "",
  description: "",
  venue_name: "",
  venue_address: "",
  city: "",
  start_date: "",
  end_date: "",
  timezone: "Europe/Zurich",
  hero_image_url: "",
  flyer_image_url: "",
  cta_label: "Count me in!",
  active: true,
  is_public: true,
  is_featured: false,
  matchmaking_enabled: true,
  matching_mode: "event_default",
  max_matches_per_user: "1",
  enrollment_opens_at: "",
  enrollment_closes_at: "",
  schedule_dates: true,
  show_matches_to_users: true,
});

const mapEventToForm = (event: AppEvent): EventFormState => {
  const meta = (event.metadata || {}) as Record<string, unknown>;
  return {
    name: event.name || "",
    slug: event.slug || "",
    tagline: event.tagline || "",
    short_description: event.short_description || "",
    description: event.description || "",
    venue_name: event.venue_name || "",
    venue_address: event.venue_address || "",
    city: event.city || "",
    start_date: toDateTimeLocalInput(event.start_date),
    end_date: toDateTimeLocalInput(event.end_date),
    timezone: event.timezone || "UTC",
    hero_image_url: event.hero_image_url || "",
    flyer_image_url: event.flyer_image_url || "",
    cta_label: event.cta_label || "Count me in!",
    active: event.active,
    is_public: event.is_public,
    is_featured: event.is_featured,
    matchmaking_enabled: event.matchmaking_enabled,
    matching_mode: event.matching_mode || "event_default",
    max_matches_per_user: String(event.max_matches_per_user || 1),
    enrollment_opens_at: toDateTimeLocalInput(event.enrollment_opens_at),
    enrollment_closes_at: toDateTimeLocalInput(event.enrollment_closes_at),
    schedule_dates: meta.schedule_dates !== false,
    show_matches_to_users: meta.show_matches_to_users !== false,
  };
};

const areFormsEqual = (left: EventFormState, right: EventFormState) =>
  JSON.stringify(left) === JSON.stringify(right);

export const AdminEventsTab = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [form, setForm] = useState<EventFormState>(createEmptyForm());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const formCardRef = useRef<HTMLDivElement>(null);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) || null,
    [events, selectedEventId]
  );
  const hasUnsavedChanges = useMemo(() => {
    const baseline = selectedEvent ? mapEventToForm(selectedEvent) : createEmptyForm();
    return !areFormsEqual(form, baseline);
  }, [form, selectedEvent]);
  const selectedEventName = form.name.trim() || selectedEvent?.name || "";

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("is_featured", { ascending: false })
        .order("start_date", { ascending: false });

      if (error) throw error;

      const nextEvents = (data || []) as AppEvent[];
      setEvents(nextEvents);

      if (!selectedEventId && nextEvents.length > 0) {
        setSelectedEventId(nextEvents[0].id);
        setForm(mapEventToForm(nextEvents[0]));
        setSlugManuallyEdited(true);
      } else if (selectedEventId) {
        const refreshed = nextEvents.find((event) => event.id === selectedEventId);
        if (refreshed) {
          setForm(mapEventToForm(refreshed));
        }
      }
    } catch (error: any) {
      toast({
        title: "Failed to load events",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const scrollToForm = () => {
    formCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSelectEvent = (event: AppEvent) => {
    setSelectedEventId(event.id);
    setForm(mapEventToForm(event));
    setSlugManuallyEdited(true);
    scrollToForm();
  };

  const handleCreateNew = () => {
    setSelectedEventId(null);
    setForm(createEmptyForm());
    setSlugManuallyEdited(false);
    scrollToForm();
  };

  const updateForm = <K extends keyof EventFormState>(key: K, value: EventFormState[K]) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "name" && !slugManuallyEdited) {
        next.slug = slugifyEventName(String(value));
      }
      return next;
    });
  };

  const handleSave = async () => {
    const trimmedName = form.name.trim();
    const trimmedSlug = slugifyEventName(form.slug);
    const normalizedStartDate = fromDateTimeLocalInput(form.start_date);
    const normalizedEndDate = fromDateTimeLocalInput(form.end_date);

    if (!trimmedName || !trimmedSlug) {
      toast({
        title: "Missing required fields",
        description: "Name and slug are required.",
        variant: "destructive",
      });
      return;
    }

    if (normalizedStartDate && normalizedEndDate && new Date(normalizedEndDate) < new Date(normalizedStartDate)) {
      toast({
        title: "Invalid event window",
        description: "End time must be after the start time.",
        variant: "destructive",
      });
      return;
    }

    if (!normalizedStartDate && normalizedEndDate) {
      toast({
        title: "Start time required",
        description: "Add a start time or clear the end time.",
        variant: "destructive",
      });
      return;
    }

    if (form.schedule_dates && !normalizedStartDate) {
      toast({
        title: "Start time required for scheduled dates",
        description: "Turn off schedule dates or add a start time before saving.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: trimmedName,
        slug: trimmedSlug,
        tagline: form.tagline.trim() || null,
        short_description: form.short_description.trim() || null,
        description: form.description.trim() || null,
        venue_name: form.venue_name.trim() || null,
        venue_address: form.venue_address.trim() || null,
        city: form.city.trim() || null,
        start_date: normalizedStartDate,
        end_date: normalizedEndDate,
        timezone: form.timezone.trim() || "UTC",
        hero_image_url: form.hero_image_url.trim() || null,
        flyer_image_url: form.flyer_image_url.trim() || null,
        cta_label: form.cta_label.trim() || "Count me in!",
        active: form.active,
        is_public: form.is_public,
        is_featured: form.is_featured,
        matchmaking_enabled: form.matchmaking_enabled,
        matching_mode: form.matching_mode,
        max_matches_per_user: Math.max(1, Number(form.max_matches_per_user) || 1),
        enrollment_opens_at: fromDateTimeLocalInput(form.enrollment_opens_at),
        enrollment_closes_at: fromDateTimeLocalInput(form.enrollment_closes_at),
        metadata: {
          ...((selectedEvent?.metadata as Record<string, unknown>) || {}),
          schedule_dates: form.schedule_dates,
          show_matches_to_users: form.show_matches_to_users,
        },
      };

      const query = selectedEventId
        ? supabase.from("events").update(payload).eq("id", selectedEventId).select().single()
        : supabase.from("events").insert(payload).select().single();

      const { data, error } = await query;

      if (error) throw error;

      toast({
        title: selectedEventId ? "Event updated" : "Event created",
        description: `${trimmedName} is ready to use.`,
      });

      await loadEvents();

      if (data?.id) {
        setSelectedEventId(data.id);
      }
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Events</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={handleCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            New
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading events...
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events yet. Create the first reusable event record.</p>
          ) : (
            events.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => handleSelectEvent(event)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  selectedEventId === event.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                }`}
              >
                {(() => {
                  const displayEvent =
                    selectedEventId === event.id
                      ? {
                          ...event,
                          name: selectedEventName || event.name,
                          slug: form.slug.trim() || event.slug,
                          active: form.active,
                          is_public: form.is_public,
                          is_featured: form.is_featured,
                        }
                      : event;

                  return (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{displayEvent.name}</p>
                    <p className="text-xs text-muted-foreground">{buildEventPath(displayEvent.slug)}</p>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {displayEvent.active && <Badge variant="secondary">Active</Badge>}
                    {!displayEvent.active && (
                      <Badge variant="outline" className="border-muted-foreground/30 bg-muted/40 text-muted-foreground">
                        Inactive
                      </Badge>
                    )}
                    {displayEvent.is_featured && <Badge>Featured</Badge>}
                    {!displayEvent.is_public && <Badge variant="outline">Hidden</Badge>}
                    {selectedEventId === event.id && hasUnsavedChanges && (
                      <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700">
                        Unsaved
                      </Badge>
                    )}
                  </div>
                </div>
                  );
                })()}
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <Card ref={formCardRef}>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <span>{selectedEvent ? `Edit ${selectedEventName || selectedEvent.name}` : "Create Event"}</span>
            {hasUnsavedChanges && (
              <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700">
                Unsaved changes
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="event-name">Name</Label>
              <Input
                id="event-name"
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                placeholder="Wine Tasting Speed Dating"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-slug">Slug</Label>
              <Input
                id="event-slug"
                value={form.slug}
                onChange={(event) => {
                  setSlugManuallyEdited(true);
                  updateForm("slug", slugifyEventName(event.target.value));
                }}
                placeholder="wine-tasting-speed-dating"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="event-tagline">Tagline</Label>
              <Input
                id="event-tagline"
                value={form.tagline}
                onChange={(event) => updateForm("tagline", event.target.value)}
                placeholder="A guided wine tasting with curated matches."
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="event-short-description">Short Description</Label>
              <Textarea
                id="event-short-description"
                rows={3}
                value={form.short_description}
                onChange={(event) => updateForm("short_description", event.target.value)}
                placeholder="Shown in banners and cards."
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="event-description">Full Description</Label>
              <Textarea
                id="event-description"
                rows={5}
                value={form.description}
                onChange={(event) => updateForm("description", event.target.value)}
                placeholder="Describe how signup and matching work for this event."
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="event-start-date">Start</Label>
              <Input
                id="event-start-date"
                type="datetime-local"
                value={form.start_date}
                onChange={(event) => updateForm("start_date", event.target.value)}
              />
              <p className="text-xs text-muted-foreground">Optional. Leave blank to publish with date and time TBA.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-end-date">End</Label>
              <Input
                id="event-end-date"
                type="datetime-local"
                value={form.end_date}
                onChange={(event) => updateForm("end_date", event.target.value)}
              />
              <p className="text-xs text-muted-foreground">Optional. Add this once the event window is confirmed.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-enrollment-open">Enrollment Opens</Label>
              <Input
                id="event-enrollment-open"
                type="datetime-local"
                value={form.enrollment_opens_at}
                onChange={(event) => updateForm("enrollment_opens_at", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-enrollment-close">Enrollment Closes</Label>
              <Input
                id="event-enrollment-close"
                type="datetime-local"
                value={form.enrollment_closes_at}
                onChange={(event) => updateForm("enrollment_closes_at", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-timezone">Timezone</Label>
              <Input
                id="event-timezone"
                value={form.timezone}
                onChange={(event) => updateForm("timezone", event.target.value)}
                placeholder="Europe/Zurich"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-cta">CTA Label</Label>
              <Input
                id="event-cta"
                value={form.cta_label}
                onChange={(event) => updateForm("cta_label", event.target.value)}
                placeholder="Count me in!"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="event-venue-name">Venue Name</Label>
              <Input
                id="event-venue-name"
                value={form.venue_name}
                onChange={(event) => updateForm("venue_name", event.target.value)}
                placeholder="Plaza Klub"
              />
              <p className="text-xs text-muted-foreground">Optional. Leave blank until the venue is confirmed.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-city">City</Label>
              <Input
                id="event-city"
                value={form.city}
                onChange={(event) => updateForm("city", event.target.value)}
                placeholder="Zurich"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="event-venue-address">Venue Address</Label>
              <Textarea
                id="event-venue-address"
                rows={2}
                value={form.venue_address}
                onChange={(event) => updateForm("venue_address", event.target.value)}
                placeholder="Badenerstrasse 109, 8004 Zurich"
              />
              <p className="text-xs text-muted-foreground">Optional. Add the address later without unpublishing the event.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="event-hero-image">Hero Image URL</Label>
              <Input
                id="event-hero-image"
                value={form.hero_image_url}
                onChange={(event) => updateForm("hero_image_url", event.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-flyer-image">Flyer Image URL</Label>
              <Input
                id="event-flyer-image"
                value={form.flyer_image_url}
                onChange={(event) => updateForm("flyer_image_url", event.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Matching Mode</Label>
              <Select value={form.matching_mode} onValueChange={(value) => updateForm("matching_mode", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Romantic + friendship (separate flows)</SelectItem>
                  <SelectItem value="event_default">Relationship first, friendship fallback</SelectItem>
                  <SelectItem value="relationship">Relationship only</SelectItem>
                  <SelectItem value="friendship">Friendship only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-max-matches">Max Matches Per User</Label>
              <Input
                id="event-max-matches"
                type="number"
                min={1}
                max={20}
                value={form.max_matches_per_user}
                onChange={(event) => updateForm("max_matches_per_user", event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                In combined event mode, this is the total cap across romantic and friendship pairings.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="font-medium">Active</p>
                <p className="text-sm text-muted-foreground">Show this event in the live system.</p>
              </div>
              <Switch checked={form.active} onCheckedChange={(checked) => updateForm("active", checked)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="font-medium">Public</p>
                <p className="text-sm text-muted-foreground">Allow public event page access.</p>
              </div>
              <Switch checked={form.is_public} onCheckedChange={(checked) => updateForm("is_public", checked)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="font-medium">Featured</p>
                <p className="text-sm text-muted-foreground">Use this event for the banner and /event shortcut.</p>
              </div>
              <Switch checked={form.is_featured} onCheckedChange={(checked) => updateForm("is_featured", checked)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="font-medium">Matchmaking Enabled</p>
                <p className="text-sm text-muted-foreground">Allow admin event matching runs for this event.</p>
              </div>
              <Switch
                checked={form.matchmaking_enabled}
                onCheckedChange={(checked) => updateForm("matchmaking_enabled", checked)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-purple-500/30 bg-purple-900/10 px-4 py-3">
              <div>
                <p className="font-medium">Schedule Dates</p>
                <p className="text-sm text-muted-foreground">When ON, mutual likes create a date to schedule. When OFF, users just meet at the event.</p>
              </div>
              <Switch
                checked={form.schedule_dates}
                onCheckedChange={(checked) => updateForm("schedule_dates", checked)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-purple-500/30 bg-purple-900/10 px-4 py-3">
              <div>
                <p className="font-medium">Show Matches to Users</p>
                <p className="text-sm text-muted-foreground">When ON, users see their event matches in the Matches page. When OFF, matches are hidden.</p>
              </div>
              <Switch
                checked={form.show_matches_to_users}
                onCheckedChange={(checked) => updateForm("show_matches_to_users", checked)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm">
            <div>
              <p className="font-medium">Event URL</p>
              <p className="text-muted-foreground">{buildEventPath(form.slug || "your-slug")}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Toggle changes only go live after you click Save Event.
              </p>
            </div>
            <Button type="button" onClick={handleSave} disabled={isSaving || !hasUnsavedChanges}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Event
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
