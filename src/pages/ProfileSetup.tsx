import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { z } from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Trash2, Edit, AlertTriangle } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LongPressButton } from "@/components/ui/long-press-button";
import { Switch } from "@/components/ui/switch";

import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import useAnswers from "@/hooks/use-answers";
import { useQuestions } from "@/hooks/use-questions";
import { useTranslation } from "react-i18next";
import { validatePhoto } from "@/lib/photoValidation";

const CITY_FROM_LAT_LONG: Record<string, [number, number]> = {
  "Zurich": [47.3769, 8.5417],
  "St. Gallen": [47.42200, 9.37419],
  "Basel": [47.56279, 7.58960],
  "Bern": [46.95166, 7.41222]
};

const ProfileSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<"pending" | "granted" | "denied">("pending");
  const [bio, setBio] = useState("");
  const [threeWords, setThreeWords] = useState("");
  const [funFact, setFunFact] = useState("");
  const [isPaused, setIsPaused] = useState(false);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [additionalPhotos, setAdditionalPhotos] = useState<string[]>([]);
  const [uploadingAdditional, setUploadingAdditional] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isTestUser, setIsTestUser] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [pendingDates, setPendingDates] = useState<any[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const photoLimit = 5;
  const minPhotos = 3;
  const { answers, answersCustom } = useAnswers();
  const { questions, isLoading: loadingQuestions } = useQuestions();
  const { t } = useTranslation("profileSetup");

  useEffect(() => {
    if (!threeWords && answersCustom[38]) {
      setThreeWords(answersCustom[38]);
    }
    if (!funFact && answersCustom[39]) {
      setFunFact(answersCustom[39]);
    }
  }, [answersCustom, threeWords, funFact]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);

      // Check if user has test role from database
      const { data: hasTestRole } = await supabase.rpc('has_role', {
        _user_id: session.user.id,
        _role: 'test'
      });

      const { data: hasAdminRole } = await supabase.rpc('has_role', {
        _user_id: session.user.id,
        _role: 'admin'
      });

      if (hasTestRole || hasAdminRole) {
        setIsTestUser(true);
      }

      // Check if profile exists
      const profilePromise = supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      const privateDataPromise = supabase
        .from("private_profile_data" as any)
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      Promise.all([profilePromise, privateDataPromise]).then(
        ([{ data }, { data: rawPrivateData }]) => {
          const privateData = rawPrivateData as any;
          if (data) {
            setFirstName(data.first_name || "");
            setLastName(privateData?.last_name || "");
            if (privateData?.birthday) {
              const date = new Date(privateData.birthday);
              const month = String(date.getUTCMonth() + 1).padStart(2, '0');
              const day = String(date.getUTCDate()).padStart(2, '0');
              const year = date.getUTCFullYear();
              setBirthday(`${day}/${month}/${year}`);
            }
            setLatitude(privateData?.latitude ?? null);
            setLongitude(privateData?.longitude ?? null);
            if (privateData?.latitude && privateData?.longitude) {
              setLocationStatus("granted");
            }
            setBio(data.bio || "");
            setIsPaused(data.is_paused || false);
            setAdditionalPhotos(data.additional_photos || []);
            setPhoneNumber(privateData?.phone_number || "");
            setIsFirstTimeSetup(false);
          } else {
            // Check if phone number was provided during signup
            const phoneFromMeta = session.user.user_metadata?.phone_number;
            if (phoneFromMeta) {
              setPhoneNumber(phoneFromMeta);
            }
          }
        }
      );
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: t("toast.geoUnsupported.title"),
        description: t("toast.geoUnsupported.description"),
        variant: "destructive",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setLocationStatus("granted");
        toast({
          title: t("toast.locationCaptured.title"),
          description: t("toast.locationCaptured.description"),
        });
      },
      (error) => {
        setLocationStatus("denied");
        toast({
          title: t("toast.locationDenied.title"),
          description: t("toast.locationDenied.description"),
          variant: "destructive",
        });
      },
      { timeout: 2000 }
    );
  };

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    const [lat, long] = CITY_FROM_LAT_LONG[city];
    setLatitude(lat);
    setLongitude(long);
    setLocationStatus("granted");
    toast({
      title: t("toast.locationSet.title"),
      description: t("toast.locationSet.description", { city }),
    });
  };

  const handlePhotoUpload = async (e) => {
    console.log("generic running")
    if (!user || !isTestUser) return;
    if (additionalPhotos.length >= photoLimit) {
      toast({
        title: t("toast.photoLimit.title"),
        description: t("toast.photoLimit.description", { limit: photoLimit }),
        variant: "destructive",
      });
      return;
    }
    setUploadingPhoto(true);

    try {
      const genericFiles = ["generic1.jpg", "generic2.jpg", "generic3.jpg"]; //TODO fix RLS policy on this
      const randomElement = genericFiles[Math.floor(Math.random() * genericFiles.length)];
      const { data: { publicUrl } } = supabase.storage
        .from("generic-profile-photos")
        .getPublicUrl(randomElement);

      setAdditionalPhotos([...additionalPhotos, publicUrl]);

    } catch (error: any) {
      toast({
        title: t("toast.uploadFailed.title"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleAdditionalPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Check if already at limit
    if (additionalPhotos.length >= photoLimit) {
      toast({
        title: t("toast.photoLimit.title"),
        description: t("toast.photoLimit.description", { limit: photoLimit }),
        variant: "destructive",
      });
      return;
    }

    // Run all content checks (type, size, screenshot, dimensions, near-black, face).
    // Each failure surfaces its own translated message under toast.photoValidation.*
    const validation = await validatePhoto(file);
    if (!validation.ok) {
      toast({
        title: t(`toast.photoValidation.${validation.errorKey}.title`),
        description: t(`toast.photoValidation.${validation.errorKey}.description`, validation.errorParams ?? {}),
        variant: "destructive",
      });
      return;
    }

    setUploadingAdditional(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/additional_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(fileName);

      setAdditionalPhotos([...additionalPhotos, publicUrl]);

      toast({
        title: t("toast.photoAdded.title"),
        description: t("toast.photoAdded.description"),
      });
    } catch (error: any) {
      toast({
        title: t("toast.uploadFailed.title"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingAdditional(false);
    }
  };

  const handleRemoveAdditionalPhoto = async (index: number) => {
    const photoUrl = additionalPhotos[index];
    const photoPath = photoUrl.split("/").slice(-2).join("/");

    try {
      await supabase.storage.from("profile-photos").remove([photoPath]);
      const newPhotos = additionalPhotos.filter((_, i) => i !== index);
      setAdditionalPhotos(newPhotos);

      toast({
        title: t("toast.photoRemoved.title"),
        description: t("toast.photoRemoved.description"),
      });
    } catch (error: any) {
      toast({
        title: t("toast.errorTitle"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (latitude === null || longitude === null) {
      toast({
        title: t("toast.locationRequired.title"),
        description: t("toast.locationRequired.description"),
        variant: "destructive",
      });
      return;
    }
    if (isTestUser) {
      if (additionalPhotos.length < minPhotos) {
        toast({
          title: t("toast.testPhotos.title"),
          description: t("toast.testPhotos.description"),
        });
      }
    }
    else {
      if (additionalPhotos.length < minPhotos) {
        toast({
          title: t("toast.photosRequired.title"),
          description: t("toast.photosRequired.description", { min: minPhotos }),
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      const profileSchema = z.object({
        firstName: z.string().trim().min(1, t("validation.nameRequired")).max(100, t("validation.nameTooLong")),
        lastName: z.string().trim().min(1, t("validation.nameRequired")).max(100, t("validation.nameTooLong")),
        birthday: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, t("validation.birthdayFormat")),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        bio: z.string().trim().max(1000, t("validation.bioTooLong")).optional(),
      });

      // Validate input
      const validation = profileSchema.safeParse({
        firstName,
        lastName,
        birthday,
        latitude,
        longitude,
        bio,
      });

      if (!validation.success) {
        const errors = validation.error.errors.map(e => e.message).join(", ");
        throw new Error(errors);
      }

      // Parse birthday (DD/MM/YYYY) and calculate age
      const [day, month, year] = birthday.split('/').map(Number);
      const birthdayDate = new Date(Date.UTC(year, month - 1, day));
      const today = new Date();
      let calculatedAge = today.getUTCFullYear() - birthdayDate.getUTCFullYear();
      const monthDiff = today.getUTCMonth() - birthdayDate.getUTCMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < birthdayDate.getUTCDate())) {
        calculatedAge--;
      }

      // Validate age
      if (calculatedAge < 18) {
        throw new Error(t("validation.ageMin"));
      }
      if (calculatedAge > 120) {
        throw new Error(t("validation.birthdayInvalid"));
      }

      // Check if questionnaire is completed
      let questionnaireCompleted = true;
      for (const q of questions) {
        // only check the combined questions
        if (!q.combined) continue;
        // Skip if skippable
        if (q.minResponses === 0) continue;

        // Skip if hidden
        if (q.showIf) {
          const dependentAnswer = answers[q.showIf.questionId];
          if (dependentAnswer !== q.showIf.answer) continue;
        }

        // Check if answered
        const userAnswer = answers[q.id];
        if (!userAnswer || userAnswer.trim() === "") {
          questionnaireCompleted = false;
          break;
        }
      }

      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          first_name: validation.data.firstName,
          age: calculatedAge,
          bio: validation.data.bio || null,
          is_paused: isPaused,
          completed_questionnaire: questionnaireCompleted,
          additional_photos: additionalPhotos,
        });

      if (error) throw error;

      const { error: privateError } = await supabase
        .from("private_profile_data" as any)
        .upsert({
          user_id: user.id,
          email: user.email,
          last_name: validation.data.lastName,
          birthday: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          latitude: validation.data.latitude,
          longitude: validation.data.longitude,
          phone_number: phoneNumber || null,
        });

      if (privateError) throw privateError;

      const profilePromptAnswers = [
        {
          user_id: user.id,
          question_number: 38,
          question_id: 38,
          answer: (threeWords || "").trim(),
          answer_custom: (threeWords || "").trim() || null,
        },
        {
          user_id: user.id,
          question_number: 39,
          question_id: 39,
          answer: (funFact || "").trim(),
          answer_custom: (funFact || "").trim() || null,
        },
      ];
      const { error: promptAnswersError } = await supabase
        .from("personality_answers")
        .upsert(profilePromptAnswers, { onConflict: "user_id,question_number" });
      if (promptAnswersError) throw promptAnswersError;

      if (isFirstTimeSetup) {
        toast({
          title: t("toast.setupComplete.title"),
          description: t("toast.setupComplete.description"),
        });


      } else {
        toast({
          title: t("toast.profileSaved.title"),
          description: t("toast.profileSaved.description"),
        });
      }
      navigate("/matches")
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
  const privateMessage = <span className="text-muted-foreground">{t("private")}</span>
  return (
    <>
      <div className="p-4 py-12">
        <Card className="max-w-2xl mx-auto shadow-xl border-border/50">
          <CardHeader>
            <CardTitle className="text-3xl font-bold bg-linear-to-r from-backgrounda to-backgroundc bg-clip-text text-transparent">
              {isFirstTimeSetup ? t("title.create") : t("title.edit")}
            </CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  {isTestUser && (<>
                    <Label>{t("photos.uploadGeneric")}</Label>
                    <Button
                      type="button"
                      variant="outline"
                      className="bg-yellow-200"
                      size="sm"
                      disabled={uploadingPhoto}
                      onClick={(e) => { handlePhotoUpload(e) }}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingPhoto ? t("photos.uploading") : t("photos.uploadGenericButton")}
                    </Button>
                  </>
                  )}
                  <Label>{t("photos.uploadCount", { count: additionalPhotos.length, limit: photoLimit })}</Label>
                  {additionalPhotos.length < photoLimit && (
                    <>
                      <Input
                        id="additional-photo"
                        type="file"
                        accept="image/*"
                        onChange={handleAdditionalPhotoUpload}
                        disabled={uploadingAdditional}
                        className="hidden"
                      />
                      <Label htmlFor="additional-photo">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={uploadingAdditional}
                          onClick={() => document.getElementById("additional-photo")?.click()}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {uploadingAdditional ? t("photos.uploading") : t("photos.add")}
                        </Button>
                      </Label>
                    </>
                  )}
                </div>
                {additionalPhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-4">
                    {additionalPhotos.map((photo, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={photo}
                          alt={t("photos.alt", { index: index + 1 })}
                          className="w-full h-32 object-cover rounded-lg cursor-pointer"
                          onClick={() => setSelectedPhotoUrl(photo)}
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 opacity-70 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveAdditionalPhoto(index);
                          }}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <span className="text-sm text-muted-foreground">{t("photos.tip")}</span>
              <div className="space-y-2">

                <Label htmlFor="firstName">{t("fields.firstName")}</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t("fields.firstNamePlaceholder")}
                  required
                />
              </div>
              <div className="space-y-2">

                <Label htmlFor="lastName">{t("fields.lastName")} {privateMessage}</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={t("fields.lastNamePlaceholder")}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">{t("fields.phone")} {privateMessage}</Label>
                <div id="phoneNumber">
                  <PhoneInput
                    country={"ch"}
                    preferredCountries={['ch', 'de', 'us']}
                    placeholder={t("fields.phonePlaceholder")}
                    value={phoneNumber}
                    onChange={(phone) => setPhoneNumber(phone)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birthday">{t("fields.birthday")}</Label>
                  <Input
                    id="birthday"
                    type="text"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    placeholder={t("fields.birthdayPlaceholder")}
                    required
                    maxLength={10}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("fields.location")}</Label>
                  {locationStatus === "granted" && latitude && longitude ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-3 py-2 rounded-md border border-border bg-muted text-sm">
                        {t("location.set")}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRequestLocation}
                      >
                        {t("location.update")}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={handleRequestLocation}
                      >
                        {locationStatus === "denied" ? t("location.retry") : t("location.getMy")}
                      </Button>
                      {locationStatus === "denied" && (
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">{t("location.orChooseCity")}</Label>
                          <Select value={selectedCity} onValueChange={handleCitySelect}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={t("location.selectCity")} />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.keys(CITY_FROM_LAT_LONG).map((city) => (
                                <SelectItem key={city} value={city}>
                                  {city}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">{t("fields.bio")}</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder={t("fields.bioPlaceholder")}
                  className="min-h-[120px]"
                />
              </div>
              <div >
                <div className="pt-6 border-t border-border"></div>
                <p className="text-sm font-bold text-orbiit mb-4">{t("prompts.heading")}</p>
                <div className="mb-4">
                  <p className="text-sm font-medium text-muted-foreground mb-1">{t("prompts.threeWords")}</p>
                  <Textarea
                    value={threeWords}
                    onChange={(e) => setThreeWords(e.target.value)}
                    placeholder={t("prompts.threeWordsPlaceholder")}
                    className="min-h-[80px]"
                  />
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-muted-foreground mb-1">{t("prompts.funFact")}</p>
                  <Textarea
                    value={funFact}
                    onChange={(e) => setFunFact(e.target.value)}
                    placeholder={t("prompts.funFactPlaceholder")}
                    className="min-h-[80px]"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-linear-to-r from-backgrounda to-backgroundc hover:opacity-90 transition-opacity"
                disabled={isLoading || loadingQuestions}
              >
                {isLoading ? t("actions.saving") : isFirstTimeSetup ? t("actions.finishSetup") : t("actions.saveProfile")}
              </Button>

              <div className="pt-6 border-t border-border space-y-2 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => navigate("/change-password")}
                >
                  <Edit className="w-4 h-4 mr-2" />{t("actions.changePassword")}
                </Button>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/20"
                    onClick={() => setPauseDialogOpen(true)}
                  >
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${isPaused ? "bg-amber-500" : "bg-gray-300"}`} />
                      {isPaused ? t("actions.profilePaused") : t("actions.pauseProfile")}
                    </div>
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      // Check for pending dates before opening dialog
                      if (user) {
                        supabase
                          .from('dates')
                          .select('*')
                          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
                          .in('status', ['pending', 'confirmed'])
                          .then(({ data }) => {
                            if (data) setPendingDates(data);
                            setDeleteDialogOpen(true);
                          });
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />{t("actions.delete")}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <Dialog open={pauseDialogOpen} onOpenChange={setPauseDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("pauseDialog.title")}</DialogTitle>
              <DialogDescription>
                {t("pauseDialog.description")}
              </DialogDescription>
            </DialogHeader>
            <div className="py-6">
              <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">{t("pauseDialog.status")}</Label>
                  <div className="text-sm text-muted-foreground">
                    {isPaused ? t("pauseDialog.paused") : t("pauseDialog.active")}
                  </div>
                </div>
                <Switch
                  checked={isPaused}
                  onCheckedChange={async (checked) => {
                    if (!user) return;
                    setIsPaused(checked); // Optimistic update

                    try {
                      const { error } = await supabase
                        .from('profiles')
                        .update({
                          is_paused: checked
                        })
                        .eq('id', user.id);

                      if (error) throw error;

                      toast({
                        title: checked ? t("toast.accountPaused.title") : t("toast.accountActive.title"),
                        description: checked
                          ? t("toast.accountPaused.description")
                          : t("toast.accountActive.description"),
                      });
                    } catch (error: any) {
                      setIsPaused(!checked); // Revert on error
                      toast({
                        title: t("toast.errorTitle"),
                        description: error.message,
                        variant: "destructive",
                      });
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setPauseDialogOpen(false)}>{t("actions.close")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                {t("deleteDialog.title")}
              </DialogTitle>
              <DialogDescription className="pt-4 space-y-4">
                <p>
                  {t("deleteDialog.description")}
                </p>

                {pendingDates.length > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md border border-yellow-200 dark:border-yellow-800">
                    <p className="text-yellow-800 dark:text-yellow-200 font-medium mb-2">
                      {t("deleteDialog.warningTitle")}
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      {t("deleteDialog.warningBody")}
                    </p>
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-center pt-4">
              <div className="w-full space-y-4">
                <LongPressButton
                  onLongPress={async () => {
                    if (!user) return;
                    setIsDeleting(true);
                    try {
                      // 1. Delete account via edge function (which handles notifications)
                      const { error } = await supabase.functions.invoke('delete-account');
                      if (error) throw error;

                      // 4. Sign out and redirect
                      await supabase.auth.signOut();
                      toast({
                        title: t("toast.accountDeleted.title"),
                        description: t("toast.accountDeleted.description"),
                      });
                      navigate("/");
                    } catch (error: any) {
                      toast({
                        title: t("toast.deleteError.title"),
                        description: error.message,
                        variant: "destructive",
                      });
                      setIsDeleting(false);
                    }
                  }}
                  variant="destructive"
                  className="w-full"
                  disabled={isDeleting}
                >
                  {isDeleting ? t("deleteDialog.deleting") : t("deleteDialog.hold")}
                </LongPressButton>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setDeleteDialogOpen(false)}
                  disabled={isDeleting}
                >
                  {t("actions.cancel")}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!selectedPhotoUrl} onOpenChange={() => setSelectedPhotoUrl(null)}>
          <DialogContent className="max-w-4xl p-0 border-0">
            <DialogHeader className="sr-only">
              <DialogTitle>{t("photoPreview.title")}</DialogTitle>
            </DialogHeader>
            {selectedPhotoUrl && (
              <img
                src={selectedPhotoUrl}
                alt={t("photoPreview.fullSizeAlt")}
                className="w-full h-auto max-h-[90vh] object-contain"
              />
            )}
          </DialogContent>
        </Dialog>

      </div >
    </>);
};

export default ProfileSetup;
