import {
  Activity,
  ArrowUpRight,
  Building2,
  CalendarDays,
  ChartNoAxesColumn,
  CircleDashed,
  MessageSquareHeart,
  MoveRight,
  Sparkles,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import BrandWordmark from "@/components/BrandWordmark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const overviewMetrics = [
  { label: "Total Residents", value: "512" },
  { label: "Active Residents", value: "328" },
  { label: "Introductions This Month", value: "245" },
  { label: "Meetups Scheduled", value: "156" },
];

const eventInsights = [
  { label: "Rooftop Wine Night", value: "72" },
  { label: "Running Club", value: "58" },
  { label: "Book Club", value: "46" },
  { label: "Wellness Workshop", value: "38" },
];

const communityInsights = [
  { label: "Fitness", value: "68%" },
  { label: "Travel", value: "62%" },
  { label: "Wellness", value: "58%" },
  { label: "Food", value: "53%" },
];

const amenityUsage = [
  { label: "Resident Lounge", value: "68%" },
  { label: "Rooftop Terrace", value: "56%" },
  { label: "Coworking Space", value: "49%" },
  { label: "Fitness Center", value: "42%" },
];

const pulseHighlights = [
  "Resident engagement is climbing after concierge-style intros.",
  "Wellness and rooftop programming are driving the strongest demand.",
  "The lounge and rooftop are your highest-converting meetup spaces.",
];

const journeySummary = [
  "Concierge Profile",
  "Curated Introduction",
  "Meetup",
  "Community",
];

