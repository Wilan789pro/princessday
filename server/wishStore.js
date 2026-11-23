/**
 * PERSISTENT STORAGE for the Royal Wish Vault and the experience-reset marker.
 *
 * Production: Upstash Redis over its REST API (no SDK needed). Works with the
 * variables Upstash gives you (UPSTASH_REDIS_REST_URL / _TOKEN) and with the
 * ones Vercel's Upstash/KV integration injects (KV_REST_API_URL / _TOKEN).
 * Development and tests: an in-memory store with the same interface. It is
 * NEVER used in production – without real storage, wishes are refused rather
 * than "accepted" into memory that disappears.
 *
 * KEY LAYOUT (two separate worlds):
 *   prism:vault:wish:<id>      hash  text, createdAt, read      ← wishes
 *   prism:vault:index          zset  id scored by createdAt     ← wishes
 *   prism:vault:revoked:<jti>  string (TTL)                     ← logged-out sessions
 *   prism:vault:rl:<name>      counter (TTL)                    ← rate limits
 *   prism:experience:epoch     string                           ← visitor experience reset marker
 * Resetting the experience writes ONLY prism:experience:epoch.
 */
import { randomUUID } from 'node:crypto';

export const KEYS = {
  wish: (id) => `prism:vault:wish:${id}`,
  index: 'prism:vault:index',
  revoked: (jti) => `prism:vault:revoked:${jti}`,
  rate: (name) => `prism:vault:rl:${name}`,
  epoch: 'prism:experience:epoch',
};

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const isWishId = (id) => typeof id === 'string' && ID.test(id);

const newEpoch = (now) => `${now}-${randomUUID().slice(0, 8)}`;

// ------------------------------------------------------------------ memory (dev/tests only)
export function createMemoryStore({ now = Date.now } = {}) {
  const wishes = new Map(); // id -> { id, text, createdAt, read }
  const expiring = new Map(); // key -> { value, until }
  let epoch = null;

  const live = (key) => {
    const e = expiring.get(key);
    if (e && e.until <= now()) expiring.delete(key);
    return expiring.get(key);
  };

  return {
    kind: 'memory',
    async addWish({ text, createdAt }) {
      const id = randomUUID();
      wishes.set(id, { id, text, createdAt, read: false });
      return { id };
    },
    async listWishes() {
      return [...wishes.values()].sort((a, b) => b.createdAt - a.createdAt).map((w) => ({ ...w }));
    },
    async getWish(id) {
      const w = wishes.get(id);
      return w ? { ...w } : null;
    },
    async markWish(id, read) {
      const w = wishes.get(id);
      if (!w) return false;
      w.read = Boolean(read);
      return true;
    },
    async deleteWish(id) {
      return wishes.delete(id);
    },
    async getEpoch() {
      return epoch;
    },
    async bumpEpoch() {
      epoch = newEpoch(now());
      return epoch;
    },
    async revoke(jti, ttlSec) {
      expiring.set(KEYS.revoked(jti), { value: '1', until: now() + ttlSec * 1000 });
    },
    async isRevoked(jti) {
      return Boolean(live(KEYS.revoked(jti)));
    },
    /** Increments a counter that expires ttlSec after its first hit; returns the new count. */
    async hit(name, ttlSec) {
      const key = KEYS.rate(name);
      const cur = live(key);
      if (!cur) {
        expiring.set(key, { value: 1, until: now() + ttlSec * 1000 });
        return 1;
      }
      cur.value += 1;
      return cur.value;
    },
    /** Current value of a rate counter (0 when absent or expired). */
    async count(name) {
      return live(KEYS.rate(name))?.value ?? 0;
    },
    /** test helper: raw snapshot of everything stored */
    _dump: () => ({ wishes: [...wishes.values()].map((w) => ({ ...w })), epoch }),
  };
}

// ------------------------------------------------------------------ Upstash Redis (production)
export function createRedisStore({ url, token, fetchImpl = fetch, now = Date.now }) {
  const base = url.replace(/\/+$/, '');
  const call = async (path, body) => {
    const res = await fetchImpl(`${base}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`storage error (${res.status})`);
    return res.json();
  };
  const cmd = async (...args) => {
    const r = await call('', args);
    if (r && r.error) throw new Error('storage error');
    return r.result;
  };
  const pipeline = async (cmds) => {
    const r = await call('/pipeline', cmds);
    if (!Array.isArray(r) || r.some((x) => x && x.error)) throw new Error('storage error');
    return r.map((x) => x.result);
  };
  const toWish = (id, flat) => {
    if (!Array.isArray(flat) || flat.length === 0) return null;
    const h = {};
    for (let i = 0; i < flat.length; i += 2) h[flat[i]] = flat[i + 1];
    if (typeof h.text !== 'string') return null;
    return { id, text: h.text, createdAt: Number(h.createdAt), read: h.read === '1' };
  };

  return {
    kind: 'redis',
    async addWish({ text, createdAt }) {
      const id = randomUUID();
      // Both writes in one request; a failure throws so the caller never reports success.
      await pipeline([
        ['HSET', KEYS.wish(id), 'text', text, 'createdAt', String(createdAt), 'read', '0'],
        ['ZADD', KEYS.index, String(createdAt), id],
      ]);
      return { id };
    },
    async listWishes() {
      const ids = (await cmd('ZRANGE', KEYS.index, '0', '-1', 'REV')) ?? [];
      if (ids.length === 0) return [];
      const rows = await pipeline(ids.map((id) => ['HGETALL', KEYS.wish(id)]));
      return ids.map((id, i) => toWish(id, rows[i])).filter(Boolean);
    },
    async getWish(id) {
      return toWish(id, await cmd('HGETALL', KEYS.wish(id)));
    },
    async markWish(id, read) {
      const exists = await cmd('EXISTS', KEYS.wish(id));
      if (!exists) return false;
      await cmd('HSET', KEYS.wish(id), 'read', read ? '1' : '0');
      return true;
    },
    async deleteWish(id) {
      const [deleted] = await pipeline([['DEL', KEYS.wish(id)], ['ZREM', KEYS.index, id]]);
      return deleted > 0;
    },
    async getEpoch() {
      return (await cmd('GET', KEYS.epoch)) ?? null;
    },
    async bumpEpoch() {
      const e = newEpoch(now());
      await cmd('SET', KEYS.epoch, e);
      return e;
    },
    async revoke(jti, ttlSec) {
      await cmd('SET', KEYS.revoked(jti), '1', 'EX', String(Math.max(1, Math.ceil(ttlSec))));
    },
    async isRevoked(jti) {
      return (await cmd('EXISTS', KEYS.revoked(jti))) > 0;
    },
    async count(name) {
      return Number((await cmd('GET', KEYS.rate(name))) ?? 0);
    },
    async hit(name, ttlSec) {
      // Create the counter with its expiry only if missing, then increment (INCR keeps the TTL).
      const [, count] = await pipeline([
        ['SET', KEYS.rate(name), '0', 'EX', String(ttlSec), 'NX'],
        ['INCR', KEYS.rate(name)],
      ]);
      return Number(count);
    },
  };
}

// ------------------------------------------------------------------ selection
let devMemory = null;

/**
 * The store for this environment, or null when no persistent storage is
 * configured (callers must then refuse to accept wishes).
 * allowMemory is only ever true for the local development server.
 */
export function getStore(env, { allowMemory = false, fetchImpl } = {}) {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  if (url && token) return createRedisStore({ url, token, fetchImpl });
  if (allowMemory) return (devMemory ??= createMemoryStore());
  return null;
}
