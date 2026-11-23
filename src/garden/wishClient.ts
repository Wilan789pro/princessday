/**
 * Browser side of "A Wish Upon a Star".
 * - Validates and catches the wealth joke locally (never sent anywhere).
 * - With a server: POSTs to /api/wish (which runs in dry-run until configured).
 * - On static hosting: no network at all; the wish is checked and discarded,
 *   and the result says so ("dry-run") – never a claim that it was delivered.
 */
import { isWealthWish, validateWish } from '../../shared/wishRules.js';

export type WishResult =
  | { kind: 'accepted'; delivery: 'email' | 'dry-run' }
  | { kind: 'wealth' }
  | { kind: 'error'; error: string };

interface Options {
  staticHosting: boolean;
  composeMs: number;
  honeypot: string;
  fetchImpl?: typeof fetch;
}

export async function submitWish(text: string, { staticHosting, composeMs, honeypot, fetchImpl = fetch }: Options): Promise<WishResult> {
  const v = validateWish(text);
  if (!v.ok) return { kind: 'error', error: v.error };
  if (isWealthWish(v.value)) return { kind: 'wealth' };

  if (staticHosting) return { kind: 'accepted', delivery: 'dry-run' };

  try {
    const res = await fetchImpl('/api/wish', {
      method: 'POST',
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

/** Delivery mode for the disclosure text. Static hosting never asks a server. */
export async function wishDeliveryMode(staticHosting: boolean, fetchImpl: typeof fetch = fetch): Promise<'email' | 'dry-run' | 'unknown'> {
  if (staticHosting) return 'dry-run';
  try {
    const r = await fetchImpl('/api/wish', { cache: 'no-store' });
    const d = r.ok ? await r.json() : null;
    return d?.delivery === 'email' || d?.delivery === 'dry-run' ? d.delivery : 'unknown';
  } catch {
    return 'unknown';
  }
}
