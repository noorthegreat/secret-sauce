import { Bookmark, CalendarPlus, CheckCircle2, MessageCircleHeart } from "lucide-react";
import { useParams } from "react-router-dom";

import ResidentCommunityFrame from "@/components/ResidentCommunityFrame";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { residentPreviewData } from "@/lib/residentConciergePreview";

const ResidentCommunityPeople = () => {
  const { buildingSlug = "chorus-apartments" } = useParams();
  const [primaryResident, ...otherResidents] = residentPreviewData.suggestedConnections;

  return (
    <ResidentCommunityFrame buildingSlug={buildingSlug}>
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-[2rem] border border-[#e2d7c8] bg-white shadow-[0_20px_60px_rgba(45,38,27,0.08)]">
          <CardContent className="space-y-5 p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#9b8460]">New Introduction</p>
              <h2 className="mt-2 font-display text-4xl text-[#29241f]">We think you should meet {primaryResident.name}.</h2>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[linear-gradient(135deg,#d8b073,#9b6f44)] text-2xl font-semibold text-white">
                {primaryResident.name.slice(0, 1)}
              </div>
              <div>
                <p className="text-lg font-semibold text-[#2b2621]">{primaryResident.name}</p>
                <p className="text-sm text-[#7b7165]">{primaryResident.headline}</p>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-[#e6dbc9] bg-[#faf3e8] p-5 text-center">
              <p className="text-sm leading-7 text-[#584f43]">{primaryResident.about}</p>
              <p className="mt-3 text-sm leading-7 text-[#584f43]">
                You both are looking for {primaryResident.sharedGoals.join(" and ").toLowerCase()}.
              </p>
            </div>

            <div className="space-y-3">
              <Button className="h-11 w-full rounded-full bg-[#cfaa63] text-[#2b241b] hover:bg-[#be9850]">
                Accept
              </Button>
              <Button variant="outline" className="h-11 w-full rounded-full border-[#dccfb9] bg-white text-[#3d362b] hover:bg-[#faf3e8]">
                Decline
              </Button>
              <Button variant="ghost" className="h-11 w-full rounded-full text-[#6d6458] hover:bg-[#faf3e8]">
                Save for Later
              </Button>
            </div>

            <p className="text-center text-xs text-[#84796d]">
              We&apos;ll only share details if both of you are interested.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-[2rem] border border-[#e2d7c8] bg-white shadow-[0_20px_60px_rgba(45,38,27,0.08)]">
            <CardContent className="p-6">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#9b8460]">Suggested for You</p>
                <h2 className="mt-2 font-display text-4xl text-[#29241f]">Luxury resident cards, not a feed</h2>
                <p className="mt-3 text-sm leading-7 text-[#61584c]">
                  We introduce you to residents you may genuinely enjoy meeting, with enough context to know why.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {[primaryResident, ...otherResidents].map((resident) => (
              <Card key={resident.id} className="rounded-[1.8rem] border border-[#e2d7c8] bg-white shadow-[0_18px_54px_rgba(45,38,27,0.07)]">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,#d8b073,#9b6f44)] text-xl font-semibold text-white">
                      {resident.name.slice(0, 1)}
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-[#2b2621]">{resident.name}</p>
                      <p className="text-sm text-[#766d61]}">{resident.headline}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-[#9b8460]">Shared interests</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {resident.sharedInterests.map((interest) => (
                        <span key={interest} className="rounded-full border border-[#e6dbc9] bg-[#faf3e8] px-3 py-1 text-xs text-[#6d6458]">
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-[#9b8460]">Shared goals</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {resident.sharedGoals.map((goal) => (
                        <span key={goal} className="rounded-full border border-[#e6dbc9] bg-white px-3 py-1 text-xs text-[#6d6458]">
                          {goal}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Button className="h-11 rounded-full bg-[#cfaa63] text-[#2b241b] hover:bg-[#be9850]">
                      <MessageCircleHeart className="mr-2 h-4 w-4" />
                      Request Introduction
                    </Button>
                    <Button variant="outline" className="h-11 rounded-full border-[#dccfb9] bg-white text-[#3d362b] hover:bg-[#faf3e8]">
                      <Bookmark className="mr-2 h-4 w-4" />
                      Save For Later
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="rounded-[1.9rem] border border-[#e2d7c8] bg-[#2b2721] text-[#f7f1e8] shadow-[0_20px_60px_rgba(34,29,22,0.26)]">
            <CardContent className="grid gap-4 p-6 md:grid-cols-[1.05fr_0.95fr] md:items-center">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#d4c09d]">If both residents accept</p>
                <h3 className="mt-2 font-display text-4xl">You Matched</h3>
                <p className="mt-3 text-sm leading-7 text-white/78">
                  The concierge can help schedule a rooftop social, coffee chat, coworking session, or another easy building meetup.
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-3">
                  <CheckCircle2 className="h-4 w-4 text-[#d1a457]" />
                  <span className="text-sm text-white/82">You matched</span>
                </div>
                <Button className="h-11 w-full rounded-full bg-[#d1a457] text-[#2b241b] hover:bg-[#c09447]">
                  <CalendarPlus className="mr-2 h-4 w-4" />
                  Schedule Meetup
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ResidentCommunityFrame>
  );
};

export default ResidentCommunityPeople;
