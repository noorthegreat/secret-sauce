import { Bell, CalendarDays, Home, Search, UserCircle2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import BrandWordmark from "@/components/BrandWordmark";
import { buildingPresets } from "@/lib/residentConciergePreview";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "home", label: "Home", icon: Home, suffix: "/home" },
  { key: "people", label: "People", icon: Search, suffix: "/people" },
  { key: "events", label: "Events", icon: CalendarDays, suffix: "/events" },
  { key: "profile", label: "Profile", icon: UserCircle2, suffix: "/profile" },
];

const isTabEnabled = (key: string) => key === "home" || key === "people" || key === "events";

const ResidentCommunityFrame = ({
  buildingSlug,
  children,
}: {
  buildingSlug: string;
  children: React.ReactNode;
}) => {
  const location = useLocation();
  const preset = buildingPresets[buildingSlug] ?? {
    name: "Resident Concierge",
    city: "Your Building",
    inviteCode: "WELCOME",
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] px-4 py-8 md:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[2.5rem] border border-[#dbcdb7] bg-[#fbf6ee] p-4 shadow-[0_30px_100px_rgba(45,38,27,0.12)] sm:p-6 lg:p-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <BrandWordmark tone="dark" />
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#9a8460]">{preset.city}</p>
                <h1 className="font-display text-4xl text-[#26211c]">{preset.name}</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full border border-[#dfd3c1] bg-white px-4 py-2 text-sm text-[#6a6155]">
                Invite code: <span className="font-semibold text-[#2e2923]">{preset.inviteCode}</span>
              </div>
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#dfd3c1] bg-white text-[#6d6356]"
              >
                <Bell className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mb-8 flex flex-wrap gap-2 rounded-full border border-[#e7dccd] bg-[#f6efe4] p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = location.pathname.endsWith(tab.suffix);
              const enabled = isTabEnabled(tab.key);

              if (!enabled) {
                return (
                  <div
                    key={tab.key}
                    className="flex items-center gap-2 rounded-full px-4 py-2 text-sm text-[#a79b8a]"
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </div>
                );
              }

              return (
                <Link
                  key={tab.key}
                  to={`/community/${buildingSlug}${tab.suffix}`}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-2 text-sm transition",
                    active
                      ? "bg-[#cfaa63] text-[#2b241b] shadow-[0_12px_24px_rgba(207,170,99,0.25)]"
                      : "text-[#655c50] hover:bg-white"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Link>
              );
            })}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
};

export default ResidentCommunityFrame;
