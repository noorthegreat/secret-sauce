import {
  Activity,
  Building2,
  CalendarDays,
  ChartNoAxesColumn,
  MessageSquareHeart,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import BrandWordmark from "@/components/BrandWordmark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const overviewMetrics = [
  { label: "Total Residents", value: "512" },
  { label: "Active Residents", value: "328" },
  { label: "Introductions Requested", value: "245" },
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
                A premium preview of resident engagement, demand signals, and amenity activation.
              </p>
            </div>
            <Button asChild className="h-12 rounded-full bg-[#24201a] px-6 text-[#f7f1e7] hover:bg-[#171410]">
              <Link to="/for-buildings">Back to Pilot Request</Link>
            </Button>
          </div>

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
                  Community Insights
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
                  <p className="font-semibold text-[#29251f]">Engagement Overview</p>
                </div>
                <p className="mt-4 text-sm leading-6 text-[#61584c]">
                  Preview-only analytics cards let us stabilize the visual system before wiring more live manager data.
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-[1.8rem] border border-[#ddcfb9] bg-[#fbf7ef] shadow-[0_18px_54px_rgba(46,38,24,0.08)]">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <MessageSquareHeart className="h-5 w-5 text-[#8d7650]" />
                  <p className="font-semibold text-[#29251f]">Resident Sentiment</p>
                </div>
                <p className="mt-4 text-sm leading-6 text-[#61584c]">
                  The hospitality-first tone is preserved without touching the existing admin product logic underneath.
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-[1.8rem] border border-[#ddcfb9] bg-[#fbf7ef] shadow-[0_18px_54px_rgba(46,38,24,0.08)]">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-[#8d7650]" />
                  <p className="font-semibold text-[#29251f]">Activation Rate</p>
                </div>
                <p className="mt-4 text-sm leading-6 text-[#61584c]">
                  This route exists only to organize Phase 1 navigation and preview flows cleanly, without refactoring core systems.
                </p>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
};

export default ManagerDashboardPreview;
