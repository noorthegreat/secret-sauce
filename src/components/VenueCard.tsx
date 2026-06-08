import { Venue } from "@/components/AvailabilityPlanner";
import { cn } from "@/lib/utils";
import { Coffee, Martini, UtensilsCrossed, Landmark, DollarSign } from "lucide-react";

interface VenueCardProps {
    venue: Venue;
    type?: "coffee" | "bar" | "restaurant" | "activity" | string;
    className?: string;
    onClick?: () => void;
}

const typeConfig: Record<string, { bg: string; border: string; hover: string; text: string; iconClass: string; Icon: typeof Coffee }> = {
    coffee: { bg: "bg-orange-50/50", border: "border-orange-300/50", hover: "hover:bg-orange-50/80", text: "text-orange-900", iconClass: "text-orange-400/20", Icon: Coffee },
    bar: { bg: "bg-purple-50/50", border: "border-purple-300/50", hover: "hover:bg-purple-50/80", text: "text-purple-900", iconClass: "text-purple-400/20", Icon: Martini },
    restaurant: { bg: "bg-rose-50/50", border: "border-rose-300/50", hover: "hover:bg-rose-50/80", text: "text-rose-900", iconClass: "text-rose-400/20", Icon: UtensilsCrossed },
    activity: { bg: "bg-emerald-50/50", border: "border-emerald-300/50", hover: "hover:bg-emerald-50/80", text: "text-emerald-900", iconClass: "text-emerald-400/20", Icon: Landmark },
};

const formatPrice = (price: number | null | undefined): string => {
    if (price === null || price === undefined) return "";
    if (price === 0) return "Free";
    return `~${price} CHF`;
};

export const VenueCard = ({ venue, type, className, onClick }: VenueCardProps) => {
    const resolvedType = type || venue.type || "coffee";
    const config = typeConfig[resolvedType] || typeConfig.coffee;
    const { Icon } = config;

    return (
        <a
            href={venue.website}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
                "relative overflow-hidden rounded-xl border-2 border-dashed p-4 transition-all hover:scale-[1.02] cursor-pointer block",
                config.bg, config.border, config.hover,
                className
            )}
            onClick={onClick}
        >
            <div className="flex flex-rows justify-between">
                <div className="flex items-start gap-4">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border/50">
                        <img
                            src={venue.image}
                            alt={venue.name}
                            className="h-full w-full object-cover"
                        />
                    </div>
                    <div className="space-y-1">
                        <h4 className={cn("font-semibold leading-none tracking-tight", config.text)}>
                            {venue.name}
                        </h4>
                        <div className="text-sm text-muted-foreground flex flex-col gap-1">
                            <span>{venue.address}</span>
                            {venue.price_range !== null && venue.price_range !== undefined && (
                                <span className="text-xs font-medium flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    {formatPrice(venue.price_range)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <Icon className={cn("w-16 h-16 shrink-0", config.iconClass)} />
            </div>
        </a>
    );
};
