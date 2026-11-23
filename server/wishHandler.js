/**
 * /api/wish – server side of "A Wish Upon a Star".
 *
 * DESTINATION: THE ROYAL WISH VAULT – wishes are stored persistently
 * (server/wishStore.js) and only the owner can read them (/api/vault).
 * There is no public way to read wishes back, and no email is sent.
 *
 * SUCCESS IS ONLY REPORTED AFTER STORAGE CONFIRMS THE WRITE. Without
 * configured storage the wish is refused (503), never "accepted".
 *
 * PRIVACY: only the wish text and its time are stored – no IP, no device
 * data. Wish text is never logged and never echoed back. Rate-limit counters
 * use a short hash of the IP and expire on their own.
 *
 * The wealth wish (a joke) is caught in the browser before sending; this
 * server check is the backstop – such wishes are never stored.
 */
import { isWealthWish, validateWish } from '../shared/wishRules.js';
import { ipKey, originGate, parseJson, preflight, reply } from './http.js';

export { MAX_BODY_BYTES, readRawBody, clientIp, allowedOrigins } from './http.js';

const PER_IP_LIMIT = 5; // per hour
const GLOBAL_DAILY_LIMIT = 40;
const MIN_COMPOSE_MS = 1200; // humans take longer than this to write a wish

/**
 * @param {{ env?: Record<string,string|undefined>, store: ReturnType<import('./wishStore.js').createMemoryStore> | null, now?: () => number }} deps
 */
export function createWishHandler({ env = process.env, store, now = Date.now }) {
  if (!store) console.warn('[wish] no persistent storage configured – wishes will be refused until it is.');

  /**
   * @param {{ method: string, headers: Record<string,string|undefined>, rawBody: string | null, ip: string }} req
   *   rawBody === null means the body exceeded the size limit while being read.
   */
  return async function handleWish({ method, headers, rawBody, ip }) {
    const gate = originGate(env, headers);
    if (gate.refused) return gate.refused;
    const answer = (status, body) => reply(status, body, gate.cors);

    if (method === 'OPTIONS') return preflight(gate.cors);
    // Public status only – there is deliberately no way to read wishes here.
    if (method === 'GET') return answer(200, { delivery: store ? 'vault' : 'unavailable' });
    if (method !== 'POST') return answer(405, { status: 'error', error: 'method-not-allowed' });

    const parsed = parseJson(headers, rawBody);
    if (parsed.error) return answer(parsed.status, { status: 'error', error: parsed.error });
    const body = parsed.body;

    // Honeypot field (invisible to humans) and a minimum compose time.
    if (body.website || typeof body.composeMs !== 'number' || body.composeMs < MIN_COMPOSE_MS) {
      return answer(400, { status: 'error', error: 'rejected' });
    }

    const v = validateWish(body.wish);
    if (!v.ok) return answer(400, { status: 'error', error: v.error });

    // The joke wish: never stored, never logged.
    if (isWealthWish(v.value)) return answer(200, { status: 'rejected', reason: 'wealth' });

    if (!store) return answer(503, { status: 'error', error: 'storage-unavailable' });

    try {
      const day = new Date(now()).toISOString().slice(0, 10);
      const [mine, everyone] = await Promise.all([store.hit(`wish:ip:${ipKey(ip)}`, 3600), store.hit(`wish:day:${day}`, 86400)]);
      if (mine > PER_IP_LIMIT || everyone > GLOBAL_DAILY_LIMIT) return answer(429, { status: 'error', error: 'rate-limited' });

      await store.addWish({ text: v.value, createdAt: now() });
      return answer(200, { status: 'accepted', delivery: 'vault' });
    } catch {
      // Deliberately no details: nothing about the wish reaches the logs.
      console.error('[wish] storage failed');
      return answer(503, { status: 'error', error: 'storage-failed' });
    }
  };
}
