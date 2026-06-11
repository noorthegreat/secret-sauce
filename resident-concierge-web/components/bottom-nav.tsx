"use client"

import { Home, Users, CalendarHeart, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"

export type ResidentTab = "home" | "people" | "community" | "profile"

const items: { id: ResidentTab; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "people", label: "People", icon: Users },
  { id: "community", label: "Community", icon: CalendarHeart },
  { id: "profile", label: "Profile", icon: UserRound },
]

export function BottomNav({
  active,
  onChange,
}: {
  active: ResidentTab
  onChange: (tab: ResidentTab) => void
}) {
  return (
    <nav className="absolute inset-x-0 bottom-0 z-20 border-t border-[#e3d7c6] bg-[#f6eee1]/96 px-3 pb-6 pt-2.5 backdrop-blur">
      <ul className="flex items-center justify-around">
        {items.map(({ id, label, icon: Icon }) => {
          const isActive = active === id
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onChange(id)}
                className="flex flex-col items-center gap-1 px-3 py-1"
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  className={cn(
                    "size-[22px] transition-colors",
                    isActive ? "text-gold" : "text-[#998a78]",
                  )}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                <span
                  className={cn(
                    "text-[10px] tracking-wide transition-colors",
                    isActive ? "text-foreground" : "text-[#998a78]",
                  )}
                >
                  {label}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
