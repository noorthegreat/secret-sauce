import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Building2, KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const managerLeadSchema = z.object({
  buildingName: z.string().trim().min(2, "Please enter the building name.").max(160),
  city: z.string().trim().min(1, "Please enter the city.").max(120),
  stateRegion: z.string().trim().max(120).optional(),
  managerFirstName: z.string().trim().min(1, "Please enter your first name.").max(80),
  managerLastName: z.string().trim().min(1, "Please enter your last name.").max(80),
  managerEmail: z.string().trim().email("Please enter a valid work email.").max(254),
  managerPhone: z.string().trim().min(8, "Please enter a valid phone number.").max(20),
  jobTitle: z.string().trim().max(120).optional(),
  unitCount: z.number().int().min(1, "Please enter the number of units.").max(10000),
  notes: z.string().trim().max(2000).optional(),
  contactViaSms: z.boolean(),
  contactViaEmail: z.boolean(),
});

const BuildingManagerOptIn = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [buildingName, setBuildingName] = useState("Chorus Apartments");
  const [city, setCity] = useState("San Francisco");
  const [stateRegion, setStateRegion] = useState("CA");
  const [managerFirstName, setManagerFirstName] = useState("");
  const [managerLastName, setManagerLastName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [managerPhone, setManagerPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [unitCount, setUnitCount] = useState("250");
  const [notes, setNotes] = useState("");
  const [contactViaSms, setContactViaSms] = useState(true);
  const [contactViaEmail, setContactViaEmail] = useState(true);
  const [successState, setSuccessState] = useState<null | { inviteCode: string; buildingSlug: string }>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validation = managerLeadSchema.safeParse({
      buildingName,
      city,
      stateRegion,
      managerFirstName,
      managerLastName,
      managerEmail,
      managerPhone,
      jobTitle,
      unitCount: Number(unitCount),
      notes,
      contactViaSms,
      contactViaEmail,
    });

    if (!validation.success) {
      toast({
        title: "Please review the form",
        description: validation.error.errors[0]?.message ?? "Some details need attention.",
        variant: "destructive",
      });
      return;
    }

    if (!contactViaSms && !contactViaEmail) {
      toast({
        title: "Choose a contact method",
        description: "Please select SMS or email so we can follow up about launch and subscription details.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("submit-building-manager-lead", {
        body: validation.data,
      });

      if (error) throw new Error(error.message || "Unable to submit the building request.");
      if (data?.error) throw new Error(String(data.error));

      setSuccessState({
        inviteCode: String(data.inviteCode ?? ""),
        buildingSlug: String(data.buildingSlug ?? ""),
      });

      toast({
        title: "Building request received",
        description: "We saved the manager lead and created a provisional building setup flow.",
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

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12 text-white md:py-16">
      <section className="mx-auto max-w-3xl text-center">
        <Badge className="border border-white/20 bg-white/12 px-4 py-1.5 text-white shadow-none hover:bg-white/12">
          For Building Managers
        </Badge>
        <h1 className="mt-5 text-4xl font-semibold leading-tight [text-shadow:0_4px_20px_rgba(0,0,0,0.45)] sm:text-5xl">
          Launch a private resident community in your building
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-white/85 [text-shadow:0_2px_10px_rgba(0,0,0,0.35)] sm:text-lg">
          Start the monthly subscription flow, collect resident opt-ins, and give your building a premium community amenity centered on friendships, networking, and better event participation.
        </p>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="rounded-[2rem] border border-white/20 bg-black/25 text-white backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white">Manager + Building Intake</CardTitle>
            <CardDescription className="text-white/70">
              We’ll use this to create the building record, open the subscription conversation, and prepare the resident invite flow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {successState ? (
              <div className="space-y-5">
                <div className="rounded-[1.5rem] border border-emerald-400/25 bg-emerald-500/10 p-5">
                  <p className="text-sm uppercase tracking-[0.2em] text-emerald-200/80">Saved</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Your building flow is started</h2>
                  <p className="mt-3 text-white/80">
                    Share this provisional invite code with your early residents while we finalize the monthly subscription and launch setup.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-white/15 bg-white/8 p-5">
                    <p className="text-sm text-white/60">Invite code</p>
                    <p className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-[0.18em] text-white">
                      <KeyRound className="h-5 w-5" />
                      {successState.inviteCode}
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] border border-white/15 bg-white/8 p-5">
                    <p className="text-sm text-white/60">Resident link</p>
                    <Link
                      className="mt-2 block text-base font-medium text-white underline underline-offset-4"
                      to={`/join-community?invite=${encodeURIComponent(successState.inviteCode)}`}
                    >
                      Open the resident intake flow
                    </Link>
                  </div>
                </div>

                <Button
                  type="button"
                  className="h-12 rounded-full bg-white text-slate-950 hover:bg-white/90"
                  onClick={() => setSuccessState(null)}
                >
                  Submit another building
                </Button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="building-name" className="text-white/90">Building name</Label>
                    <Input id="building-name" value={buildingName} onChange={(event) => setBuildingName(event.target.value)} className="h-12 rounded-2xl border-white/20 bg-white/12 text-white placeholder:text-white/45" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit-count" className="text-white/90">Approximate unit count</Label>
                    <Input id="unit-count" inputMode="numeric" value={unitCount} onChange={(event) => setUnitCount(event.target.value)} className="h-12 rounded-2xl border-white/20 bg-white/12 text-white placeholder:text-white/45" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="building-city" className="text-white/90">City</Label>
                    <Input id="building-city" value={city} onChange={(event) => setCity(event.target.value)} className="h-12 rounded-2xl border-white/20 bg-white/12 text-white placeholder:text-white/45" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="building-state" className="text-white/90">State / region</Label>
                    <Input id="building-state" value={stateRegion} onChange={(event) => setStateRegion(event.target.value)} className="h-12 rounded-2xl border-white/20 bg-white/12 text-white placeholder:text-white/45" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="manager-first-name" className="text-white/90">Manager first name</Label>
                    <Input id="manager-first-name" autoComplete="given-name" value={managerFirstName} onChange={(event) => setManagerFirstName(event.target.value)} className="h-12 rounded-2xl border-white/20 bg-white/12 text-white placeholder:text-white/45" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manager-last-name" className="text-white/90">Manager last name</Label>
                    <Input id="manager-last-name" autoComplete="family-name" value={managerLastName} onChange={(event) => setManagerLastName(event.target.value)} className="h-12 rounded-2xl border-white/20 bg-white/12 text-white placeholder:text-white/45" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="manager-email" className="text-white/90">Work email</Label>
                    <Input id="manager-email" type="email" autoComplete="email" value={managerEmail} onChange={(event) => setManagerEmail(event.target.value)} className="h-12 rounded-2xl border-white/20 bg-white/12 text-white placeholder:text-white/45" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manager-phone" className="text-white/90">Phone number</Label>
                    <Input id="manager-phone" autoComplete="tel" placeholder="+14155551234" value={managerPhone} onChange={(event) => setManagerPhone(event.target.value)} className="h-12 rounded-2xl border-white/20 bg-white/12 text-white placeholder:text-white/45" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="job-title" className="text-white/90">Job title</Label>
                  <Input id="job-title" value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} className="h-12 rounded-2xl border-white/20 bg-white/12 text-white placeholder:text-white/45" placeholder="Community Manager, General Manager, Leasing Director…" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manager-notes" className="text-white/90">Notes</Label>
                  <Textarea id="manager-notes" value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-28 rounded-[1.5rem] border-white/20 bg-white/12 text-white placeholder:text-white/45" placeholder="Amenities, desired launch timing, resident profile, or anything else we should know." />
                </div>

                <div className="grid gap-3 rounded-[1.5rem] border border-white/15 bg-white/8 p-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox id="manager-contact-email" checked={contactViaEmail} onCheckedChange={(checked) => setContactViaEmail(checked === true)} />
                    <div>
                      <Label htmlFor="manager-contact-email" className="cursor-pointer text-white/90">Email me about setup and subscription details</Label>
                      <p className="text-sm text-white/60">Recommended so we can send launch notes and contracts safely.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Checkbox id="manager-contact-sms" checked={contactViaSms} onCheckedChange={(checked) => setContactViaSms(checked === true)} />
                    <div>
                      <Label htmlFor="manager-contact-sms" className="cursor-pointer text-white/90">Text me for launch coordination</Label>
                      <p className="text-sm text-white/60">Useful for quick scheduling and launch-day logistics.</p>
                    </div>
                  </div>
                </div>

                <Button type="submit" className="h-12 w-full rounded-full bg-white text-slate-950 hover:bg-white/90" disabled={isSubmitting}>
                  {isSubmitting ? "Starting building setup..." : "Start the building setup"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="rounded-[2rem] border border-white/20 bg-white/10 text-white backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Sparkles className="h-5 w-5" />
                What this unlocks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-white/85">
              <p>Private, building-only resident community access.</p>
              <p>Friendship and networking introductions with luxury amenity meetup prompts.</p>
              <p>Manager-led events, resident suggestions, and subscription-backed analytics.</p>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border border-white/20 bg-white/10 text-white backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <ShieldCheck className="h-5 w-5" />
                Private by default
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-white/85">
              <p>We only use this form to create a building lead and prep launch.</p>
              <p>Resident access remains scoped to the building community only.</p>
              <p>Nothing here creates open cross-building visibility.</p>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border border-white/20 bg-white/10 text-white backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Building2 className="h-5 w-5" />
                Pilot framing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-white/85">
              <p>Start with one property, one manager-led event calendar, and a premium amenity narrative.</p>
              <p>Residents opt in with their email, phone number, and unit information before access goes live.</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default BuildingManagerOptIn;
