/**
 * Single source of "now" for the whole experience.
 *
 *   now = device clock + server correction + test-clock shift
 *
 * - Server correction: measured from /api/time so a wrong phone clock can't
 *   break the countdown (falls back to the device clock if unavailable).
 * - Test clock: add `?now=2026-12-17T23:59:50+04:00` to the URL to start the
 *   virtual clock at that instant; it then ticks normally. Only enabled in
 *   `vite dev`, or when VITE_ENABLE_TEST_CLOCK=true. The real target never changes.
 */

import { STATIC_HOSTING } from './hosting';

const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();

export const TEST_CLOCK_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ENABLE_TEST_CLOCK === 'true';

const rawTestNow = TEST_CLOCK_ENABLED ? params.get('now') : null;
const parsedTestNow = rawTestNow ? Date.parse(rawTestNow) : NaN;

export const TEST_NOW_ACTIVE = !Number.isNaN(parsedTestNow);
const testShift = TEST_NOW_ACTIVE ? parsedTestNow - Date.now() : 0;

let serverShift = 0;

export function now(): number {
  return Date.now() + serverShift + testShift;
}

/** Forwards the virtual clock to the dev API. Production servers ignore it. */
export function testClockQuery(): string {
  return TEST_NOW_ACTIVE ? `now=${encodeURIComponent(new Date(now()).toISOString())}` : '';
}

let synced = false;
export async function syncWithServer(): Promise<void> {
  // Static hosting has no /api/time: keep the device clock.
  if (synced || TEST_NOW_ACTIVE || STATIC_HOSTING) return;
  synced = true;
  try {
    const t0 = Date.now();
    const res = await fetch('/api/time', { cache: 'no-store' });
    const t1 = Date.now();
    if (!res.ok) return;
    const { serverTime } = (await res.json()) as { serverTime: number };
    if (typeof serverTime !== 'number') return;
    const drift = serverTime + (t1 - t0) / 2 - t1;
    // Only correct meaningful drift, to avoid jitter from network noise.
    if (Math.abs(drift) > 1500) {
      serverShift = drift;
      notify();
    }
  } catch {
    /* static hosting / offline: keep the device clock */
  }
}

// --- shared 1-second ticker, aligned to the second boundary -----------------
type Listener = () => void;
const listeners = new Set<Listener>();
let timer: ReturnType<typeof setTimeout> | null = null;
let snapshot = now();

function notify() {
  snapshot = now();
  listeners.forEach((l) => l());
}

function schedule() {
  const delay = 1000 - (((now() % 1000) + 1000) % 1000) + 8;
  timer = setTimeout(() => {
    notify();
    schedule();
  }, delay);
}

function onVisible() {
  if (document.visibilityState === 'visible') notify();
}

export function subscribeTick(l: Listener) {
  listeners.add(l);
  if (listeners.size === 1) {
    snapshot = now();
    schedule();
    document.addEventListener('visibilitychange', onVisible);
  }
  return () => {
    listeners.delete(l);
    if (listeners.size === 0) {
      if (timer) clearTimeout(timer);
      timer = null;
      document.removeEventListener('visibilitychange', onVisible);
    }
  };
}

export function getTickSnapshot() {
  return snapshot;
}
