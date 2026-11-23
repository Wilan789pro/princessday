/**
 * Browser side of "A Wish Upon a Star" → THE ROYAL WISH VAULT.
 * - Validates and catches the wealth joke locally (never sent anywhere).
 * - No backend connected (endpoint null): nothing is sent; reported as an error.
 * - With a backend: POSTs the wish. 'accepted' is only returned after the
 *   server confirmed it was stored. Any failure is an error, never a success.
 * - Nothing about the wish is kept in the browser.
 */
import { isWealthWish, validateWish } from '../../shared/wishRules.js';

export type WishResult = { kind: 'accepted' } | { kind: 'wealth' } | { kind: 'error'; error: string };

export type WishDelivery = 'vault' | 'unavailable' | 'not-connected' | 'unknown';

interface Options {
  /** Full URL of the wish endpoint, or null when no backend is connected. */
  endpoint: string | null;
  composeMs: number;
  honeypot: string;
  fetchImpl?: typeof fetch;
}

export async function submitWish(text: string, { endpoint, composeMs, honeypot, fetchImpl = fetch }: Options): Promise<WishResult> {
  const v = validateWish(text);
  if (!v.ok) return { kind: 'error', error: v.error };
  if (isWealthWish(v.value)) return { kind: 'wealth' };

  if (!endpoint) return { kind: 'error', error: 'not-connected' };

  try {
    const res = await fetchImpl(endpoint, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wish: v.value, website: honeypot, composeMs }),
    });
    const data = await res.json().catch(() => null);
    if (data?.status === 'rejected' && data.reason === 'wealth') return { kind: 'wealth' };
    if (res.ok && data?.status === 'accepted' && data.delivery === 'vault') return { kind: 'accepted' };
    return { kind: 'error', error: typeof data?.error === 'string' ? data.error : 'generic' };
  } catch {
    return { kind: 'error', error: 'network' };
  }
}

/** Delivery status for the disclosure text. Without a backend nothing is asked. */
export async function wishDeliveryMode(endpoint: string | null, fetchImpl: typeof fetch = fetch): Promise<WishDelivery> {
  if (!endpoint) return 'not-connected';
  try {
    const r = await fetchImpl(endpoint, { cache: 'no-store', mode: 'cors', credentials: 'omit' });
    const d = r.ok ? await r.json() : null;
    return d?.delivery === 'vault' || d?.delivery === 'unavailable' ? d.delivery : 'unknown';
  } catch {
    return 'unknown';
  }
}
