import { TIMEZONE, getZonedParts, zonedTimeToUtc, type ZonedParts } from './timezone';

/** Wednesday 18 November 2026, 00:00:00 Mauritius – destination of the rewind. */
export const PRINCESS_DAY_MS = zonedTimeToUtc(2026, 11, 18, 0, 0, 0);
/** Friday 18 December 2026, 00:00:00 Mauritius – Project 25 unlock moment. */
export const BIRTHDAY_MS = zonedTimeToUtc(2026, 12, 18, 0, 0, 0);

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const pad2 = (n: number) => String(n).padStart(2, '0');

export function formatTime(p: ZonedParts) {
  return `${pad2(p.hour)}:${pad2(p.minute)}:${pad2(p.second)}`;
}

export function formatLongDate(p: ZonedParts) {
  return `${p.day} ${MONTHS[p.month - 1]} ${p.year}`;
}

/** Whole calendar days between two instants, counted on the Mauritius calendar. */
export function calendarDaysBetween(fromMs: number, toMs: number, tz: string = TIMEZONE): number {
  const a = getZonedParts(fromMs, tz);
  const b = getZonedParts(toMs, tz);
  const da = Date.UTC(a.year, a.month - 1, a.day);
  const db = Date.UTC(b.year, b.month - 1, b.day);
  return Math.round((db - da) / 86_400_000);
}

export interface Remaining {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  reached: boolean;
}

/** Countdown breakdown. Seconds are rounded up so the display reads 00:00:00:00 exactly at the target. */
export function remainingUntil(targetMs: number, nowMs: number): Remaining {
  const totalMs = Math.max(0, targetMs - nowMs);
  const totalSec = Math.ceil(totalMs / 1000);
  return {
    totalMs,
    days: Math.floor(totalSec / 86_400),
    hours: Math.floor((totalSec % 86_400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
    reached: totalMs <= 0,
  };
}

export function numberWord(n: number): string {
  const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  return words[n] ?? String(n);
}
