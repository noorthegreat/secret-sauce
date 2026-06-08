import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Check, ChevronsUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import {
  SWISS_CITY_INSTITUTION_GROUPS,
  SWISS_CITY_OPTIONS,
  SWISS_INSTITUTIONS_BY_CITY,
} from "@/lib/swissInstitutions";

const SwitzerlandWaitlist = () => {
  const { toast } = useToast();
  const { t } = useTranslation("switzerlandWaitlist");
  const [selectedCity, setSelectedCity] = useState<string>(SWISS_CITY_OPTIONS[0] ?? "");
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>("");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [consentToUpdates, setConsentToUpdates] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schoolPickerOpen, setSchoolPickerOpen] = useState(false);

  const institutions = useMemo(
    () => SWISS_INSTITUTIONS_BY_CITY[selectedCity] ?? [],
    [selectedCity],
  );
  const searchableInstitutions = useMemo(
    () => SWISS_CITY_INSTITUTION_GROUPS.flatMap((group) =>
      group.institutions.map((institution) => ({
        ...institution,
        city: group.city,
      })),
    ),
    [],
  );
  const selectedInstitution = useMemo(
    () => institutions.find((institution) => institution.id === selectedInstitutionId) ?? null,
    [institutions, selectedInstitutionId],
  );
  useEffect(() => {
    if (!institutions.some((institution) => institution.id === selectedInstitutionId)) {
      setSelectedInstitutionId(institutions[0]?.id ?? "");
    }
  }, [institutions, selectedInstitutionId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const waitlistFormSchema = z.object({
      firstName: z.string().trim().min(1, t("validation.firstNameRequired")).max(80, t("validation.firstNameTooLong")).regex(/^[\p{L}\p{M}' -]+$/u, t("validation.firstNamePattern")),
      email: z.string().trim().email(t("validation.emailInvalid")).max(254, t("validation.emailTooLong")),
      city: z.string().trim().min(1, t("validation.cityRequired")),
      institutionId: z.string().trim().min(1, t("validation.institutionRequired")),
      consentToUpdates: z.boolean(),
    });

    const validation = waitlistFormSchema.safeParse({
      firstName,
      email,
      city: selectedCity,
      institutionId: selectedInstitutionId,
      consentToUpdates,
    });

    if (!validation.success) {
      toast({
        title: t("toast.review.title"),
        description: validation.error.errors[0]?.message ?? t("toast.review.fallback"),
        variant: "destructive",
      });
      return;
    }

    const normalizedEmail = validation.data.email.trim().toLowerCase();
    const emailDomain = normalizedEmail.split("@")[1] ?? "";
    const matchesInstitution = selectedInstitution?.emailDomains.some((allowedDomain) =>
      emailDomain === allowedDomain || emailDomain.endsWith(`.${allowedDomain}`),
    );

    if (!selectedInstitution || !matchesInstitution) {
      toast({
        title: t("toast.schoolEmail.title"),
        description: selectedInstitution
          ? t("toast.schoolEmail.withInstitution", { name: selectedInstitution.name, domains: selectedInstitution.emailDomains.join(", ") })
          : t("toast.schoolEmail.noInstitution"),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("join-university-waitlist", {
        body: validation.data,
      });

      if (error) {
        throw new Error(error.message || t("toast.failure.fallback"));
      }

      if (data?.error) {
        throw new Error(String(data.error));
      }

      toast({
        title: t("toast.success.title"),
        description: t("toast.success.description"),
      });

      setFirstName("");
      setEmail("");
      setConsentToUpdates(true);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : t("toast.failure.fallback");

      toast({
        title: t("toast.failure.title"),
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative z-10 container mx-auto px-4 py-12 text-white md:py-16">
      <section className="mx-auto max-w-3xl text-center">
        <Badge className="border border-white/20 bg-white/12 px-4 py-1.5 text-white shadow-none hover:bg-white/12">
          {t("badge")}
        </Badge>
        <h1 className="mt-5 text-4xl font-semibold leading-tight text-white [text-shadow:0_4px_20px_rgba(0,0,0,0.45)] sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-white/85 [text-shadow:0_2px_10px_rgba(0,0,0,0.35)] sm:text-lg">
          {t("subtitle")}
        </p>
      </section>

      <section className="mx-auto mt-8 max-w-3xl">
        <Card className="rounded-[2rem] border border-white/25 bg-black/20 text-white backdrop-blur-xl">
          <CardContent className="p-6 sm:p-8">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-white/90">{t("fields.city.label")}</Label>
                  <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger className="h-12 rounded-2xl border-white/20 bg-white/12 text-white">
                      <SelectValue placeholder={t("fields.city.placeholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {SWISS_CITY_OPTIONS.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/90">{t("fields.school.label")}</Label>
                  <Popover open={schoolPickerOpen} onOpenChange={setSchoolPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={schoolPickerOpen}
                        className="h-12 w-full justify-between rounded-2xl border-white/20 bg-white/12 px-4 text-left text-white hover:bg-white/16 hover:text-white"
                      >
                        <span className="truncate">
                          {selectedInstitution ? selectedInstitution.name : t("fields.school.placeholder")}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-70" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] border-white/20 bg-slate-950/96 p-0 text-white backdrop-blur-xl" align="start">
                      <Command className="bg-transparent text-white">
                        <CommandInput
                          placeholder={t("fields.school.searchPlaceholder")}
                          className="text-white placeholder:text-white/45"
                        />
                        <CommandList>
                          <CommandEmpty>{t("fields.school.empty")}</CommandEmpty>
                          <CommandGroup>
                            {searchableInstitutions.map((institution) => (
                              <CommandItem
                                key={institution.id}
                                value={`${institution.name} ${institution.city}`}
                                onSelect={() => {
                                  setSelectedCity(institution.city);
                                  setSelectedInstitutionId(institution.id);
                                  setSchoolPickerOpen(false);
                                }}
                                className="flex items-center justify-between rounded-xl px-3 py-3 data-[selected=true]:bg-white/12 data-[selected=true]:text-white"
                              >
                                <div className="min-w-0">
                                  <p className="truncate">{institution.name}</p>
                                  <p className="text-xs text-white/55">{institution.city}</p>
                                </div>
                                <Check className={`ml-3 h-4 w-4 ${selectedInstitutionId === institution.id ? "opacity-100" : "opacity-0"}`} />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="waitlist-first-name" className="text-white/90">{t("fields.firstName.label")}</Label>
                <Input
                  id="waitlist-first-name"
                  autoComplete="given-name"
                  maxLength={80}
                  placeholder={t("fields.firstName.placeholder")}
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  className="h-12 rounded-2xl border-white/20 bg-white/12 text-white placeholder:text-white/45"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="waitlist-email" className="text-white/90">{t("fields.email.label")}</Label>
                <Input
                  id="waitlist-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  maxLength={254}
                  placeholder={selectedInstitution ? `you@${selectedInstitution.emailDomains[0]}` : t("fields.email.fallbackPlaceholder")}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 rounded-2xl border-white/20 bg-white/12 text-white placeholder:text-white/45"
                  required
                />
                {selectedInstitution && (
                  <p className="text-sm text-white/70">
                    {selectedInstitution.emailDomains.join(", ")}
                  </p>
                )}
              </div>

              <div className="flex items-start space-x-3 rounded-2xl border border-white/15 bg-white/8 p-4">
                <Checkbox
                  id="waitlist-consent"
                  checked={consentToUpdates}
                  onCheckedChange={(checked) => setConsentToUpdates(checked === true)}
                />
                <div className="space-y-1">
                  <Label htmlFor="waitlist-consent" className="cursor-pointer text-white/90">
                    {t("fields.consent.label")}
                  </Label>
                  <p className="text-sm text-white/65">
                    {t("fields.consent.help")}
                  </p>
                </div>
              </div>

              <Button
                type="submit"
                className="h-12 w-full rounded-full bg-white text-slate-950 hover:bg-white/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? t("submit.loading") : t("submit.idle")}
              </Button>

              <p className="text-center text-xs text-white/60">
                {t("footnote")}
              </p>
            </form>
          </CardContent>
        </Card>

        <div className="mt-5 text-center text-sm text-white/75">
          {t("missingSchool")}
        </div>
      </section>
    </div>
  );
};

export default SwitzerlandWaitlist;
