const TZ = 'Europe/Zurich';

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

/**
 * Returns the UTC timestamp (ms) for 00:00 in Europe/Zurich on the given
 * calendar date. Handles CET (UTC+1) and CEST (UTC+2) automatically.
 */
function zurichMidnightMs(year: number, month: number, day: number): number {
  // Check the Zurich offset by seeing what local hour noon-UTC maps to.
  // Zurich is always UTC+1 (CET) or UTC+2 (CEST), so noon-UTC → 13:00 or 14:00.
  const noonUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const zurichHour = parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TZ,
      hour: 'numeric',
      hour12: false,
    }).format(noonUtc),
    10,
  );
  const offsetHours = zurichHour - 12; // 1 or 2
  // Midnight Zurich = UTC midnight shifted back by the offset
  return Date.UTC(year, month - 1, day, -offsetHours, 0, 0);
}

/**
 * Advances (or retreats) a UTC-noon date by N calendar days without
 * timezone ambiguity.
 */
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
  // Day-of-week for this calendar date (0=Sun, 1=Mon … 6=Sat)
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
  if (daysUntil === 0) daysUntil = 7; // already Monday → next Monday
  const monday = shiftDays(year, month, day, daysUntil);
  const target = zurichMidnightMs(monday.year, monday.month, monday.day);
  return target > now.getTime() ? target : target + 7 * 24 * 60 * 60 * 1000;
}
