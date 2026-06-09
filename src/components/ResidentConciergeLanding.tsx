import {
  ArrowRight,
  CalendarDays,
  ConciergeBell,
  HeartHandshake,
  LineChart,
  MapPin,
  Sparkles,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import BrandWordmark from "@/components/BrandWordmark";
import { Button } from "@/components/ui/button";

const featureCards = [
  {
    icon: HeartHandshake,
    title: "Curated Introductions",
    description: "Connect compatible residents through intentional, concierge-style matching.",
  },
  {
    icon: CalendarDays,
    title: "Community Programming",
    description: "Host events residents actually want, from rooftop dinners to wellness mornings.",
  },
  {
    icon: LineChart,
    title: "Community Intelligence",
    description: "Understand resident interests, engagement, and where your amenities can work harder.",
  },
];

const dashboardMetrics = [
  { label: "Community Engagement Rate", value: "68%" },
  { label: "Most Requested Events", value: "Women's Brunch" },
  { label: "Top Resident Interests", value: "Wellness, Travel, Food" },
  { label: "Introductions Made", value: "124" },
  { label: "Amenity Utilization", value: "Rooftop + Lounge" },
];

const conciergeMoments = [
  "Residents never browse an endless feed.",
  "Every suggestion feels curated for the building.",
  "Managers see a hospitality-style community layer, not admin software.",
];

const ResidentConciergeLanding = () => {
  return (
    <main className="flex min-h-[calc(100dvh-4rem)] items-center px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10">
        <section className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <article className="overflow-hidden rounded-[2.4rem] border border-[#d8c7a6]/60 bg-[#f7f1e7] text-[#2b2823] shadow-[0_30px_100px_rgba(46,38,24,0.15)]">
            <div className="relative min-h-[560px] overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(244,228,193,0.85),rgba(49,41,29,0.15)_38%,rgba(24,22,20,0.8)_76%),linear-gradient(180deg,rgba(39,34,31,0.1),rgba(39,34,31,0.72))]" />
              <div className="absolute inset-x-0 bottom-0 h-56 bg-[linear-gradient(180deg,rgba(245,241,233,0),rgba(245,241,233,0.92))]" />
              <div className="relative z-10 flex h-full flex-col justify-between p-7 sm:p-10">
                <div className="flex items-start justify-between gap-4">
                  <BrandWordmark tone="dark" />
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#cdb893] bg-white/50 px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#8a7353]">
                    <Sparkles className="h-3.5 w-3.5" />
                    Luxury Community Concierge
                  </div>
                </div>

                <div className="max-w-3xl space-y-6">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/45 px-4 py-2 text-xs uppercase tracking-[0.22em] text-[#6d5c43] shadow-sm">
                    <MapPin className="h-3.5 w-3.5" />
                    Pilot-ready for luxury residential buildings
                  </div>
                  <div className="space-y-4">
                    <h1 className="font-display text-5xl leading-[0.96] text-[#231f1a] sm:text-6xl lg:text-7xl">
                      Transform Residents Into Community
                    </h1>
                    <p className="max-w-2xl text-base leading-7 text-[#5a5044] sm:text-lg">
                      Resident Concierge helps luxury residential communities create meaningful connections,
                      increase engagement, activate amenities, and understand what residents actually want.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button asChild size="lg" className="h-12 rounded-full bg-[#24201a] px-6 text-sm font-semibold text-[#f7f1e7] hover:bg-[#171410]">
                      <Link to="/for-buildings">
                        Request a Pilot
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-[#c9b18a] bg-white/45 px-6 text-sm font-semibold text-[#3a3329] hover:bg-white/70">
                      <Link to="/community/chorus-apartments?invite=CHORUS">
                        Preview Resident Welcome
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <div className="grid gap-5">
            {featureCards.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="rounded-[2rem] border border-[#d7c9af] bg-[#fbf7f0]/95 p-6 text-[#2b2823] shadow-[0_24px_70px_rgba(51,43,30,0.09)]"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d7c9af] bg-[#efe4d1] text-[#8b734e]">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="font-display text-3xl leading-none">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-[#5f564a]">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-[2.2rem] border border-[#d8c7a6] bg-[#fffaf3] p-7 text-[#2a2621] shadow-[0_28px_90px_rgba(47,39,25,0.12)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d7c9af] bg-[#efe4d1] text-[#8b734e]">
                <ConciergeBell className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d855d]">Manager Preview</p>
                <h2 className="font-display text-3xl">Community Dashboard</h2>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {dashboardMetrics.map((metric) => (
                <div key={metric.label} className="rounded-[1.6rem] border border-[#e2d6c0] bg-[#f7f0e5] p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#9a8460]">{metric.label}</p>
                  <p className="mt-3 font-display text-3xl leading-tight text-[#26211c]">{metric.value}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[2.2rem] border border-[#d8c7a6] bg-[#2c2722] p-7 text-[#f7f1e7] shadow-[0_28px_90px_rgba(35,31,24,0.28)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d5c1a0]">Design Principle</p>
                <h2 className="font-display text-3xl">It should feel like a concierge is helping.</h2>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {conciergeMoments.map((line) => (
                <div key={line} className="rounded-[1.5rem] border border-white/10 bg-white/6 px-4 py-3 text-sm leading-6 text-white/82">
                  {line}
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
};

export default ResidentConciergeLanding;