const ManagerDashboardPreview = () => {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-12 md:py-16">
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-[2.2rem] border border-[#d8c8ab] bg-[#24201a] p-6 text-[#f7f1e7] shadow-[0_28px_90px_rgba(39,33,24,0.28)]">
          <BrandWordmark />
          <div className="mt-8 space-y-3">
            <div className="rounded-[1.35rem] border border-white/10 bg-[#cfaa63] px-4 py-3 text-sm font-medium text-[#2a241b]">
              Overview
            </div>
            <div className="rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-3 text-sm text-white/78">
              Residents
            </div>
            <div className="rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-3 text-sm text-white/78">
              Events
            </div>
            <div className="rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-3 text-sm text-white/78">
              Community Insights
            </div>
            <div className="rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-3 text-sm text-white/78">
              Messages
            </div>
          </div>

          <div className="mt-8 rounded-[1.6rem] border border-white/10 bg-white/6 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[#d4c09d]">Preview only</p>
            <p className="mt-2 text-sm leading-6 text-white/76">
              This is a visual mock route for Phase 1. Existing admin and Supabase logic remain unchanged.
            </p>
          </div>
        </aside>

        <main className="space-y-6">
          <div className="flex flex-col gap-4 rounded-[2.2rem] border border-[#d8c8ab] bg-[#fbf6ee] p-6 shadow-[0_20px_60px_rgba(45,38,27,0.08)] md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#9b8460]">Property Manager Dashboard</p>
              <h1 className="mt-2 font-display text-5xl leading-none text-[#29241f]">The Clara</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#61584c]">
                Community Pulse is the operating layer for luxury buildings. It gives property teams one premium view
                of resident engagement, event demand, and amenity activation.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-12 rounded-full bg-[#24201a] px-6 text-[#f7f1e7] hover:bg-[#171410]">
                <Link to="/for-buildings#pilot-form">Book Demo</Link>
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-full border-[#d4c3a7] bg-white text-[#302a24] hover:bg-[#faf3e8]">
                <Link to="/for-buildings">Request Pilot</Link>
              </Button>
            </div>
          </div>

          <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="overflow-hidden rounded-[2.1rem] border border-[#d8c8ab] bg-[#2a2621] text-[#f7f1e7] shadow-[0_28px_90px_rgba(39,33,24,0.28)]">
              <CardContent className="p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[#d4c09d]">Hero Feature</p>
                    <h2 className="mt-2 font-display text-4xl sm:text-5xl">Community Pulse</h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-white/76">
                      The single clearest snapshot of how your building community is performing this month.
                    </p>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-xs uppercase tracking-[0.16em] text-[#ecd9b5]">
                    Updated this week
                  </div>
                </div>

                <div className="mt-8 grid gap-4 lg:grid-cols-[0.62fr_0.38fr]">
                  <div className="rounded-[1.8rem] border border-white/10 bg-white/6 p-5">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-white/55">Pulse Score</p>
                        <p className="mt-3 font-display text-7xl leading-none text-[#f7f1e7]">68</p>
                      </div>
                      <div className="rounded-full bg-[#d1a457] px-3 py-1 text-sm font-medium text-[#2b241b]">
                        +6 this month
                      </div>
                    </div>
                    <div className="mt-6 h-3 rounded-full bg-white/10">
                      <div className="h-3 w-[68%] rounded-full bg-[linear-gradient(90deg,#d1a457,#f1d6a3)]" />
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-[1.2rem] border border-white/10 bg-black/10 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-white/55">Introductions</p>
                        <p className="mt-2 text-xl font-semibold">124</p>
                      </div>
                      <div className="rounded-[1.2rem] border border-white/10 bg-black/10 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-white/55">Event Demand</p>
                        <p className="mt-2 text-xl font-semibold">High</p>
                      </div>
                      <div className="rounded-[1.2rem] border border-white/10 bg-black/10 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-white/55">Amenity Usage</p>
                        <p className="mt-2 text-xl font-semibold">Rooftop-led</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {pulseHighlights.map((item) => (
                      <div key={item} className="rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-4 text-sm leading-6 text-white/82">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2.1rem] border border-[#e2d7c8] bg-white shadow-[0_20px_60px_rgba(45,38,27,0.08)]">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#dcc7a2] bg-[#efe4d1] text-[#8c754f]">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[#9b8460]">Manager Snapshot</p>
                    <h3 className="font-display text-3xl text-[#29241f]">What to do next</h3>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="rounded-[1.35rem] border border-[#eadfce] bg-[#faf3e8] px-4 py-4">
                    <p className="text-sm font-medium text-[#2f291f]">Lean into rooftop and wellness programming next month.</p>
                  </div>
                  <div className="rounded-[1.35rem] border border-[#eadfce] bg-[#faf3e8] px-4 py-4">
                    <p className="text-sm font-medium text-[#2f291f]">Promote resident lounge as the easiest first-meet space.</p>
                  </div>
                  <div className="rounded-[1.35rem] border border-[#eadfce] bg-[#faf3e8] px-4 py-4">
                    <p className="text-sm font-medium text-[#2f291f]">Invite more new move-ins into the concierge profile flow.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {overviewMetrics.map((metric) => (
              <Card key={metric.label} className="rounded-[1.8rem] border border-[#e2d7c8] bg-white shadow-[0_18px_54px_rgba(45,38,27,0.07)]">
                <CardContent className="p-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-[#9b8460]">{metric.label}</p>
                  <p className="mt-3 font-display text-4xl text-[#2b2621]">{metric.value}</p>
                </CardContent>
              </Card>
            ))}
          </section>

          <section className="grid gap-5 xl:grid-cols-3">
            <Card className="rounded-[1.9rem] border border-[#e2d7c8] bg-white shadow-[0_18px_54px_rgba(45,38,27,0.07)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-3xl text-[#29241f]">
                  <CalendarDays className="h-5 w-5 text-[#8c754f]" />
                  Event Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {eventInsights.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-[1.2rem] bg-[#faf3e8] px-4 py-3">
                    <span className="text-sm text-[#3e382f]">{item.label}</span>
                    <span className="text-sm font-medium text-[#8c754f]">{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-[1.9rem] border border-[#e2d7c8] bg-white shadow-[0_18px_54px_rgba(45,38,27,0.07)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-3xl text-[#29241f]">
                  <Users className="h-5 w-5 text-[#8c754f]" />
                  Community Pulse Inputs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {communityInsights.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-[1.2rem] bg-[#faf3e8] px-4 py-3">
                    <span className="text-sm text-[#3e382f]">{item.label}</span>
                    <span className="text-sm font-medium text-[#8c754f]">{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-[1.9rem] border border-[#e2d7c8] bg-white shadow-[0_18px_54px_rgba(45,38,27,0.07)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-3xl text-[#29241f]">
                  <Building2 className="h-5 w-5 text-[#8c754f]" />
                  Amenity Usage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {amenityUsage.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-[1.2rem] bg-[#faf3e8] px-4 py-3">
                    <span className="text-sm text-[#3e382f]">{item.label}</span>
                    <span className="text-sm font-medium text-[#8c754f]">{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-5 md:grid-cols-3">
            <Card className="rounded-[1.8rem] border border-[#ddcfb9] bg-[#fbf7ef] shadow-[0_18px_54px_rgba(46,38,24,0.08)]">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <ChartNoAxesColumn className="h-5 w-5 text-[#8d7650]" />
                  <p className="font-semibold text-[#29251f]">Buildings Are the Customer</p>
                </div>
                <p className="mt-4 text-sm leading-6 text-[#61584c]">
                  This preview is framed around operating insight for management teams, not a resident-facing consumer app.
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-[1.8rem] border border-[#ddcfb9] bg-[#fbf7ef] shadow-[0_18px_54px_rgba(46,38,24,0.08)]">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <MessageSquareHeart className="h-5 w-5 text-[#8d7650]" />
                  <p className="font-semibold text-[#29251f]">Resident Experience</p>
                </div>
                <p className="mt-4 text-sm leading-6 text-[#61584c]">
                  Residents feel the concierge layer through better intros and experiences while the building sees the outcome.
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-[1.8rem] border border-[#ddcfb9] bg-[#fbf7ef] shadow-[0_18px_54px_rgba(46,38,24,0.08)]">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-[#8d7650]" />
                  <p className="font-semibold text-[#29251f]">Pilot Readiness</p>
                </div>
                <p className="mt-4 text-sm leading-6 text-[#61584c]">
                  Use this route to sell the product story clearly before any deeper backend expansion.
                </p>
              </CardContent>
            </Card>
          </section>

          <section className="rounded-[2rem] border border-[#e2d7c8] bg-white p-6 shadow-[0_18px_54px_rgba(45,38,27,0.07)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#9b8460]">Resident Journey</p>
                <h2 className="mt-2 font-display text-4xl text-[#29241f]">How Community Pulse gets created</h2>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-[#61584c]">
                The dashboard story is strongest when the manager can see how resident actions ladder up into building-wide momentum.
              </p>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-4">
              {journeySummary.map((item, index) => (
                <div key={item} className="rounded-[1.6rem] border border-[#eadfce] bg-[#faf3e8] p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#dcc7a2] bg-white text-[#8c754f]">
                      {index === 0 ? <CircleDashed className="h-4 w-4" /> : index === 1 ? <Users className="h-4 w-4" /> : index === 2 ? <ArrowUpRight className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                    </div>
                    {index < journeySummary.length - 1 && <MoveRight className="hidden h-4 w-4 text-[#c6a46c] lg:block" />}
                  </div>
                  <p className="font-display text-3xl leading-none text-[#29241f]">{item}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default ManagerDashboardPreview;
