/**
 * Swiss federal public holidays commonly observed by Zurich venues (cafés / bars).
 * Used to avoid suggesting dates on days many venues are closed (e.g. Easter Monday).
 *
 * Movable holidays follow Western (Gregorian) Easter. Dates are civil ISO calendar
 * days yyyy-mm-dd as used by scheduling (`first_possible_day` window).
 */

function isoFromParts(year: number, month: number, day: number): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${year}-${pad(month)}-${pad(day)}`;
}

/** Gregorian Easter Sunday (Western) — month/day only */
function gregorianEasterSundayParts(year: number): { month: number; day: number } {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return { month, day };
}

export function addDaysIso(isoDate: string, deltaDays: number): string {
    const [y, m, d] = isoDate.split("-").map(Number);
    const t = Date.UTC(y, m - 1, d) + deltaDays * 86400000;
    const dt = new Date(t);
    return isoFromParts(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/** JS weekday 0–6 (Sun–Sat) for a civil ISO date */
export function jsWeekdayFromIso(isoDate: string): number {
    const [y, m, d] = isoDate.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function movableFederalHolidayIsoDates(year: number): string[] {
    const { month, day } = gregorianEasterSundayParts(year);
    const easterSunday = isoFromParts(year, month, day);
    return [
        addDaysIso(easterSunday, -2), // Good Friday
        addDaysIso(easterSunday, 1), // Easter Monday
        addDaysIso(easterSunday, 39), // Ascension Thursday (still treated as reduced-traffic day)
        addDaysIso(easterSunday, 50), // Whit Monday
    ];
}

function fixedFederalHolidayIsoDates(year: number): string[] {
    return [
        isoFromParts(year, 1, 1),
        isoFromParts(year, 5, 1),
        isoFromParts(year, 8, 1),
        isoFromParts(year, 12, 25),
        isoFromParts(year, 12, 26),
    ];
}

const holidayCache = new Map<number, ReadonlySet<string>>();

export function getZurichFederalHolidaySet(year: number): ReadonlySet<string> {
    let set = holidayCache.get(year);
    if (!set) {
        set = new Set([
            ...fixedFederalHolidayIsoDates(year),
            ...movableFederalHolidayIsoDates(year),
        ]);
        holidayCache.set(year, set);
    }
    return set;
}

/** True if `isoDate` (yyyy-mm-dd) is a Swiss federal holiday we treat as high-risk for venue closures */
export function isZurichPublicHolidayIso(isoDate: string): boolean {
    const y = Number(isoDate.slice(0, 4));
    if (!Number.isFinite(y)) return false;
    return getZurichFederalHolidaySet(y).has(isoDate);
}

/** Opening-hour segment for one weekday must be usable slot indices (30-min slots 0–47) */
export function isValidVenueSlotHours(h: { start: number; end: number } | null | undefined): boolean {
    if (!h || typeof h.start !== "number" || typeof h.end !== "number") return false;
    if (!Number.isFinite(h.start) || !Number.isFinite(h.end)) return false;
    if (h.start < 0 || h.end > 48) return false;
    return h.start < h.end;
}
