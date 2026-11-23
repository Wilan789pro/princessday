import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFakeUpstash } from './__tests__/fakeUpstash.js';
import { allowedOrigins, createWishHandler, MAX_BODY_BYTES, readRawBody } from './wishHandler.js';
import { createMemoryStore, createRedisStore } from './wishStore.js';

const post = (body, extra = {}) => ({
  method: 'POST',
  headers: { 'content-type': 'application/json', ...(extra.headers ?? {}) },
  rawBody: typeof body === 'string' ? body : JSON.stringify(body),
  ip: extra.ip ?? '203.0.113.1',
});
const ok = (wish) => ({ wish, composeMs: 5000 });
const json = (r) => JSON.parse(r.body);
const quiet = () => ['log', 'info', 'warn', 'error', 'debug'].map((m) => vi.spyOn(console, m).mockImplementation(() => {}));

afterEach(() => vi.restoreAllMocks());

describe('submitting a wish to the Royal Wish Vault', () => {
  it('stores the wish exactly as written and only then reports success', async () => {
    const store = createMemoryStore();
    const wish = '  Spaces, émojis 💎 and\nnew lines stay intact  ';
    const r = await createWishHandler({ env: {}, store })(post(ok(wish)));
    expect(r.status).toBe(200);
    expect(json(r)).toEqual({ status: 'accepted', delivery: 'vault' });
    expect(r.body).not.toContain('Spaces');
    expect((await store.listWishes()).map((w) => w.text)).toEqual([wish]);
  });

  it('persists to the database (Redis) so the vault can read it later', async () => {
    const fake = createFakeUpstash();
    const store = createRedisStore({ url: 'https://x.upstash.io', token: 'test-token', fetchImpl: fake.fetchImpl });
    await createWishHandler({ env: {}, store })(post(ok('stored for real')));
    const fresh = createRedisStore({ url: 'https://x.upstash.io', token: 'test-token', fetchImpl: fake.fetchImpl });
    expect((await fresh.listWishes()).map((w) => w.text)).toEqual(['stored for real']);
  });

  it('refuses (503) instead of pretending when no storage is configured', async () => {
    quiet();
    const r = await createWishHandler({ env: {}, store: null })(post(ok('a wish')));
    expect(r.status).toBe(503);
    expect(json(r)).toEqual({ status: 'error', error: 'storage-unavailable' });
  });

  it('reports a storage failure as an error – never as success – and logs nothing of the wish', async () => {
    const spies = quiet();
    const store = createMemoryStore();
    store.addWish = () => Promise.reject(new Error('a very private wish 12345'));
    const r = await createWishHandler({ env: {}, store })(post(ok('a very private wish 12345')));
    expect(r.status).toBe(503);
    expect(json(r)).toEqual({ status: 'error', error: 'storage-failed' });
    for (const spy of spies) for (const call of spy.mock.calls) expect(JSON.stringify(call)).not.toContain('private wish');
  });
});

describe('no public wish retrieval', () => {
  it('GET reports only whether the vault is available – never any wishes', async () => {
    const store = createMemoryStore();
    await store.addWish({ text: 'secret wish text', createdAt: 1 });
    const r = await createWishHandler({ env: {}, store })({ method: 'GET', headers: {}, rawBody: '', ip: 'x' });
    expect(json(r)).toEqual({ delivery: 'vault' });
    expect(r.body).not.toContain('secret');
    quiet();
    expect(json(await createWishHandler({ env: {}, store: null })({ method: 'GET', headers: {}, rawBody: '', ip: 'x' }))).toEqual({ delivery: 'unavailable' });
  });
  it('other methods are refused', async () => {
    const h = createWishHandler({ env: {}, store: createMemoryStore() });
    for (const method of ['DELETE', 'PUT', 'PATCH']) expect((await h({ method, headers: {}, rawBody: '', ip: 'x' })).status).toBe(405);
  });
});

describe('wealth wish backstop', () => {
  it('is answered with the joke and never stored', async () => {
    const store = createMemoryStore();
    const r = await createWishHandler({ env: {}, store })(post(ok('I want to be a billionaire')));
    expect(json(r)).toEqual({ status: 'rejected', reason: 'wealth' });
    expect(await store.listWishes()).toEqual([]);
  });
});

describe('invalid input is refused and nothing is stored', () => {
  const run = async (req) => {
    const store = createMemoryStore();
    const r = await createWishHandler({ env: {}, store })(req);
    expect(await store.listWishes()).toEqual([]);
    return r;
  };
  it.each([
    ['empty', ok('   '), 'empty'],
    ['501 characters', ok('x'.repeat(501)), 'too-long'],
    ['not text', ok(123), 'not-text'],
    ['control characters', ok('hi\u0000'), 'invalid-characters'],
  ])('%s', async (_n, body, error) => {
    const r = await run(post(body));
    expect(r.status).toBe(400);
    expect(json(r).error).toBe(error);
  });
  it('accepts exactly 500 characters', async () => {
    const store = createMemoryStore();
    expect((await createWishHandler({ env: {}, store })(post(ok('x'.repeat(500))))).status).toBe(200);
  });
  it('malformed JSON, wrong content type, oversized bodies, honeypot and instant submissions', async () => {
    expect((await run(post('{nope'))).status).toBe(400);
    expect((await run({ ...post(ok('a')), headers: { 'content-type': 'text/plain' } })).status).toBe(415);
    expect((await run({ ...post(ok('a')), rawBody: null })).status).toBe(413);
    expect((await run(post(ok('a'), { headers: { 'content-length': String(MAX_BODY_BYTES + 1) } }))).status).toBe(413);
    expect((await run(post({ ...ok('a wish'), website: 'http://spam' }))).status).toBe(400);
    expect((await run(post({ wish: 'a wish', composeMs: 10 }))).status).toBe(400);
  });
});

