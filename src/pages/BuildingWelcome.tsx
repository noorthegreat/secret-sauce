import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, CalendarDays, MessageSquareHeart, Sparkles, Vote, Users } from "lucide-react";

import BrandWordmark from "@/components/BrandWordmark";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { buildingPresets } from "@/lib/residentConciergePreview";

const welcomeCards = [
  {
    icon: MessageSquareHeart,
    title: "Meet People",
    description: "Discover residents who share your interests.",
  },
  {
    icon: CalendarDays,
    title: "Join Experiences",
    description: "Attend events and activities designed for your building.",
  },
  {
    icon: Vote,
    title: "Shape Your Community",
    description: "Suggest experiences and vote on what happens next.",
  },
];

const BuildingWelcome = () => {
  const { buildingSlug } = useParams();
  const [searchParams] = useSearchParams();
  const preset = buildingPresets[buildingSlug ?? ""] ?? {
    name: "Resident Concierge",
    city: "Your Building",
    inviteCode: searchParams.get("invite") ?? "WELCOME",
  };
  const inviteCode = searchParams.get("invite") ?? preset.inviteCode;

  return (
    <div className="container mx-auto max-w-7xl px-4 py-10 md:py-16">
      <section className="overflow-hidden rounded-[2.6rem] border border-[#d7c8af] bg-[#fbf6ee] shadow-[0_30px_100px_rgba(45,38,27,0.12)]">
        <div className="grid gap-0 lg:grid-cols-[1.04fr_0.96fr]">
          <div className="relative min-h-[640px] overflow-hidden bg-[linear-gradient(180deg,rgba(20,17,15,0.15),rgba(20,17,15,0.72)),radial-gradient(circle_at_top,rgba(233,206,153,0.42),transparent_44%),linear-gradient(135deg,#958268,#42392f)] p-7 text-white sm:p-10">
            <div className="absolute inset-x-0 bottom-0 h-56 bg-[linear-gradient(180deg,rgba(251,246,238,0),rgba(251,246,238,0.96))]" />
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div className="flex items-start justify-between gap-4">
                <BrandWordmark />
                <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/72">
                  Private building community
                </div>
              </div>

              <div className="max-w-2xl space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/78">
                  <Sparkles className="h-3.5 w-3.5" />
                  Resident Welcome
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-white/70">{preset.city}</p>
                  <h1 className="mt-3 font-display text-6xl leading-[0.92] sm:text-7xl">Welcome Home.</h1>
                </div>
                <p className="max-w-xl text-base leading-7 text-white/82 sm:text-lg">
                  Discover people, experiences, and opportunities within your community.
                </p>
              </div>
            </div>
          </div>

          <div className="flex min-h-[640px] flex-col justify-between p-7 text-[#29251f] sm:p-10">
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#9b8460]">Community</p>
                <h2 className="mt-2 font-display text-5xl leading-none">{preset.name}</h2>
              </div>
              <p className="max-w-xl text-base leading-7 text-[#5d5448]">
                This is not a social network. It is a concierge-style layer for meeting the right people,
                joining the right experiences, and making your building feel more connected.
              </p>
            </div>

            <div className="mt-8 grid gap-4">
              {welcomeCards.map(({ icon: Icon, title, description }) => (
                <Card key={title} className="rounded-[1.8rem] border border-[#e0d4c1] bg-white shadow-[0_18px_56px_rgba(44,36,24,0.08)]">
                  <CardContent className="flex items-start gap-4 p-5">
                    <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#dcc7a2] bg-[#efe4d1] text-[#8c754f]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#2c2822]">{title}</h3>
                      <p className="mt-1 text-sm leading-6 text-[#62594d]">{description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-8 rounded-[1.8rem] border border-[#e0d4c1] bg-[#faf3e8] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#9c8460]">Invite code</p>
                  <p className="mt-2 font-display text-4xl tracking-[0.12em]">{inviteCode}</p>
                </div>
                <Users className="h-8 w-8 text-[#9c8460]" />
              </div>
              <Button asChild className="mt-5 h-12 w-full rounded-full bg-[#c89f55] text-[#2a241b] hover:bg-[#b98f43]">
                <Link to={`/join-community?invite=${encodeURIComponent(inviteCode)}`}>
                  Begin Your Concierge Profile
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BuildingWelcome;
