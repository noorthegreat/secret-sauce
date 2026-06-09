import { Building2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface BrandWordmarkProps {
  className?: string;
  compact?: boolean;
  tone?: "light" | "dark";
}

const BrandWordmark = ({ className, compact = false, tone = "light" }: BrandWordmarkProps) => {
  const isLight = tone === "light";

  return (
    <div className={cn(isLight ? "text-white" : "text-[#2a2621]", "inline-flex items-center gap-3", className)}>
      <div className={cn(
        "flex h-10 w-10 items-center justify-center rounded-2xl shadow-[0_12px_32px_rgba(18,20,45,0.18)] backdrop-blur-md",
        isLight ? "border border-white/20 bg-white/10" : "border border-[#cdb893] bg-[#faf5eb]"
      )}>
        <Building2 className="h-5 w-5" />
      </div>
      <div className="flex flex-col leading-none">
        <span className={cn(
          "font-semibold uppercase tracking-[0.22em]",
          isLight ? "text-white/70" : "text-[#8f7a57]",
          compact ? "text-[0.55rem]" : "text-[0.65rem]"
        )}>
          Private Building Communities
        </span>
        <span className={cn("font-display font-semibold", compact ? "text-xl" : "text-3xl")}>
          Resident Concierge
        </span>
      </div>
    </div>
  );
};

export default BrandWordmark;
