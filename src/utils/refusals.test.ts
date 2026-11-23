import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { project25 } from '../content/birthday';
import { DOOR_REACTIONS, initialDoorState, nextRefusal, pressLockedDoor } from './refusals';

/** Deterministic pseudo-random generator for reproducible shuffles. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('nextRefusal – shuffle bag', () => {
  it('uses every entry exactly once before any repeat', () => {
    const rng = seeded(7);
    let bag: number[] = [];
    let last: number | null = null;
    for (let round = 0; round < 5; round++) {
      const seen: number[] = [];
      for (let i = 0; i < 8; i++) {
        const r = nextRefusal(bag, last, 8, rng);
        seen.push(r.index);
        bag = r.bag;
        last = r.index;
      }
      expect([...seen].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    }
  });

  it('never repeats the previous message when a new bag starts', () => {
    // rng ≈ 1 makes the shuffle return the identity order, so the new bag would
    // start with 0 – which is exactly the last message shown.
    const r = nextRefusal([], 0, 5, () => 0.9999);
    expect(r.index).not.toBe(0);
    expect([r.index, ...r.bag].sort()).toEqual([0, 1, 2, 3, 4]);
    for (let seed = 1; seed < 200; seed++) {
      const rng = seeded(seed);
      const last = Math.floor(rng() * 6);
      expect(nextRefusal([], last, 6, rng).index).not.toBe(last);
    }
  });

  it('handles empty and single-entry pools safely', () => {
    expect(nextRefusal([], null, 0)).toEqual({ index: -1, bag: [] });
    expect(nextRefusal([], 0, 1)).toEqual({ index: 0, bag: [] });
    expect(nextRefusal([3, 9], null, 2).index).toBeLessThan(2); // stale indices are discarded
  });
});

describe('pressLockedDoor', () => {
  const content = {
    opening: project25.chamber.curiousLines,
    pool: [...project25.chamber.curiousLines, ...project25.chamber.refusals],
    special: project25.chamber.specialRefusals,
  };

  it('has a pool of 16–20 refusals with the original three first', () => {
    expect(content.pool.length).toBeGreaterThanOrEqual(16);
    expect(content.pool.length).toBeLessThanOrEqual(20);
    expect(content.pool.slice(0, 3)).toEqual([
      'Well, well. Someone is curious.',
      'Unfortunately, even royalty must respect the countdown.',
      'Come back on December 18.',
    ]);
    expect(new Set(content.pool).size).toBe(content.pool.length);
  });

  it('shows the openers in order, the special lines at 10 and 25, and never the same line twice in a row', () => {
    let state = initialDoorState();
    const messages: string[] = [];
    const rng = seeded(42);
    for (let i = 0; i < 60; i++) {
      const r = pressLockedDoor(state, content, rng);
      state = r.state;
      messages.push(r.message);
      expect(r.reaction).toBe(DOOR_REACTIONS[i % DOOR_REACTIONS.length]);
    }
    expect(messages.slice(0, 3)).toEqual(content.opening);
    expect(messages[9]).toBe(content.special[10]);
    expect(messages[24]).toBe(content.special[25]);
    for (let i = 1; i < messages.length; i++) expect(messages[i], `press ${i + 1}`).not.toBe(messages[i - 1]);
    expect(state.presses).toBe(60);
  });

  it('never repeats the last opener on the first shuffled press, whatever the shuffle', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const rng = seeded(seed);
      let state = initialDoorState();
      const msgs: string[] = [];
      for (let i = 0; i < 4; i++) {
        const r = pressLockedDoor(state, content, rng);
        state = r.state;
        msgs.push(r.message);
      }
      expect(msgs[3], `seed ${seed}`).not.toBe(msgs[2]);
    }
  });

  it('returns only cosmetic state – there is nothing in it that could unlock anything', () => {
    const r = pressLockedDoor(initialDoorState(), content);
    expect(Object.keys(r).sort()).toEqual(['message', 'reaction', 'state']);
    expect(Object.keys(r.state).sort()).toEqual(['bag', 'last', 'presses']);
  });
});

describe('BirthdayChamber: pressing the locked door can never open it', () => {
  const src = readFileSync(new URL('../components/BirthdayChamber/BirthdayChamber.tsx', import.meta.url), 'utf8');
  const body = src.slice(src.indexOf('const pressDoor = () => {'), src.indexOf('};', src.indexOf('const pressDoor = () => {')));

  it('the press handler touches only refusal state, sound and the counter', () => {
    expect(body.length).toBeGreaterThan(50);
    expect(body).not.toMatch(/\bopen\(|setState\(|setPhase\(|\breached\b|onOpened|onGold|timers/);
  });

  it('the locked door button calls the press handler, and only "ready" calls open()', () => {
    expect(src).toMatch(/state === 'locked' && \(\s*<button[\s\S]*?onClick=\{pressDoor\}/);
    expect(src).toMatch(/state === 'ready' && \(\s*<button[^>]*onClick=\{open\}/);
  });
});
