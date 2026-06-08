import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Calendar, ClipboardCheck, Heart, Loader2, MapPin, PartyPopper, Sparkles, Users } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AppEvent } from "@/lib/events";
import { formatEventDate, formatEventDateTime, isEventEnrollmentOpen } from "@/lib/events";

type Enrollment = {
  user_id: string;
  created_at: string;
};

type EventMatchPreviewRow = {
  user1_id: string;
  user2_id: string;
  compatibility_score: number;
  match_type: "relationship" | "friendship";
  user1_profile: {
    id: string;
    first_name: string;
    last_name: string | null;
    email: string | null;
  };
  user2_profile: {
    id: string;
    first_name: string;
    last_name: string | null;
    email: string | null;
  };
};

const Event = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [event, setEvent] = useState<AppEvent | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [eventMatchPreviewRows, setEventMatchPreviewRows] = useState<EventMatchPreviewRow[]>([]);
  const [selectedPreviewMatch, setSelectedPreviewMatch] = useState<EventMatchPreviewRow | null>(null);
  const [compatibilityOpen, setCompatibilityOpen] = useState(false);
  const [compatibilityLoading, setCompatibilityLoading] = useState(false);
  const [compatibilityText, setCompatibilityText] = useState<string | null>(null);

  useEffect(() => {
    loadEventPage();
  }, [slug]);

  const loadEventPage = async () => {
    setLoading(true);
    try {
      const nowIso = new Date().toISOString();
      const eventQuery = slug
        ? supabase
            .from("events")
            .select("*")
            .eq("slug", slug)
            .eq("active", true)
            .eq("is_public", true)
            .or(`start_date.gte.${nowIso},start_date.is.null`)
            .maybeSingle()
        : supabase
            .from("events")
            .select("*")
            .eq("active", true)
            .eq("is_public", true)
            .or(`start_date.gte.${nowIso},start_date.is.null`)
            .order("is_featured", { ascending: false })
            .order("start_date", { ascending: true, nullsFirst: false })
            .limit(1)
            .maybeSingle();

      const [{ data: eventData, error: eventError }, { data: { session } }] = await Promise.all([
        eventQuery,
        supabase.auth.getSession(),
      ]);

      if (eventError) throw eventError;

      const currentEvent = (eventData || null) as AppEvent | null;
      setEvent(currentEvent);
      setSessionUser(session?.user ?? null);
      setIsAdmin(false);

      if (!currentEvent) {
        setEnrollments([]);
        setIsEnrolled(false);
        return;
      }

      await fetchEnrollments(currentEvent.id);

      if (session?.user) {
        await Promise.all([
          checkEnrollmentStatus(session.user.id, currentEvent.id),
          loadUserProfile(session.user.id),
          loadAdminRole(session.user.id),
        ]);
      } else {
        setIsEnrolled(false);
        setUserProfile(null);
      }
    } catch (error: any) {
      toast({
        title: "Could not load event",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAdminRole = async (userId: string) => {
    const { data: hasAdminRole, error } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    if (error) {
      console.error("Error checking admin role", error);
      setIsAdmin(false);
      return;
    }

    setIsAdmin(!!hasAdminRole);
  };

  const loadUserProfile = async (userId: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("completed_questionnaire, completed_friendship_questionnaire")
      .eq("id", userId)
      .maybeSingle();

    setUserProfile(profile || null);
  };

  const checkEnrollmentStatus = async (userId: string, eventId: string) => {
    const { data, error } = await supabase
      .from("event_enrollments")
      .select("id")
      .eq("user_id", userId)
      .eq("event_id", eventId)
      .maybeSingle();

    if (error) {
      console.error("Error checking event enrollment status", error);
      return;
    }

    setIsEnrolled(!!data);
  };

  const fetchEnrollments = async (eventId: string) => {
    const { data, error } = await supabase
      .from("event_enrollments")
      .select("user_id, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching enrollments", error);
      toast({
        title: "Could not load roster",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setEnrollments((data || []) as Enrollment[]);
  };

  const loadEventMatchPreview = async (eventId: string) => {
    setPreviewLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-event-match-preview", {
        body: { eventId },
      });

      if (error) throw error;

      const payload = typeof data === "string" ? JSON.parse(data) : data;
      setEventMatchPreviewRows((payload?.matches || []) as EventMatchPreviewRow[]);
    } catch (error: any) {
      console.error("Error loading event match preview", error);
      toast({
        title: "Could not load potential matches",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const openPreviewDialog = async () => {
    if (!event) return;
    setPreviewOpen(true);
    await loadEventMatchPreview(event.id);
  };

  const openCompatibilityDialog = async (matchRow: EventMatchPreviewRow) => {
    setSelectedPreviewMatch(matchRow);
    setCompatibilityOpen(true);
    setCompatibilityLoading(true);
    setCompatibilityText(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-compatibility", {
        body: {
          userId1: matchRow.user1_id,
          userId2: matchRow.user2_id,
          match_type: matchRow.match_type,
        },
      });

      if (error) throw error;

      const payload = typeof data === "string" ? JSON.parse(data) : data;
      setCompatibilityText(payload?.compatibility || "Compatibility insight is not available yet.");
    } catch (error: any) {
      console.error("Error loading compatibility insight", error);
      setCompatibilityText("Compatibility insight is temporarily unavailable.");
      toast({
        title: "Could not load compatibility",
        description: error.message || "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setCompatibilityLoading(false);
    }
  };

  const getRequiredQuestionnaires = (matchingMode: string): { romantic: boolean; friendship: boolean } => {
    switch (matchingMode) {
      case "relationship": return { romantic: true, friendship: false };
      case "friendship": return { romantic: false, friendship: true };
      case "both":
      case "event_default":
      default: return { romantic: true, friendship: false }; // at minimum romantic
    }
  };

  const getMissingQuestionnaires = (): string[] => {
    if (!event || !userProfile) return [];
    const mode = event.matching_mode || "event_default";
    const required = getRequiredQuestionnaires(mode);
    const missing: string[] = [];
    if (required.romantic && !userProfile.completed_questionnaire) missing.push("Compatibility Survey");
    if (required.friendship && !userProfile.completed_friendship_questionnaire) missing.push("Friendship Survey");
    return missing;
  };

  const toggleEnrollment = async () => {
    if (!event) return;

    if (!sessionUser) {
      navigate("/auth");
      return;
    }

    if (!isEventEnrollmentOpen(event)) {
      toast({
        title: "Enrollment closed",
        description: "This event is no longer accepting signups.",
        variant: "destructive",
      });
      return;
    }

    // Check questionnaire completion before enrolling (not when unenrolling)
    if (!isEnrolled) {
      const missing = getMissingQuestionnaires();
      if (missing.length > 0) {
        toast({
          title: "Questionnaire required",
          description: `Please complete the ${missing.join(" and ")} before signing up for this event.`,
          variant: "destructive",
        });
        navigate("/questionnaire-intro");
        return;
      }
    }

    setEnrolling(true);

    try {
      if (isEnrolled) {
        const { error } = await supabase
          .from("event_enrollments")
          .delete()
          .eq("user_id", sessionUser.id)
          .eq("event_id", event.id);

        if (error) throw error;

        setIsEnrolled(false);
        toast({
          title: "Unenrolled",
          description: `You have been removed from ${event.name}.`,
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
        toast({
          title: "You're going",
          description: `You are signed up for ${event.name}.`,
        });
      }

      await fetchEnrollments(event.id);
    } catch (error: any) {
      toast({
        title: "Enrollment failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-linear-to-b from-white/70 via-violet-50/60 to-fuchsia-50/70 p-4 py-12 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl">
          <Card className="border-white/50 bg-white/85 shadow-xl backdrop-blur-xl">
            <CardContent className="p-8 text-center space-y-4">
              <h1 className="text-3xl font-bold">Event not found</h1>
              <p className="text-muted-foreground">There is no public event available at this URL.</p>
              <Button onClick={() => navigate("/")}>Back Home</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const imageSrc = event.flyer_image_url || event.hero_image_url || null;
  const venueLabel = [event.venue_name, event.venue_address].filter(Boolean).join("\n");
  const enrollmentOpen = isEventEnrollmentOpen(event);
  const eventDateLabel = event.start_date ? formatEventDateTime(event.start_date, event.timezone) : "Date and time announced soon";
  const venueDetailsLabel = venueLabel || event.city || "Venue announced soon";
  const surfaceCardClass = "border-white/55 bg-white/84 shadow-xl shadow-violet-950/10 backdrop-blur-xl";
  const featureCardClass = `${surfaceCardClass} transition-all hover:shadow-2xl hover:shadow-violet-950/10`;

  return (
    <div className="min-h-screen bg-linear-to-b from-white/72 via-violet-50/66 to-fuchsia-50/72 backdrop-blur-sm">
      <div className="mx-auto max-w-5xl p-4 py-8 space-y-6">
        <div className="text-center space-y-4">
          <h1 className="bg-linear-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent lg:text-5xl">
            {event.name}
          </h1>
          <p className="text-xl text-muted-foreground">
            {event.tagline || event.short_description || "A special curated matchmaking event."}
          </p>
        </div>

        <h2 className="text-2xl font-bold">How it works</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className={`cursor-pointer ${featureCardClass}`} onClick={() => navigate("/questionnaire-intro")}>
            <CardContent className="pt-6 flex flex-col items-center text-center space-y-2">
              <div className="rounded-full bg-violet-100 p-3 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                <ClipboardCheck className="h-6 w-6" />
              </div>
              <h3 className="font-semibold">1. Complete your profile</h3>
              <p className="pb-2 text-sm text-muted-foreground">
                Fill out the questionnaire that fits this event so we can generate better pairings.
              </p>
              <div className="flex w-full flex-col gap-2 px-4">
                {userProfile && event && (() => {
                  const required = getRequiredQuestionnaires(event.matching_mode || "event_default");
                  return (
                    <>
                      {required.friendship && (
                        userProfile.completed_friendship_questionnaire ? (
                          <Badge variant="secondary" className="w-full justify-center bg-green-100 text-green-800 hover:bg-green-100">
                            Friendship Survey Completed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="w-full justify-center border-destructive/50 bg-destructive/10 text-destructive">
                            Friendship Survey Not Completed
                          </Badge>
                        )
                      )}
                      {required.romantic && (
                        userProfile.completed_questionnaire ? (
                          <Badge variant="secondary" className="w-full justify-center bg-purple-100 text-purple-800 hover:bg-purple-100">
                            Compatibility Survey Completed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="w-full justify-center border-destructive/50 bg-destructive/10 text-destructive">
                            Compatibility Survey Not Completed
                          </Badge>
                        )
                      )}
                    </>
                  );
                })()}
              </div>
            </CardContent>
          </Card>

          {(event.metadata as any)?.show_matches_to_users !== false && (
            <Card className={`cursor-pointer ${featureCardClass}`} onClick={() => navigate("/matches")}>
              <CardContent className="pt-6 flex flex-col items-center text-center space-y-2">
                <div className="rounded-full bg-fuchsia-100 p-3 text-fuchsia-600 dark:bg-fuchsia-900/30 dark:text-fuchsia-400">
                  <Heart className="h-6 w-6" />
                </div>
                <h3 className="font-semibold">2. We generate event pairings</h3>
                <p className="text-sm text-muted-foreground">
                  When matching runs for this event, your pairings appear on your matches page.
                </p>
              </CardContent>
            </Card>
          )}

          {(() => {
            const scheduleDates = (event.metadata as any)?.schedule_dates !== false;
            const step = (event.metadata as any)?.show_matches_to_users !== false ? "3." : "2.";
            return (
              <Card className={surfaceCardClass}>
                <CardContent className="pt-6 flex flex-col items-center text-center space-y-2">
                  <div className="rounded-full bg-violet-100 p-3 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                    <PartyPopper className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold">{step} {scheduleDates ? "We'll schedule a date for you" : "Meet at the event"}</h3>
                  <p className="text-sm text-muted-foreground">
                    {scheduleDates
                      ? "We'll schedule a date for you to meet during the event."
                      : "Meet at the event on the night."}
                  </p>
                </CardContent>
              </Card>
            );
          })()}
        </div>

        <h2 className="text-2xl font-bold">Sign Up</h2>
        <Card className="overflow-hidden border-white/60 bg-white/88 shadow-2xl shadow-violet-950/10 backdrop-blur-xl">
          <div className="grid gap-0 md:grid-cols-2">
            <div className="relative h-[400px] overflow-hidden bg-linear-to-br from-violet-950 via-violet-900 to-fuchsia-900 md:h-auto">
              {imageSrc ? (
                <img src={imageSrc} alt={event.name} className="h-full w-full object-contain" />
              ) : (
                <div className="relative flex h-full flex-col justify-between overflow-hidden p-8 text-white">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_34%)]" />
                  <div className="relative z-10 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium text-white/90">
                    <Sparkles className="h-4 w-4" />
                    Orbiit Event
                  </div>
                  <div className="relative z-10 space-y-4">
                    <p className="text-sm uppercase tracking-[0.28em] text-white/65">
                      {event.city || event.timezone || "Curated matchmaking"}
                    </p>
                    <h3 className="max-w-md text-3xl font-bold leading-tight">
                      {event.name}
                    </h3>
                    <p className="max-w-md text-base leading-relaxed text-white/80">
                      {event.tagline || event.short_description || "Curated pairings, thoughtful introductions, and a better night to meet people."}
                    </p>
                  </div>
                  <div className="relative z-10 space-y-1 text-sm text-white/72">
                    <p>{eventDateLabel}</p>
                    <p>{venueDetailsLabel}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col justify-center space-y-6 p-8">
              <div>
                <h3 className="mb-2 text-2xl font-bold">Event Details</h3>
                <div className="space-y-3 text-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-violet-500" />
                    <span>{eventDateLabel}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-1 h-5 w-5 text-violet-500" />
                    <span className="whitespace-pre-line">{venueDetailsLabel}</span>
                  </div>
                </div>
              </div>

              {(event.description || event.short_description) && (
                <div className="border-t border-violet-100/80 pt-6 text-sm text-muted-foreground whitespace-pre-line">
                  {event.description || event.short_description}
                </div>
              )}

              <div className="border-t border-violet-100/80 pt-6">
                <h3 className="mb-4 text-xl font-semibold">Are you going?</h3>
                {(() => {
                  const missing = getMissingQuestionnaires();
                  const showWarning = !isEnrolled && sessionUser && userProfile && missing.length > 0 && enrollmentOpen;
                  return showWarning ? (
                    <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-600 dark:bg-amber-900/20 dark:text-amber-200">
                      <p className="font-medium mb-1">Complete your questionnaire to sign up</p>
                      <p>This event requires the <strong>{missing.join(" and ")}</strong>. Please complete {missing.length > 1 ? "them" : "it"} first.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 border-amber-400 text-amber-800 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-200"
                        onClick={() => navigate("/questionnaire-intro")}
                      >
                        Go to Questionnaire
                      </Button>
                    </div>
                  ) : null;
                })()}
                <Button
                  size="lg"
                  className={`w-full text-lg ${isEnrolled
                    ? "border-2 border-red-600 from-white to-white text-red-600 hover:bg-red-200"
                    : "bg-linear-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/20 hover:opacity-90"
                    }`}
                  onClick={toggleEnrollment}
                  disabled={enrolling || !enrollmentOpen}
                >
                  {enrolling ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : isEnrolled ? (
                    "Unregister"
                  ) : enrollmentOpen ? (
                    event.cta_label || "Count me in!"
                  ) : (
                    "Enrollment Closed"
                  )}
                </Button>
                <p className="mt-3 text-center text-sm text-muted-foreground">
                  {isEnrolled
                    ? "You are on the list."
                    : enrollmentOpen
                      ? "Join the attendee roster for this event."
                      : "This event is no longer accepting signups."}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-violet-500" />
              <h2 className="text-2xl font-bold">Who's Going ({enrollments.length})</h2>
            </div>
            {isAdmin && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={(event.metadata as any)?.show_matches_to_users !== false ? "secondary" : "outline"}>
                  {(event.metadata as any)?.show_matches_to_users !== false ? "Visible to attendees" : "Hidden from attendees"}
                </Badge>
                <Button variant="outline" onClick={openPreviewDialog}>
                  Preview Potential Matches
                </Button>
              </div>
            )}
          </div>

          <Card className={surfaceCardClass}>
            <CardContent className="p-0">
              {enrollments.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Be the first to join.</div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-muted/50">
                      <tr className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        <th className="px-6 py-3">Attendee</th>
                        <th className="px-6 py-3">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {enrollments.map((entry) => (
                        <tr key={entry.user_id}>
                          <td className="px-6 py-4 text-sm font-medium">Anonymous Orbiit User</td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {formatEventDate(entry.created_at, event.timezone)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Admin Match Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>These are the event matches currently generated for this event.</span>
              <Badge variant={(event.metadata as any)?.show_matches_to_users !== false ? "secondary" : "outline"}>
                {(event.metadata as any)?.show_matches_to_users !== false ? "Already visible to attendees" : "Still hidden from attendees"}
              </Badge>
            </div>

            {previewLoading ? (
              <div className="flex items-center gap-2 rounded-lg border p-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading potential matches...
              </div>
            ) : eventMatchPreviewRows.length === 0 ? (
              <div className="rounded-lg border p-6 text-sm text-muted-foreground">
                No event matches have been created for this event yet.
              </div>
            ) : (
              <div className="space-y-3">
                {eventMatchPreviewRows.map((matchRow) => (
                  <div
                    key={[matchRow.user1_id, matchRow.user2_id].sort().join(":")}
                    className="rounded-xl border bg-background p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={matchRow.match_type === "friendship" ? "outline" : "secondary"}>
                            {matchRow.match_type === "friendship" ? "Friendship" : "Relationship"}
                          </Badge>
                          <Badge variant="default">{matchRow.compatibility_score}% match</Badge>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <p className="font-semibold">
                              {matchRow.user1_profile.first_name} {matchRow.user1_profile.last_name || ""}
                            </p>
                            <p className="text-sm text-muted-foreground">{matchRow.user1_profile.email || "No email"}</p>
                          </div>
                          <div>
                            <p className="font-semibold">
                              {matchRow.user2_profile.first_name} {matchRow.user2_profile.last_name || ""}
                            </p>
                            <p className="text-sm text-muted-foreground">{matchRow.user2_profile.email || "No email"}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => openCompatibilityDialog(matchRow)}>
                          Why compatible?
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={compatibilityOpen} onOpenChange={setCompatibilityOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Compatibility Insight</DialogTitle>
          </DialogHeader>
          {selectedPreviewMatch && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={selectedPreviewMatch.match_type === "friendship" ? "outline" : "secondary"}>
                  {selectedPreviewMatch.match_type === "friendship" ? "Friendship" : "Relationship"}
                </Badge>
                <Badge variant="default">{selectedPreviewMatch.compatibility_score}% match</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedPreviewMatch.user1_profile.first_name} {selectedPreviewMatch.user1_profile.last_name || ""} and{" "}
                {selectedPreviewMatch.user2_profile.first_name} {selectedPreviewMatch.user2_profile.last_name || ""}
              </div>
              <Card className="border-primary/20 bg-linear-to-r from-primary/5 to-secondary/5">
                <CardContent className="pt-6">
                  {compatibilityLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating compatibility insight...
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed">{compatibilityText}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Event;
