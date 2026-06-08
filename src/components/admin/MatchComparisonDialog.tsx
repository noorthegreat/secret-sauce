import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import ProfileViewDialog from "@/components/ProfileViewDialog";

// Matches the enriched-match shape produced by the admin match tabs: it carries
// user_profile / matched_user_profile plus the per-side like/dislike flags.
type AnyMatch = any;

type PersonalityAnswer = {
    question_number: number;
    answer: string | null;
    answer_custom: string | null;
};

type MatchComparisonDialogProps = {
    match: AnyMatch | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

/**
 * Personality-answer comparison + profile viewer for a single match pair.
 * Self-contained: loads both users' answers when opened. Shared between the
 * weekly "Current Matches" tab and the "Event Matches" tab so the admin sees
 * the same comparison UX everywhere.
 */
export const MatchComparisonDialog = ({ match, open, onOpenChange }: MatchComparisonDialogProps) => {
    const { toast } = useToast();
    const [user1Answers, setUser1Answers] = useState<PersonalityAnswer[]>([]);
    const [user2Answers, setUser2Answers] = useState<PersonalityAnswer[]>([]);
    const [profileDialogUser, setProfileDialogUser] = useState<"user1" | "user2" | null>(null);

    useEffect(() => {
        if (!open || !match) return;
        let cancelled = false;

        (async () => {
            try {
                const [{ data: user1Data }, { data: user2Data }] = await Promise.all([
                    supabase
                        .from("personality_answers")
                        .select("question_number, answer, answer_custom")
                        .eq("user_id", match.user_id)
                        .order("question_number"),
                    supabase
                        .from("personality_answers")
                        .select("question_number, answer, answer_custom")
                        .eq("user_id", match.matched_user_id)
                        .order("question_number"),
                ]);
                if (cancelled) return;
                setUser1Answers(user1Data || []);
                setUser2Answers(user2Data || []);
            } catch {
                if (!cancelled) {
                    toast({
                        title: "Error",
                        description: "Failed to load personality answers",
                        variant: "destructive",
                    });
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [open, match, toast]);

    const getAnswerForQuestion = (answers: PersonalityAnswer[], questionNumber: number) => {
        const answer = answers.find((a) => a.question_number === questionNumber);
        return answer?.answer_custom || answer?.answer || "No answer";
    };

    const allQuestions = [
        ...new Set([...user1Answers, ...user2Answers].map((a) => a.question_number)),
    ].sort((a, b) => a - b);

    return (
        <>
            <ProfileViewDialog
                open={!!profileDialogUser}
                onOpenChange={() => setProfileDialogUser(null)}
                profile={
                    profileDialogUser === "user1" ? match?.user_profile : match?.matched_user_profile
                }
                showAdminInfo
                matchType={match?.match_type || "relationship"}
                compatibilityWithUserId={
                    profileDialogUser === "user1"
                        ? match?.matched_user_id || null
                        : profileDialogUser === "user2"
                            ? match?.user_id || null
                            : null
                }
            />

            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Personality Answer Comparison</DialogTitle>
                        {match && (
                            <div className="space-y-4 pt-4">
                                <div className="flex justify-between items-center">
                                    <div className="text-center">
                                        <p className="font-semibold text-lg">
                                            {match.user_profile?.first_name} {match.user_profile?.last_name}
                                        </p>
                                        {match.user1_liked_user2 && (
                                            <p className="text-xs text-green-600 mt-1">Liked their match</p>
                                        )}
                                        {match.user1_disliked_user2 && (
                                            <p className="text-xs text-red-600 mt-1">Disliked their match</p>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="mt-2"
                                            onClick={() => setProfileDialogUser("user1")}
                                        >
                                            View Profile
                                        </Button>
                                    </div>
                                    <div className="text-primary font-bold">
                                        {match.compatibility_score}% Match
                                    </div>
                                    <div className="text-center">
                                        <p className="font-semibold text-lg">
                                            {match.matched_user_profile?.first_name}{" "}
                                            {match.matched_user_profile?.last_name}
                                        </p>
                                        {match.user2_liked_user1 && (
                                            <p className="text-xs text-green-600 mt-1">Liked their match</p>
                                        )}
                                        {match.user2_disliked_user1 && (
                                            <p className="text-xs text-red-600 mt-1">Disliked their match</p>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="mt-2"
                                            onClick={() => setProfileDialogUser("user2")}
                                        >
                                            View Profile
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </DialogHeader>

                    <div className="space-y-6 mt-4">
                        {allQuestions.map((questionNumber) => (
                            <div key={questionNumber} className="border-b pb-4">
                                <h3 className="font-semibold mb-3">Question {questionNumber}</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-muted p-4 rounded-lg">
                                        <p className="text-sm">
                                            {getAnswerForQuestion(user1Answers, questionNumber)}
                                        </p>
                                    </div>
                                    <div className="bg-muted p-4 rounded-lg">
                                        <p className="text-sm">
                                            {getAnswerForQuestion(user2Answers, questionNumber)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};
