
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

type DateType = {
    id: string;
    match_type?: "relationship" | "friendship" | null;
    matched_user: {
        first_name: string;
    };
    user1_id: string;
    user2_id: string;
    user1_followup_preference: "match" | "friend" | "pass" | null;
    user2_followup_preference: "match" | "friend" | "pass" | null;
    confirmed_venue_id?: string | null;
    location?: string | null;
};

interface DateFeedbackDialogProps {
    date: DateType | null;
    isOpen: boolean;
    onClose: () => void;
    currentUserId: string | null;
}

export const DateFeedbackDialog = ({ date, isOpen, onClose, currentUserId }: DateFeedbackDialogProps) => {
    const { toast } = useToast();
    const [questions, setQuestions] = useState<any[]>([]);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [preference, setPreference] = useState<"match" | "friend" | "pass" | null>(null);
    const [venueRating, setVenueRating] = useState<number | null>(null);
    const [hoveredStar, setHoveredStar] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
    const isFriendshipDate = date?.match_type === "friendship";
    const areAllQuestionsAnswered = questions.every((q) => (answers[q.id] || "").trim().length > 0);
    const isFormValid = !!preference && areAllQuestionsAnswered;

    useEffect(() => {
        if (isOpen && date && currentUserId) {
            // Load questions and existing answers
            loadQuestionsAndAnswers();

            // Set initial preference
            const existingPref = date.user1_id === currentUserId
                ? date.user1_followup_preference
                : date.user2_followup_preference;
            setPreference(isFriendshipDate && existingPref === "match" ? null : existingPref);
        } else {
            // Reset state when closed
            setAnswers({});
            setPreference(null);
            setVenueRating(null);
            setHoveredStar(null);
        }
    }, [isOpen, date, currentUserId, isFriendshipDate]);

    const loadQuestionsAndAnswers = async () => {
        setIsLoadingQuestions(true);
        try {
            // Load active questions
            // @ts-ignore
            const { data: qs, error: qError } = await (supabase as any)
                .from("date_feedback_questions")
                .select("*")
                .eq("is_active", true)
                .order("created_at", { ascending: true });

            if (qError) throw qError;
            setQuestions(qs || []);

            // Load existing answers if any
            // @ts-ignore
            const { data: ans, error: aError } = await (supabase as any)
                .from("date_feedback_answers")
                .select("question_id, answer")
                .eq("date_id", date?.id)
                .eq("user_id", currentUserId);

            if (aError) throw aError;

            const ansMap: Record<string, string> = {};
            ans?.forEach((a: any) => {
                ansMap[a.question_id] = a.answer;
            });
            setAnswers(ansMap);

        } catch (error) {
            console.error("Error loading feedback data:", error);
        } finally {
            setIsLoadingQuestions(false);
        }
    };

    const handleSubmit = async () => {
        if (!date || !currentUserId) return;
        if (!isFormValid) {
            toast({
                title: "Missing required answers",
                description: `Please select a ${isFriendshipDate ? "follow-up choice" : "preference"} and answer all feedback questions.`,
                variant: "destructive",
            });
            return;
        }
        setIsSubmitting(true);

        try {
            // 1. Update preference (and optional venue rating) on dates table
            const isUser1 = date.user1_id === currentUserId;
            const preferenceField = isUser1 ? "user1_followup_preference" : "user2_followup_preference";
            const ratingField = isUser1 ? "user1_venue_rating" : "user2_venue_rating";

            const dateUpdate: Record<string, any> = { [preferenceField]: preference };
            if (venueRating !== null && (date.confirmed_venue_id || date.location)) {
                dateUpdate[ratingField] = venueRating;
            }

            const { error: prefError } = await supabase
                .from("dates")
                .update(dateUpdate)
                .eq("id", date.id);

            if (prefError) throw prefError;

            // 2. Save answers to date_feedback_answers
            // We need to upsert answers. 
            // Since we don't have a unique constraint on (date_id, question_id, user_id) in the migration (Wait, I should have added one!),
            // we will delete existing answers for this user/date and re-insert. 
            // Or better, check if exists.

            // Simpler approach for now: Delete all answers for this user/date and re-insert.
            // @ts-ignore
            await (supabase as any)
                .from("date_feedback_answers")
                .delete()
                .eq("date_id", date.id)
                .eq("user_id", currentUserId);

            const answersToInsert = Object.entries(answers)
                .filter(([_, val]) => val.trim() !== "")
                .map(([qId, val]) => ({
                    date_id: date.id,
                    question_id: qId,
                    user_id: currentUserId,
                    answer: val
                }));

            if (answersToInsert.length > 0) {
                // @ts-ignore
                const { error: ansError } = await (supabase as any)
                    .from("date_feedback_answers")
                    .insert(answersToInsert);

                if (ansError) throw ansError;
            }

            // Check for mutual outcome and notify both users
            const { data: updatedDate } = await supabase
                .from('dates')
                .select('user1_followup_preference, user2_followup_preference')
                .eq('id', date.id)
                .single();
            if (updatedDate) {
                const p1 = updatedDate.user1_followup_preference;
                const p2 = updatedDate.user2_followup_preference;
                const isMutual = p1 && p2 && p1 === p2 && p1 !== 'pass';
                if (isMutual) {
                    await supabase.functions.invoke('send-user-emails', {
                        body: { emailType: 'mutual_outcome', dateId: date.id, recipients: [{ userId: currentUserId }] },
                    });
                }
            }

            toast({
                title: "Feedback submitted",
                description: "Thank you for your feedback!",
            });
            onClose();
        } catch (error: any) {
            console.error("Error submitting feedback:", error);
            toast({
                title: "Error",
                description: "Could not submit feedback.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!date) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                    <DialogTitle>Date Feedback</DialogTitle>
                    <DialogDescription>
                        How was your date with {date.matched_user.first_name}? This feedback is private and won't be shared with your match!
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-6">
                    {/* Interest Level Section */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold">
                            {isFriendshipDate ? "What would you like after this friendship date?" : "Interest Level"}
                        </Label>
                        <div className="flex gap-2">
                            {!isFriendshipDate && (
                                <Button
                                    variant={preference === "match" ? "default" : "outline"}
                                    className={cn("flex-1 transition-all", preference === "match" && "bg-pink-500 hover:bg-pink-600 border-pink-500 text-white")}
                                    onClick={() => setPreference("match")}
                                >
                                    ❤️ Match
                                </Button>
                            )}
                            <Button
                                variant={preference === "friend" ? "default" : "outline"}
                                className={cn("flex-1 transition-all", preference === "friend" && "bg-blue-500 hover:bg-blue-600 border-blue-500 text-white")}
                                onClick={() => setPreference("friend")}
                            >
                                🤝 Friend{isFriendshipDate ? "s" : ""}
                            </Button>
                            <Button
                                variant={preference === "pass" ? "default" : "outline"}
                                className={cn("flex-1 transition-all", preference === "pass" && "bg-gray-500 hover:bg-gray-600 border-gray-500 text-white")}
                                onClick={() => setPreference("pass")}
                            >
                                👋 Pass
                            </Button>
                            </div>
                        <p className="text-xs text-muted-foreground">Required</p>
                    </div>

                    <div className="space-y-4">
                        {isLoadingQuestions ? (
                            <p className="text-sm text-muted-foreground">Loading questions...</p>
                        ) : questions.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No additional questions.</p>
                        ) : (
                            questions.map((q) => (
                                <div key={q.id} className="space-y-2">
                                    <Label htmlFor={q.id} className="text-base font-semibold">
                                        {q.question} <span className="text-destructive">*</span>
                                    </Label>
                                    <Textarea
                                        id={q.id}
                                        placeholder="Required"
                                        value={answers[q.id] || ""}
                                        onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                        rows={3}
                                    />
                                </div>
                            ))
                        )}
                    </div>

                    {/* Venue rating — shown whenever the date had a venue (confirmed or location-only) */}
                    {(date.confirmed_venue_id || date.location) && (
                        <div className="space-y-2">
                            <Label className="text-base font-semibold">
                                How was the venue?{date.location ? ` (${date.location})` : ""}
                            </Label>
                            <div
                                className="flex gap-1"
                                onMouseLeave={() => setHoveredStar(null)}
                            >
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setVenueRating(star === venueRating ? null : star)}
                                        onMouseEnter={() => setHoveredStar(star)}
                                        className="p-0.5 focus:outline-none"
                                        aria-label={`${star} star${star !== 1 ? "s" : ""}`}
                                    >
                                        <Star
                                            className={cn(
                                                "w-7 h-7 transition-colors",
                                                star <= (hoveredStar ?? venueRating ?? 0)
                                                    ? "fill-amber-400 text-amber-400"
                                                    : "text-muted-foreground"
                                            )}
                                        />
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground">Optional — helps us improve venue suggestions.</p>
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                        All answers are private and only visible to Orbiit staff, and will be used to improve our algorithm :)
                    </p>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting || isLoadingQuestions || !isFormValid}>
                        {isSubmitting ? "Submitting..." : "Submit Feedback"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
