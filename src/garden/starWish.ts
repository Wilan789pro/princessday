/**
 * "A Wish Upon a Star" → THE ROYAL SEAL.
 * Her wish never leaves the device: it is validated here, kept for the current
 * visit (sessionStorage, so it survives a reload of the tab) and written onto
 * her certificate. The wealth joke is caught and never kept.
 */
import { isWealthWish, validateWish } from '../../shared/wishRules.js';

export const STAR_WISH_KEY = 'prism:star-wish';

export type WishResult = { kind: 'accepted'; wish: string } | { kind: 'wealth' } | { kind: 'error'; error: string };

/** Checks a wish. Nothing is sent anywhere. */
export function makeWish(text: string): WishResult {
  const v = validateWish(text);
  if (!v.ok) return { kind: 'error', error: v.error };
  if (isWealthWish(v.value)) return { kind: 'wealth' };
  return { kind: 'accepted', wish: v.value.trim() };
}

type WishStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function session(): WishStorage | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

/** The wish kept for this visit, if any (re-validated, so it is always printable). */
export function loadStarWish(storage: WishStorage | null = session()): string | null {
  try {
    const raw = storage?.getItem(STAR_WISH_KEY);
    if (!raw) return null;
    const r = makeWish(raw);
    return r.kind === 'accepted' ? r.wish : null;
  } catch {
    return null;
  }
}

/** Keeps (or, with null, forgets) the wish for this visit. */
export function saveStarWish(wish: string | null, storage: WishStorage | null = session()): void {
  try {
    if (wish) storage?.setItem(STAR_WISH_KEY, wish);
    else storage?.removeItem(STAR_WISH_KEY);
  } catch {
    /* storage blocked: the wish still lives in memory for this page */
  }
}
