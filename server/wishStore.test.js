import { describe, expect, it } from 'vitest';
import { createFakeUpstash } from './__tests__/fakeUpstash.js';
import { KEYS, createMemoryStore, createRedisStore, getStore, isWishId } from './wishStore.js';

const redis = (fake, now) => createRedisStore({ url: 'https://example.upstash.io/', token: 'test-token', fetchImpl: fake.fetchImpl, now });

for (const kind of ['memory', 'redis']) {
  describe(`wish store (${kind})`, () => {
    const make = (now = () => Date.now()) => {
      if (kind === 'memory') return { store: createMemoryStore({ now }) };
      const fake = createFakeUpstash({ now });
      return { store: redis(fake, now), fake };
    };

    it('adds, lists newest first, reads, marks and deletes wishes', async () => {
      const { store } = make();
      const a = await store.addWish({ text: 'first wish', createdAt: 1000 });
      const b = await store.addWish({ text: 'second wish 💎\nwith a new line', createdAt: 2000 });
      expect(isWishId(a.id) && isWishId(b.id)).toBe(true);
      const list = await store.listWishes();
      expect(list.map((w) => w.text)).toEqual(['second wish 💎\nwith a new line', 'first wish']);
      expect(list.every((w) => w.read === false)).toBe(true);
      expect(await store.getWish(a.id)).toEqual({ id: a.id, text: 'first wish', createdAt: 1000, read: false });
      expect(await store.markWish(a.id, true)).toBe(true);
      expect((await store.getWish(a.id)).read).toBe(true);
      expect(await store.markWish(a.id, false)).toBe(true);
      expect((await store.getWish(a.id)).read).toBe(false);
      expect(await store.deleteWish(b.id)).toBe(true);
      expect((await store.listWishes()).map((w) => w.id)).toEqual([a.id]);
      expect(await store.deleteWish(b.id)).toBe(false);
      expect(await store.markWish(b.id, true)).toBe(false);
      expect(await store.getWish(b.id)).toBeNull();
    });

    it('stores only the wish text, its time and its read state', async () => {
      const { store } = make();
      const { id } = await store.addWish({ text: 'private', createdAt: 5 });
      expect(Object.keys(await store.getWish(id)).sort()).toEqual(['createdAt', 'id', 'read', 'text']);
    });

    it('bumps the experience epoch without touching any wish or read state', async () => {
      const { store, fake } = make();
      const { id } = await store.addWish({ text: 'keep me', createdAt: 10 });
      await store.markWish(id, true);
      const before = await store.listWishes();
      expect(await store.getEpoch()).toBeNull();
      if (fake) fake.log.length = 0;
      const e1 = await store.bumpEpoch();
      const e2 = await store.bumpEpoch();
      expect(e1).not.toBe(e2);
      expect(await store.getEpoch()).toBe(e2);
      // Every command issued while resetting touched only the experience key, and the only write was SET.
      if (fake) {
        expect(fake.log.length).toBeGreaterThan(0);
        expect(fake.log.every(([, key]) => key === KEYS.epoch)).toBe(true);
        expect(fake.log.filter(([op]) => op !== 'GET').every(([op]) => op === 'SET')).toBe(true);
      }
      expect(await store.listWishes()).toEqual(before);
    });

    it('counts and expires rate-limit hits; revokes sessions until they expire', async () => {
      let t = 1_000_000;
      const { store } = make(() => t);
      expect(await store.count('x')).toBe(0);
      expect(await store.hit('x', 60)).toBe(1);
      expect(await store.hit('x', 60)).toBe(2);
      expect(await store.count('x')).toBe(2);
      t += 61_000;
      expect(await store.count('x')).toBe(0);
      expect(await store.hit('x', 60)).toBe(1);
      await store.revoke('jti-1', 30);
      expect(await store.isRevoked('jti-1')).toBe(true);
      expect(await store.isRevoked('jti-2')).toBe(false);
      t += 31_000;
      expect(await store.isRevoked('jti-1')).toBe(false);
    });
  });
}

describe('persistence and failures (Redis store)', () => {
  it('data written by one instance is read by a fresh instance (shared database)', async () => {
    const fake = createFakeUpstash();
    await redis(fake).addWish({ text: 'survives cold starts', createdAt: 1 });
    expect((await redis(fake).listWishes()).map((w) => w.text)).toEqual(['survives cold starts']);
  });

  it('throws when storage fails, so a wish is never reported as saved', async () => {
    const fake = createFakeUpstash({ failOn: (op) => op === 'ZADD' });
    await expect(redis(fake).addWish({ text: 'x', createdAt: 1 })).rejects.toThrow();
    const bad = createRedisStore({ url: 'https://example.upstash.io', token: 'wrong', fetchImpl: fake.fetchImpl });
    await expect(bad.listWishes()).rejects.toThrow();
  });
});

describe('store selection', () => {
  it('uses Redis when configured (Upstash or Vercel KV variable names)', () => {
    expect(getStore({ UPSTASH_REDIS_REST_URL: 'https://a', UPSTASH_REDIS_REST_TOKEN: 't' })?.kind).toBe('redis');
    expect(getStore({ KV_REST_API_URL: 'https://a', KV_REST_API_TOKEN: 't' })?.kind).toBe('redis');
  });
  it('never falls back to memory in production', () => {
    expect(getStore({})).toBeNull();
    expect(getStore({ UPSTASH_REDIS_REST_URL: 'https://a' })).toBeNull();
    expect(getStore({}, { allowMemory: true })?.kind).toBe('memory');
  });
});
