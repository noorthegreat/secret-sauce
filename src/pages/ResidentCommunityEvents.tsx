import { CalendarDays, MapPin, Sparkles, Vote } from "lucide-react";
import { useParams } from "react-router-dom";

import ResidentCommunityFrame from "@/components/ResidentCommunityFrame";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { residentPreviewData } from "@/lib/residentConciergePreview";

const voteOptions = [
  { name: "Rooftop Wine Night", votes: 72 },
  { name: "Running Club", votes: 58 },
  { name: "Book Club", votes: 46 },
  { name: "Wellness Workshop", votes: 38 },
];

const ResidentCommunityEvents = () => {
  const { buildingSlug = "chorus-apartments" } = useParams();
  const { upcomingEvents, communityOpportunities } = residentPreviewData;

  return (
    <ResidentCommunityFrame buildingSlug={buildingSlug}>
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <Card className="rounded-[2rem] border border-[#e2d7c8] bg-white shadow-[0_20px_60px_rgba(45,38,27,0.08)]">
            <CardContent className="p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-[#9b8460]">Community Events</p>
              <h2 className="mt-2 font-display text-5xl leading-none text-[#29241f]">
                Upcoming experiences inside your building
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#61584c]">
                This preview route uses mock data for now so we can stabilize the resident journey before wiring
                additional live event logic.
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {upcomingEvents.map((event) => (
              <Card
                key={event.id}
                className="rounded-[1.9rem] border border-[#e2d7c8] bg-white shadow-[0_18px_54px_rgba(45,38,27,0.07)]"
              >
                <CardContent className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.16em] text-[#9b8460]">{event.day}</p>
                    <h3 className="font-display text-3xl text-[#2b2621]">{event.name}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-[#6c6357]">
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-[#8c754f]" />
                        {event.time}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-[#8c754f]" />
                        {event.place}
                      </span>
                    </div>
                  </div>
                  <Button className="h-11 rounded-full bg-[#cfaa63] px-6 text-[#2b241b] hover:bg-[#be9850]">
                    RSVP Preview
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[1.9rem] border border-[#e2d6c8] bg-[#2b2721] text-[#f7f1e8] shadow-[0_20px_60px_rgba(34,29,22,0.26)]">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/12 bg-white/8">
                  <Vote className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#d4c09d]">Event Voting</p>
                  <h3 className="font-display text-3xl">What residents want next</h3>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {voteOptions.map((option) => (
                  <div
                    key={option.name}
                    className="flex items-center justify-between rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-3"
                  >
                    <span className="text-sm text-white/84">{option.name}</span>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-[#ecd9b5]">
                      {option.votes} votes
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.9rem] border border-[#e2d6c8] bg-white shadow-[0_18px_54px_rgba(44,36,24,0.07)]">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#dcc7a2] bg-[#efe4d1] text-[#8c754f]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#9b8460]">Community Momentum</p>
                  <h3 className="font-display text-3xl text-[#29241f]">Resident-led interest areas</h3>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {communityOpportunities.map((opportunity) => (
                  <div
                    key={opportunity}
                    className="rounded-[1.35rem] border border-[#e6dbc9] bg-[#faf3e8] px-4 py-3 text-sm text-[#3d372f]"
                  >
                    {opportunity}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ResidentCommunityFrame>
  );
};

export default ResidentCommunityEvents;
