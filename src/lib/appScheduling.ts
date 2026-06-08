import { DateTime } from "luxon";

/** All date scheduling (availability grid, overlap, confirm) uses this zone — not the browser's local zone. */
export const SCHEDULING_TIMEZONE = "Europe/Zurich";

/** JS getDay(): 0=Sun … 6=Sat. Luxon weekday: 1=Mon … 7=Sun. */
export function luxonWeekdayToJs(luxonWeekday: number): number {
    return luxonWeekday === 7 ? 0 : luxonWeekday;
}

export function startOfSchedulingDay(dateOnly: string): DateTime {
    const [y, m, d] = dateOnly.split("-").map(Number);
    return DateTime.fromObject({ year: y, month: m, day: d }, { zone: SCHEDULING_TIMEZONE }).startOf("day");
}

/**
 * Calendar date in the scheduling zone for the instant `d` (used for “today” / comparisons).
 */
export function nowInSchedulingZone(): DateTime {
    return DateTime.now().setZone(SCHEDULING_TIMEZONE);
}

/**
 * First calendar day in the week window (column 0) — same meaning as `parseISO(first_possible_day)` but anchored in Zurich.
 */
export function schedulingWeekStart(firstPossibleDay: string | null): DateTime {
    if (!firstPossibleDay) return nowInSchedulingZone().startOf("day");
    return startOfSchedulingDay(firstPossibleDay);
}

/**
 * The seven columns Mon..Sun order: day-of-week indices in visit order starting `first_possible_day`.
 */
export function schedulingDayOrder(firstPossibleDay: string | null): number[] {
    const start = schedulingWeekStart(firstPossibleDay);
    return Array.from({ length: 7 }, (_, i) => luxonWeekdayToJs(start.plus({ days: i }).weekday));
}

/**
 * Calendar dates for the 7 columns (as JS Date UTC instants correct for Zurich wall times).
 */
export function schedulingWeekDates(firstPossibleDay: string | null): Date[] {
    const start = schedulingWeekStart(firstPossibleDay);
    return Array.from({ length: 7 }, (_, i) => start.plus({ days: i }).toJSDate());
}

/**
 * Find the calendar day in the [start, start+6] window whose weekday matches `targetDayIndex` (JS 0–6).
 */
export function meetingDateForWeekday(firstPossibleDay: string | null, targetDayIndex: number): Date {
    const start = schedulingWeekStart(firstPossibleDay);
    for (let i = 0; i < 7; i++) {
        const cur = start.plus({ days: i });
        if (luxonWeekdayToJs(cur.weekday) === targetDayIndex) {
            return cur.toJSDate();
        }
    }
    return start.toJSDate();
}

/**
 * Build the confirmed instant: `targetDayIndex` column + slot 0–47 in Zurich on that calendar day.
 */
export function dateTimeFromDayAndSlot(
    firstPossibleDay: string | null,
    targetDayIndex: number,
    startSlot: number,
): Date {
    const start = schedulingWeekStart(firstPossibleDay);
    let day = start;
    for (let i = 0; i < 7; i++) {
        const cur = start.plus({ days: i });
        if (luxonWeekdayToJs(cur.weekday) === targetDayIndex) {
            day = cur;
            break;
        }
    }
    const hour = Math.floor(startSlot / 2);
    const minute = (startSlot % 2) * 30;
    return day.set({ hour, minute, second: 0, millisecond: 0 }).toJSDate();
}

/** Add calendar days to a YYYY-MM-DD string in the scheduling zone; returns YYYY-MM-DD. */
export function addCalendarDaysScheduling(dateOnly: string, days: number): string {
    return startOfSchedulingDay(dateOnly).plus({ days }).toISODate()!;
}
