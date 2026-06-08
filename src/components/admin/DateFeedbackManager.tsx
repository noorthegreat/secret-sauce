
import { useMemo, useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2, Plus, MessageSquare, Star } from "lucide-react";

// Temporary types until generated
type DateFeedbackQuestion = {
    id: string;
    question: string;
    is_active: boolean;
    created_at: string;
};

type DateFeedbackAnswer = {
    id: string;
    date_id: string;
    question_id: string;
    user_id: string;
    answer: string;
    created_at: string;
    // Joins
    date_feedback_questions?: DateFeedbackQuestion;
    profiles?: {
        first_name: string;
        last_name: string | null;
    };
    dates?: {
        matched_user: {
            first_name: string;
        }
    }
};

type ContinuationFeedbackAnswer = {
    id: string;
    date_id: string;
    user_id: string;
    status: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
    user?: {
        first_name: string;
        last_name: string | null;
    };
    partnerName?: string;
    matchType?: "relationship" | "friendship";
};

export const DateFeedbackManager = () => {
    const { toast } = useToast();
    const [questions, setQuestions] = useState<DateFeedbackQuestion[]>([]);
    const [answers, setAnswers] = useState<any[]>([]); // Using any for joined data convenience
    const [continuationAnswers, setContinuationAnswers] = useState<ContinuationFeedbackAnswer[]>([]);
    const [venueRatings, setVenueRatings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newQuestionText, setNewQuestionText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [responsesView, setResponsesView] = useState<"questions" | "users">("users");
    const [responseType, setResponseType] = useState<"date_feedback" | "continuation_feedback">("date_feedback");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        await Promise.all([loadQuestions(), loadAnswers(), loadContinuationAnswers(), loadVenueRatings()]);
        setIsLoading(false);
    };

    const loadQuestions = async () => {
        // @ts-ignore
        const { data, error } = await (supabase as any)
            .from("date_feedback_questions")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error loading questions:", error);
            toast({
                title: "Error",
                description: "Failed to load questions",
                variant: "destructive",
            });
        } else {
            setQuestions(data as any || []);
        }
    };

    const loadAnswers = async () => {
        // We need to fetch answers and join with related data
        // Note: Supabase nested joins can be tricky if relationships aren't perfect in types
        // asking for: answers, question content, user name

        try {
            // @ts-ignore
            const { data, error } = await (supabase as any)
                .from("date_feedback_answers")
                .select(`
                    *,
                    question:date_feedback_questions(question),
                    user:profiles(first_name),
                    date:dates(id)
                `)
                .order("created_at", { ascending: false });

            if (error) throw error;
            const rows = data || [];
            const userIds = Array.from(new Set(rows.map((r: any) => r.user_id).filter(Boolean)));
            if (userIds.length === 0) {
                setAnswers(rows);
                return;
            }

            const { data: privateRows, error: privateError } = await (supabase as any)
                .from("private_profile_data")
                .select("user_id, last_name")
                .in("user_id", userIds);

            if (privateError) throw privateError;

            const privateByUser = new Map((privateRows || []).map((r: any) => [r.user_id, r]));
            const enrichedRows = rows.map((ans: any) => ({
                ...ans,
                user: {
                    ...(ans.user || {}),
                    last_name: (privateByUser.get(ans.user_id) as any)?.last_name ?? null,
                },
            }));
            setAnswers(enrichedRows);
        } catch (error: any) {
            console.error("Error loading answers:", error);
            // Non-critical, maybe just empty
        }
    };

    const loadContinuationAnswers = async () => {
        try {
            // @ts-ignore
            const { data, error } = await (supabase as any)
                .from("date_continuation_feedback")
                .select("*")
                .order("updated_at", { ascending: false });

            if (error) throw error;

            const rows = data || [];
            if (rows.length === 0) {
                setContinuationAnswers([]);
                return;
            }

            const userIds = Array.from(new Set(rows.map((row: any) => row.user_id).filter(Boolean)));
            const dateIds = Array.from(new Set(rows.map((row: any) => row.date_id).filter(Boolean)));

            const [
                { data: profileRows, error: profileError },
                { data: privateRows, error: privateError },
                { data: dateRows, error: dateError },
            ] = await Promise.all([
                // @ts-ignore
                (supabase as any).from("profiles").select("id, first_name").in("id", userIds),
                // @ts-ignore
                (supabase as any).from("private_profile_data").select("user_id, last_name").in("user_id", userIds),
                // @ts-ignore
                (supabase as any).from("dates").select("id, user1_id, user2_id, match_type").in("id", dateIds),
            ]);

            if (profileError) throw profileError;
            if (privateError) throw privateError;
            if (dateError) throw dateError;

            const profilesById = new Map((profileRows || []).map((row: any) => [row.id, row]));
            const privateByUserId = new Map((privateRows || []).map((row: any) => [row.user_id, row]));
            const datesById = new Map((dateRows || []).map((row: any) => [row.id, row]));

            const partnerIds = Array.from(new Set(
                rows.map((row: any) => {
                    const date = datesById.get(row.date_id);
                    if (!date) return null;
                    return date.user1_id === row.user_id ? date.user2_id : date.user1_id;
                }).filter(Boolean)
            ));

            let partnerProfilesById = new Map<string, any>();
            if (partnerIds.length > 0) {
                // @ts-ignore
                const { data: partnerProfiles, error: partnerError } = await (supabase as any)
                    .from("profiles")
                    .select("id, first_name")
                    .in("id", partnerIds);

                if (partnerError) throw partnerError;
                partnerProfilesById = new Map((partnerProfiles || []).map((row: any) => [row.id, row]));
            }

            const enrichedRows: ContinuationFeedbackAnswer[] = rows.map((row: any) => {
                const profile = profilesById.get(row.user_id);
                const privateProfile = privateByUserId.get(row.user_id);
                const date = datesById.get(row.date_id);
                const partnerId = date ? (date.user1_id === row.user_id ? date.user2_id : date.user1_id) : null;
                const partnerProfile = partnerId ? partnerProfilesById.get(partnerId) : null;

                return {
                    ...row,
                    user: {
                        first_name: profile?.first_name || "Unknown",
                        last_name: privateProfile?.last_name ?? null,
                    },
                    partnerName: partnerProfile?.first_name || "Unknown",
                    matchType: date?.match_type === "friendship" ? "friendship" : "relationship",
                };
            });

            setContinuationAnswers(enrichedRows);
        } catch (error: any) {
            console.error("Error loading continuation answers:", error);
            toast({
                title: "Error",
                description: "Failed to load continuation check-ins",
                variant: "destructive",
            });
        }
    };

    const loadVenueRatings = async () => {
        try {
            const { data, error } = await supabase
                .from("dates")
                .select(`
                    id, date_time, location, confirmed_venue_id,
                    user1_venue_rating, user2_venue_rating,
                    user1:profiles!dates_user1_id_fkey1(id, first_name),
                    user2:profiles!dates_user2_id_fkey1(id, first_name),
                    venue:venues(name)
                `)
                .or("user1_venue_rating.not.is.null,user2_venue_rating.not.is.null")
                .order("date_time", { ascending: false });

            if (error) throw error;
            setVenueRatings(data || []);
        } catch (error: any) {
            console.error("Error loading venue ratings:", error);
        }
    };

    const handleAddQuestion = async () => {
        if (!newQuestionText.trim()) return;
        setIsSubmitting(true);

        try {
            // @ts-ignore
            const { error } = await (supabase as any)
                .from("date_feedback_questions")
                .insert([{ question: newQuestionText }])
                .select();

            if (error) throw error;

            toast({ title: "Success", description: "Question added" });
            setNewQuestionText("");
            loadQuestions();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleActive = async (question: DateFeedbackQuestion) => {
        try {
            // @ts-ignore
            const { error } = await (supabase as any)
                .from("date_feedback_questions")
                .update({ is_active: !question.is_active })
                .eq("id", question.id);

            if (error) throw error;

            // Optimistic update
            setQuestions(prev => prev.map(q =>
                q.id === question.id ? { ...q, is_active: !q.is_active } : q
            ));

            toast({ title: "Updated", description: "Question status updated" });
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
            loadQuestions(); // Revert on error
        }
    };

    const feedbackByUser = useMemo(() => {
        const grouped = new Map<string, {
            userId: string;
            fullName: string;
            latestResponseAt: string;
            responses: Array<{
                id: string;
                dateId: string;
                question: string;
                answer: string;
                createdAt: string;
            }>;
        }>();

        for (const ans of answers) {
            const userId = ans.user_id || "unknown-user";
            const firstName = ans.user?.first_name || "Unknown";
            const lastName = ans.user?.last_name || "";
            const fullName = `${firstName} ${lastName}`.trim();
            const createdAt = ans.created_at || new Date().toISOString();
            const question = ans.question?.question || "Unknown Question";

            if (!grouped.has(userId)) {
                grouped.set(userId, {
                    userId,
                    fullName,
                    latestResponseAt: createdAt,
                    responses: [],
                });
            }

            const entry = grouped.get(userId)!;
            if (new Date(createdAt).getTime() > new Date(entry.latestResponseAt).getTime()) {
                entry.latestResponseAt = createdAt;
            }
            entry.responses.push({
                id: ans.id,
                dateId: ans.date_id,
                question,
                answer: ans.answer,
                createdAt,
            });
        }

        return Array.from(grouped.values())
            .map((entry) => ({
                ...entry,
                responses: entry.responses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
            }))
            .sort((a, b) => new Date(b.latestResponseAt).getTime() - new Date(a.latestResponseAt).getTime());
    }, [answers]);

    const continuationByUser = useMemo(() => {
        const grouped = new Map<string, {
            userId: string;
            fullName: string;
            latestResponseAt: string;
            responses: Array<{
                id: string;
                dateId: string;
                partnerName: string;
                status: string;
                notes: string | null;
                matchType: "relationship" | "friendship";
                createdAt: string;
            }>;
        }>();

        for (const answer of continuationAnswers) {
            const userId = answer.user_id || "unknown-user";
            const firstName = answer.user?.first_name || "Unknown";
            const lastName = answer.user?.last_name || "";
            const fullName = `${firstName} ${lastName}`.trim();
            const createdAt = answer.updated_at || answer.created_at || new Date().toISOString();

            if (!grouped.has(userId)) {
                grouped.set(userId, {
                    userId,
                    fullName,
                    latestResponseAt: createdAt,
                    responses: [],
                });
            }

            const entry = grouped.get(userId)!;
            if (new Date(createdAt).getTime() > new Date(entry.latestResponseAt).getTime()) {
                entry.latestResponseAt = createdAt;
            }
            entry.responses.push({
                id: answer.id,
                dateId: answer.date_id,
                partnerName: answer.partnerName || "Unknown",
                status: answer.status,
                notes: answer.notes,
                matchType: answer.matchType || "relationship",
                createdAt,
            });
        }

        return Array.from(grouped.values())
            .map((entry) => ({
                ...entry,
                responses: entry.responses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
            }))
            .sort((a, b) => new Date(b.latestResponseAt).getTime() - new Date(a.latestResponseAt).getTime());
    }, [continuationAnswers]);

    const formatContinuationStatus = (status: string) => {
        switch (status) {
            case "still_dating":
                return "Still dating";
            case "still_friends":
                return "Still friends";
            case "stayed_in_touch":
                return "Stayed in touch";
            case "not_anymore":
                return "Not anymore";
            case "other":
                return "Other";
            default:
                return status;
        }
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <Tabs defaultValue="questions">
                <TabsList>
                    <TabsTrigger value="questions">Questions Manager</TabsTrigger>
                    <TabsTrigger value="responses">User Responses</TabsTrigger>
                    <TabsTrigger value="venue_ratings">Venue Ratings</TabsTrigger>
                </TabsList>

                <TabsContent value="questions" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Add New Question</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-4">
                                <Input
                                    placeholder="e.g. How was the conversation?"
                                    value={newQuestionText}
                                    onChange={(e) => setNewQuestionText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddQuestion()}
                                />
                                <Button onClick={handleAddQuestion} disabled={isSubmitting || !newQuestionText.trim()}>
                                    <Plus className="w-4 h-4 mr-2" /> Add
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Active Questions</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                These questions will appear in the "Date Feedback" dialog for all users.
                            </p>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Question</TableHead>
                                        <TableHead className="w-[100px]">Status</TableHead>
                                        <TableHead className="w-[150px]">Created</TableHead>
                                        <TableHead className="w-[100px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {questions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-muted-foreground">
                                                No questions added yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        questions.map((q) => (
                                            <TableRow key={q.id}>
                                                <TableCell className="font-medium">{q.question}</TableCell>
                                                <TableCell>
                                                    {q.is_active ?
                                                        <Badge className="bg-green-600">Active</Badge> :
                                                        <Badge variant="secondary">Disabled</Badge>
                                                    }
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {format(new Date(q.created_at), "MMM d, yyyy")}
                                                </TableCell>
                                                <TableCell>
                                                    <Switch
                                                        checked={q.is_active}
                                                        onCheckedChange={() => handleToggleActive(q)}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="responses">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between gap-3">
                                <CardTitle>Recent Feedback Responses</CardTitle>
                                <div className="flex items-center gap-3">
                                    <Tabs value={responseType} onValueChange={(value) => setResponseType(value as "date_feedback" | "continuation_feedback")}>
                                        <TabsList>
                                            <TabsTrigger value="date_feedback">Post-Date Feedback</TabsTrigger>
                                            <TabsTrigger value="continuation_feedback">Check-Ins</TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                    <Tabs value={responsesView} onValueChange={(value) => setResponsesView(value as "questions" | "users")}>
                                        <TabsList>
                                            <TabsTrigger value="users">By User</TabsTrigger>
                                            <TabsTrigger value="questions">By Question</TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {responseType === "date_feedback" && responsesView === "questions" ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>User</TableHead>
                                            <TableHead>Question</TableHead>
                                            <TableHead>Answer</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {answers.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center text-muted-foreground">
                                                    No feedback responses yet.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            answers.map((ans) => (
                                                <TableRow key={ans.id}>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {format(new Date(ans.created_at), "MMM d, h:mm a")}
                                                    </TableCell>
                                                    <TableCell>
                                                        {ans.user?.first_name} {ans.user?.last_name}
                                                    </TableCell>
                                                    <TableCell className="max-w-[200px] truncate" title={ans.question?.question}>
                                                        {ans.question?.question || "Unknown Question"}
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {ans.answer}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            ) : responseType === "date_feedback" ? (
                                <div className="space-y-4">
                                    {feedbackByUser.length === 0 ? (
                                        <div className="text-center text-muted-foreground py-8">
                                            No feedback responses yet.
                                        </div>
                                    ) : (
                                        feedbackByUser.map((userEntry) => (
                                            <Card key={userEntry.userId} className="border-border/60">
                                                <CardHeader className="pb-3">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div>
                                                            <CardTitle className="text-base">{userEntry.fullName}</CardTitle>
                                                            <p className="text-xs text-muted-foreground">
                                                                Last response: {format(new Date(userEntry.latestResponseAt), "MMM d, yyyy • h:mm a")}
                                                            </p>
                                                        </div>
                                                        <Badge variant="secondary">{userEntry.responses.length} answers</Badge>
                                                    </div>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="space-y-2">
                                                        {userEntry.responses.map((response) => (
                                                            <div key={response.id} className="rounded-md border px-3 py-2">
                                                                <p className="text-sm font-medium">{response.question}</p>
                                                                <p className="text-sm text-muted-foreground mt-1">{response.answer}</p>
                                                                <p className="text-xs text-muted-foreground mt-2">
                                                                    {format(new Date(response.createdAt), "MMM d, h:mm a")} • Date ID: {response.dateId}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            ) : responsesView === "questions" ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Updated</TableHead>
                                            <TableHead>User</TableHead>
                                            <TableHead>Connection Type</TableHead>
                                            <TableHead>Partner</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Notes</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {continuationAnswers.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center text-muted-foreground">
                                                    No continuation check-ins yet.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            continuationAnswers.map((answer) => (
                                                <TableRow key={answer.id}>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {format(new Date(answer.updated_at || answer.created_at), "MMM d, h:mm a")}
                                                    </TableCell>
                                                    <TableCell>
                                                        {answer.user?.first_name} {answer.user?.last_name}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={answer.matchType === "friendship" ? "outline" : "secondary"}>
                                                            {answer.matchType === "friendship" ? "Friendship" : "Relationship"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>{answer.partnerName}</TableCell>
                                                    <TableCell className="font-medium">
                                                        {formatContinuationStatus(answer.status)}
                                                    </TableCell>
                                                    <TableCell className="max-w-[280px] truncate" title={answer.notes || ""}>
                                                        {answer.notes || "No notes"}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="space-y-4">
                                    {continuationByUser.length === 0 ? (
                                        <div className="text-center text-muted-foreground py-8">
                                            No continuation check-ins yet.
                                        </div>
                                    ) : (
                                        continuationByUser.map((userEntry) => (
                                            <Card key={userEntry.userId} className="border-border/60">
                                                <CardHeader className="pb-3">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div>
                                                            <CardTitle className="text-base">{userEntry.fullName}</CardTitle>
                                                            <p className="text-xs text-muted-foreground">
                                                                Last response: {format(new Date(userEntry.latestResponseAt), "MMM d, yyyy • h:mm a")}
                                                            </p>
                                                        </div>
                                                        <Badge variant="secondary">{userEntry.responses.length} check-ins</Badge>
                                                    </div>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="space-y-2">
                                                        {userEntry.responses.map((response) => (
                                                            <div key={response.id} className="rounded-md border px-3 py-2">
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <p className="text-sm font-medium">
                                                                        {response.partnerName}
                                                                    </p>
                                                                    <Badge variant={response.matchType === "friendship" ? "outline" : "secondary"}>
                                                                        {response.matchType === "friendship" ? "Friendship" : "Relationship"}
                                                                    </Badge>
                                                                </div>
                                                                <p className="text-sm text-muted-foreground mt-1">
                                                                    {formatContinuationStatus(response.status)}
                                                                </p>
                                                                {response.notes && (
                                                                    <p className="text-sm text-muted-foreground mt-2">{response.notes}</p>
                                                                )}
                                                                <p className="text-xs text-muted-foreground mt-2">
                                                                    {format(new Date(response.createdAt), "MMM d, h:mm a")} • Date ID: {response.dateId}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="venue_ratings">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Star className="w-5 h-5" />
                                Venue Ratings
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Star ratings submitted by users for their date venue (1–5). Feeds into the venue scoring algorithm.
                            </p>
                        </CardHeader>
                        <CardContent>
                            {venueRatings.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic py-4">No venue ratings submitted yet.</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Venue</TableHead>
                                            <TableHead>User 1</TableHead>
                                            <TableHead>Rating</TableHead>
                                            <TableHead>User 2</TableHead>
                                            <TableHead>Rating</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {venueRatings.map((d: any) => (
                                            <TableRow key={d.id}>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {d.date_time ? format(new Date(d.date_time), "MMM d, yyyy") : "—"}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {(d.venue as any)?.name || d.location || "—"}
                                                </TableCell>
                                                <TableCell>{(d.user1 as any)?.first_name || "—"}</TableCell>
                                                <TableCell>
                                                    {d.user1_venue_rating
                                                        ? <span className="flex items-center gap-1">{d.user1_venue_rating} <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /></span>
                                                        : <span className="text-muted-foreground text-sm">—</span>}
                                                </TableCell>
                                                <TableCell>{(d.user2 as any)?.first_name || "—"}</TableCell>
                                                <TableCell>
                                                    {d.user2_venue_rating
                                                        ? <span className="flex items-center gap-1">{d.user2_venue_rating} <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /></span>
                                                        : <span className="text-muted-foreground text-sm">—</span>}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};
