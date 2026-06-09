import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Heart,
  LockKeyhole,
  Sparkles,
  Users,
} from "lucide-react";

import BrandWordmark from "@/components/BrandWordmark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const goalOptions = [
  { label: "New Friends", value: "Friendships", description: "Meet neighbors you genuinely enjoy spending time with." },
  { label: "Professional Connections", value: "Professional connections", description: "Find thoughtful conversations close to home." },
  { label: "Activity Partners", value: "Activity partners", description: "Build routines around movement, hobbies, and shared plans." },
  { label: "Community Events", value: "Community events", description: "Hear about the experiences worth showing up for." },
] as const;

const goalValues = [
  "Friendships",
  "Professional connections",
  "Activity partners",
  "Community events",
] as const;

const interestOptions = [
  "Fitness",
  "Travel",
  "Food",
  "Books",
  "Music",
  "Art",
  "Wellness",
  "Technology",
  "Hiking",
  "Running",
  "Entrepreneurship",
  "Pets",
] as const;

const connectionOptions = [
  "One-on-one",
  "Small groups",
  "Community events",
  "Activity partners",
  "Professional networking",
] as const;

const availabilityOptions = [
  "Weekday evenings",
  "Weekends",
  "Flexible",
  "Workday lunch",
  "Weekday mornings",
  "Late evenings",
] as const;

const amenityOptions = [
  "Resident Lounge",
  "Rooftop Terrace",
  "Coworking Space",
  "Pool",
  "Fitness Center",
  "Private Dining Room",
] as const;

const ageRangeOptions = [
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55-64",
  "65+",
] as const;

const residentJoinSchema = z.object({
  inviteCode: z.string().trim().min(5, "Please enter your building invite code.").max(16),
  firstName: z.string().trim().min(1, "Please enter your first name.").max(80),
  lastName: z.string().trim().min(1, "Please enter your last name.").max(80),
  email: z.string().trim().email("Please enter a valid email.").max(254),
  phone: z.string().trim().min(8, "Please enter a valid phone number.").max(20),
  unitNumber: z.string().trim().min(1, "Please enter your unit number.").max(32),
  moveInDate: z.string().trim().optional(),
  occupation: z.string().trim().max(120, "Keep occupation under 120 characters.").optional(),
  ageRange: z.enum(ageRangeOptions).optional(),
  introduction: z.string().trim().max(400, "Keep your intro under 400 characters.").optional(),
  interests: z.array(z.enum(interestOptions)).min(1, "Choose at least one interest.").max(12),
  lookingFor: z.array(z.enum(goalValues)).min(1, "Choose at least one goal."),
  connectionStyles: z.array(z.enum(connectionOptions)).min(1, "Choose at least one preference."),
  availability: z.array(z.enum(availabilityOptions)).min(1, "Choose at least one time window."),
  amenityPreferences: z.array(z.enum(amenityOptions)).max(6),
  wantsFriendships: z.boolean(),
  wantsNetworking: z.boolean(),
  contactViaSms: z.boolean(),
  contactViaEmail: z.boolean(),
});

type ResidentJoinForm = z.infer<typeof residentJoinSchema>;
type StepKey = "welcome" | "goals" | "interests" | "connect" | "details";

const steps: Array<{ key: StepKey; title: string; subtitle: string }> = [
  { key: "welcome", title: "Welcome to Resident Concierge", subtitle: "Discover people, events, and experiences inside your building." },
  { key: "goals", title: "What brings you here?", subtitle: "Select all that apply." },
  { key: "interests", title: "What are your interests?", subtitle: "Select all that apply." },
  { key: "connect", title: "How do you like to connect?", subtitle: "Select your preference." },
  { key: "details", title: "Complete your concierge profile", subtitle: "Private building verification and preferences." },
];

const initialFormState: ResidentJoinForm = {
  inviteCode: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  unitNumber: "",
  moveInDate: "",
  occupation: "",
  ageRange: undefined,
  introduction: "",
  interests: [],
  lookingFor: [],
  connectionStyles: [],
  availability: ["Weekday evenings"],
  amenityPreferences: [],
  wantsFriendships: true,
  wantsNetworking: false,
  contactViaSms: true,
  contactViaEmail: true,
};

