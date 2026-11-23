import { describe, expect, it } from 'vitest';
import { SECRET_TAPS, SECRET_WINDOW_MS, registerTap } from './secretTaps';

const tapAt = (times: number[]) => {
  let state: number[] = [];
  let unlocked = false;
  for (const t of times) {
    const r = registerTap(state, t);
    state = r.times;
    unlocked = unlocked || r.unlocked;
  }
  return unlocked;
};

describe('five-tap secret entrance', () => {
  it('opens after five deliberate taps within about three seconds', () => {
    expect(SECRET_TAPS).toBe(5);
    expect(SECRET_WINDOW_MS).toBe(3000);
    expect(tapAt([0, 400, 800, 1200, 1600])).toBe(true);
    expect(tapAt([0, 700, 1400, 2100, 2900])).toBe(true);
  });

  it('does not open with four taps, or when the taps are too slow', () => {
    expect(tapAt([0, 300, 600, 900])).toBe(false);
    expect(tapAt([0, 900, 1800, 2700, 3600])).toBe(false);
  });

  it('ignores accidental double-fires closer than a real tap', () => {
    expect(tapAt([0, 10, 20, 30, 40])).toBe(false);
  });

  it('starts counting again after opening, so a sixth tap does not reopen', () => {
    let state: number[] = [];
    const results = [0, 300, 600, 900, 1200, 1500].map((t) => {
      const r = registerTap(state, t);
      state = r.times;
      return r.unlocked;
    });
    expect(results).toEqual([false, false, false, false, true, false]);
  });
});
