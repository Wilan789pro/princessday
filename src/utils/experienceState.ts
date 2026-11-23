/**
 * VISITOR EXPERIENCE STATE
 *
 * Everything the site remembers about a visitor lives in this browser under
 * keys starting with "prism:" (see the inventory below). Nothing else is used:
 * no cookies, no IndexedDB. In-memory progress (crystals collected, glints
 * found, Garden chapter, dates/countdown phases, the chamber's state) is
 * rebuilt from scratch on every page load.
 *
 * RESET ENTIRE EXPERIENCE (owner, inside the Royal Wish Vault) changes a
 * server "experience epoch". Every browser compares it with the epoch it last
 * saw (EXPERIENCE_EPOCH_KEY) and, if it changed, clears all of its "prism:"
 * keys and restarts – so the reset reaches every device.
 * Wishes are never stored in the browser, so this can never touch them.
 */

export const PRISM_KEY_PREFIX = 'prism:';
export const EXPERIENCE_EPOCH_KEY = 'prism:experience-epoch';

/** Inventory of every persisted visitor key (kept in sync by a test that scans the source). */
export const KNOWN_VISITOR_KEYS = {
  'prism:sound': 'sound on/off preference',
  'prism:reached25': 'has reached THE 25th STAR (enables "Skip to THE 25th STAR")',
  'prism:bouquet': 'the bouquet she created in the Garden',
  'prism:star-entrance:v1': 'THE 25th STAR one-time entrance already played',
  'prism:garden-secrets': 'legacy: removed Five Little Secrets progress (session)',
  'prism:experience-epoch': 'last experience-reset marker this browser has seen',
} as const;

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

/** Every "prism:" key currently present in the given storages. */
export function visitorKeys(storages: StorageLike[] = browserStorages()): string[] {
  const out: string[] = [];
  for (const s of storages) {
    try {
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i);
        if (k && k.startsWith(PRISM_KEY_PREFIX)) out.push(k);
      }
    } catch {
      /* ignore */
    }
  }
  return out;
}

/** Keys that are preferences or bookkeeping rather than experience progress. */
const NOT_PROGRESS = new Set<string>(['prism:sound', EXPERIENCE_EPOCH_KEY]);

/** Removes every "prism:" key from local and session storage. Returns the removed keys. */
export function clearVisitorProgress(storages: StorageLike[] = browserStorages()): string[] {
  const removed: string[] = [];
  for (const s of storages) {
    try {
      const keys: string[] = [];
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i);
        if (k && k.startsWith(PRISM_KEY_PREFIX)) keys.push(k);
      }
      for (const k of keys) {
        s.removeItem(k);
        removed.push(k);
      }
    } catch {
      /* ignore */
    }
  }
  return removed;
}

export type EpochSync = 'not-connected' | 'unavailable' | 'first-visit' | 'same' | 'reset';

/**
 * Compares the server's experience epoch with this browser's.
 * 'reset' means local progress was just cleared and the page should restart.
 */
export async function syncExperienceEpoch({
  endpoint,
  fetchImpl = fetch,
  local = (() => {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  })(),
  storages,
}: {
  endpoint: string | null;
  fetchImpl?: typeof fetch;
  local?: Pick<Storage, 'getItem' | 'setItem'> | null;
  storages?: StorageLike[];
}): Promise<EpochSync> {
  if (!endpoint || !local) return 'not-connected';
  let epoch: unknown;
  try {
    const r = await fetchImpl(endpoint, { cache: 'no-store', mode: 'cors', credentials: 'omit' });
    if (!r.ok) return 'unavailable';
    epoch = (await r.json())?.epoch;
  } catch {
    return 'unavailable';
  }
  if (typeof epoch !== 'string' || !epoch) return 'unavailable'; // never reset → nothing to do
  let seen: string | null = null;
  try {
    seen = local.getItem(EXPERIENCE_EPOCH_KEY);
  } catch {
    return 'unavailable';
  }
  if (seen === epoch) return 'same';
  if (seen === null) {
    // First time this browser sees a marker. A genuinely new visitor has no
    // progress: just remember the marker (no reload). Progress saved before the
    // reset predates it, so that browser starts fresh as well.
    const hadProgress = visitorKeys(storages).some((k) => !NOT_PROGRESS.has(k));
    if (hadProgress) clearVisitorProgress(storages);
    try {
      local.setItem(EXPERIENCE_EPOCH_KEY, epoch);
    } catch {
      /* ignore */
    }
    return hadProgress ? 'reset' : 'first-visit';
  }
  clearVisitorProgress(storages);
  try {
    local.setItem(EXPERIENCE_EPOCH_KEY, epoch);
  } catch {
    /* ignore */
  }
  return 'reset';
}

/** The very beginning of the experience (no ?stage, no #hash). */
export function startUrl(): string {
  return typeof window === 'undefined' ? '/' : window.location.pathname;
}
