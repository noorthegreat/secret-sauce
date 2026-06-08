import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";
import { RotateCcw, Save, Coffee, Martini, UtensilsCrossed, Landmark } from "lucide-react";
import { DateTime } from "luxon";
import { useTranslation } from "react-i18next";
import {
    SCHEDULING_TIMEZONE,
    schedulingWeekDates,
    schedulingDayOrder,
    dateTimeFromDayAndSlot,
    schedulingWeekStart,
    nowInSchedulingZone,
} from "@/lib/appScheduling.ts";
import { isValidVenueSlotHours, isZurichPublicHolidayIso } from "@/lib/zurich-holidays.ts";
import { useBlocker } from "react-router-dom";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { VenueCard } from "@/components/VenueCard.tsx";

export type Availability = Record<string, number[]>; // day index (0-6) -> slot indices (0-47)

export interface Venue {
    id: string;
    name: string;
    address: string;
    website: string;
    type: string;
    hours: Record<string, { start: number; end: number } | null>;
    image: string;
    latitude?: number | null;
    longitude?: number | null;
    timezone?: string | null;
    price_range?: number | null;
    is_partner?: boolean;
    /** When true, allow overlap on modelled Swiss federal holidays (most venues default false) */
    open_public_holidays?: boolean | null;
    /** ETH / campus style — exclude weekend overlaps */
    restrict_to_weekdays?: boolean | null;
};

interface AvailabilityPlannerProps {
    initialAvailability?: Availability;
    initialFlex?: Availability;
    matchedUserAvailability?: Availability;
    onSave: (availability: Availability, flexAvailability: Availability, overlap: Overlap | null) => void;
    isLoading?: boolean;
    venues: Record<string, Venue>;
    readOnly?: boolean;
    firstPossibleDay?: string | null;
}

const START_HOUR = 7;
const END_HOUR = 23;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
const SLOTS_PER_HOUR = 2;
const VISIBLE_SLOTS_COUNT = HOURS.length * SLOTS_PER_HOUR;

type GridCell = { day: number; slot: number };

const DEFAULT_AVAILABILITY: Availability = {};

export type Overlap = { startDay: number; startSlot: number; endSlot: number; venue: string };

/** Per-day union of two availability maps. */
export const mergeAvailability = (a: Availability, b: Availability): Availability => {
    const out: Availability = {};
    const days = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
    for (const day of days) {
        const arr = Array.from(new Set([...(a?.[day] || []), ...(b?.[day] || [])])).sort((x, y) => x - y);
        if (arr.length) out[day] = arr;
    }
    return out;
};

/** `a` minus `b`, per day. */
export const subtractAvailability = (a: Availability, b: Availability): Availability => {
    const out: Availability = {};
    for (const day of Object.keys(a || {})) {
        const remove = new Set(b?.[day] || []);
        const arr = (a[day] || []).filter((s) => !remove.has(s));
        if (arr.length) out[day] = arr;
    }
    return out;
};

