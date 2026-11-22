/**
 * All date logic in the experience is anchored to Mauritius time (Port Louis).
 * NOTE: "Africa/Port_Louis" is not a valid IANA zone and throws a RangeError in
 * Safari/Chrome/Node. The official IANA identifier for Mauritius is "Indian/Mauritius".
 */
export const TIMEZONE = 'Indian/Mauritius';
/** Mauritius is UTC+4 all year (no DST). Used only if the browser lacks tz data. */
const FALLBACK_OFFSET_MS: Record<string, number> = { 'Indian/Mauritius': 4 * 3_600_000 };

export interface ZonedParts {
  year: number;
  month: number; // 1–12
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number; // 0 = Sunday
}

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const formatterCache = new Map<string, Intl.DateTimeFormat>();
function partsFormatter(tz: string) {
  let f = formatterCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      weekday: 'short',
    });
    formatterCache.set(tz, f);
  }
  return f;
}

/** Wall-clock components of an instant, as seen in the given timezone. */
export function getZonedParts(ms: number, tz: string = TIMEZONE): ZonedParts {
  let formatter: Intl.DateTimeFormat | null = null;
  try {
    formatter = partsFormatter(tz);
  } catch {
    formatter = null;
  }
  if (!formatter) {
    const d = new Date(ms + (FALLBACK_OFFSET_MS[tz] ?? 0));
    return {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      hour: d.getUTCHours(),
      minute: d.getUTCMinutes(),
      second: d.getUTCSeconds(),
      weekday: d.getUTCDay(),
    };
  }
  const out: Record<string, string> = {};
  for (const p of formatter.formatToParts(new Date(ms))) out[p.type] = p.value;
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: Number(out.hour) % 24,
    minute: Number(out.minute),
    second: Number(out.second),
    weekday: WEEKDAY_INDEX[out.weekday] ?? 0,
  };
}

/** Offset (ms) of the timezone from UTC at the given instant. */
export function getTimezoneOffsetMs(ms: number, tz: string = TIMEZONE): number {
  const p = getZonedParts(ms, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/**
 * Convert a wall-clock time in `tz` to an absolute UTC instant.
 * Two-pass so it settles correctly around DST edges (Mauritius has none, but this stays correct anyway).
 */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  tz: string = TIMEZONE,
): number {
  const guess = Date.UTC(year, month - 1, day, hour, minute, second);
  const first = guess - getTimezoneOffsetMs(guess, tz);
  return guess - getTimezoneOffsetMs(first, tz);
}
