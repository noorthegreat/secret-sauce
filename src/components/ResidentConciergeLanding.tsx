import {
  ArrowRight,
  CalendarDays,
  Building2,
  ConciergeBell,
  HeartHandshake,
  LineChart,
  MapPin,
  MessageSquareHeart,
  MoveRight,
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
    description: "Connect residents through a warm, concierge-style layer that feels intentional rather than transactional.",
  },
  {
    icon: CalendarDays,
    title: "Community Programming",
    description: "Plan events residents actually want, from rooftop dinners to wellness mornings and amenity moments.",
  },
  {
    icon: LineChart,
    title: "Community Pulse",
    description: "See the clearest signals on resident engagement, demand, and amenity activation in one premium view.",
  },
];

const dashboardMetrics = [
  { label: "Community Pulse", value: "68 / 100" },
  { label: "Most Requested Experience", value: "Women's Brunch" },
  { label: "Top Resident Interests", value: "Wellness, Travel, Food" },
  { label: "Introductions This Month", value: "124" },
  { label: "Best-Performing Amenities", value: "Rooftop + Lounge" },
];

const conciergeMoments = [
  "Residents never browse an endless feed.",
  "Every suggestion feels curated for the building.",
  "Managers see a hospitality-style community layer, not admin software.",
];

const customerSignals = [
  "Built for property managers, resident experience leads, and luxury operators.",
  "Private to each building, with no open cross-property social graph.",
  "Designed to increase engagement without turning your brand into another app feed.",
];

const residentJourney = [
  {
    icon: Users,
    title: "Concierge Profile",
    description: "Residents opt in through a branded building flow and share interests, goals, and availability.",
  },
  {
    icon: HeartHandshake,
    title: "Curated Introduction",
    description: "The platform suggests a small number of thoughtful introductions with clear compatibility context.",
  },
  {
    icon: MessageSquareHeart,
    title: "Meetup",
    description: "Matches turn into easy coffee chats, rooftop conversations, or amenity-based meetups.",
  },
  {
    icon: Building2,
    title: "Community",
    description: "Managers gain stronger resident connection, better event planning, and richer community insight.",
  },
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
                      The resident engagement layer built for premium buildings.
                    </h1>
                    <p className="max-w-2xl text-base leading-7 text-[#5a5044] sm:text-lg">
                      Resident Concierge helps property managers and luxury operators turn resident interest
                      into introductions, amenity usage, and measurable community momentum.
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {customerSignals.map((signal) => (
                      <div key={signal} className="rounded-[1.35rem] border border-[#d8c8ab] bg-white/55 px-4 py-3 text-sm leading-6 text-[#4f463a]">
                        {signal}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button asChild size="lg" className="h-12 rounded-full bg-[#24201a] px-6 text-sm font-semibold text-[#f7f1e7] hover:bg-[#171410]">
                      <Link to="/for-buildings#pilot-form">
                        Book Demo
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-[#c9b18a] bg-white/45 px-6 text-sm font-semibold text-[#3a3329] hover:bg-white/70">
                      <Link to="/for-buildings">
                        Request Pilot
                      </Link>
                    </Button>
                    <Button asChild size="lg" variant="ghost" className="h-12 rounded-full px-2 text-sm font-semibold text-[#4a4034] hover:bg-white/35">
                      <Link to="/for-buildings/dashboard-preview">
                        View Community Pulse
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
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d855d]">Community Pulse</p>
                <h2 className="font-display text-3xl">The feature that makes the value obvious</h2>
              </div>
            </div>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-[#5d5347]">
              Buildings are the customer. Community Pulse turns resident engagement, event demand, and amenity usage
              into a premium operating signal property teams can actually use.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {dashboardMetrics.map((metric) => (
                <div key={metric.label} className="rounded-[1.6rem] border border-[#e2d6c0] bg-[#f7f0e5] p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#9a8460]">{metric.label}</p>
                  <p className="mt-3 font-display text-3xl leading-tight text-[#26211c]">{metric.value}</p>
                </div>
              ))}
            </div>
            <Button asChild className="mt-6 h-12 rounded-full bg-[#24201a] px-6 text-[#f7f1e7] hover:bg-[#171410]">
              <Link to="/for-buildings/dashboard-preview">
                Explore dashboard preview
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
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

        <section className="rounded-[2.3rem] border border-[#d8c7a6] bg-[#fbf6ee]/95 p-7 shadow-[0_28px_90px_rgba(47,39,25,0.12)] sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d855d]">Resident Journey</p>
              <h2 className="mt-2 font-display text-4xl text-[#27231d] sm:text-5xl">
                Concierge Profile to Community
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-[#5d5347]">
              A building-first experience that helps residents opt in easily while giving property teams a cleaner
              story about how connection actually happens.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-4">
            {residentJourney.map(({ icon: Icon, title, description }, index) => (
              <article
                key={title}
                className="relative rounded-[1.9rem] border border-[#e0d3be] bg-white p-5 shadow-[0_18px_54px_rgba(45,38,27,0.07)]"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#dcc7a2] bg-[#efe4d1] text-[#8c754f]">
                    <Icon className="h-5 w-5" />
                  </div>
                  {index < residentJourney.length - 1 && <MoveRight className="hidden h-5 w-5 text-[#c6a46c] lg:block" />}
                </div>
                <h3 className="font-display text-3xl leading-none text-[#29241f]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#61584c]">{description}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};

export default ResidentConciergeLanding;
