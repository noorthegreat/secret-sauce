const TZ = "Europe/Zurich";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function formatYmd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Returns the calendar date (year, 1-based month, day) currently in Zurich. */
function getZurichCalendarDate(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const p: Record<string, string> = {};
  parts.forEach(({ type, value }) => (p[type] = value));

  return { year: parseInt(p.year), month: parseInt(p.month), day: parseInt(p.day) };
}

/** Returns the UTC timestamp (ms) for 00:00 Europe/Zurich on the given calendar date. */
function zurichMidnightMs(year: number, month: number, day: number): number {
  const noonUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const zurichHour = parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TZ,
      hour: 'numeric',
      hour12: false,
    }).format(noonUtc),
    10,
  );
  const offsetHours = zurichHour - 12; // 1 (CET) or 2 (CEST)
  return Date.UTC(year, month - 1, day, -offsetHours, 0, 0);
}

function shiftDays(year: number, month: number, day: number, delta: number) {
  const d = new Date(Date.UTC(year, month - 1, day + delta, 12, 0, 0));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/**
 * UTC ms for the start of the current weekly cycle
 * (last Monday 00:00 Europe/Zurich, always ≤ now).
 */
export function currentZurichCycleStartMs(): number {
  const now = new Date();
  const { year, month, day } = getZurichCalendarDate(now);
  const weekday = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getUTCDay();
  const daysSinceMonday = (weekday - 1 + 7) % 7;
  const monday = shiftDays(year, month, day, -daysSinceMonday);
  const cycleStart = zurichMidnightMs(monday.year, monday.month, monday.day);
  return cycleStart <= now.getTime() ? cycleStart : cycleStart - 7 * 24 * 60 * 60 * 1000;
}

/**
 * UTC ms for the next Monday 00:00 Europe/Zurich (always strictly > now).
 */
export function nextZurichMondayMidnightMs(): number {
  const now = new Date();
  const { year, month, day } = getZurichCalendarDate(now);
  const weekday = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getUTCDay();
  let daysUntil = (1 - weekday + 7) % 7;
  if (daysUntil === 0) daysUntil = 7;
  const monday = shiftDays(year, month, day, daysUntil);
  const target = zurichMidnightMs(monday.year, monday.month, monday.day);
  return target > now.getTime() ? target : target + 7 * 24 * 60 * 60 * 1000;
}

/**
 * Returns the ISO date string (YYYY-MM-DD) for the Monday that starts the week
 * containing `d`, using the Europe/Zurich calendar date.
 *
 * Fixes the UTC weekStart bug: events at 22:00–00:00 UTC (= midnight Zurich)
 * belong to the new Zurich week, not the previous UTC week.
 */
export function zurichWeekStart(d: Date): string {
  const { year, month, day } = getZurichCalendarDate(d);
  const dt = new Date(Date.UTC(year, month - 1, day));
  const dow = dt.getUTCDay(); // 0=Sun … 6=Sat
  const diff = (dow === 0 ? -6 : 1) - dow;
  dt.setUTCDate(dt.getUTCDate() + diff);
  return dt.toISOString().slice(0, 10);
}

/**
 * YYYY-MM-DD for the Europe/Zurich calendar date of the given instant (matches app `first_possible_day` strings).
 */
export function zurichIsoDateFromMs(ms: number): string {
  const { year, month, day } = getZurichCalendarDate(new Date(ms));
  return formatYmd(year, month, day);
}

/**
 * "Tomorrow" as YYYY-MM-DD on the Europe/Zurich calendar (for cron/reminders vs `first_possible_day`).
 */
export function zurichTomorrowIsoDate(now: Date): string {
  const { year, month, day } = getZurichCalendarDate(now);
  const jd = new Date(Date.UTC(year, month - 1, day + 1));
  return formatYmd(jd.getUTCFullYear(), jd.getUTCMonth() + 1, jd.getUTCDate());
}

/**
 * Add signed whole days to a YYYY-MM-DD civil date (Gregorian), for Zurich business logic comparisons.
 */
export function zurichIsoDateOffsetFromToday(now: Date, offsetDays: number): string {
  const { year, month, day } = getZurichCalendarDate(now);
  const jd = new Date(Date.UTC(year, month - 1, day + offsetDays));
  return formatYmd(jd.getUTCFullYear(), jd.getUTCMonth() + 1, jd.getUTCDate());
}

/**
 * JS weekday 0=Sun … 6=Sat for this calendar date interpreted in Europe/Zurich (availability keys).
 */
export function jsWeekdayFromIsoDateInZurich(isoDate: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) throw new Error("invalid YYYY-MM-DD");
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  const middayMs = zurichMidnightMs(y, mo, d) + 12 * 60 * 60 * 1000;
  const w = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(new Date(middayMs));
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const idx = map[w];
  if (idx === undefined) throw new Error(`unexpected weekday label: ${w}`);
  return idx;
}

/**
 * First possible scheduling date (Tuesday of the active week) as YYYY-MM-DD in Europe/Zurich.
 * Decision window = Mon 00:00 – Tue 12:00 Europe/Zurich.
 */
export function getDateWindowStartFromWeeklyDrop(now: Date): string {
  const cycleStart = currentZurichCycleStartMs();
  const decisionWindowEnd = cycleStart + 36 * 60 * 60 * 1000; // Tue 12:00 Zurich
  const isInDecisionWindow = now.getTime() >= cycleStart && now.getTime() < decisionWindowEnd;

  const activeDropMs = isInDecisionWindow ? cycleStart : cycleStart + WEEK_MS;
  const tuesdayMs = activeDropMs + 36 * 60 * 60 * 1000;
  return zurichIsoDateFromMs(tuesdayMs);
}
