/**
 * Calendar-aware venue / availability overlap checks for the 7-day window
 * anchored at dates.first_possible_day (matches AvailabilityPlanner).
 */
import {
    addDaysIso,
    isValidVenueSlotHours,
    isZurichPublicHolidayIso,
    jsWeekdayFromIso,
} from "./zurich-holidays.ts";

export function normalizeToSlots(avail: Record<string, number[]>): Record<string, number[]> {
    const allValues = Object.values(avail).flat();
    if (allValues.length === 0 || allValues.some((v) => v >= 24)) return avail;
    const normalized: Record<string, number[]> = {};
    for (const [day, hours] of Object.entries(avail)) {
        normalized[day] = hours.flatMap((h) => [h * 2, h * 2 + 1]);
    }
    return normalized;
}

function venueHasValidSlotLegacy(
    u1: Record<string, number[]>,
    u2: Record<string, number[]>,
    venueHours: Record<string, { start: number; end: number } | null>,
): boolean {
    for (const dayStr of ["0", "1", "2", "3", "4", "5", "6"]) {
        const u1Slots = u1[dayStr] ?? [];
        const u2Slots = u2[dayStr] ?? [];
        if (u1Slots.length === 0 || u2Slots.length === 0) continue;

        const hours = venueHours[dayStr];
        if (!isValidVenueSlotHours(hours)) continue;

        const u2Set = new Set(u2Slots);
        const hasSlot = u1Slots.some((s) => u2Set.has(s) && s >= hours!.start && s < hours!.end);
        if (hasSlot) return true;
    }
    return false;
}

export type VenueSchedulingRow = {
    hours: Record<string, { start: number; end: number } | null>;
    open_public_holidays?: boolean | null;
    restrict_to_weekdays?: boolean | null;
};

/** True if there exists at least one mutually free slot inside venue hours in the scheduling week */
export function venueHasValidSlotForSchedulingWeek(
    u1Avail: Record<string, number[]>,
    u2Avail: Record<string, number[]>,
    venue: VenueSchedulingRow,
    firstPossibleDay: string | null,
): boolean {
    const u1 = normalizeToSlots(u1Avail);
    const u2 = normalizeToSlots(u2Avail);

    if (!firstPossibleDay) {
        return venueHasValidSlotLegacy(u1, u2, venue.hours);
    }

    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const calendarIso = addDaysIso(firstPossibleDay, dayIdx);

        if (isZurichPublicHolidayIso(calendarIso) && !venue.open_public_holidays) continue;

        const d = jsWeekdayFromIso(calendarIso);
        if (venue.restrict_to_weekdays && (d === 0 || d === 6)) continue;

        const dayStr = d.toString();
        const hours = venue.hours[dayStr];
        if (!isValidVenueSlotHours(hours)) continue;

        const u1Slots = u1[dayStr] ?? [];
        const u2Slots = u2[dayStr] ?? [];
        if (u1Slots.length === 0 || u2Slots.length === 0) continue;

        const u2Set = new Set(u2Slots);
        const hasSlot = u1Slots.some((s) => u2Set.has(s) && s >= hours!.start && s < hours!.end);
        if (hasSlot) return true;
    }

    return false;
}
