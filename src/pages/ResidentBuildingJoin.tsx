import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link, useSearchParams } from "react-router-dom";
import { Home, MessageSquareText, ShieldCheck, Users } from "lucide-react";

const residentJoinSchema = z.object({
  inviteCode: z.string().trim().min(5, "Please enter your building invite code.").max(16),
  firstName: z.string().trim().min(1, "Please enter your first name.").max(80),
  lastName: z.string().trim().min(1, "Please enter your last name.").max(80),
  email: z.string().trim().email("Please enter a valid email.").max(254),
  phone: z.string().trim().min(8, "Please enter a valid phone number.").max(20),
  unitNumber: z.string().trim().min(1, "Please enter your unit number.").max(32),
  moveInDate: z.string().trim().optional(),
  wantsFriendships: z.boolean(),
  wantsNetworking: z.boolean(),
  contactViaSms: z.boolean(),
  contactViaEmail: z.boolean(),
});

const ResidentBuildingJoin = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [moveInDate, setMoveInDate] = useState("");
  const [wantsFriendships, setWantsFriendships] = useState(true);
  const [wantsNetworking, setWantsNetworking] = useState(true);
  const [contactViaSms, setContactViaSms] = useState(true);
  const [contactViaEmail, setContactViaEmail] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const invite = searchParams.get("invite");
    if (invite) {
      setInviteCode(invite.toUpperCase());
    }
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validation = residentJoinSchema.safeParse({
      inviteCode: inviteCode.toUpperCase(),
      firstName,
      lastName,
      email,
      phone,
      unitNumber,
      moveInDate,
      wantsFriendships,
      wantsNetworking,
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

    if (!wantsFriendships && !wantsNetworking) {
      toast({
        title: "Choose at least one goal",
        description: "Select friendship, networking, or both so we know what kind of introductions to make.",
        variant: "destructive",
      });
      return;
    }

    if (!contactViaSms && !contactViaEmail) {
      toast({
        title: "Choose a contact method",
        description: "Please select SMS or email so we can contact you about the building community.",
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

      setSuccessMessage(String(data?.message ?? "Your request has been saved."));
      toast({
        title: "Request saved",
        description: "We stored your resident intake and next-step preferences.",
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
          Resident Opt-In
        </Badge>
        <h1 className="mt-5 text-4xl font-semibold leading-tight [text-shadow:0_4px_20px_rgba(0,0,0,0.45)] sm:text-5xl">
          Join your building’s private community
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-white/85 [text-shadow:0_2px_10px_rgba(0,0,0,0.35)] sm:text-lg">
          Share your contact details, unit number, and connection goals so we can onboard you into a private building-only network for friendships, networking, and resident events.
        </p>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Card className="rounded-[2rem] border border-white/20 bg-black/25 text-white backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white">Resident Join Request</CardTitle>
            <CardDescription className="text-white/70">
              This stores your building intake securely and helps us prepare your access once the building community is ready.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {successMessage ? (
              <div className="space-y-5">
                <div className="rounded-[1.5rem] border border-emerald-400/25 bg-emerald-500/10 p-5">
                  <p className="text-sm uppercase tracking-[0.2em] text-emerald-200/80">You’re in</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">We saved your resident request</h2>
                  <p className="mt-3 text-white/80">{successMessage}</p>
                </div>

                <Button
                  type="button"
                  className="h-12 rounded-full bg-white text-slate-950 hover:bg-white/90"
                  onClick={() => setSuccessMessage(null)}
                >
                  Submit another request
                </Button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="invite-code" className="text-white/90">Building invite code</Label>
                  <Input id="invite-code" value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} className="h-12 rounded-2xl border-white/20 bg-white/12 text-white placeholder:text-white/45" placeholder="EXAMPLE" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="resident-first-name" className="text-white/90">First name</Label>
                    <Input id="resident-first-name" autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} className="h-12 rounded-2xl border-white/20 bg-white/12 text-white placeholder:text-white/45" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resident-last-name" className="text-white/90">Last name</Label>
                    <Input id="resident-last-name" autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} className="h-12 rounded-2xl border-white/20 bg-white/12 text-white placeholder:text-white/45" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="resident-email" className="text-white/90">Email</Label>
                    <Input id="resident-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 rounded-2xl border-white/20 bg-white/12 text-white placeholder:text-white/45" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resident-phone" className="text-white/90">Phone number</Label>
                    <Input id="resident-phone" autoComplete="tel" placeholder="+14155551234" value={phone} onChange={(event) => setPhone(event.target.value)} className="h-12 rounded-2xl border-white/20 bg-white/12 text-white placeholder:text-white/45" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="unit-number" className="text-white/90">Unit number</Label>
                    <Input id="unit-number" value={unitNumber} onChange={(event) => setUnitNumber(event.target.value)} className="h-12 rounded-2xl border-white/20 bg-white/12 text-white placeholder:text-white/45" placeholder="12B" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="move-in-date" className="text-white/90">Move-in date</Label>
                    <Input id="move-in-date" type="date" value={moveInDate} onChange={(event) => setMoveInDate(event.target.value)} className="h-12 rounded-2xl border-white/20 bg-white/12 text-white placeholder:text-white/45" />
                  </div>
                </div>

                <div className="grid gap-3 rounded-[1.5rem] border border-white/15 bg-white/8 p-4">
                  <p className="text-sm font-medium text-white/90">I’m here for</p>
                  <div className="flex items-start space-x-3">
                    <Checkbox id="goal-friendships" checked={wantsFriendships} onCheckedChange={(checked) => setWantsFriendships(checked === true)} />
                    <Label htmlFor="goal-friendships" className="cursor-pointer text-white/85">Friendships and activity partners</Label>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Checkbox id="goal-networking" checked={wantsNetworking} onCheckedChange={(checked) => setWantsNetworking(checked === true)} />
                    <Label htmlFor="goal-networking" className="cursor-pointer text-white/85">Professional networking and local connections</Label>
                  </div>
                </div>

                <div className="grid gap-3 rounded-[1.5rem] border border-white/15 bg-white/8 p-4">
                  <p className="text-sm font-medium text-white/90">You can contact me via</p>
                  <div className="flex items-start space-x-3">
                    <Checkbox id="contact-sms" checked={contactViaSms} onCheckedChange={(checked) => setContactViaSms(checked === true)} />
                    <Label htmlFor="contact-sms" className="cursor-pointer text-white/85">SMS</Label>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Checkbox id="contact-email" checked={contactViaEmail} onCheckedChange={(checked) => setContactViaEmail(checked === true)} />
                    <Label htmlFor="contact-email" className="cursor-pointer text-white/85">Email</Label>
                  </div>
                </div>

                <Button type="submit" className="h-12 w-full rounded-full bg-white text-slate-950 hover:bg-white/90" disabled={isSubmitting}>
                  {isSubmitting ? "Saving your request..." : "Join the building community"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="rounded-[2rem] border border-white/20 bg-white/10 text-white backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="h-5 w-5" />
                What happens next
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-white/85">
              <p>We match you with neighbors inside your own building only.</p>
              <p>Introductions are built around friendship, networking, and shared interests.</p>
              <p>Community events and suggested meetups can happen in your building amenities.</p>
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
              <p>Your request is scoped to the building invite code you entered.</p>
              <p>Your unit number helps verify that you belong in the community.</p>
              <p>We do not open your profile to other buildings.</p>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border border-white/20 bg-white/10 text-white backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Home className="h-5 w-5" />
                No invite code yet?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-white/85">
              <p>Ask your building manager for the invite code or share the manager setup link below.</p>
              <Link className="inline-flex items-center gap-2 text-white underline underline-offset-4" to="/for-buildings">
                <MessageSquareText className="h-4 w-4" />
                Send your manager the building setup page
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default ResidentBuildingJoin;