describe('rate limiting (persistent counters, hashed IPs)', () => {
  it('limits one visitor to 5 wishes per hour; others are unaffected; resets after the hour', async () => {
    let t = Date.parse('2026-11-23T10:00:00Z');
    const store = createMemoryStore({ now: () => t });
    const h = createWishHandler({ env: {}, store, now: () => t });
    for (let i = 0; i < 5; i++) expect((await h(post(ok(`wish ${i}`)))).status).toBe(200);
    expect((await h(post(ok('one more')))).status).toBe(429);
    expect((await h(post(ok('other visitor'), { ip: '198.51.100.7' }))).status).toBe(200);
    t += 61 * 60 * 1000;
    expect((await h(post(ok('later')))).status).toBe(200);
  });
  it('caps the total at 40 wishes per day', async () => {
    const store = createMemoryStore();
    const h = createWishHandler({ env: {}, store });
    for (let i = 0; i < 40; i++) expect((await h(post(ok(`w${i}`), { ip: `10.0.0.${i}` }))).status).toBe(200);
    expect((await h(post(ok('w41'), { ip: '10.0.1.1' }))).status).toBe(429);
  });
  it('never stores raw IP addresses', async () => {
    const fake = createFakeUpstash();
    const store = createRedisStore({ url: 'https://x.upstash.io', token: 'test-token', fetchImpl: fake.fetchImpl });
    await createWishHandler({ env: {}, store })(post(ok('a wish'), { ip: '203.0.113.99' }));
    expect(JSON.stringify(fake.log)).not.toContain('203.0.113.99');
  });
});

describe('cross-origin (GitHub Pages → separately hosted API)', () => {
  const PAGES = 'https://wilan789pro.github.io';
  const env = { WISH_ALLOWED_ORIGINS: `${PAGES}, https://other.example/` };
  it('answers an allowed preflight with 204 and CORS headers, processing nothing', async () => {
    const store = createMemoryStore();
    const r = await createWishHandler({ env, store })({ method: 'OPTIONS', headers: { origin: PAGES }, rawBody: '', ip: 'x' });
    expect(r.status).toBe(204);
    expect(r.headers['Access-Control-Allow-Origin']).toBe(PAGES);
    expect(r.headers['Access-Control-Allow-Headers']).toContain('Content-Type');
    expect(await store.listWishes()).toEqual([]);
  });
  it('stores an allowed POST and keeps the CORS header on errors too', async () => {
    const store = createMemoryStore();
    const h = createWishHandler({ env, store });
    const good = await h(post(ok('from the garden'), { headers: { origin: PAGES } }));
    expect(good.headers['Access-Control-Allow-Origin']).toBe(PAGES);
    const bad = await h(post(ok('   '), { headers: { origin: PAGES } }));
    expect(bad.headers['Access-Control-Allow-Origin']).toBe(PAGES);
    expect(await store.listWishes()).toHaveLength(1);
  });
  it('refuses any other origin without CORS headers or storage', async () => {
    const store = createMemoryStore();
    const h = createWishHandler({ env, store });
    for (const method of ['OPTIONS', 'POST', 'GET']) {
      const r = await h({ ...post(ok('a wish')), method, headers: { 'content-type': 'application/json', origin: 'https://evil.example' } });
      expect(r.status).toBe(403);
      expect(r.headers['Access-Control-Allow-Origin']).toBeUndefined();
    }
    expect(await store.listWishes()).toEqual([]);
  });
  it('parses the allow-list tolerantly', () => {
    expect(allowedOrigins({ WISH_ALLOWED_ORIGINS: ' https://a.example/ ,, https://b.example ' })).toEqual(['https://a.example', 'https://b.example']);
  });
});

describe('readRawBody', () => {
  it('stops buffering past the limit', async () => {
    const stream = (chunks) => {
      const e = new EventEmitter();
      queueMicrotask(() => {
        for (const c of chunks) e.emit('data', Buffer.from(c));
        e.emit('end');
      });
      return e;
    };
    expect(await readRawBody(stream(['{"wish":', '"hi"}']))).toBe('{"wish":"hi"}');
    expect(await readRawBody(stream(['x'.repeat(MAX_BODY_BYTES), 'y']))).toBeNull();
    expect(await readRawBody({ body: 'x'.repeat(MAX_BODY_BYTES + 5) })).toBeNull();
    expect(await readRawBody({ body: { wish: 'hi' } })).toBe('{"wish":"hi"}');
  });
});