function toggleValue<T extends string>(collection: T[], value: T, max?: number) {
  if (collection.includes(value)) {
    return collection.filter((item) => item !== value);
  }

  if (max && collection.length >= max) {
    return collection;
  }

  return [...collection, value];
}

const ResidentBuildingJoin = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<ResidentJoinForm>(initialFormState);
  const [successState, setSuccessState] = useState<null | { message: string; buildingSlug: string | null }>(null);

  useEffect(() => {
    const invite = searchParams.get("invite");
    if (invite) {
      setForm((current) => ({
        ...current,
        inviteCode: invite.toUpperCase(),
      }));
    }
  }, [searchParams]);

  const currentStep = steps[stepIndex];
  const progress = useMemo(() => (stepIndex / (steps.length - 1)) * 100, [stepIndex]);

  const updateField = <K extends keyof ResidentJoinForm>(field: K, value: ResidentJoinForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const syncGoalFlags = (goals: ResidentJoinForm["lookingFor"]) => {
    const wantsFriendships = goals.some((goal) =>
      goal === "Friendships" || goal === "Activity partners" || goal === "Community events"
    );
    const wantsNetworking = goals.some((goal) => goal === "Professional connections");

    setForm((current) => ({
      ...current,
      lookingFor: goals,
      wantsFriendships,
      wantsNetworking,
    }));
  };

  const validateCurrentStep = () => {
    switch (currentStep.key) {
      case "welcome":
        return null;
      case "goals":
        if (form.lookingFor.length === 0) return "Choose at least one reason for joining.";
        return null;
      case "interests":
        if (form.interests.length === 0) return "Choose at least one interest.";
        return null;
      case "connect":
        if (form.connectionStyles.length === 0) return "Choose at least one connection preference.";
        return null;
      case "details": {
        const result = residentJoinSchema.pick({
          inviteCode: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          unitNumber: true,
          moveInDate: true,
          occupation: true,
          ageRange: true,
          introduction: true,
          availability: true,
          amenityPreferences: true,
          contactViaSms: true,
          contactViaEmail: true,
        }).safeParse(form);

        if (!result.success) {
          return result.error.errors[0]?.message ?? "Please review your details.";
        }
        if (!form.contactViaSms && !form.contactViaEmail) return "Choose at least one contact method.";
        return null;
      }
    }
  };

  const handleNext = () => {
    const error = validateCurrentStep();
    if (error) {
      toast({
        title: "Please review this step",
        description: error,
        variant: "destructive",
      });
      return;
    }

    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  };

  const submitJoinRequest = async () => {
    const validation = residentJoinSchema.safeParse({
      ...form,
      inviteCode: form.inviteCode.toUpperCase(),
    });

    if (!validation.success) {
      toast({
        title: "Please review the form",
        description: validation.error.errors[0]?.message ?? "Some details need attention.",
        variant: "destructive",
      });
      return;
    }

    if (!validation.data.contactViaSms && !validation.data.contactViaEmail) {
      toast({
        title: "Choose a contact method",
        description: "Please select SMS or email so we can contact you about your building community.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("submit-resident-join-request", {
        body: validation.data,
      });

      if (error) throw new Error(error.message || "Unable to submit the join request.");
      if (data?.error) throw new Error(String(data.error));

      setSuccessState({
        message: String(data?.message ?? "Your request has been saved."),
        buildingSlug: typeof data?.buildingSlug === "string" ? data.buildingSlug : null,
      });

      toast({
        title: "Request saved",
        description: "We stored your resident onboarding details and next-step preferences.",
      });
    } catch (error) {
      toast({
        title: "Unable to submit",
        description: error instanceof Error ? error.message : "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitJoinRequest();
  };

  const resetFlow = () => {
    setSuccessState(null);
    setStepIndex(0);
    setForm((current) => ({
      ...initialFormState,
      inviteCode: current.inviteCode,
    }));
  };

  const renderChoiceButton = ({
    title,
    description,
    active,
    onClick,
  }: {
    title: string;
    description?: string;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[1.35rem] border px-4 py-4 text-left transition ${
        active
          ? "border-[#c89f55] bg-[#e8c07a] text-[#2a241b] shadow-[0_18px_40px_rgba(195,151,73,0.25)]"
          : "border-[#eadfce] bg-white text-[#2f2a24] hover:border-[#d9bf92] hover:bg-[#fbf5eb]"
      }`}
    >
      <div className="text-sm font-semibold">{title}</div>
      {description && <div className={`mt-1 text-xs leading-5 ${active ? "text-[#4c4232]" : "text-[#7c7368]"}`}>{description}</div>}
    </button>
  );

  const renderPills = <T extends string>({
    values,
    selected,
    onToggle,
  }: {
    values: readonly T[];
    selected: T[];
    onToggle: (value: T) => void;
  }) => (
    <div className="flex flex-wrap gap-2.5">
      {values.map((value) => {
        const active = selected.includes(value);
        return (
          <button
            key={value}
            type="button"
            onClick={() => onToggle(value)}
            className={`rounded-full border px-3.5 py-2 text-xs font-medium transition ${
              active
                ? "border-[#c89f55] bg-[#f1d6a3] text-[#3e3427]"
                : "border-[#e6dbc9] bg-white text-[#695f53] hover:border-[#d8c09b] hover:bg-[#faf3e8]"
            }`}
          >
            {value}
          </button>
        );
      })}
    </div>
  );

  const renderBody = () => {
    switch (currentStep.key) {
      case "welcome":
        return (
          <div className="flex h-full min-h-[590px] flex-col justify-between rounded-[2rem] bg-[linear-gradient(180deg,rgba(14,12,10,0.72),rgba(14,12,10,0.9)),radial-gradient(circle_at_top,rgba(207,170,107,0.24),transparent_45%)] p-6 text-white shadow-[0_35px_80px_rgba(31,24,17,0.42)]">
            <div className="flex justify-end">
              <div className="rounded-full border border-white/15 bg-white/8 px-4 py-1.5 text-xs uppercase tracking-[0.22em] text-white/70">
                Private by building
              </div>
            </div>
            <div className="space-y-5">
              <BrandWordmark />
              <div className="space-y-4">
                <h2 className="font-display text-5xl leading-none">Welcome to Resident Concierge</h2>
                <p className="max-w-sm text-sm leading-7 text-white/78">
                  Discover people, events, and experiences inside your building.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <Button type="button" onClick={handleNext} className="h-12 w-full rounded-full bg-[#d1a457] text-[#2f271d] hover:bg-[#c89f55]">
                Begin
              </Button>
              <p className="text-center text-xs text-white/58">
                Already a member? <Link className="underline underline-offset-4" to="/auth">Sign in</Link>
              </p>
            </div>
          </div>
        );
      case "goals":
        return (
          <form className="space-y-5" onSubmit={(event) => event.preventDefault()}>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.18em] text-[#9e8a68]">{currentStep.subtitle}</p>
              <h2 className="text-[1.65rem] font-semibold text-[#1f1b17]">{currentStep.title}</h2>
            </div>
            <div className="space-y-3">
              {goalOptions.map((option) => (
                <div key={option.value}>
                  {renderChoiceButton({
                    title: option.label,
                    description: option.description,
                    active: form.lookingFor.includes(option.value),
                    onClick: () => syncGoalFlags(toggleValue(form.lookingFor, option.value)),
                  })}
                </div>
              ))}
            </div>
          </form>
        );
      case "interests":
        return (
          <div className="space-y-5">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.18em] text-[#9e8a68]">{currentStep.subtitle}</p>
              <h2 className="text-[1.65rem] font-semibold text-[#1f1b17]">{currentStep.title}</h2>
            </div>
            {renderPills({
              values: interestOptions,
              selected: form.interests,
              onToggle: (value) => updateField("interests", toggleValue(form.interests, value, 12)),
            })}
          </div>
        );
      case "connect":
        return (
          <div className="space-y-5">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.18em] text-[#9e8a68]">{currentStep.subtitle}</p>
              <h2 className="text-[1.65rem] font-semibold text-[#1f1b17]">{currentStep.title}</h2>
            </div>
            <div className="space-y-3">
              {connectionOptions.map((option) =>
                renderChoiceButton({
                  title: option,
                  active: form.connectionStyles.includes(option),
                  onClick: () => updateField("connectionStyles", toggleValue(form.connectionStyles, option)),
                })
              )}
            </div>
          </div>
        );
      case "details":
        return (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.18em] text-[#9e8a68]">{currentStep.subtitle}</p>
              <h2 className="text-[1.65rem] font-semibold text-[#1f1b17]">{currentStep.title}</h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} className="h-11 rounded-2xl border-[#e4d9c7] bg-[#fcf8f1]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} className="h-11 rounded-2xl border-[#e4d9c7] bg-[#fcf8f1]" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} className="h-11 rounded-2xl border-[#e4d9c7] bg-[#fcf8f1]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} className="h-11 rounded-2xl border-[#e4d9c7] bg-[#fcf8f1]" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="inviteCode">Invite code</Label>
                <Input id="inviteCode" value={form.inviteCode} onChange={(event) => updateField("inviteCode", event.target.value.toUpperCase())} className="h-11 rounded-2xl border-[#e4d9c7] bg-[#fcf8f1]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitNumber">Unit</Label>
                <Input id="unitNumber" value={form.unitNumber} onChange={(event) => updateField("unitNumber", event.target.value)} className="h-11 rounded-2xl border-[#e4d9c7] bg-[#fcf8f1]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="moveInDate">Move-in date</Label>
                <Input id="moveInDate" type="date" value={form.moveInDate} onChange={(event) => updateField("moveInDate", event.target.value)} className="h-11 rounded-2xl border-[#e4d9c7] bg-[#fcf8f1]" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="occupation">Occupation</Label>
                <Input id="occupation" value={form.occupation} onChange={(event) => updateField("occupation", event.target.value)} className="h-11 rounded-2xl border-[#e4d9c7] bg-[#fcf8f1]" />
              </div>
              <div className="space-y-2">
                <Label>Age range</Label>
                <Select value={form.ageRange} onValueChange={(value) => updateField("ageRange", value as ResidentJoinForm["ageRange"])}>
                  <SelectTrigger className="h-11 rounded-2xl border-[#e4d9c7] bg-[#fcf8f1]">
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    {ageRangeOptions.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Availability</Label>
              {renderPills({
                values: availabilityOptions,
                selected: form.availability,
                onToggle: (value) => updateField("availability", toggleValue(form.availability, value)),
              })}
            </div>

            <div className="space-y-2">
              <Label>Amenities you would use for meetups</Label>
              {renderPills({
                values: amenityOptions,
                selected: form.amenityPreferences,
                onToggle: (value) => updateField("amenityPreferences", toggleValue(form.amenityPreferences, value, 6)),
              })}
            </div>

            <div className="space-y-2">
              <Label htmlFor="introduction">Short note</Label>
              <Textarea
                id="introduction"
                value={form.introduction}
                onChange={(event) => updateField("introduction", event.target.value)}
                className="min-h-[110px] rounded-[1.4rem] border-[#e4d9c7] bg-[#fcf8f1]"
                placeholder="Anything helpful we should know about how you like to meet neighbors?"
              />
            </div>

            <div className="grid gap-3 rounded-[1.35rem] border border-[#eadfce] bg-[#faf4ea] p-4">
              <div className="flex items-start gap-3">
                <Checkbox id="contactViaSms" checked={form.contactViaSms} onCheckedChange={(checked) => updateField("contactViaSms", checked === true)} />
                <Label htmlFor="contactViaSms" className="cursor-pointer leading-6">Text me about introductions and upcoming experiences</Label>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox id="contactViaEmail" checked={form.contactViaEmail} onCheckedChange={(checked) => updateField("contactViaEmail", checked === true)} />
                <Label htmlFor="contactViaEmail" className="cursor-pointer leading-6">Email me the same details</Label>
              </div>
            </div>
          </form>
        );
    }
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-10 md:py-16">
      <section className="grid gap-8 lg:grid-cols-[0.45fr_0.55fr] lg:items-start">
        <aside className="space-y-6 text-[#28241f]">
          <BrandWordmark tone="dark" />
          <div className="space-y-4">
            <h1 className="font-display text-5xl leading-[0.95] sm:text-6xl">Meet your neighbors. Experience your community. Live connected.</h1>
            <p className="max-w-md text-base leading-7 text-[#5f574d]">
              A private concierge-style experience for discovering the right people, the right events, and the right amenity moments inside your building.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4 rounded-[1.6rem] border border-[#e1d4c1] bg-[#faf5ec] p-4">
              <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-full border border-[#dbc8a3] bg-[#efe2cb] text-[#95784a]">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-[#2c2721]">Curated Introductions</h2>
                <p className="mt-1 text-sm leading-6 text-[#665d52]">We connect you with compatible neighbors, not a crowd.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-[1.6rem] border border-[#e1d4c1] bg-[#faf5ec] p-4">
              <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-full border border-[#dbc8a3] bg-[#efe2cb] text-[#95784a]">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-[#2c2721]">Meaningful Experiences</h2>
                <p className="mt-1 text-sm leading-6 text-[#665d52]">Join events and activities you will actually want to attend.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-[1.6rem] border border-[#e1d4c1] bg-[#faf5ec] p-4">
              <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-full border border-[#dbc8a3] bg-[#efe2cb] text-[#95784a]">
                <Heart className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-[#2c2721]">Stronger Community</h2>
                <p className="mt-1 text-sm leading-6 text-[#665d52]">Together we create a place that feels more like home.</p>
              </div>
            </div>
          </div>
        </aside>

        <div className="mx-auto w-full max-w-[460px]">
          {successState ? (
            <Card className="overflow-hidden rounded-[2.1rem] border border-[#e0d4c1] bg-white shadow-[0_30px_90px_rgba(53,43,27,0.12)]">
              <CardContent className="space-y-6 p-7 text-[#26221d]">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[radial-gradient(circle,rgba(240,214,164,0.92),rgba(246,240,229,0.55))] text-[#b48537]">
                  <Sparkles className="h-10 w-10" />
                </div>
                <div className="space-y-2 text-center">
                  <p className="text-sm font-semibold text-[#a18254]">Great! You&apos;re all set.</p>
                  <h2 className="text-3xl font-semibold">Your concierge profile is saved.</h2>
                </div>
                <div className="rounded-[1.5rem] border border-[#ece0d0] bg-[#faf4ea] p-5 text-sm leading-7 text-[#655c50]">
                  <p>{successState.message}</p>
                  <div className="mt-4 space-y-1">
                    <p>Based on your profile:</p>
                    <p>12 residents share your interests</p>
                    <p>3 upcoming events may be a fit</p>
                    <p>2 building spaces are ideal for meeting</p>
                  </div>
                </div>
                <div className="space-y-3">
                    <Button asChild className="h-12 w-full rounded-full bg-[#c89f55] text-[#2a241b] hover:bg-[#b98f43]">
                    <Link to={successState.buildingSlug ? `/community/${successState.buildingSlug}/home` : "/"}>
                      Explore Community
                    </Link>
                  </Button>
                  <Button type="button" variant="outline" onClick={resetFlow} className="h-12 w-full rounded-full border-[#dcc9ae] bg-white text-[#3a3227] hover:bg-[#faf3e8]">
                    Start again
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden rounded-[2.1rem] border border-[#e0d4c1] bg-white shadow-[0_30px_90px_rgba(53,43,27,0.12)]">
              <CardContent className="space-y-5 p-6">
                {currentStep.key !== "welcome" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
                        className={`rounded-full border border-[#eadfce] p-2 text-[#6a6054] ${stepIndex === 0 ? "pointer-events-none opacity-0" : "hover:bg-[#faf3e8]"}`}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      <Badge className="border border-[#eadfce] bg-[#faf4ea] px-3 py-1 text-[#9a8460] shadow-none">
                        Step {stepIndex} of {steps.length - 1}
                      </Badge>
                    </div>
                    <Progress value={progress} className="h-1.5 rounded-full bg-[#f1e6d6] [&>div]:bg-[#c89f55]" />
                  </div>
                )}

                {renderBody()}

                {currentStep.key !== "welcome" && (
                  <div className="pt-2">
                    {currentStep.key === "details" ? (
                      <Button onClick={submitJoinRequest} className="h-12 w-full rounded-full bg-[#c89f55] text-[#2a241b] hover:bg-[#b98f43]" disabled={isSubmitting}>
                        {isSubmitting ? "Saving..." : "Explore Community"}
                      </Button>
                    ) : (
                      <Button onClick={handleNext} className="h-12 w-full rounded-full bg-[#c89f55] text-[#2a241b] hover:bg-[#b98f43]">
                        Next
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="mt-4 flex items-center gap-2 text-xs text-[#7a7062]">
            <LockKeyhole className="h-3.5 w-3.5" />
            Your profile remains private to your building and is reviewed before community access is confirmed.
          </div>
        </div>
      </section>
    </div>
  );
};

export default ResidentBuildingJoin;
