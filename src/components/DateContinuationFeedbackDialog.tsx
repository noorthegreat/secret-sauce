import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ContinuationStatus = "still_dating" | "still_friends" | "stayed_in_touch" | "not_anymore" | "other";

type DateType = {
  id: string;
  match_type?: "relationship" | "friendship" | null;
  matched_user: {
    first_name: string;
  };
};

interface DateContinuationFeedbackDialogProps {
  date: DateType | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string | null;
  onSubmitted?: () => void;
}

const RELATIONSHIP_OPTIONS: Array<{ value: ContinuationStatus; label: string; helper: string }> = [
  { value: "still_dating", label: "Still dating", helper: "You kept seeing each other romantically." },
  { value: "stayed_in_touch", label: "Stayed in touch", helper: "You stayed connected, but not as a couple." },
  { value: "not_anymore", label: "Not anymore", helper: "You are no longer in contact." },
  { value: "other", label: "Something else", helper: "Your situation does not fit the options above." },
];

const FRIENDSHIP_OPTIONS: Array<{ value: ContinuationStatus; label: string; helper: string }> = [
  { value: "still_friends", label: "Still friends", helper: "You are still meeting or talking as friends." },
  { value: "stayed_in_touch", label: "Stayed in touch", helper: "You talk occasionally, but not regularly." },
  { value: "not_anymore", label: "Not anymore", helper: "You are no longer in contact." },
  { value: "other", label: "Something else", helper: "Your situation does not fit the options above." },
];

export const DateContinuationFeedbackDialog = ({
  date,
  isOpen,
  onClose,
  currentUserId,
  onSubmitted,
}: DateContinuationFeedbackDialogProps) => {
  const { toast } = useToast();
  const [status, setStatus] = useState<ContinuationStatus | null>(null);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFriendshipDate = date?.match_type === "friendship";
  const options = useMemo(() => (isFriendshipDate ? FRIENDSHIP_OPTIONS : RELATIONSHIP_OPTIONS), [isFriendshipDate]);

  useEffect(() => {
    if (!isOpen || !date || !currentUserId) {
      setStatus(null);
      setNotes("");
      return;
    }

    const loadExistingFeedback = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await (supabase as any)
          .from("date_continuation_feedback")
          .select("status, notes")
          .eq("date_id", date.id)
          .eq("user_id", currentUserId)
          .maybeSingle();

        if (error) throw error;

        setStatus((data?.status as ContinuationStatus | null) || null);
        setNotes(data?.notes || "");
      } catch (error) {
        console.error("Error loading continuation feedback:", error);
        setStatus(null);
        setNotes("");
      } finally {
        setIsLoading(false);
      }
    };

    void loadExistingFeedback();
  }, [isOpen, date, currentUserId]);

  const handleSubmit = async () => {
    if (!date || !currentUserId || !status) return;

    setIsSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from("date_continuation_feedback")
        .upsert(
          {
            date_id: date.id,
            user_id: currentUserId,
            status,
            notes: notes.trim() || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "date_id,user_id" }
        );

      if (error) throw error;

      toast({
        title: "Follow-up saved",
        description: "Thanks. Your relationship update was recorded.",
      });

      onSubmitted?.();
      onClose();
    } catch (error: any) {
      console.error("Error saving continuation feedback:", error);
      toast({
        title: "Error",
        description: error.message || "Could not save your follow-up.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!date) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isFriendshipDate ? "Friendship Follow-Up" : "Relationship Follow-Up"}</DialogTitle>
          <DialogDescription>
            Tell us what happened after your {isFriendshipDate ? "friendship" : "date"} with {date.matched_user.first_name}. This stays private to Orbiit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              {isFriendshipDate ? "Are you still friends?" : "Did you keep dating?"}
            </Label>
            <div className="grid gap-2">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    "rounded-lg border px-4 py-3 text-left transition-colors",
                    status === option.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                  )}
                  onClick={() => setStatus(option.value)}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-muted-foreground">{option.helper}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="continuation-notes">Anything else you want us to know? (optional)</Label>
            <Textarea
              id="continuation-notes"
              rows={4}
              placeholder="Short update, context, or what made it work or not work..."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || isSubmitting || !status}>
            {isSubmitting ? "Saving..." : "Save Follow-Up"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
