import { ArrowRight, CalendarDays, MessageSquareHeart, Sparkles, Users } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import ResidentCommunityFrame from "@/components/ResidentCommunityFrame";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { residentPreviewData } from "@/lib/residentConciergePreview";

const ResidentCommunityHome = () => {
  const { buildingSlug = "chorus-apartments" } = useParams();
  const { currentResident, suggestedConnections, upcomingEvents, communityOpportunities } = residentPreviewData;

  return (
    <ResidentCommunityFrame buildingSlug={buildingSlug}>
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <Card className="rounded-[2rem] border border-[#e3d8c9] bg-white shadow-[0_20px_60px_rgba(45,38,27,0.08)]">
            <CardContent className="p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-[#9d8661]">Home</p>
              <h2 className="mt-3 font-display text-5xl leading-none text-[#26211c]">
                Good Evening, {currentResident.firstName}
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[#62594d]">
                Here&apos;s your private concierge view of who to meet, what to attend, and where your community is already gathering.
              </p>
            </CardContent>
          </Card>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#9b8460]">Suggested Connections</p>
                <h3 className="font-display text-3xl text-[#29241f]">Three curated resident introductions</h3>
              </div>
              <Button asChild variant="outline" className="rounded-full border-[#ddcfba] bg-white text-[#3b3429] hover:bg-[#faf3e8]">
                <Link to={`/community/${buildingSlug}/people`}>
                  See all
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {suggestedConnections.map((resident) => (
                <Card key={resident.id} className="rounded-[1.8rem] border border-[#e2d7c8] bg-white shadow-[0_18px_54px_rgba(44,36,24,0.07)]">
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,#d8b073,#9b6f44)] text-xl font-semibold text-white">
                        {resident.name.slice(0, 1)}
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-[#2b2621]">{resident.name}</p>
                        <p className="text-sm text-[#786f63]">{resident.headline}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {resident.sharedInterests.slice(0, 3).map((interest) => (
                        <span key={interest} className="rounded-full border border-[#e5d8c6] bg-[#faf3e8] px-3 py-1 text-xs text-[#6d6458]">
                          {interest}
                        </span>
                      ))}
                    </div>
                    <Button asChild className="h-11 w-full rounded-full bg-[#cfaa63] text-[#2b241b] hover:bg-[#be9850]">
                      <Link to={`/community/${buildingSlug}/people`}>
                        Request Introduction
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[1.9rem] border border-[#e2d6c8] bg-[#2a2621] text-[#f7f1e8] shadow-[0_22px_70px_rgba(34,29,22,0.25)]">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/12 bg-white/8">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#d4c09d]">Upcoming Experiences</p>
                  <h3 className="font-display text-3xl">What&apos;s happening next</h3>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold">{event.name}</p>
                        <p className="mt-1 text-sm text-white/72">{event.day} · {event.time}</p>
                        <p className="text-sm text-white/58">{event.place}</p>
                      </div>
                      <Button className="rounded-full bg-[#d1a457] text-[#2a241b] hover:bg-[#c09447]">
                        RSVP
                      </Button>
                    </div>
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
                  <p className="text-xs uppercase tracking-[0.18em] text-[#9b8460]">Suggested Community Opportunities</p>
                  <h3 className="font-display text-3xl text-[#29241f]">Where energy is building</h3>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {communityOpportunities.map((opportunity) => (
                  <div key={opportunity} className="flex items-center justify-between rounded-[1.35rem] border border-[#e6dbc9] bg-[#faf3e8] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-[#8c754f]" />
                      <span className="text-sm text-[#3d372f]">{opportunity}</span>
                    </div>
                    <span className="text-xs uppercase tracking-[0.16em] text-[#9f8662]">Suggested</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.9rem] border border-[#e2d6c8] bg-white shadow-[0_18px_54px_rgba(44,36,24,0.07)]">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#dcc7a2] bg-[#efe4d1] text-[#8c754f]">
                  <MessageSquareHeart className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#9b8460]">Concierge Note</p>
                  <h3 className="font-display text-3xl text-[#29241f]">Quality over quantity</h3>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-[#61584c]">
                We introduce a few residents at a time, with context, shared interests, and building spaces that make a first meetup feel natural.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </ResidentCommunityFrame>
  );
};

export default ResidentCommunityHome;
