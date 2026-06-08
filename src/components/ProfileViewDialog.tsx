import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Calendar, Sparkles, Flag, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import ReportProfileDialog from "@/components/ReportProfileDialog.tsx";
import { Trash2 } from "lucide-react";

type QuestionOption = {
  label: string;
  value: string;
};

type Profile = {
  id: string;
  first_name: string;
  age: number | null;
  bio: string | null;
  three_words_friends_describe?: string | null;
  fun_fact?: string | null;
  additional_photos: string[] | null;
  created_at: string | null;
  photo_url?: string | null;
};

type ProfileViewDialogProps = {
  profile: Profile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showAdminDelete?: boolean;
  onAdminDelete?: () => void;
  adminDeleting?: boolean;
  showAdminInfo?: boolean;
  compatibilityWithUserId?: string | null;
  matchType?: "relationship" | "friendship";
};

const ProfileViewDialog = ({
  profile,
  open,
  onOpenChange,
  showAdminDelete = false,
  onAdminDelete,
  adminDeleting = false,
  showAdminInfo = false,
  compatibilityWithUserId = null,
  matchType = "relationship",
}: ProfileViewDialogProps) => {
  const { t, i18n } = useTranslation("profileViewDialog");

  const [resolvedProfile, setResolvedProfile] = useState<Profile | null>(profile);
  const [compatibility, setCompatibility] = useState<string | null>(null);
  const [loadingCompatibility, setLoadingCompatibility] = useState(false);
  const [regeneratingCompatibility, setRegeneratingCompatibility] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [spokenLanguages, setSpokenLanguages] = useState<string[] | null>(null);

  useEffect(() => {
    setResolvedProfile(profile);
  }, [profile]);

  useEffect(() => {
    if (!profile?.id || !open) {
      setSpokenLanguages(null);
      return;
    }

    let cancelled = false;

    const loadSpokenLanguages = async () => {
      try {
        const [{ data: answerData, error: answerError }, { data: questionData, error: questionError }] = await Promise.all([
          supabase
            .from("personality_answers")
            .select("answer")
            .eq("user_id", profile.id)
            .eq("question_number", 25)
            .maybeSingle(),
          supabase
            .from("questionnaire_questions")
            .select("options")
            .eq("id", 25)
            .maybeSingle(),
        ]);

        if (answerError) {
          console.error("Error loading spoken language answer:", answerError);
          return;
        }
        if (questionError) {
          console.error("Error loading spoken language options:", questionError);
          return;
        }

        const rawAnswer = (answerData as { answer?: string } | null)?.answer;
        const options = (questionData as { options?: QuestionOption[] } | null)?.options ?? [];

        if (!rawAnswer || options.length === 0) {
          if (!cancelled) setSpokenLanguages(null);
          return;
        }

        const labels = rawAnswer
          .split(",")
          .map((code) => code.trim())
          .filter(Boolean)
          .map((code) => options.find((option) => option.value === code)?.label ?? code);

        if (!cancelled) setSpokenLanguages(labels);
      } catch (error) {
        console.error("Error loading spoken languages:", error);
      }
    };

    void loadSpokenLanguages();
    return () => { cancelled = true; };
  }, [profile?.id, open]);

  useEffect(() => {
    if (!profile?.id || !open) return;
    let cancelled = false;

    const loadFullProfile = async () => {
      try {
        const [{ data, error }, { data: privateData, error: privateError }] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, first_name, age, bio, additional_photos, created_at, photo_url")
            .eq("id", profile.id)
            .maybeSingle(),
          supabase
            .from("private_profile_data" as any)
            .select("user_id, created_at")
            .eq("user_id", profile.id)
            .maybeSingle(),
        ]);

        if (error) {
          console.error("Error loading full profile details:", error);
          return;
        }
        if (privateError) {
          console.error("Error loading private profile metadata:", privateError);
        }
        if (!data || cancelled) return;

        setResolvedProfile((current) => ({
          ...(current || profile),
          ...data,
          created_at:
            data.created_at ??
            (privateData as any)?.created_at ??
            current?.created_at ??
            profile.created_at ??
            null,
        }));
      } catch (error) {
        console.error("Error loading full profile details:", error);
      }
    };

    void loadFullProfile();
    return () => { cancelled = true; };
  }, [profile, open]);

  useEffect(() => {
    const fetchCompatibility = async () => {
      if (!resolvedProfile || !open) return;
      if (showAdminInfo && !compatibilityWithUserId) {
        setCompatibility(null);
        setLoadingCompatibility(false);
        return;
      }

      setLoadingCompatibility(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const compatibilityUserId1 = compatibilityWithUserId || user.id;
        const compatibilityUserId2 = resolvedProfile.id;

        const { data: existingCompatibility, error: dbError } = await supabase
          .from("compatibility_insights")
          .select("compatibility_text")
          .or(`and(user1_id.eq.${compatibilityUserId1},user2_id.eq.${compatibilityUserId2}),and(user1_id.eq.${compatibilityUserId2},user2_id.eq.${compatibilityUserId1})`)
          .maybeSingle();

        if (dbError) console.error("Error fetching compatibility from DB:", dbError);

        if (existingCompatibility) {
          setCompatibility(existingCompatibility.compatibility_text);
        } else {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Compatibility generation timed out")), 45000)
          );
          const { data, error } = await Promise.race([
            supabase.functions.invoke("generate-compatibility", {
              body: { userId1: compatibilityUserId1, userId2: compatibilityUserId2, match_type: matchType },
            }),
            timeoutPromise,
          ]);

          if (error) {
            const response = (error as any)?.context as Response | undefined;
            if (response?.status === 403) {
              let reason = "";
              try {
                const text = await response.text();
                const payload = text ? JSON.parse(text) : null;
                reason = payload?.error || "";
              } catch {
                // Ignore body parse errors and use fallback message.
              }
              if (reason === "Not authorized to view this compatibility") {
                setCompatibility(t("compatibility.errorOnlyMatched"));
              } else {
                setCompatibility(t("compatibility.errorNotActive"));
              }
              return;
            }
            console.error("Error generating compatibility:", error);
            setCompatibility(t("compatibility.errorUnavailable"));
            return;
          }

          const payload = typeof data === "string" ? JSON.parse(data) : data;
          setCompatibility(payload?.compatibility || null);
        }
      } catch (error) {
        console.error("Error fetching compatibility:", error);
        setCompatibility(t("compatibility.errorUnavailable"));
      } finally {
        setLoadingCompatibility(false);
      }
    };

    fetchCompatibility();
  }, [resolvedProfile, open, showAdminInfo, compatibilityWithUserId, matchType, t]);

  if (!resolvedProfile) return null;

  const handleRegenerateCompatibility = async () => {
    if (!resolvedProfile || !compatibilityWithUserId) return;
    setRegeneratingCompatibility(true);
    setLoadingCompatibility(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-compatibility", {
        body: {
          userId1: compatibilityWithUserId,
          userId2: resolvedProfile.id,
          force_regenerate: true,
          match_type: matchType,
        },
      });
      if (error) throw error;
      const payload = typeof data === "string" ? JSON.parse(data) : data;
      setCompatibility(payload?.compatibility || null);
    } catch (error) {
      console.error("Error regenerating compatibility:", error);
    } finally {
      setLoadingCompatibility(false);
      setRegeneratingCompatibility(false);
    }
  };

  const memberSinceDate = resolvedProfile.created_at ? new Date(resolvedProfile.created_at) : null;
  const memberSinceLabel =
    memberSinceDate && !Number.isNaN(memberSinceDate.getTime())
      ? memberSinceDate.toLocaleDateString(i18n.language, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      : t("memberSince.unknown");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
            {resolvedProfile.first_name}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("srDescription")}
          </DialogDescription>
          {resolvedProfile.age && (
            <p className="text-sm text-muted-foreground">
              {t("age", { age: resolvedProfile.age, count: resolvedProfile.age })}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {(loadingCompatibility || compatibility) && (
            <Card className="bg-linear-to-r from-primary/10 to-secondary/10 border-primary/20">
              <CardContent className="pt-4">
                <div className="flex items-start space-x-3">
                  <Sparkles className="w-5 h-5 text-primary mt-1 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      {t("compatibility.heading")}
                    </p>
                    {loadingCompatibility ? (
                      <>
                        <p className="text-sm">{t("compatibility.loading")}</p>
                        <Skeleton className="h-16 w-full" />
                      </>
                    ) : (
                      <p className="text-sm leading-relaxed">{compatibility}</p>
                    )}
                    {showAdminInfo && compatibilityWithUserId && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={handleRegenerateCompatibility}
                        disabled={regeneratingCompatibility}
                      >
                        {regeneratingCompatibility
                          ? t("compatibility.regenerating")
                          : t("compatibility.regenerate")}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {showAdminInfo && (
                <div className="flex items-start space-x-3">
                  <Calendar className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("memberSince.label")}
                    </p>
                    <p className="text-base">{memberSinceLabel}</p>
                  </div>
                </div>
              )}

              {spokenLanguages && spokenLanguages.length > 0 && (
                <div className="flex items-start space-x-3">
                  <Globe className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("spokenLanguages")}
                    </p>
                    <p className="text-base">{spokenLanguages.join(", ")}</p>
                  </div>
                </div>
              )}
            </div>

            <div>
              {resolvedProfile.bio && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">{t("bio")}</p>
                  <Card className="bg-muted/50 border-border/50">
                    <CardContent className="pt-4">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {resolvedProfile.bio}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {resolvedProfile.three_words_friends_describe && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    {t("threeWords")}
                  </p>
                  <Card className="bg-muted/50 border-border/50">
                    <CardContent className="pt-4">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {resolvedProfile.three_words_friends_describe}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {resolvedProfile.fun_fact && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">{t("funFact")}</p>
                  <Card className="bg-muted/50 border-border/50">
                    <CardContent className="pt-4">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {resolvedProfile.fun_fact}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>

          {resolvedProfile.additional_photos && resolvedProfile.additional_photos.length > 0 && (
            <div className="pt-4 border-t border-border">
              <p className="text-sm font-medium text-muted-foreground mb-4">{t("photos.heading")}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {resolvedProfile.additional_photos.map((photo, index) => (
                  <img
                    key={index}
                    src={photo}
                    alt={t("photos.alt", { index: index + 1 })}
                    className="w-full h-48 object-cover rounded-lg shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setSelectedPhotoUrl(photo)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-center items-center gap-2 mt-6 mb-2">
          {showAdminDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onAdminDelete}
              disabled={adminDeleting}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {adminDeleting ? t("admin.deleting") : t("admin.delete")}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => setReportOpen(true)}
          >
            <Flag className="w-4 h-4 mr-2" />
            {t("report")}
          </Button>
        </div>
      </DialogContent>

      <Dialog open={!!selectedPhotoUrl} onOpenChange={() => setSelectedPhotoUrl(null)}>
        <DialogContent className="max-w-4xl p-0 border-0">
          <DialogHeader className="sr-only">
            <DialogTitle>{t("photos.preview")}</DialogTitle>
          </DialogHeader>
          {selectedPhotoUrl && (
            <img
              src={selectedPhotoUrl}
              alt={t("photos.fullSizeAlt")}
              className="w-full h-auto max-h-[90vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      <ReportProfileDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        reportedUserId={resolvedProfile.id}
        reportedUserName={resolvedProfile.first_name}
      />
    </Dialog>
  );
};

export default ProfileViewDialog;