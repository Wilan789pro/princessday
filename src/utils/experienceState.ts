/**
 * VISITOR EXPERIENCE STATE
 *
 * Everything the site remembers about a visitor lives in this browser under
 * keys starting with "prism:" (see the inventory below). Nothing else is used:
 * no cookies, no IndexedDB, no server. In-memory progress (crystals collected,
 * glints found, Garden chapter, dates/countdown phases, the chamber's state)
 * is rebuilt from scratch on every page load.
 *
 * RESET ENTIRE EXPERIENCE (open the site with ?reset) removes every "prism:"
 * key from this browser's local and session storage – and nothing else – then
 * restarts from the very beginning. It affects this browser/device only.
 */

export const PRISM_KEY_PREFIX = 'prism:';

/** Inventory of every persisted visitor key (kept in sync by a test that scans the source). */
export const KNOWN_VISITOR_KEYS = {
  'prism:sound': 'sound on/off preference',
  'prism:reached25': 'has reached THE 25th STAR (enables "Skip to THE 25th STAR")',
  'prism:bouquet': 'the bouquet she created in the Garden',
  'prism:star-wish': 'her wish from "A Wish Upon a Star", for the Royal Seal certificate (session)',
  'prism:star-entrance:v1': 'THE 25th STAR one-time entrance already played',
  'prism:garden-secrets': 'legacy: removed Five Little Secrets progress (session)',
} as const;

/** The hidden entrance: https://…/princessday/?reset opens the reset dialog. */
export const RESET_PARAM = 'reset';

export function wantsReset(search: string): boolean {
  return new URLSearchParams(search).has(RESET_PARAM);
}

type StorageLike = Pick<Storage, 'length' | 'key' | 'removeItem'>;

function browserStorages(): StorageLike[] {
  const out: StorageLike[] = [];
  for (const name of ['localStorage', 'sessionStorage'] as const) {
    try {
      if (typeof window !== 'undefined' && window[name]) out.push(window[name]);
    } catch {
      /* blocked storage: nothing stored there either */
    }
  }
  return out;
}

function prismKeys(s: StorageLike): string[] {
  const keys: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const k = s.key(i);
    if (k && k.startsWith(PRISM_KEY_PREFIX)) keys.push(k);
  }
  return keys;
}

/** Every "prism:" key currently present in the given storages. */
export function visitorKeys(storages: StorageLike[] = browserStorages()): string[] {
  return storages.flatMap((s) => {
    try {
      return prismKeys(s);
    } catch {
      return [];
    }
  });
}

/** Removes every "prism:" key from local and session storage. Returns the removed keys. */
export function clearVisitorProgress(storages: StorageLike[] = browserStorages()): string[] {
  const removed: string[] = [];
  for (const s of storages) {
    try {
      for (const k of prismKeys(s)) {
        s.removeItem(k);
        removed.push(k);
      }
    } catch {
      /* ignore */
    }
  }
  return removed;
}

/** The very beginning of the experience (no ?stage, no ?reset, no #hash). */
export function startUrl(): string {
  return typeof window === 'undefined' ? '/' : window.location.pathname;
}
