import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { WISH_MAX_LENGTH } from '../../shared/wishRules.js';
import { STAR_WISH_KEY, loadStarWish, makeWish, saveStarWish } from './starWish';

function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
    raw: m,
  };
}

describe('A Wish Upon a Star: submitting a wish', () => {
  it('accepts an ordinary wish (trimmed) for the certificate', () => {
    expect(makeWish('  To see the northern lights from a quiet cabin \n')).toEqual({
      kind: 'accepted',
      wish: 'To see the northern lights from a quiet cabin',
    });
  });

  it('keeps line breaks she wrote inside the wish', () => {
    expect(makeWish('First line\nSecond line')).toEqual({ kind: 'accepted', wish: 'First line\nSecond line' });
  });

  it('enforces the 500-character limit, counted as she sees it (emoji = 1)', () => {
    expect(WISH_MAX_LENGTH).toBe(500);
    expect(makeWish('a'.repeat(500)).kind).toBe('accepted');
    expect(makeWish('💎'.repeat(500)).kind).toBe('accepted');
    expect(makeWish('a'.repeat(501))).toEqual({ kind: 'error', error: 'too-long' });
  });

  it('rejects empty and unreadable wishes', () => {
    expect(makeWish('   \n ')).toEqual({ kind: 'error', error: 'empty' });
    expect(makeWish('hello\u0007')).toEqual({ kind: 'error', error: 'invalid-characters' });
  });

  it('answers money wishes with the joke and never keeps them', () => {
    expect(makeWish('I wish to be rich')).toEqual({ kind: 'wealth' });
    expect(makeWish('Je veux être riche')).toEqual({ kind: 'wealth' });
    expect(makeWish('A life rich in love').kind).toBe('accepted');
    const store = memoryStorage();
    store.setItem(STAR_WISH_KEY, 'I want to win the lottery');
    expect(loadStarWish(store)).toBeNull();
  });
});

describe('the wish is kept for this visit only (sessionStorage["prism:star-wish"])', () => {
  it('is saved, restored and forgotten', () => {
    const store = memoryStorage();
    saveStarWish('A long walk by the sea at sunrise', store);
    expect(store.raw.get(STAR_WISH_KEY)).toBe('A long walk by the sea at sunrise');
    expect(loadStarWish(store)).toBe('A long walk by the sea at sunrise');
    saveStarWish(null, store);
    expect(loadStarWish(store)).toBeNull();
    expect(store.raw.size).toBe(0);
  });

  it('ignores tampered or broken storage instead of throwing', () => {
    const store = memoryStorage();
    store.setItem(STAR_WISH_KEY, 'x'.repeat(900));
    expect(loadStarWish(store)).toBeNull();
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => {} };
    expect(loadStarWish(broken)).toBeNull();
    expect(() => saveStarWish('hi', broken)).not.toThrow();
  });
});

describe('nothing about the wish leaves the device', () => {
  const files = ['./starWish.ts', '../components/Garden/WishUponAStar.tsx', '../components/Garden/GardenOfWishes.tsx', '../components/Garden/RoyalCertificate.tsx'];
  const sources = files.map((f) => readFileSync(new URL(f, import.meta.url), 'utf8'));

  it('makes no network request and has no API, vault or email code', () => {
    for (const s of sources) {
      expect(s).not.toMatch(/fetch\(|XMLHttpRequest|sendBeacon|\/api\/|VITE_API_BASE_URL|vault|resend|upstash/i);
    }
  });

  it('the wish component hands her wish to the Garden, which passes it to the certificate', () => {
    const [, ui, gardenSrc, cert] = sources;
    expect(ui).toMatch(/onWish\(r\.wish\)/);
    expect(ui).toMatch(/onWish\(null\)/); // "Keep it to myself" leaves the certificate without a wish
    expect(gardenSrc).toMatch(/<WishUponAStar onContinue=\{next\} onWish=\{keepWish\} \/>/);
    expect(gardenSrc).toMatch(/<RoyalCertificate spec=\{spec\} wish=\{wish\}/);
    expect(cert).toMatch(/renderCertificatePng\(spec, wish\)/);
  });
});
