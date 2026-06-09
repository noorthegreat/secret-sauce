import { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import {
  Building2,
  CalendarRange,
  KeyRound,
  LineChart,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

import BrandWordmark from "@/components/BrandWordmark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

const managerBenefits = [
  {
    icon: UsersRound,
    title: "Curated Introductions",
    description: "Connect compatible residents with the right tone and timing.",
  },
  {
    icon: CalendarRange,
    title: "Community Programming",
    description: "See what residents will actually attend before you plan the month.",
  },
  {
    icon: LineChart,
    title: "Community Intelligence",
    description: "Understand interests, engagement, and which amenities create the best moments.",
  },
];

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
        title: "Pilot request received",
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
    <div className="container mx-auto max-w-7xl px-4 py-12 md:py-16">
      <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <Badge className="border border-[#d7c7ad] bg-[#f6efe4] px-4 py-1.5 text-[#8a7353] shadow-none hover:bg-[#f6efe4]">
            Property Manager Pilot
          </Badge>
          <BrandWordmark tone="dark" />
          <div className="space-y-4 text-[#2a2621]">
            <h1 className="font-display text-5xl leading-[0.95] sm:text-6xl">
              Transform Residents Into Community
            </h1>
            <p className="max-w-2xl text-base leading-7 text-[#5f564a] sm:text-lg">
              Resident Concierge helps luxury residential communities create meaningful connections,
              increase engagement, activate amenities, and understand what residents actually want.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {managerBenefits.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="rounded-[1.8rem] border border-[#ddd0ba] bg-[#fbf6ee] shadow-[0_20px_60px_rgba(44,36,24,0.08)]">
                <CardContent className="p-5">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-[#dcc7a2] bg-[#efe4d1] text-[#8d7650]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="font-display text-2xl text-[#2a2621]">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-[#61584b]">{description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="overflow-hidden rounded-[2rem] border border-[#d8c8ab] bg-[#2a2621] text-[#f7f1e7] shadow-[0_28px_90px_rgba(39,33,24,0.28)]">
            <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[#d4c09b]">Dashboard Preview</p>
                <h2 className="mt-2 font-display text-3xl">A premium view of building community health.</h2>
              </div>
              <div className="grid gap-3 text-sm text-white/82">
                <div className="rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-3">Community Engagement Rate</div>
                <div className="rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-3">Most Requested Events</div>
                <div className="rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-3">Top Resident Interests</div>
                <div className="rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-3">Introductions Made</div>
                <div className="rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-3">Amenity Utilization</div>
              </div>
              <Button asChild variant="outline" className="border-white/15 bg-white/8 text-[#f7f1e7] hover:bg-white/12 hover:text-white">
                <Link to="/for-buildings/dashboard-preview">Open dashboard preview</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-[2.2rem] border border-[#d7c8af] bg-[#fffaf2] shadow-[0_28px_90px_rgba(49,41,28,0.12)]">
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-4xl text-[#28241f]">Request a Pilot</CardTitle>
            <CardDescription className="text-base text-[#665b4e]">
              We use this to start the building setup, prepare your invite flow, and open the subscription conversation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {successState ? (
              <div className="space-y-5">
                <div className="rounded-[1.7rem] border border-[#d8c7a6] bg-[#f6efe4] p-6 text-[#2b2722]">
                  <p className="text-xs uppercase tracking-[0.24em] text-[#9b8360]">Pilot started</p>
                  <h2 className="mt-2 font-display text-3xl">Your building flow is ready.</h2>
                  <p className="mt-3 text-sm leading-6 text-[#5f5548]">
                    Share this provisional invite code with early residents while we finalize launch timing and subscription details.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[1.6rem] border border-[#e0d4bf] bg-[#faf5eb] p-5 text-[#2a2621]">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#9c8560]">Invite code</p>
                    <p className="mt-3 flex items-center gap-2 font-display text-4xl tracking-[0.16em]">
                      <KeyRound className="h-5 w-5 text-[#8d7650]" />
                      {successState.inviteCode}
                    </p>
                  </div>
                  <div className="rounded-[1.6rem] border border-[#e0d4bf] bg-[#faf5eb] p-5 text-[#2a2621]">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#9c8560]">Resident flow</p>
                    <Link
                      className="mt-3 block text-base font-medium underline underline-offset-4"
                      to={`/community/${successState.buildingSlug}?invite=${encodeURIComponent(successState.inviteCode)}`}
                    >
                      Open the resident welcome page
                    </Link>
                  </div>
                </div>

                <Button
                  type="button"
                  className="h-12 rounded-full bg-[#24201a] text-[#f7f1e7] hover:bg-[#171410]"
                  onClick={() => setSuccessState(null)}
                >
                  Submit another building
                </Button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="building-name" className="text-[#37322d]">Building name</Label>
                    <Input id="building-name" value={buildingName} onChange={(event) => setBuildingName(event.target.value)} className="h-12 rounded-2xl border-[#dccfb8] bg-[#fbf6ee] text-[#2a2621]" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit-count" className="text-[#37322d]">Approximate unit count</Label>
                    <Input id="unit-count" inputMode="numeric" value={unitCount} onChange={(event) => setUnitCount(event.target.value)} className="h-12 rounded-2xl border-[#dccfb8] bg-[#fbf6ee] text-[#2a2621]" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="building-city" className="text-[#37322d]">City</Label>
                    <Input id="building-city" value={city} onChange={(event) => setCity(event.target.value)} className="h-12 rounded-2xl border-[#dccfb8] bg-[#fbf6ee] text-[#2a2621]" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="building-state" className="text-[#37322d]">State / region</Label>
                    <Input id="building-state" value={stateRegion} onChange={(event) => setStateRegion(event.target.value)} className="h-12 rounded-2xl border-[#dccfb8] bg-[#fbf6ee] text-[#2a2621]" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="manager-first-name" className="text-[#37322d]">Manager first name</Label>
                    <Input id="manager-first-name" autoComplete="given-name" value={managerFirstName} onChange={(event) => setManagerFirstName(event.target.value)} className="h-12 rounded-2xl border-[#dccfb8] bg-[#fbf6ee] text-[#2a2621]" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manager-last-name" className="text-[#37322d]">Manager last name</Label>
                    <Input id="manager-last-name" autoComplete="family-name" value={managerLastName} onChange={(event) => setManagerLastName(event.target.value)} className="h-12 rounded-2xl border-[#dccfb8] bg-[#fbf6ee] text-[#2a2621]" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="manager-email" className="text-[#37322d]">Work email</Label>
                    <Input id="manager-email" type="email" autoComplete="email" value={managerEmail} onChange={(event) => setManagerEmail(event.target.value)} className="h-12 rounded-2xl border-[#dccfb8] bg-[#fbf6ee] text-[#2a2621]" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manager-phone" className="text-[#37322d]">Phone number</Label>
                    <Input id="manager-phone" autoComplete="tel" placeholder="+14155551234" value={managerPhone} onChange={(event) => setManagerPhone(event.target.value)} className="h-12 rounded-2xl border-[#dccfb8] bg-[#fbf6ee] text-[#2a2621]" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="job-title" className="text-[#37322d]">Job title</Label>
                  <Input id="job-title" value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} className="h-12 rounded-2xl border-[#dccfb8] bg-[#fbf6ee] text-[#2a2621]" placeholder="General Manager, Resident Experience Director..." />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manager-notes" className="text-[#37322d]">Pilot notes</Label>
                  <Textarea id="manager-notes" value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-28 rounded-[1.5rem] border-[#dccfb8] bg-[#fbf6ee] text-[#2a2621]" placeholder="Amenities, launch timing, resident mix, or hospitality goals..." />
                </div>

                <div className="grid gap-3 rounded-[1.5rem] border border-[#e0d4bf] bg-[#f8f2e8] p-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox id="manager-contact-email" checked={contactViaEmail} onCheckedChange={(checked) => setContactViaEmail(checked === true)} />
                    <div>
                      <Label htmlFor="manager-contact-email" className="cursor-pointer text-[#2f2a24]">Email me about setup and subscription details</Label>
                      <p className="text-sm text-[#7a6c58]">Recommended so we can send launch notes and agreements safely.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Checkbox id="manager-contact-sms" checked={contactViaSms} onCheckedChange={(checked) => setContactViaSms(checked === true)} />
                    <div>
                      <Label htmlFor="manager-contact-sms" className="cursor-pointer text-[#2f2a24]">Text me for launch coordination</Label>
                      <p className="text-sm text-[#7a6c58]">Useful for quick scheduling and launch-day logistics.</p>
                    </div>
                  </div>
                </div>

                <Button type="submit" className="h-12 w-full rounded-full bg-[#24201a] text-[#f7f1e7] hover:bg-[#171410]" disabled={isSubmitting}>
                  {isSubmitting ? "Starting pilot..." : "Request a Pilot"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-3">
        <Card className="rounded-[1.9rem] border border-[#ddcfb9] bg-[#fbf7ef] shadow-[0_18px_54px_rgba(46,38,24,0.08)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-3xl text-[#29251f]">
              <Sparkles className="h-5 w-5 text-[#8d7650]" />
              Hospitality-first
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-[#61584c]">
            <p>This is not a resident feed. It feels like a discreet concierge service for meaningful connection.</p>
          </CardContent>
        </Card>

        <Card className="rounded-[1.9rem] border border-[#ddcfb9] bg-[#fbf7ef] shadow-[0_18px_54px_rgba(46,38,24,0.08)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-3xl text-[#29251f]">
              <ShieldCheck className="h-5 w-5 text-[#8d7650]" />
              Private by default
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-[#61584c]">
            <p>Resident access stays scoped to the building community only. Nothing creates open cross-building visibility.</p>
          </CardContent>
        </Card>

        <Card className="rounded-[1.9rem] border border-[#ddcfb9] bg-[#fbf7ef] shadow-[0_18px_54px_rgba(46,38,24,0.08)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-3xl text-[#29251f]">
              <Building2 className="h-5 w-5 text-[#8d7650]" />
              One property at a time
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-[#61584c]">
            <p>Start with one flagship building, one refined invite flow, and one premium amenity story.</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default BuildingManagerOptIn;
