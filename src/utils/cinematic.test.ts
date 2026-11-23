import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  DATES_REVEAL_DONE_MS,
  ENTRANCE_ORDER,
  ENTRANCE_SEEN_KEY,
  chooseEntrance,
  datesTimeline,
  entranceTimeline,
  hasSeenEntrance,
  markEntranceSeen,
  once,
  shouldAutoOpen,
} from './cinematic';

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};
const broken = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
};

describe('dates → countdown hand-over', () => {
  for (const reduced of [false, true]) {
    it(`phases are strictly ordered and end in a single hand-over (reduced=${reduced})`, () => {
      const t = datesTimeline(reduced);
      expect(t.map((s) => s.phase)).toEqual(['reveal', 'hold', 'outro', 'dark', 'handoff']);
      for (let i = 1; i < t.length; i++) expect(t[i].at).toBeGreaterThan(t[i - 1].at);
      expect(t.filter((s) => s.phase === 'handoff')).toHaveLength(1);
    });
  }

  it('leaves the dates on screen long enough to be read before moving', () => {
    const t = datesTimeline(false);
    const hold = t.find((s) => s.phase === 'hold')!.at;
    const outro = t.find((s) => s.phase === 'outro')!.at;
    expect(hold).toBe(DATES_REVEAL_DONE_MS);
    expect(outro - hold).toBeGreaterThanOrEqual(3000);
    // reduced motion shortens the animation, never the reading time
    const r = datesTimeline(true);
    expect(r.find((s) => s.phase === 'outro')!.at - r.find((s) => s.phase === 'hold')!.at).toBeGreaterThanOrEqual(3000);
  });

  it('fires the hand-over exactly once, even if triggered repeatedly', () => {
    const go = vi.fn();
    const handoff = once(go);
    handoff();
    handoff();
    handoff();
    expect(go).toHaveBeenCalledTimes(1);
  });

  it('DateReveal advances automatically (no button) and guards its callback with once()', () => {
    const src = readFileSync(new URL('../components/DateReveal/DateReveal.tsx', import.meta.url), 'utf8');
    expect(src).not.toMatch(/<button/);
    expect(src).toMatch(/once\(\(\) => handlers\.current\.onContinue\(\)\)/);
    expect(src).toMatch(/return \(\) => timers\.forEach\(clearTimeout\)/);
  });
});

describe('THE 25th STAR entrance', () => {
  it('full entrance phases are ordered and finish in about 9.5 seconds', () => {
    const t = entranceTimeline(false);
    expect(t.map((s) => s.phase)).toEqual(ENTRANCE_ORDER);
    for (let i = 1; i < t.length; i++) expect(t[i].at).toBeGreaterThan(t[i - 1].at);
    expect(t[t.length - 1].at).toBeLessThanOrEqual(10000);
  });

  it('reduced motion completes in under two seconds', () => {
    const t = entranceTimeline(true);
    expect(t[t.length - 1].phase).toBe('done');
    expect(t[t.length - 1].at).toBeLessThan(2000);
    for (let i = 1; i < t.length; i++) expect(ENTRANCE_ORDER.indexOf(t[i].phase)).toBeGreaterThan(ENTRANCE_ORDER.indexOf(t[i - 1].phase));
  });

  it('plays once per browser: skipped after the completion flag is set', () => {
    const store = memory();
    expect(chooseEntrance(store)).toBe('cinematic');
    markEntranceSeen(store);
    expect(store.getItem(ENTRANCE_SEEN_KEY)).toBe('1');
    expect(hasSeenEntrance(store)).toBe(true);
    expect(chooseEntrance(store)).toBe('none');
    expect(ENTRANCE_SEEN_KEY).toMatch(/:v\d+$/);
  });

  it('never breaks when storage is unavailable', () => {
    expect(() => markEntranceSeen(broken)).not.toThrow();
    expect(hasSeenEntrance(broken)).toBe(false);
    expect(chooseEntrance(broken)).toBe('cinematic');
    expect(chooseEntrance(null)).toBe('cinematic');
  });
});

describe('chamber auto-open during the entrance', () => {
  const base = { reached: true, lockedOnMount: true, state: 'locked', entranceRunning: false };
  it('is only deferred while the entrance runs, then allowed', () => {
    expect(shouldAutoOpen({ ...base, entranceRunning: true })).toBe(false);
    expect(shouldAutoOpen(base)).toBe(true);
  });
  it('still never opens before the countdown is reached, whatever the entrance state', () => {
    for (const entranceRunning of [true, false]) {
      expect(shouldAutoOpen({ ...base, reached: false, entranceRunning })).toBe(false);
    }
    expect(shouldAutoOpen({ ...base, state: 'ready' })).toBe(false);
    expect(shouldAutoOpen({ ...base, lockedOnMount: false })).toBe(false);
  });
});
