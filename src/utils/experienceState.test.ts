import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ENTRANCE_SEEN_KEY } from './cinematic';
import { STORAGE_KEY as BOUQUET_KEY } from '../garden/bouquetModel';
import { STAR_WISH_KEY, loadStarWish, saveStarWish } from '../garden/starWish';
import { KNOWN_VISITOR_KEYS, PRISM_KEY_PREFIX, clearVisitorProgress, visitorKeys, wantsReset } from './experienceState';

class MemoryStorage {
  private m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v));
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  keys() {
    return [...this.m.keys()];
  }
}

/** A browser that has been through the whole experience. */
function usedBrowser() {
  const local = new MemoryStorage();
  const session = new MemoryStorage();
  local.setItem('prism:sound', 'off');
  local.setItem('prism:reached25', '1');
  local.setItem(BOUQUET_KEY, '{"version":1,"flowers":[],"ribbon":"#C9D3E0"}');
  local.setItem(ENTRANCE_SEEN_KEY, '1');
  session.setItem('prism:garden-secrets', '["radiance"]');
  session.setItem(STAR_WISH_KEY, 'To see the northern lights');
  local.setItem('unrelated-site-key', 'keep');
  return { local, session };
}

// ------------------------------------------------------------------ inventory
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return sourceFiles(p);
    return /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f) ? [p] : [];
  });
}
const SRC = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const sources = sourceFiles(SRC).map((p) => readFileSync(p, 'utf8'));

describe('visitor progress inventory', () => {
  it('every storage key the site uses starts with "prism:" and is known to the reset', () => {
    const literals = new Set(sources.flatMap((s) => [...s.matchAll(/['"`](prism:[a-z0-9:-]+)['"`]/g)].map((m) => m[1])));
    expect(literals.size).toBeGreaterThan(3);
    for (const key of literals) {
      expect(key.startsWith(PRISM_KEY_PREFIX)).toBe(true);
      expect(Object.keys(KNOWN_VISITOR_KEYS), key).toContain(key);
    }
  });

  it('nothing is persisted outside local/session storage (no cookies, no IndexedDB, no server)', () => {
    for (const s of sources) {
      expect(s).not.toMatch(/document\.cookie|indexedDB|caches\.open|\/api\/experience|\/api\/vault|\/api\/wish/);
    }
  });

  it('every direct storage write uses a prism: key', () => {
    for (const s of sources) {
      for (const m of s.matchAll(/(?:localStorage|sessionStorage)\.setItem\(\s*([^,]+),/g)) {
        expect(m[1]).toMatch(/KEY|prism:|ENTRANCE_SEEN_KEY|STORAGE_KEY/);
      }
    }
  });
});

// ------------------------------------------------------------------ reset
describe('RESET ENTIRE EXPERIENCE (this browser/device only)', () => {
  it('is opened only by visiting the site with ?reset', () => {
    expect(wantsReset('?reset')).toBe(true);
    expect(wantsReset('?reset=1')).toBe(true);
    expect(wantsReset('?stage=princess&reset')).toBe(true);
    expect(wantsReset('')).toBe(false);
    expect(wantsReset('?stage=princess')).toBe(false);
  });

  it('clears every prism: key in local and session storage – and nothing else', () => {
    const { local, session } = usedBrowser();
    const removed = clearVisitorProgress([local, session]);
    expect(removed.sort()).toEqual(['prism:bouquet', 'prism:garden-secrets', 'prism:reached25', 'prism:sound', 'prism:star-entrance:v1', 'prism:star-wish']);
    expect(local.keys()).toEqual(['unrelated-site-key']);
    expect(session.keys()).toEqual([]);
    expect(visitorKeys([local, session])).toEqual([]);
  });

  it('restores first-visit behaviour: the countdown entrance plays again and no skip link is offered', async () => {
    const { local, session } = usedBrowser();
    clearVisitorProgress([local, session]);
    const { chooseEntrance } = await import('./cinematic');
    expect(chooseEntrance(local)).toBe('cinematic');
    expect(local.getItem('prism:reached25')).toBeNull();
    expect(local.getItem(BOUQUET_KEY)).toBeNull();
  });

  it('clears the wish kept for the Royal Seal certificate', () => {
    const { local, session } = usedBrowser();
    expect(loadStarWish(session)).toBe('To see the northern lights');
    clearVisitorProgress([local, session]);
    expect(loadStarWish(session)).toBeNull();
    // and a new wish can be made afterwards as usual
    saveStarWish('A new wish', session);
    expect(loadStarWish(session)).toBe('A new wish');
  });

  it('works without any backend, database or network request', () => {
    const src = readFileSync(new URL('./experienceState.ts', import.meta.url), 'utf8');
    expect(src).not.toMatch(/fetch\(|epoch|\/api\//i);
  });
});
