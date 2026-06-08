import { Fragment, useEffect, useMemo, useState } from "react";
import { Calendar, ChevronDown, ChevronRight, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import type { AppEvent } from "@/lib/events";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EventAttendee {
  user_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  event_id: string | null;
  event_key: string;
  event_label: string;
  event_slug: string | null;
  gender: string;
  gender_source: "personality" | "friendship" | "none";
}

interface EventAssignment {
  user_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  match_type: "relationship" | "friendship";
}

export const AdminEventAttendeesTab = () => {
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [eventsById, setEventsById] = useState<Map<string, AppEvent>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [expandedKey, setExpandedKey] = useState<{ userId: string; eventKey: string } | null>(null);
  const [assignments, setAssignments] = useState<EventAssignment[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [selectedEventKey, setSelectedEventKey] = useState<string>("all");

  useEffect(() => {
    loadAttendees();
  }, []);

  // Distinct events present in the attendee list, for the filter dropdown.
  const eventOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const attendee of attendees) {
      if (!map.has(attendee.event_key)) map.set(attendee.event_key, attendee.event_label);
    }
    return Array.from(map, ([key, label]) => ({ key, label })).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  }, [attendees]);

  const visibleAttendees = useMemo(
    () =>
      selectedEventKey === "all"
        ? attendees
        : attendees.filter((a) => a.event_key === selectedEventKey),
    [attendees, selectedEventKey]
  );

  const attendeeLookup = useMemo(
    () =>
      new Map(
        attendees.map((attendee) => [
          `${attendee.event_key}:${attendee.user_id}`,
          attendee,
        ])
      ),
    [attendees]
  );

  const loadAttendees = async () => {
    setIsLoading(true);
    try {
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from("event_enrollments")
        .select(`
          user_id,
          event_id,
          event_name,
          profiles:user_id (
            first_name
          )
        `);

      if (enrollmentsError) throw enrollmentsError;

      if (!enrollments || enrollments.length === 0) {
        setAttendees([]);
        setEventsById(new Map());
        return;
      }

      const userIds = enrollments.map((entry) => entry.user_id);
      const eventIds = Array.from(
        new Set(enrollments.map((entry) => entry.event_id).filter(Boolean))
      ) as string[];

      const [
        { data: privateRows, error: privateError },
        { data: eventsRows, error: eventsError },
        { data: personalityGenderQuestion },
        { data: friendshipGenderQuestions },
      ] = await Promise.all([
        supabase.from("private_profile_data" as any).select("user_id, last_name, email").in("user_id", userIds),
        eventIds.length > 0
          ? supabase.from("events").select("*").in("id", eventIds)
          : Promise.resolve({ data: [], error: null }),
        supabase.from("questionnaire_questions").select("id, options").ilike("question", "%gender%").limit(1).single(),
        supabase.from("friendship_questions").select("id, options").ilike("question", "%gender%"),
      ]);

      if (privateError) throw privateError;
      if (eventsError) throw eventsError;

      const eventMap = new Map<string, AppEvent>((eventsRows || []).map((event: AppEvent) => [event.id, event]));
      setEventsById(eventMap);

      const friendshipGenderIds = (friendshipGenderQuestions || []).map((q: any) => q.id);

      // Personality gender is always question_number = 16
      const [{ data: personalityAnswers }, { data: friendshipAnswers }] = await Promise.all([
        supabase
          .from("personality_answers")
          .select("user_id, answer, answer_custom")
          .in("user_id", userIds)
          .eq("question_number", 16),
        friendshipGenderIds.length > 0
          ? supabase
              .from("friendship_answers")
              .select("user_id, answer, answer_custom, question_id")
              .in("user_id", userIds)
              .in("question_id", friendshipGenderIds)
          : Promise.resolve({ data: [] }),
      ]);

      const parseOptions = (raw: any): any[] => {
        if (!raw) return [];
        try {
          return Array.isArray(raw) ? raw : JSON.parse(raw);
        } catch {
          return [];
        }
      };

      const personalityOptions = parseOptions(personalityGenderQuestion?.options);
      const friendshipOptionsById = new Map(
        (friendshipGenderQuestions || []).map((q: any) => [q.id, parseOptions(q.options)])
      );

      const resolveGenderLabel = (answer: string, type: "personality" | "friendship", questionId?: number): string => {
        if (!answer) return "Unknown";
        const options = type === "personality"
          ? personalityOptions
          : (questionId != null ? friendshipOptionsById.get(questionId) ?? [] : []);
        const match = (options as any[]).find((o: any) => o.value === answer);
        return match ? match.label : answer;
      };

      const privateByUser = new Map((privateRows || []).map((row: any) => [row.user_id, row]));
      const personalityByUser = new Map((personalityAnswers || []).map((r: any) => [r.user_id, r]));
      const friendshipByUser = new Map((friendshipAnswers || []).map((r: any) => [r.user_id, r]));

      const mergedAttendees: EventAttendee[] = enrollments.map((enrollment) => {
        const profile = enrollment.profiles as { first_name?: string } | null;
        const privateData = privateByUser.get(enrollment.user_id);
        const event = enrollment.event_id ? eventMap.get(enrollment.event_id) : null;
        const mode = event?.matching_mode || "event_default";

        const pa = personalityByUser.get(enrollment.user_id);
        const fa = friendshipByUser.get(enrollment.user_id);

        let gender = "Unknown";
        let gender_source: "personality" | "friendship" | "none" = "none";

        const preferFriendship = mode === "friendship";
        const primary = preferFriendship ? fa : pa;
        const fallback = preferFriendship ? pa : fa;

        if (primary) {
          if (preferFriendship) {
            gender = primary.answer_custom || resolveGenderLabel(primary.answer, "friendship", primary.question_id);
            gender_source = "friendship";
          } else {
            gender = primary.answer_custom || resolveGenderLabel(primary.answer, "personality");
            gender_source = "personality";
          }
        } else if (fallback) {
          if (preferFriendship) {
            gender = fallback.answer_custom || resolveGenderLabel(fallback.answer, "personality");
            gender_source = "personality";
          } else {
            gender = fallback.answer_custom || resolveGenderLabel(fallback.answer, "friendship", fallback.question_id);
            gender_source = "friendship";
          }
        }

        const eventLabel = event?.name || enrollment.event_name || "Legacy Event";
        const eventSlug = event?.slug || enrollment.event_name || null;
        const eventKey = enrollment.event_id || enrollment.event_name || `legacy-${enrollment.user_id}`;

        return {
          user_id: enrollment.user_id,
          first_name: profile?.first_name || "Unknown",
          last_name: privateData?.last_name ?? "",
          email: privateData?.email ?? "",
          event_id: enrollment.event_id,
          event_key: eventKey,
          event_label: eventLabel,
          event_slug: eventSlug,
          gender,
          gender_source,
        };
      });

      mergedAttendees.sort((a, b) =>
        a.event_label.localeCompare(b.event_label)
        || a.first_name.localeCompare(b.first_name)
        || (a.last_name || "").localeCompare(b.last_name || "")
      );

      setAttendees(mergedAttendees);
    } catch (error) {
      console.error("Error loading event attendees:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExpand = async (attendee: EventAttendee) => {
    if (expandedKey?.userId === attendee.user_id && expandedKey?.eventKey === attendee.event_key) {
      setExpandedKey(null);
      setAssignments([]);
      return;
    }

    setExpandedKey({ userId: attendee.user_id, eventKey: attendee.event_key });
    setIsLoadingDetails(true);
    setAssignments([]);

    try {
      let query = supabase
        .from("matches")
        .select("matched_user_id, match_type")
        .eq("from_algorithm", "event")
        .eq("user_id", attendee.user_id);

      query = attendee.event_id
        ? query.eq("event_id", attendee.event_id)
        : query.is("event_id", null);

      const { data, error } = await query;
      if (error) throw error;

      const resolvedAssignments = (data || [])
        .map((row) => {
          const matchedAttendee = attendeeLookup.get(`${attendee.event_key}:${row.matched_user_id}`);
          if (!matchedAttendee) return null;

          return {
            user_id: matchedAttendee.user_id,
            first_name: matchedAttendee.first_name,
            last_name: matchedAttendee.last_name,
            email: matchedAttendee.email,
            match_type: (row.match_type || "relationship") as "relationship" | "friendship",
          };
        })
        .filter(Boolean) as EventAssignment[];

      setAssignments(resolvedAssignments);
    } catch (error) {
      console.error("Error loading event assignments:", error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const downloadCSV = () => {
    if (!visibleAttendees.length) return;

    const headers = ["Event", "First Name", "Last Name", "Email", "Gender"];
    const rows = visibleAttendees.map((attendee) => [
      attendee.event_label,
      attendee.first_name,
      attendee.last_name,
      attendee.email,
      attendee.gender,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${(cell || "").replace(/"/g, "\"\"")}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `event_attendees_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Event Attendees
        </CardTitle>
        <div className="flex items-center gap-3">
          <Select value={selectedEventKey} onValueChange={setSelectedEventKey}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Filter by event" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All events ({attendees.length})</SelectItem>
              {eventOptions.map((option) => (
                <SelectItem key={option.key} value={option.key}>
                  {option.label} ({attendees.filter((a) => a.event_key === option.key).length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            onClick={downloadCSV}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Download CSV
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Event</TableHead>
              <TableHead>First Name</TableHead>
              <TableHead>Last Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Gender</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleAttendees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No event attendees found.
                </TableCell>
              </TableRow>
            ) : (
              visibleAttendees.map((attendee) => {
                const isExpanded =
                  expandedKey?.userId === attendee.user_id && expandedKey?.eventKey === attendee.event_key;
                const event = attendee.event_id ? eventsById.get(attendee.event_id) : null;

                return (
                  <Fragment key={`${attendee.event_key}:${attendee.user_id}`}>
                    <TableRow className={isExpanded ? "border-b-0 bg-muted/50" : ""}>
                      <TableCell>
                        <button
                          onClick={() => handleExpand(attendee)}
                          className="rounded p-1 hover:bg-slate-200"
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="space-y-1">
                          <div>{attendee.event_label}</div>
                          {event?.slug && (
                            <div className="text-xs text-muted-foreground">/{event.slug}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{attendee.first_name}</TableCell>
                      <TableCell>{attendee.last_name}</TableCell>
                      <TableCell>{attendee.email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{attendee.gender}</span>
                          {attendee.gender_source !== "none" && (
                            <span className="text-xs text-muted-foreground">({attendee.gender_source})</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow className="bg-muted">
                        <TableCell colSpan={6}>
                          <div className="p-4 space-y-4">
                            {isLoadingDetails ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Loading assigned event matches...
                              </div>
                            ) : assignments.length === 0 ? (
                              <div className="text-sm text-muted-foreground">
                                No event matches assigned yet for this attendee.
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold">Assigned Matches</span>
                                  <Badge variant="secondary">{assignments.length}</Badge>
                                </div>
                                <div className="space-y-2">
                                  {assignments.map((assignment) => (
                                    <div
                                      key={assignment.user_id}
                                      className="flex items-center justify-between rounded-lg border bg-background px-3 py-2"
                                    >
                                      <div>
                                        <p className="font-medium">
                                          {assignment.first_name} {assignment.last_name}
                                        </p>
                                        <p className="text-sm text-muted-foreground">{assignment.email}</p>
                                      </div>
                                      <Badge variant={assignment.match_type === "friendship" ? "outline" : "default"}>
                                        {assignment.match_type}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
