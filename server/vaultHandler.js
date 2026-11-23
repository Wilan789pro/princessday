/**
 * /api/vault – THE ROYAL WISH VAULT (owner only).
 *
 * Every request is a POST with { action, ... }:
 *   login {code}            → { token }      (no token needed)
 *   list                    → { wishes }
 *   read {id}               → { wish }
 *   mark {id, read}         → { ok }
 *   delete {id}             → { ok }
 *   logout                  → { ok }         (revokes this session)
 *   reset-experience        → { epoch }      (visitor experience only – never wishes)
 *
 * ACCESS: the owner's code lives ONLY in the server environment variable
 * VAULT_ACCESS_CODE. A successful login returns a short-lived token signed with
 * HMAC (secret: VAULT_SESSION_SECRET, falling back to the access code). The
 * token is kept in page memory only, sent as "Authorization: Bearer …", and
 * revoked on logout. Five wrong codes per IP lock login for 15 minutes.
 * Wish text and codes are never logged.
 */
import { createHmac, randomUUID, timingSafeEqual, createHash } from 'node:crypto';
import { ipKey, originGate, parseJson, preflight, reply } from './http.js';
import { isWishId } from './wishStore.js';

export const SESSION_TTL_SEC = 2 * 60 * 60;
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_SEC = 15 * 60;

const b64 = (buf) => Buffer.from(buf).toString('base64url');
const sign = (secret, payload) => createHmac('sha256', secret).update(payload).digest('base64url');
const sameSecret = (a, b) => {
  // Compare digests so length differences leak nothing and timing is constant.
  const da = createHash('sha256').update(String(a)).digest();
  const db = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(da, db);
};

export function issueToken(secret, now, ttlSec = SESSION_TTL_SEC) {
  const payload = b64(JSON.stringify({ jti: randomUUID(), exp: now + ttlSec * 1000 }));
  return `${payload}.${sign(secret, payload)}`;
}

/** Returns the token's claims if the signature is valid and it has not expired; otherwise null. */
export function verifyToken(secret, token, now) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = sign(secret, payload);
  if (!sig || sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof claims.jti !== 'string' || typeof claims.exp !== 'number' || claims.exp <= now) return null;
    return claims;
  } catch {
    return null;
  }
}

export function createVaultHandler({ env = process.env, store, now = Date.now }) {
  const code = env.VAULT_ACCESS_CODE || '';
  const secret = env.VAULT_SESSION_SECRET || code;
  if (!code) console.warn('[vault] VAULT_ACCESS_CODE is not set – the Royal Wish Vault cannot be opened.');
  if (!store) console.warn('[vault] no persistent storage configured.');

  const corsOptions = { methods: 'POST, OPTIONS', headers: 'Content-Type, Authorization' };

  return async function handleVault({ method, headers, rawBody, ip }) {
    const gate = originGate(env, headers, corsOptions);
    if (gate.refused) return gate.refused;
    const answer = (status, body) => reply(status, body, gate.cors);

    if (method === 'OPTIONS') return preflight(gate.cors);
    if (method !== 'POST') return answer(405, { status: 'error', error: 'method-not-allowed' });
    if (!code) return answer(503, { status: 'error', error: 'vault-not-configured' });
    if (!store) return answer(503, { status: 'error', error: 'storage-unavailable' });

    const parsed = parseJson(headers, rawBody);
    if (parsed.error) return answer(parsed.status, { status: 'error', error: parsed.error });
    const { action } = parsed.body;

    try {
      // ---------------------------------------------------------------- login
      if (action === 'login') {
        const failKey = `vault:fail:${ipKey(ip)}`;
        const attempt = parsed.body.code;
        if (typeof attempt !== 'string' || attempt.length === 0 || attempt.length > 200) {
          return answer(400, { status: 'error', error: 'bad-request' });
        }
        // Locked out after too many wrong codes (checked before comparing, read-only).
        if ((await store.count(failKey)) >= MAX_FAILED_LOGINS) return answer(429, { status: 'error', error: 'locked' });
        if (!sameSecret(attempt, code)) {
          await store.hit(failKey, LOCKOUT_SEC); // only wrong codes count
          return answer(401, { status: 'error', error: 'wrong-code' });
        }
        return answer(200, { status: 'ok', token: issueToken(secret, now()), expiresInSec: SESSION_TTL_SEC });
      }

      // ---------------------------------------------------------------- everything else needs a session
      const bearer = (headers.authorization ?? '').replace(/^Bearer\s+/i, '');
      const claims = verifyToken(secret, bearer, now());
      if (!claims || (await store.isRevoked(claims.jti))) return answer(401, { status: 'error', error: 'unauthorised' });

      const needId = () => (isWishId(parsed.body.id) ? parsed.body.id : null);

      switch (action) {
        case 'list':
          return answer(200, { status: 'ok', wishes: await store.listWishes() });
        case 'read': {
          const id = needId();
          if (!id) return answer(400, { status: 'error', error: 'bad-request' });
          const wish = await store.getWish(id);
          return wish ? answer(200, { status: 'ok', wish }) : answer(404, { status: 'error', error: 'not-found' });
        }
        case 'mark': {
          const id = needId();
          if (!id || typeof parsed.body.read !== 'boolean') return answer(400, { status: 'error', error: 'bad-request' });
          return (await store.markWish(id, parsed.body.read)) ? answer(200, { status: 'ok' }) : answer(404, { status: 'error', error: 'not-found' });
        }
        case 'delete': {
          const id = needId();
          if (!id) return answer(400, { status: 'error', error: 'bad-request' });
          return (await store.deleteWish(id)) ? answer(200, { status: 'ok' }) : answer(404, { status: 'error', error: 'not-found' });
        }
        case 'logout':
          await store.revoke(claims.jti, Math.max(1, (claims.exp - now()) / 1000));
          return answer(200, { status: 'ok' });
        case 'reset-experience':
          // Visitor experience ONLY. Wishes, read states, codes and settings are untouched.
          return answer(200, { status: 'ok', epoch: await store.bumpEpoch() });
        default:
          return answer(400, { status: 'error', error: 'bad-request' });
      }
    } catch {
      console.error('[vault] storage failed');
      return answer(503, { status: 'error', error: 'storage-failed' });
    }
  };
}