export const calculateLargestOverlap = (
    userAvail: Availability,
    matchedAvail: Availability,
    venues: Record<string, Venue>,
    preferredVenueType?: string | null,
    minDurationMinutes: number = 30,
    firstPossibleDay?: string | null,
    maxBudget?: number | null
): Overlap | null => {
    const now = new Date();
    const minSlots = Math.max(1, Math.floor(minDurationMinutes / 30));
    const preferredKey = preferredVenueType ?? null;

    // Budget is a venue-ranking concern (handled in venue-scoring), NOT a gate on
    // whether a date can happen. Filtering here caused the planner to show a teal
    // overlap while saving reported "no overlap" because the only venue open then
    // was over budget. The overlap search therefore considers all venues; price is
    // applied later when scoring/choosing the actual venue.
    const venuesPool = venues;

    const dayOrder = schedulingDayOrder(firstPossibleDay);
    const weekAnchor = schedulingWeekStart(firstPossibleDay);
    const todayStartScheduling = nowInSchedulingZone().startOf("day");
    const dayPriority = new Map(dayOrder.map((day, index) => [day, index]));

    type Candidate = Overlap & { length: number; fitsPreference: boolean; dayPriority: number };
    const preferredCandidates: Candidate[] = [];
    const fallbackCandidates: Candidate[] = [];

    for (let dayIdx = 0; dayIdx < dayOrder.length; dayIdx++) {
        const d = dayOrder[dayIdx];
        // Ignore availability on calendar columns that are already in the past — overlap checks still
        // looked at slot instants, but naive teal colouring stayed visible across stale windows (#2).
        const columnCalendarDate = weekAnchor.plus({ days: dayIdx }).startOf("day");
        if (columnCalendarDate < todayStartScheduling) continue;

        const columnIso = columnCalendarDate.toISODate();
        if (!columnIso) continue;

        const dayStr = d.toString();
        const userSlots = userAvail[dayStr] || [];
        const matchedSlots = matchedAvail[dayStr] || [];
        const commonSlots = userSlots.filter(slot => matchedSlots.includes(slot)).sort((a, b) => a - b);

        if (commonSlots.length === 0) continue;

        const blocks: { start: number; end: number }[] = [];
        let blockStart = commonSlots[0];
        let blockEnd = commonSlots[0];

        for (let i = 1; i <= commonSlots.length; i++) {
            if (i < commonSlots.length && commonSlots[i] === blockEnd + 1) {
                blockEnd = commonSlots[i];
            } else {
                blocks.push({ start: blockStart, end: blockEnd });
                if (i < commonSlots.length) {
                    blockStart = commonSlots[i];
                    blockEnd = commonSlots[i];
                }
            }
        }

        const hasVenues = Object.keys(venuesPool).length > 0;

        for (const block of blocks) {
            if (hasVenues) {
                for (const [venueType, venue] of Object.entries(venuesPool)) {
                    if (isZurichPublicHolidayIso(columnIso) && !venue.open_public_holidays) continue;
                    if (venue.restrict_to_weekdays && (d === 0 || d === 6)) continue;

                    const venueHours = venue?.hours?.[dayStr];
                    if (!isValidVenueSlotHours(venueHours)) continue;

                    const clippedStart = Math.max(block.start, venueHours!.start);
                    const clippedEnd = Math.min(block.end, venueHours!.end - 1);
                    if (clippedStart > clippedEnd) continue;

                    const length = clippedEnd - clippedStart + 1;
                    if (length < 1) continue;

                    const fitsPreference = length >= minSlots;
                    const trimmedEnd = fitsPreference ? clippedStart + minSlots - 1 : clippedEnd;

                    // Filter out past time slots
                    const candidateDateTime = dateTimeFromDayAndSlot(firstPossibleDay, d, clippedStart);
                    if (candidateDateTime <= now) continue;

                    const candidate: Candidate = {
                        startDay: d,
                        startSlot: clippedStart,
                        endSlot: trimmedEnd,
                        venue: venueType,
                        length,
                        fitsPreference,
                        dayPriority: dayPriority.get(d) ?? 7,
                    };

                    if (preferredKey && venueType === preferredKey) {
                        preferredCandidates.push(candidate);
                    } else {
                        fallbackCandidates.push(candidate);
                    }
                }
            } else {
                if (isZurichPublicHolidayIso(columnIso)) continue;

                const length = block.end - block.start + 1;
                if (length < 1) continue;

                const fitsPreference = length >= minSlots;
                const trimmedEnd = fitsPreference ? block.start + minSlots - 1 : block.end;

                // Filter out past time slots
                const candidateDateTime = dateTimeFromDayAndSlot(firstPossibleDay, d, block.start);
                if (candidateDateTime <= now) continue;

                fallbackCandidates.push({
                    startDay: d,
                    startSlot: block.start,
                    endSlot: trimmedEnd,
                    venue: "none",
                    length,
                    fitsPreference,
                    dayPriority: dayPriority.get(d) ?? 7,
                });
            }
        }
    }

    const rank = (candidates: Candidate[]): Overlap | null => {
        if (candidates.length === 0) return null;

        candidates.sort((a, b) => {
            if (a.fitsPreference !== b.fitsPreference) return a.fitsPreference ? -1 : 1;
            if (a.dayPriority !== b.dayPriority) return a.dayPriority - b.dayPriority;
            return a.startSlot - b.startSlot;
        });

        const best = candidates[0];
        return { startDay: best.startDay, startSlot: best.startSlot, endSlot: best.endSlot, venue: best.venue };
    };

    // Prefer the user's preferred venue type; fall back to any venue if no matching slots exist
    return preferredKey
        ? (rank(preferredCandidates) ?? rank(fallbackCandidates))
        : rank(fallbackCandidates);
};

/**
 * Returns a single availability's own bookable blocks (day + time + a venue that's
 * open then), ranked soonest-first, deduped by day+start, capped at `limit`.
 *
 * Used by the no-overlap recovery (B1): when two people don't overlap, we surface
 * the *partner's* free times so the user can one-tap add a matching slot — which
 * instantly creates an overlap — instead of hitting a dead end.
 */
