import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client.ts";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { useToast } from "@/hooks/use-toast.ts";
import { User as UserIcon, Calendar, Edit, Sparkles, MapPin, Phone, AlertTriangle, Globe } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { User } from "@supabase/supabase-js";
import { getCityFromCoordinates } from "@/lib/geocoding.ts";
import useAnswers from "@/hooks/use-answers.tsx";
import { useTranslation } from "react-i18next";

type QuestionOption = {
  label: string;
  value: string;
};

type Profile = {
  id: string;
  first_name: string;
  age: number | null;
  bio: string | null;
  additional_photos: string[] | null;
  created_at: string;
  date_penalty_count: number;
  // private fields joined from private_profile_data
  last_name: string | null;
  latitude: number | null;
  longitude: number | null;
  phone_number: string | null;
};

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [city, setCity] = useState<string | null>(null);
  const [languages, setLanguages] = useState<string[] | null>(null);
  const { answersCustom } = useAnswers();
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const { t, i18n } = useTranslation("profile");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      loadProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadProfile = async (userId: string) => {
    setIsLoading(true);
    setLanguages(null);
    try {
      const [{ data, error }, { data: privateData }, { data: answerData }, { data: langData }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase
          .from("private_profile_data" as any)
          .select("last_name, latitude, longitude, phone_number")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("personality_answers")
          .select("answer")
          .eq("user_id", userId)
          .eq("question_number", 25)
          .maybeSingle(),
        supabase
          .from("questionnaire_questions")
          .select("options")
          .eq("id", 25)
          .maybeSingle(),
      ]);

      if (error) throw error;

      if (!data) {
        toast({
          title: t("toast.noProfileTitle"),
          description: t("toast.noProfileDescription"),
        });
        navigate("/profile-setup");
        return;
      }

      const priv = privateData as any;
      setProfile({
        ...data,
        date_penalty_count: (data as any).date_penalty_count ?? 0,
        last_name: priv?.last_name ?? null,
        latitude: priv?.latitude ?? null,
        longitude: priv?.longitude ?? null,
        phone_number: priv?.phone_number ?? null,
      });

      if (priv?.latitude && priv?.longitude) {
        getCityFromCoordinates(priv.latitude, priv.longitude).then(setCity);
      }

      // Load spoken languages from questionnaire metadata question 25
      try {
        const options = (langData as { options?: QuestionOption[] } | null)?.options;
        const rawAnswer = (answerData as { answer?: string } | null)?.answer;
        if (options && rawAnswer) {
          const codes = rawAnswer
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean);
          const optionList = Array.isArray(options) ? options : [];
          const labels = codes
            .map((code: string) => optionList.find((option) => option.value === code)?.label ?? code)
            .filter(Boolean);
          setLanguages(labels);
        }
      } catch (e) {
        // ignore language parse errors
        console.error("Error parsing languages", e);
      }

    } catch (error: any) {
      toast({
        title: t("toast.errorTitle"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center space-y-4">
            <Sparkles className="w-12 h-12 mx-auto text-white animate-pulse" />
            <p className="text-white">{t("loading")}</p>
          </div>
        </div>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[50vh]">
          <p className="text-muted-foreground">{t("notFound")}</p>
        </div>
      </>
    );
  }

  const privateMessage = <span className="text-orbiitbright">{t("private")}</span>
  return (
    <>
      <div className="p-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-xl border-border/50">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div>
                    <CardTitle className="text-3xl font-bold bg-linear-to-r from-backgrounda to-backgroundc bg-clip-text text-transparent mb-2">
                      {profile.first_name}
                    </CardTitle>
                    <CardDescription>{t("description")}</CardDescription>
                  </div>
                </div>
                <Button className="bg-linear-to-r from-backgrounda to-backgroundc " onClick={() => navigate("/profile-setup")}>
                  <Edit className="w-4 h-4" />
                  <div className="hidden md:block ml-2">{t("editButton")}</div>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <UserIcon className="w-5 h-5 text-orbiitbright mt-1" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t("fields.firstName")}</p>
                      <p className="text-lg">{profile.first_name}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <UserIcon className="w-5 h-5 text-orbiitbright mt-1" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t("fields.lastName")} {privateMessage}</p>
                      <p className="text-lg">{profile.last_name}</p>
                    </div>
                  </div>
                  {profile.age && (
                    <div className="flex items-start space-x-3">
                      <Calendar className="w-5 h-5 text-orbiitbright mt-1" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{t("fields.age")}</p>
                        <p className="text-lg">{t("fields.ageValue", { age: profile.age })}</p>
                      </div>
                    </div>
                  )}

                  {city && (
                    <div className="flex items-start space-x-3">
                      <MapPin className="w-5 h-5 text-orbiitbright mt-1" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{t("fields.location")}</p>
                        <p className="text-lg">{city}</p>
                      </div>
                    </div>
                  )}

                  {languages && languages.length > 0 && (
                    <div className="flex items-start space-x-3">
                      <Globe className="w-5 h-5 text-orbiitbright mt-1" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{t("fields.languages")}</p>
                        <p className="text-lg">{languages.join(', ')}</p>
                      </div>
                    </div>
                  )}

                  {user && (
                    <div className="flex items-start space-x-3">
                      <UserIcon className="w-5 h-5 text-orbiitbright mt-1" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{t("fields.email")} {privateMessage}</p>
                        <p className="text-lg">{user.email}</p>
                      </div>
                    </div>
                  )}

                  {profile.phone_number && (
                    <div className="flex items-start space-x-3">
                      <Phone className="w-5 h-5 text-orbiitbright mt-1" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{t("fields.phone")} {privateMessage}</p>
                        <p className="text-lg">{profile.phone_number}</p>
                      </div>
                    </div>
                  )}

                  {profile.date_penalty_count > 0 && (
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-500 mt-1" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{t("fields.penalty")}</p>
                        <p className="text-lg text-yellow-500 font-semibold">
                          {t("fields.penaltyValue", { count: profile.date_penalty_count })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("fields.penaltyHelp")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  {profile.bio && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-muted-foreground mb-1">{t("fields.bio")}</p>
                      <Card className="bg-muted/50 border-border/50">
                        <CardContent className="pt-6">
                          <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                            {profile.bio}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  <div className="mb-4">
                    <p className="text-sm font-medium text-muted-foreground mb-1">{t("fields.threeWords")}</p>
                    <Card className="bg-muted/50 border-border/50">
                      <CardContent className="pt-6">
                        <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                          {answersCustom[38]}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm font-medium text-muted-foreground mb-1">{t("fields.funFact")}</p>
                    <Card className="bg-muted/50 border-border/50">
                      <CardContent className="pt-6">
                        <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                          {answersCustom[39]}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                </div>
              </div>

              {profile.additional_photos && profile.additional_photos.length > 0 && (
                <div className="pt-6 border-t border-border">
                  <p className="text-sm font-medium text-muted-foreground mb-4">{t("fields.photos")}</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {profile.additional_photos.map((photo, index) => (
                      <img
                        key={index}
                        src={photo}
                        alt={t("photoAlt", { index: index + 1 })}
                        className="w-full h-48 object-cover rounded-lg shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setSelectedPhotoUrl(photo)}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  {t("memberSince", {
                    date: new Date(profile.created_at).toLocaleDateString(i18n.language, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>


      <Dialog open={!!selectedPhotoUrl} onOpenChange={() => setSelectedPhotoUrl(null)}>
        <DialogContent className="max-w-4xl p-0 border-0">
          <DialogHeader className="sr-only">
            <DialogTitle>{t("photoPreviewTitle")}</DialogTitle>
          </DialogHeader>
          {selectedPhotoUrl && (
            <img
              src={selectedPhotoUrl}
              alt={t("fullSizeAlt")}
              className="w-full h-auto max-h-[90vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Profile;
