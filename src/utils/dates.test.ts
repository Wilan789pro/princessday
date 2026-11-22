import { describe, expect, it } from 'vitest';
import { BIRTHDAY_MS, PRINCESS_DAY_MS, WEEKDAYS, calendarDaysBetween, remainingUntil } from './dates';
import { getZonedParts, zonedTimeToUtc } from './timezone';
import { UNLOCK_AT_MS, birthdayResponse } from '../../server/birthdayAccess.js';

describe('anchor dates (Mauritius, Indian/Mauritius)', () => {
  it('Princess Day is Wednesday 18 November 2026, 00:00 Mauritius = 17 Nov 20:00 UTC', () => {
    expect(new Date(PRINCESS_DAY_MS).toISOString()).toBe('2026-11-17T20:00:00.000Z');
    const p = getZonedParts(PRINCESS_DAY_MS);
    expect([p.year, p.month, p.day, p.hour, p.minute, p.second]).toEqual([2026, 11, 18, 0, 0, 0]);
    expect(WEEKDAYS[p.weekday]).toBe('Wednesday');
  });

  it('birthday target is Friday 18 December 2026, 00:00 Mauritius = 17 Dec 20:00 UTC', () => {
    expect(new Date(BIRTHDAY_MS).toISOString()).toBe('2026-12-17T20:00:00.000Z');
    expect(WEEKDAYS[getZonedParts(BIRTHDAY_MS).weekday]).toBe('Friday');
  });

  it('server unlock moment matches the client target', () => {
    expect(UNLOCK_AT_MS).toBe(BIRTHDAY_MS);
  });

  it('zonedTimeToUtc round-trips', () => {
    const t = zonedTimeToUtc(2026, 11, 22, 23, 15, 30);
    const p = getZonedParts(t);
    expect([p.day, p.hour, p.minute, p.second]).toEqual([22, 23, 15, 30]);
  });
});

describe('calendarDaysBetween', () => {
  it('22 Nov 2026 is four days after Princess Day, even late at night', () => {
    expect(calendarDaysBetween(PRINCESS_DAY_MS, zonedTimeToUtc(2026, 11, 22, 23, 59, 59))).toBe(4);
    expect(calendarDaysBetween(PRINCESS_DAY_MS, zonedTimeToUtc(2026, 11, 22, 0, 0, 1))).toBe(4);
  });
  it('uses the Mauritius calendar, not UTC (21 Nov 22:00 UTC is already 22 Nov in MU)', () => {
    expect(calendarDaysBetween(PRINCESS_DAY_MS, Date.parse('2026-11-21T22:00:00Z'))).toBe(4);
  });
});

describe('remainingUntil', () => {
  it('counts down precisely', () => {
    const r = remainingUntil(BIRTHDAY_MS, BIRTHDAY_MS - (2 * 86400 + 3 * 3600 + 4 * 60 + 5) * 1000);
    expect([r.days, r.hours, r.minutes, r.seconds, r.reached]).toEqual([2, 3, 4, 5, false]);
  });
  it('shows 00:00:00:01 in the final second, then exactly zero and reached', () => {
    const last = remainingUntil(BIRTHDAY_MS, BIRTHDAY_MS - 400);
    expect([last.days, last.hours, last.minutes, last.seconds, last.reached]).toEqual([0, 0, 0, 1, false]);
    const zero = remainingUntil(BIRTHDAY_MS, BIRTHDAY_MS);
    expect([zero.days, zero.hours, zero.minutes, zero.seconds, zero.reached]).toEqual([0, 0, 0, 0, true]);
  });
  it('never goes negative after the target', () => {
    const r = remainingUntil(BIRTHDAY_MS, BIRTHDAY_MS + 86400_000 * 3);
    expect([r.days, r.hours, r.minutes, r.seconds, r.reached]).toEqual([0, 0, 0, 0, true]);
  });
});

describe('server gate', () => {
  it('refuses content one millisecond before the unlock', async () => {
    const r = await birthdayResponse(BIRTHDAY_MS - 1);
    expect(r.status).toBe(403);
    expect(JSON.parse(r.body).content).toBeUndefined();
  });
  it('serves content at the unlock moment', async () => {
    const r = await birthdayResponse(BIRTHDAY_MS);
    expect(r.status).toBe(200);
    expect(JSON.parse(r.body).content).toBeTruthy();
  });
});
