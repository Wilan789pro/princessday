import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { ENTRANCE_SEEN_KEY } from './cinematic';
import { STORAGE_KEY as BOUQUET_KEY } from '../garden/bouquetModel';
import { EXPERIENCE_EPOCH_KEY, KNOWN_VISITOR_KEYS, PRISM_KEY_PREFIX, clearVisitorProgress, syncExperienceEpoch, visitorKeys } from './experienceState';

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
  local.setItem('unrelated-site-key', 'keep');
  return { local, session };
}

const epochResponse = (epoch: unknown) => vi.fn().mockResolvedValue({ ok: true, json: async () => ({ epoch }) }) as unknown as typeof fetch;

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

  it('nothing is persisted outside local/session storage (no cookies, no IndexedDB)', () => {
    for (const s of sources) {
      expect(s).not.toMatch(/document\.cookie|indexedDB|caches\.open/);
    }
  });

  it('every direct storage write uses a prism: key', () => {
    for (const s of sources) {
      for (const m of s.matchAll(/(?:localStorage|sessionStorage)\.setItem\(\s*([^,]+),/g)) {
        expect(m[1]).toMatch(/KEY|prism:|EXPERIENCE_EPOCH_KEY|ENTRANCE_SEEN_KEY|STORAGE_KEY/);
      }
    }
  });
});

// ------------------------------------------------------------------ reset
describe('RESET ENTIRE EXPERIENCE (this device)', () => {
  it('clears every prism: key in local and session storage – and nothing else', () => {
    const { local, session } = usedBrowser();
    const removed = clearVisitorProgress([local, session]);
    expect(removed.sort()).toEqual(['prism:bouquet', 'prism:garden-secrets', 'prism:reached25', 'prism:sound', 'prism:star-entrance:v1']);
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

  it('never stores wishes in the browser, so a reset cannot touch them', () => {
    for (const s of sources) expect(s).not.toMatch(/setItem\([^)]*wish/i);
  });
});

describe('RESET ENTIRE EXPERIENCE (every device, via the server epoch)', () => {
  it('another device with old progress clears it and restarts when the epoch changed', async () => {
    const { local, session } = usedBrowser();
    local.setItem(EXPERIENCE_EPOCH_KEY, 'epoch-1');
    const r = await syncExperienceEpoch({ endpoint: '/api/experience', fetchImpl: epochResponse('epoch-2'), local, storages: [local, session] });
    expect(r).toBe('reset');
    expect(local.getItem(ENTRANCE_SEEN_KEY)).toBeNull();
    expect(local.getItem(BOUQUET_KEY)).toBeNull();
    expect(session.getItem('prism:garden-secrets')).toBeNull();
    expect(local.getItem(EXPERIENCE_EPOCH_KEY)).toBe('epoch-2');
    // the next visit is ordinary
    expect(await syncExperienceEpoch({ endpoint: '/api/experience', fetchImpl: epochResponse('epoch-2'), local, storages: [local, session] })).toBe('same');
  });

  it('a device that saw no marker before but has progress also starts fresh', async () => {
    const { local, session } = usedBrowser();
    expect(await syncExperienceEpoch({ endpoint: '/x', fetchImpl: epochResponse('e1'), local, storages: [local, session] })).toBe('reset');
    expect(local.getItem(ENTRANCE_SEEN_KEY)).toBeNull();
  });

  it('a brand-new visitor is not reloaded (only the sound preference exists)', async () => {
    const local = new MemoryStorage();
    local.setItem('prism:sound', 'on');
    expect(await syncExperienceEpoch({ endpoint: '/x', fetchImpl: epochResponse('e1'), local, storages: [local] })).toBe('first-visit');
    expect(local.getItem('prism:sound')).toBe('on');
    expect(local.getItem(EXPERIENCE_EPOCH_KEY)).toBe('e1');
  });

  it('does nothing when no reset ever happened, the server is unreachable, or there is no backend', async () => {
    const { local, session } = usedBrowser();
    const before = local.keys().length;
    expect(await syncExperienceEpoch({ endpoint: '/x', fetchImpl: epochResponse(null), local, storages: [local, session] })).toBe('unavailable');
    const offline = vi.fn().mockRejectedValue(new TypeError('offline')) as unknown as typeof fetch;
    expect(await syncExperienceEpoch({ endpoint: '/x', fetchImpl: offline, local, storages: [local, session] })).toBe('unavailable');
    expect(await syncExperienceEpoch({ endpoint: null, local, storages: [local, session] })).toBe('not-connected');
    expect(local.keys().length).toBe(before);
  });
});