export const findViableSlotsForAvailability = (
    avail: Availability,
    venues: Record<string, Venue>,
    minDurationMinutes: number = 30,
    firstPossibleDay?: string | null,
    limit: number = 4,
): Overlap[] => {
    const now = new Date();
    const minSlots = Math.max(1, Math.floor(minDurationMinutes / 30));
    const dayOrder = schedulingDayOrder(firstPossibleDay);
    const weekAnchor = schedulingWeekStart(firstPossibleDay);
    const todayStartScheduling = nowInSchedulingZone().startOf("day");
    const dayPriority = new Map(dayOrder.map((day, index) => [day, index]));
    const hasVenues = Object.keys(venues).length > 0;

    type Cand = Overlap & { fits: boolean; dp: number };
    const cands: Cand[] = [];

    for (let dayIdx = 0; dayIdx < dayOrder.length; dayIdx++) {
        const d = dayOrder[dayIdx];
        const colDate = weekAnchor.plus({ days: dayIdx }).startOf("day");
        if (colDate < todayStartScheduling) continue;
        const colIso = colDate.toISODate();
        if (!colIso) continue;

        const slots = (avail[d.toString()] || []).slice().sort((a, b) => a - b);
        if (slots.length === 0) continue;

        const blocks: { start: number; end: number }[] = [];
        let bStart = slots[0];
        let bEnd = slots[0];
        for (let i = 1; i <= slots.length; i++) {
            if (i < slots.length && slots[i] === bEnd + 1) {
                bEnd = slots[i];
            } else {
                blocks.push({ start: bStart, end: bEnd });
                if (i < slots.length) {
                    bStart = slots[i];
                    bEnd = slots[i];
                }
            }
        }

        for (const block of blocks) {
            if (hasVenues) {
                for (const [venueType, venue] of Object.entries(venues)) {
                    if (isZurichPublicHolidayIso(colIso) && !venue.open_public_holidays) continue;
                    if (venue.restrict_to_weekdays && (d === 0 || d === 6)) continue;
                    const vh = venue?.hours?.[d.toString()];
                    if (!isValidVenueSlotHours(vh)) continue;
                    const cs = Math.max(block.start, vh!.start);
                    const ce = Math.min(block.end, vh!.end - 1);
                    if (cs > ce) continue;
                    const fits = ce - cs + 1 >= minSlots;
                    const trimmedEnd = fits ? cs + minSlots - 1 : ce;
                    if (dateTimeFromDayAndSlot(firstPossibleDay, d, cs) <= now) continue;
                    cands.push({ startDay: d, startSlot: cs, endSlot: trimmedEnd, venue: venueType, fits, dp: dayPriority.get(d) ?? 7 });
                }
            } else {
                if (isZurichPublicHolidayIso(colIso)) continue;
                const fits = block.end - block.start + 1 >= minSlots;
                const trimmedEnd = fits ? block.start + minSlots - 1 : block.end;
                if (dateTimeFromDayAndSlot(firstPossibleDay, d, block.start) <= now) continue;
                cands.push({ startDay: d, startSlot: block.start, endSlot: trimmedEnd, venue: "none", fits, dp: dayPriority.get(d) ?? 7 });
            }
        }
    }

    cands.sort((a, b) => {
        if (a.fits !== b.fits) return a.fits ? -1 : 1;
        if (a.dp !== b.dp) return a.dp - b.dp;
        return a.startSlot - b.startSlot;
    });

    const seen = new Set<string>();
    const out: Overlap[] = [];
    for (const c of cands) {
        const key = `${c.startDay}:${c.startSlot}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ startDay: c.startDay, startSlot: c.startSlot, endSlot: c.endSlot, venue: c.venue });
        if (out.length >= limit) break;
    }
    return out;
};

export interface AvailabilityPlannerHandle {
    reset: () => void;
}

export const AvailabilityPlanner = forwardRef<AvailabilityPlannerHandle, AvailabilityPlannerProps>(({
    initialAvailability = DEFAULT_AVAILABILITY,
    initialFlex = DEFAULT_AVAILABILITY,
    matchedUserAvailability = DEFAULT_AVAILABILITY,
    onSave,
    isLoading = false,
    venues,
    readOnly = false,
    firstPossibleDay
}: AvailabilityPlannerProps, ref) => {
    const { t, i18n } = useTranslation("availabilityPlanner");
    const [availability, setAvailability] = useState<Availability>(initialAvailability);
    const [flexAvailability, setFlexAvailability] = useState<Availability>(initialFlex);
    const [paintTier, setPaintTier] = useState<"free" | "flex">("free");
    const [showCoachmark, setShowCoachmark] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<GridCell | null>(null);
    const [dragCurrent, setDragCurrent] = useState<GridCell | null>(null);
    const [isSelecting, setIsSelecting] = useState(true); // true = selecting, false = deselecting
    const [isDirty, setIsDirty] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    // Long-press-to-drag (touch): a quick swipe scrolls; hold-then-drag selects.
    const gridRef = useRef<HTMLDivElement>(null);
    const longPressTimerRef = useRef<number | null>(null);
    const longPressStartRef = useRef<{ col: number; slot: number; x: number; y: number } | null>(null);
    const dragArmedRef = useRef(false);
    const LONG_PRESS_MS = 300;
    const TOUCH_MOVE_CANCEL_PX = 12;

    useEffect(() => {
        setAvailability(initialAvailability);
        setFlexAvailability(initialFlex);
        setIsDirty(false);
    }, [initialAvailability, initialFlex]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    // Block native scrolling only while a touch drag is armed (non-passive so we
    // can preventDefault). Before arming, swipes scroll the page normally.
    useEffect(() => {
        const el = gridRef.current;
        if (!el) return;
        const onTouchMove = (e: TouchEvent) => {
            if (dragArmedRef.current) e.preventDefault();
        };
        el.addEventListener("touchmove", onTouchMove, { passive: false });
        return () => el.removeEventListener("touchmove", onTouchMove);
    }, []);

    // One-time coachmark teaching the long-press-then-drag gesture (touch only).
    useEffect(() => {
        if (readOnly) return;
        const isTouch = typeof window !== "undefined" && (("ontouchstart" in window) || navigator.maxTouchPoints > 0);
        if (!isTouch) return;
        try {
            if (!window.localStorage.getItem("orbiit_availability_coachmark_v1")) setShowCoachmark(true);
        } catch { /* localStorage unavailable */ }
    }, [readOnly]);

    const dismissCoachmark = () => {
        setShowCoachmark(false);
        try { window.localStorage.setItem("orbiit_availability_coachmark_v1", "1"); } catch { /* ignore */ }
    };

    const weekDates = schedulingWeekDates(firstPossibleDay);
    const columnDayOrder = schedulingDayOrder(firstPossibleDay);
    const todayStartScheduling = nowInSchedulingZone().startOf("day");

    // Handle React Router Navigation Blocking
    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) =>
            isDirty &&
            !readOnly &&
            currentLocation.pathname !== nextLocation.pathname
    );

    /** Map column 0–6 → JS weekday 0–6 (Sun–Sat) in Europe/Zurich, matching availability keys. */
    const getDayOfWeekIndex = (columnIndex: number) => columnDayOrder[columnIndex];

    const getVenueStatus = (day: number, slot: number): string => {
        for (const [venueType, venue] of Object.entries(venues)) {
            const hours = venue?.hours?.[day.toString()];
            if (hours && slot >= hours.start && slot < hours.end) {
                return venueType;
            }
        }
        return "closed";
    };

    /** Past calendar day — not selectable in the grid */
    const isSchedulingColumnBlocked = (colIndex: number): boolean => {
        const dayStart = DateTime.fromJSDate(weekDates[colIndex]).setZone(SCHEDULING_TIMEZONE).startOf("day");
        return dayStart < todayStartScheduling;
    };

    /** Swiss federal holiday (modelled) — selectable, but overlap depends on venue flags */
    const isHolidayColumn = (colIndex: number): boolean => {
        const dayStart = DateTime.fromJSDate(weekDates[colIndex]).setZone(SCHEDULING_TIMEZONE).startOf("day");
        const iso = dayStart.toISODate();
        return !!iso && isZurichPublicHolidayIso(iso);
    };

    const clearLongPress = () => {
        if (longPressTimerRef.current) {
            window.clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        longPressStartRef.current = null;
    };

    const beginDrag = (colIndex: number, slotIndex: number) => {
        const dayIndex = getDayOfWeekIndex(colIndex);
        setIsDragging(true);
        setDragStart({ day: colIndex, slot: slotIndex });
        setDragCurrent({ day: colIndex, slot: slotIndex });

        const activeMap = paintTier === "flex" ? flexAvailability : availability;
        const isSelected = (activeMap[dayIndex.toString()] || []).includes(slotIndex);
        // Starting on a slot already in the active tier removes it; otherwise adds.
        setIsSelecting(!isSelected);
    };

    const handlePointerDown = (e: React.PointerEvent, colIndex: number, slotIndex: number) => {
        if (readOnly) return;
        if (isSchedulingColumnBlocked(colIndex)) return;
        const dayIndex = getDayOfWeekIndex(colIndex);
        if (getVenueStatus(dayIndex, slotIndex) === "closed") return;

        if (e.pointerType === "touch") {
            // Don't grab the gesture yet — a quick swipe should scroll the page.
            // Arm drag-select only after a short hold (then native scroll is blocked).
            clearLongPress();
            longPressStartRef.current = { col: colIndex, slot: slotIndex, x: e.clientX, y: e.clientY };
            longPressTimerRef.current = window.setTimeout(() => {
                dragArmedRef.current = true;
                (navigator as { vibrate?: (ms: number) => void }).vibrate?.(15);
                beginDrag(colIndex, slotIndex);
            }, LONG_PRESS_MS);
        } else {
            beginDrag(colIndex, slotIndex);
        }
    };

    const handleMouseEnter = (colIndex: number, slotIndex: number) => {
        if (isDragging) {
            setDragCurrent({ day: colIndex, slot: slotIndex });
        }
    };

    const handleTouchMove = (e: React.PointerEvent) => {
        // Pending long-press: a moving finger means "scroll", so cancel arming.
        if (longPressTimerRef.current && !dragArmedRef.current) {
            const s = longPressStartRef.current;
            if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) > TOUCH_MOVE_CANCEL_PX) {
                clearLongPress();
            }
            return;
        }
        if (!isDragging) return;
        const element = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
        if (element) {
            const col = element.getAttribute('data-col');
            const slot = element.getAttribute('data-slot');
            if (col != null && slot != null) {
                handleMouseEnter(parseInt(col, 10), parseInt(slot, 10));
            }
        }
    };

    const handleMouseUp = () => {
        clearLongPress();
        if (isDragging && dragStart && dragCurrent) {
            applySelection(dragStart, dragCurrent);
        }
        dragArmedRef.current = false;
        setIsDragging(false);
        setDragStart(null);
        setDragCurrent(null);
    };

    const handlePointerCancel = () => {
        clearLongPress();
        dragArmedRef.current = false;
        setIsDragging(false);
        setDragStart(null);
        setDragCurrent(null);
    };

    const applySelection = (start: GridCell, end: GridCell) => {
        const minCol = Math.min(start.day, end.day);
        const maxCol = Math.max(start.day, end.day);
        const minSlot = Math.min(start.slot, end.slot);
        const maxSlot = Math.max(start.slot, end.slot);

        // Selectable (weekday, slot) cells inside the drag rectangle.
        const cells: { day: number; slot: number }[] = [];
        for (let col = minCol; col <= maxCol; col++) {
            if (isSchedulingColumnBlocked(col)) continue;
            const dayIndex = getDayOfWeekIndex(col);
            for (let slot = minSlot; slot <= maxSlot; slot++) {
                if (getVenueStatus(dayIndex, slot) !== "closed") cells.push({ day: dayIndex, slot });
            }
        }
        if (cells.length === 0) return;
        setIsDirty(true);

        const addCells = (prev: Availability): Availability => {
            const next = { ...prev };
            for (const { day, slot } of cells) {
                const dayStr = day.toString();
                const set = new Set(next[dayStr] || []);
                set.add(slot);
                next[dayStr] = Array.from(set).sort((a, b) => a - b);
            }
            return next;
        };
        const removeCells = (prev: Availability): Availability => {
            const next = { ...prev };
            for (const { day, slot } of cells) {
                const dayStr = day.toString();
                if (!next[dayStr]) continue;
                next[dayStr] = next[dayStr].filter((s) => s !== slot);
            }
            return next;
        };

        // A cell is free XOR could-flex — painting one tier clears the other.
        if (paintTier === "free") {
            if (isSelecting) {
                setAvailability(addCells);
                setFlexAvailability(removeCells);
            } else {
                setAvailability(removeCells);
            }
        } else {
            if (isSelecting) {
                setFlexAvailability(addCells);
                setAvailability(removeCells);
            } else {
                setFlexAvailability(removeCells);
            }
        }
    };

    // Global mouse up handler to catch releases outside the grid
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (isDragging && dragStart && dragCurrent) {
                applySelection(dragStart, dragCurrent);
            }
            clearLongPress();
            dragArmedRef.current = false;
            setIsDragging(false);
            setDragStart(null);
            setDragCurrent(null);
        };
        window.addEventListener("mouseup", handleGlobalMouseUp);
        return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
    }, [isDragging, dragStart, dragCurrent, isSelecting, paintTier]);

    const isCellInSelection = (colIndex: number, slotIndex: number) => {
        if (!isDragging || !dragStart || !dragCurrent) return false;

        const minCol = Math.min(dragStart.day, dragCurrent.day);
        const maxCol = Math.max(dragStart.day, dragCurrent.day);
        const minSlot = Math.min(dragStart.slot, dragCurrent.slot);
        const maxSlot = Math.max(dragStart.slot, dragCurrent.slot);

        return (
            colIndex >= minCol &&
            colIndex <= maxCol &&
            slotIndex >= minSlot &&
            slotIndex <= maxSlot
        );
    };

    const handleReset = () => {
        setAvailability(initialAvailability);
        setFlexAvailability(initialFlex);
        setIsDirty(false);
    };

    useImperativeHandle(ref, () => ({
        reset: handleReset
    }));

    const handleSave = () => {
        const overlap = calculateLargestOverlap(availability, matchedUserAvailability, venues, undefined, 30, firstPossibleDay);
        onSave(availability, flexAvailability, overlap);
    };

    const toRelativeSlot = (slot: number) => {
        const startSlot = START_HOUR * SLOTS_PER_HOUR;
        const endSlot = (END_HOUR + 1) * SLOTS_PER_HOUR; // End of the last visible hour
        if (slot < startSlot) return 0;
        if (slot >= endSlot) return VISIBLE_SLOTS_COUNT; // Use >= for slots that extend past the end
        return slot - startSlot;
    };

    const formatTime = (hour: number) => {
        return `${hour}:00`;
        const period = hour >= 12 ? "PM" : "AM";
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour}:00 ${period}`;
    };

    const VENUE_COLORS: Record<string, { fill: string; stroke: string; icon: string; border: string; bg: string; label: string }> = {
        coffee: { fill: "rgba(255, 237, 213, 0.4)", stroke: "rgba(253, 186, 116, 0.8)", icon: "text-orange-400", border: "border-orange-400", bg: "bg-orange-100/40", label: t("venues.coffee") },
        activity: { fill: "rgba(209, 250, 229, 0.4)", stroke: "rgba(52, 211, 153, 0.8)", icon: "text-emerald-400", border: "border-emerald-400", bg: "bg-emerald-100/40", label: t("venues.activity") },
        restaurant: { fill: "rgba(255, 228, 230, 0.4)", stroke: "rgba(251, 113, 133, 0.8)", icon: "text-rose-400", border: "border-rose-400", bg: "bg-rose-100/40", label: t("venues.restaurant") },
        bar: { fill: "rgba(233, 213, 255, 0.4)", stroke: "rgba(216, 180, 254, 0.8)", icon: "text-purple-400", border: "border-purple-400", bg: "bg-purple-100/40", label: t("venues.bar") },
    };

    const VENUE_ICONS: Record<string, typeof Coffee> = {
        coffee: Coffee,
        activity: Landmark,
        restaurant: UtensilsCrossed,
        bar: Martini,
    };

    const renderVenueOverlay = (type: string) => {
        const config = venues[type]?.hours;
        if (!config) return null;

        const ranges: { start: number; end: number }[] = [];
        let currentRange: { start: number; end: number } | null = null;

        for (let i = 0; i < 7; i++) {
            const dayIndex = getDayOfWeekIndex(i);
            const dayConfig = config[dayIndex.toString()];
            if (dayConfig) {
                if (!currentRange) currentRange = { start: i, end: i };
                else currentRange.end = i;
            } else {
                if (currentRange) { ranges.push(currentRange); currentRange = null; }
            }
        }
        if (currentRange) ranges.push(currentRange);

        const colors = VENUE_COLORS[type] || VENUE_COLORS.coffee;

        return ranges.map((range, i) => {
            let path = "";
            for (let c = range.start; c <= range.end; c++) {
                const dayIndex = getDayOfWeekIndex(c);
                const dayConfig = config[dayIndex.toString()];
                if (!dayConfig) continue;
                const y = toRelativeSlot(dayConfig.start);
                if (c === range.start) path += `M ${c} ${y} `;
                else path += `L ${c} ${y} `;
                path += `L ${c + 1} ${y} `;
            }
            for (let c = range.end; c >= range.start; c--) {
                const dayIndex = getDayOfWeekIndex(c);
                const dayConfig = config[dayIndex.toString()];
                if (!dayConfig) continue;
                const y = toRelativeSlot(dayConfig.end);
                path += `L ${c + 1} ${y} `;
                path += `L ${c} ${y} `;
            }
            path += "Z";

            return (
                <path
                    key={`${type}-${i}`}
                    d={path}
                    fill={colors.fill}
                    stroke={colors.stroke}
                    strokeWidth="2"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                />
            );
        });
    };

    const renderVenueIcons = (type: string, venueIndex: number, venueCount: number) => {
        const config = venues[type]?.hours;
        if (!config) return null;
        const Icon = VENUE_ICONS[type] || Coffee;
        const colors = VENUE_COLORS[type] || VENUE_COLORS.coffee;

        const ranges: { start: number; end: number }[] = [];
        let currentRange: { start: number; end: number } | null = null;

        for (let i = 0; i < 7; i++) {
            const dayIndex = getDayOfWeekIndex(i);
            const dayConfig = config[dayIndex.toString()];
            if (dayConfig) {
                if (!currentRange) currentRange = { start: i, end: i };
                else currentRange.end = i;
            } else {
                if (currentRange) { ranges.push(currentRange); currentRange = null; }
            }
        }
        if (currentRange) ranges.push(currentRange);

        return ranges.map((range, i) => {
            let minY = Infinity, maxY = -Infinity;
            for (let c = range.start; c <= range.end; c++) {
                const dayIndex = getDayOfWeekIndex(c);
                const dayConfig = config[dayIndex.toString()];
                if (dayConfig) {
                    minY = Math.min(minY, toRelativeSlot(dayConfig.start));
                    maxY = Math.max(maxY, toRelativeSlot(dayConfig.end));
                }
            }

            const left = (range.start / 7) * 100;
            const width = ((range.end - range.start + 1) / 7) * 100;
            const topRow = minY / 2;
            const heightRows = (maxY - minY) / 2;
            const top = (topRow / HOURS.length) * 100 + 10;
            const height = (heightRows / HOURS.length) * 100 - 10;

            // Vertically distribute icons across the block so overlapping
            // venue types don't render on top of each other.
            const laneHeight = height / venueCount;
            const iconTop = top + laneHeight * venueIndex;

            return (
                <div
                    key={`${type}-icon-${i}`}
                    className="absolute flex items-center justify-center pointer-events-none"
                    style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        top: `${iconTop}%`,
                        height: `${laneHeight}%`,
                    }}
                >
                    <Icon className={cn("w-16 h-16 opacity-50", colors.icon)} />
                </div>
            );
        });
    };

    return (
        <div className="space-y-4 select-none mt-4 relative">
            {showCoachmark && (
                <div
                    className="absolute inset-0 z-30 flex flex-col items-center justify-start gap-4 rounded-lg bg-background/90 backdrop-blur-sm p-6 pt-10 text-center"
                    onClick={dismissCoachmark}
                    role="button"
                    tabIndex={0}
                >
                    <style>{`
@keyframes orbiit-cm-finger {
  0% { transform: translate(-50%,0) scale(1); opacity: 0; box-shadow: 0 0 0 0 rgba(124,58,237,0); }
  12% { opacity: 1; }
  24% { transform: translate(-50%,0) scale(0.8); }
  30% { box-shadow: 0 0 0 0 rgba(124,58,237,0.45); }
  44% { transform: translate(-50%,0) scale(0.8); box-shadow: 0 0 0 18px rgba(124,58,237,0); }
  74% { transform: translate(-50%,58px) scale(0.8); }
  90% { opacity: 1; }
  100% { transform: translate(-50%,58px) scale(0.8); opacity: 0; }
}
@keyframes orbiit-cm-trail {
  0%,24% { height: 0; opacity: 0; }
  44% { height: 12px; opacity: 1; }
  74% { height: 66px; opacity: 1; }
  90% { height: 66px; opacity: 1; }
  100% { height: 66px; opacity: 0; }
}
.orbiit-cm-finger { animation: orbiit-cm-finger 3s ease-in-out infinite; }
.orbiit-cm-trail { animation: orbiit-cm-trail 3s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .orbiit-cm-finger, .orbiit-cm-trail { animation: none; } }
                    `}</style>
                    <div className="relative h-28 w-16">
                        <div className="orbiit-cm-trail absolute left-1/2 top-3 w-9 -translate-x-1/2 rounded bg-green-500/50" />
                        <div className="orbiit-cm-finger absolute left-1/2 top-3 h-9 w-9 rounded-full bg-primary/85 shadow-lg" />
                    </div>
                    <p className="font-semibold">{t("coachmark.title")}</p>
                    <p className="text-sm text-muted-foreground max-w-xs">{t("coachmark.body")}</p>
                    <Button size="sm" onClick={(e) => { e.stopPropagation(); dismissCoachmark(); }}>{t("coachmark.gotIt")}</Button>
                </div>
            )}
            {!readOnly && (
                <div className="flex items-center justify-center gap-2 text-sm">
                    <span className="text-muted-foreground">{t("paint.label")}</span>
                    <div className="inline-flex rounded-md border overflow-hidden">
                        <button type="button" onClick={() => setPaintTier("free")} className={cn("px-3 py-1 transition-colors", paintTier === "free" ? "bg-green-500/80 text-white" : "bg-background hover:bg-muted")}>{t("paint.free")}</button>
                        <button type="button" onClick={() => setPaintTier("flex")} className={cn("px-3 py-1 border-l transition-colors", paintTier === "flex" ? "bg-amber-400/90 text-white" : "bg-background hover:bg-muted")}>{t("paint.flex")}</button>
                    </div>
                </div>
            )}
            <div className="px-1 flex flex-wrap gap-2 text-sm text-muted-foreground justify-center">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500/80 rounded"></div>
                    <span>{t("legend.yours")}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-400/50 rounded"></div>
                    <span>{t("legend.match")}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-teal-500/90 rounded"></div>
                    <span>{t("legend.both")}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-amber-400/60 rounded"></div>
                    <span>{t("legend.flex")}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-muted/35 border border-border rounded" />
                    <span className="text-xs">{t("legend.pastDays")}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-amber-500/5 border border-border rounded" />
                    <span className="text-xs">{t("legend.publicHolidays")}</span>
                </div>
                {Object.entries(venues).map(([type, venue]) => {
                    if (!venue || Object.keys(venue).length === 0) return null;
                    const colors = VENUE_COLORS[type] || VENUE_COLORS.coffee;
                    return (
                        <Popover key={type}>
                            <PopoverTrigger asChild>
                                <div className="flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-80">
                                    <div className={cn("w-4 h-4 border-2 border-dashed rounded", colors.border, colors.bg)}></div>
                                    <span className="underline decoration-dashed underline-offset-4">{colors.label}</span>
                                </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-0 border-0 shadow-lg" side="top" sideOffset={10}>
                                <VenueCard venue={venue} type={type} />
                            </PopoverContent>
                        </Popover>
                    );
                })}
            </div>
            <div className="flex">
                {/* Time Labels Column - Outside */}
                <div className="flex flex-col pt-[67px] md:pr-2">
                    {HOURS.map((hour) => (
                        <div key={hour} className="h-12 relative">
                            <span className="absolute md:-top-2 md:-right-12 -top-3 -right-9 text-xs  whitespace-nowrap">
                                {formatTime(hour)}
                            </span>
                        </div>
                    ))}
                </div>

                <div
                    className="flex-1 md:ml-12 border rounded-lg overflow-hidden bg-white"
                    ref={containerRef}
                >
                    {/* Header */}
                    <div className="flex border-b border-border/50">
                        <div className="flex-1 grid grid-cols-7">
                            {weekDates.map((date, i) => {
                                const header = DateTime.fromJSDate(date).setZone(SCHEDULING_TIMEZONE).setLocale(i18n.language);
                                return (
                                    <div key={i} className={`py-2 text-center border-r border-border/50 last:border-r-0  ${i % 2 === 1 ? " bg-black/3 " : " bg-white"}`}>
                                        <div className="text-sm font-bold text-muted-foreground whitespace-pre-line">
                                            {header.toFormat("EEE")}
                                        </div>
                                        <div className="text-xs font-medium text-muted-foreground whitespace-pre-line">
                                            {header.toFormat("MMM d")}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Grid */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                        <div className="flex relative min-h-[600px]">
                            {/* Columns */}
                            <div
                                ref={gridRef}
                                className="flex-1 grid grid-cols-7 relative touch-pan-y"
                                onPointerMove={handleTouchMove}
                                onPointerCancel={handlePointerCancel}
                            >
                                {/* Background Grid Lines */}
                                <div className="absolute inset-0 grid grid-rows-[repeat(17,3rem)] pointer-events-none0">
                                    {HOURS.map((_, i) => (
                                        <div key={i} className="border border-border/50 w-full" />
                                    ))}
                                </div>

                                {/* Venue Overlay (Background Shapes) */}
                                <div className="absolute inset-0 pointer-events-none z-0">
                                    <svg
                                        width="100%"
                                        height="100%"
                                        viewBox={`0 0 7 ${VISIBLE_SLOTS_COUNT}`}
                                        preserveAspectRatio="none"
                                    >
                                        {Object.keys(venues).map(type => renderVenueOverlay(type))}
                                    </svg>
                                </div>

                                {/* Venue Icons (HTML Overlay) */}
                                <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                                    {(() => {
                                        const orderedTypes = Object.keys(VENUE_ICONS).filter(
                                            (type) => venues[type]?.hours,
                                        );
                                        return orderedTypes.map((type, idx) =>
                                            renderVenueIcons(type, idx, orderedTypes.length),
                                        );
                                    })()}
                                </div>

                                {weekDates.map((weekDateJs, colIndex) => {
                                    const dayIndex = getDayOfWeekIndex(colIndex);
                                    const dayStr = dayIndex.toString();
                                    const userSlots = availability[dayStr] || [];
                                    const flexSlots = flexAvailability[dayStr] || [];
                                    const matchedSlots = matchedUserAvailability?.[dayStr] || [];
                                    const colBlocked = isSchedulingColumnBlocked(colIndex);
                                    const colHoliday = !colBlocked && isHolidayColumn(colIndex);

                                    return (
                                        <div
                                            key={colIndex}
                                            className={cn(
                                                "relative border-r border-border/50 last:border-r-0 z-10",
                                                colIndex % 2 === 1 ? "bg-black/3" : "",
                                                colHoliday ? "bg-amber-500/5" : "",
                                            )}
                                        >
                                            {/* Slots */}
                                            {Array.from({ length: VISIBLE_SLOTS_COUNT }).map((_, i) => {
                                                const slotIndex = i + (START_HOUR * SLOTS_PER_HOUR);
                                                const isFree = userSlots.includes(slotIndex);
                                                const isFlex = flexSlots.includes(slotIndex);
                                                const isMatched = matchedSlots.includes(slotIndex);
                                                const isDragSelected = isCellInSelection(colIndex, slotIndex);
                                                const venueStatus = getVenueStatus(dayIndex, slotIndex);

                                                // Live drag preview applies to the active tier only.
                                                let effFree = isFree;
                                                let effFlex = isFlex;
                                                if (isDragSelected && venueStatus !== "closed" && !colBlocked) {
                                                    if (isSelecting) {
                                                        effFree = paintTier === "free";
                                                        effFlex = paintTier === "flex";
                                                    } else if (paintTier === "free") {
                                                        effFree = false;
                                                    } else {
                                                        effFlex = false;
                                                    }
                                                }

                                                let bgClass = "";
                                                if (effFree && isMatched) bgClass = "bg-teal-500/90 hover:bg-teal-600/90";
                                                else if (effFlex && isMatched) bgClass = "bg-amber-400/80";
                                                else if (effFree) bgClass = "bg-green-500/50 hover:bg-green-600/50";
                                                else if (effFlex) bgClass = "bg-amber-400/50";
                                                else if (isMatched) bgClass = "bg-blue-300/50";

                                                return (
                                                    <div
                                                        key={slotIndex}
                                                        data-col={colIndex}
                                                        data-slot={slotIndex}
                                                        onPointerDown={(e) => handlePointerDown(e, colIndex, slotIndex)}
                                                        onPointerUp={handleMouseUp}
                                                        onPointerCancel={handlePointerCancel}
                                                        className={cn(
                                                            "h-6 border-none",
                                                            colBlocked
                                                                ? "cursor-not-allowed bg-muted/35 pointer-events-none"
                                                                : cn(
                                                                    venueStatus === "closed" ? "cursor-not-allowed" : "cursor-pointer",
                                                                    !bgClass && venueStatus !== "closed" && "hover:bg-primary/10",
                                                                    bgClass,
                                                                ),
                                                        )}
                                                    />
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex justify-end gap-2 mr-6 md:mr-0">
                <Button variant="outline" size="sm" onClick={handleReset} disabled={isLoading || !isDirty || readOnly}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    {t("buttons.reset")}
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isLoading || !isDirty || readOnly}>
                    <Save className="w-4 h-4 mr-2" />
                    {t("buttons.save")}
                </Button>
            </div>

            {/* Unsaved Changes Confirmation Dialog for React Router Navigation */}
            <AlertDialog
                open={blocker.state === "blocked"}
                onOpenChange={(open) => {
                    if (!open && blocker.state === "blocked") {
                        blocker.reset();
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("unsavedDialog.title")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("unsavedDialog.description")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => blocker.state === "blocked" && blocker.reset()}>
                            {t("unsavedDialog.stay")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => blocker.state === "blocked" && blocker.proceed()}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {t("unsavedDialog.leave")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
});

AvailabilityPlanner.displayName = "AvailabilityPlanner";