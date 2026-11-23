/**
 * Browser side of "A Wish Upon a Star".
 * - Validates and catches the wealth joke locally (never sent anywhere).
 * - No backend connected (endpoint null): nothing is sent, and the result says
 *   so ('not-connected') – never a claim that it was delivered.
 * - With a backend: POSTs to it. The server may answer 'dry-run' (reachable but
 *   email not configured) or 'email' (delivered to the provider).
 */
import { isWealthWish, validateWish } from '../../shared/wishRules.js';

export type WishResult =
  | { kind: 'accepted'; delivery: 'email' | 'dry-run' }
  | { kind: 'not-connected' }
  | { kind: 'wealth' }
  | { kind: 'error'; error: string };

export type WishDelivery = 'email' | 'dry-run' | 'not-connected' | 'unknown';

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

  if (!endpoint) return { kind: 'not-connected' };

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
    if (res.ok && data?.status === 'accepted') return { kind: 'accepted', delivery: data.delivery === 'email' ? 'email' : 'dry-run' };
    return { kind: 'error', error: typeof data?.error === 'string' ? data.error : 'generic' };
  } catch {
    return { kind: 'error', error: 'network' };
  }
}

/** Delivery mode for the disclosure text. Without a backend nothing is asked. */
export async function wishDeliveryMode(endpoint: string | null, fetchImpl: typeof fetch = fetch): Promise<WishDelivery> {
  if (!endpoint) return 'not-connected';
  try {
    const r = await fetchImpl(endpoint, { cache: 'no-store', mode: 'cors', credentials: 'omit' });
    const d = r.ok ? await r.json() : null;
    return d?.delivery === 'email' || d?.delivery === 'dry-run' ? d.delivery : 'unknown';
  } catch {
    return 'unknown';
  }
}
