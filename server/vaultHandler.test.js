import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFakeUpstash } from './__tests__/fakeUpstash.js';
import { createExperienceHandler } from './experienceHandler.js';
import { SESSION_TTL_SEC, createVaultHandler, issueToken, verifyToken } from './vaultHandler.js';
import { createWishHandler } from './wishHandler.js';
import { KEYS, createMemoryStore, createRedisStore } from './wishStore.js';

const CODE = 'test-access-code-7429';
const ENV = { VAULT_ACCESS_CODE: CODE, VAULT_SESSION_SECRET: 'test-session-secret' };

const call = (h, action, extra = {}, token = null, ip = '203.0.113.5') =>
  h({
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    rawBody: JSON.stringify({ action, ...extra }),
    ip,
  });
const json = (r) => JSON.parse(r.body);

async function setup({ env = ENV, now } = {}) {
  const store = createMemoryStore(now ? { now } : {});
  const vault = createVaultHandler({ env, store, ...(now ? { now } : {}) });
  const wishes = createWishHandler({ env, store, ...(now ? { now } : {}) });
  for (const text of ['To see the northern lights', 'A cup of tea that never cools']) {
    await wishes({ method: 'POST', headers: { 'content-type': 'application/json' }, rawBody: JSON.stringify({ wish: text, composeMs: 4000 }), ip: 'v' });
  }
  return { store, vault };
}
const login = async (vault) => json(await call(vault, 'login', { code: CODE })).token;

afterEach(() => vi.restoreAllMocks());

describe('Royal Wish Vault – access', () => {
  it('rejects an incorrect access code', async () => {
    const { vault } = await setup();
    const r = await call(vault, 'login', { code: 'wrong' });
    expect(r.status).toBe(401);
    expect(json(r)).toEqual({ status: 'error', error: 'wrong-code' });
    expect(r.body).not.toContain(CODE);
  });

  it('accepts the correct code and returns a session token (not the code)', async () => {
    const { vault } = await setup();
    const r = await call(vault, 'login', { code: CODE });
    expect(r.status).toBe(200);
    const body = json(r);
    expect(typeof body.token).toBe('string');
    expect(body.expiresInSec).toBe(SESSION_TTL_SEC);
    expect(r.body).not.toContain(CODE);
  });

  it('rejects every action without a valid session', async () => {
    const { vault, store } = await setup();
    const id = (await store.listWishes())[0].id;
    for (const [action, extra] of [['list', {}], ['read', { id }], ['mark', { id, read: true }], ['delete', { id }], ['logout', {}], ['reset-experience', {}]]) {
      expect((await call(vault, action, extra)).status, action).toBe(401);
      expect((await call(vault, action, extra, 'forged.token')).status, action).toBe(401);
    }
    expect(await store.listWishes()).toHaveLength(2);
    expect(await store.getEpoch()).toBeNull();
  });

  it('rejects tampered and expired tokens', () => {
    const t = issueToken('s', 1000, 60);
    expect(verifyToken('s', t, 2000)).toBeTruthy();
    expect(verifyToken('other-secret', t, 2000)).toBeNull();
    expect(verifyToken('s', t.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A')), 2000)).toBeNull();
    expect(verifyToken('s', t, 1000 + 61_000)).toBeNull();
  });

  it('locks login after 5 wrong codes for that visitor, without counting correct logins', async () => {
    const { vault } = await setup();
    for (let i = 0; i < 8; i++) expect((await call(vault, 'login', { code: CODE }, null, '198.51.100.1')).status).toBe(200);
    for (let i = 0; i < 5; i++) expect((await call(vault, 'login', { code: `nope-${i}` })).status).toBe(401);
    expect((await call(vault, 'login', { code: 'again' })).status).toBe(429);
    expect((await call(vault, 'login', { code: CODE })).status).toBe(429); // even the right code, while locked
    expect((await call(vault, 'login', { code: CODE }, null, '198.51.100.9')).status).toBe(200); // other visitors unaffected
  });

  it('refuses to open when no access code is configured', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { vault } = await setup({ env: {} });
    const r = await call(vault, 'login', { code: '' });
    expect(r.status).toBe(503);
    expect(json(r).error).toBe('vault-not-configured');
  });

  it('logging out revokes the session', async () => {
    const { vault } = await setup();
    const token = await login(vault);
    expect((await call(vault, 'list', {}, token)).status).toBe(200);
    expect((await call(vault, 'logout', {}, token)).status).toBe(200);
    expect((await call(vault, 'list', {}, token)).status).toBe(401);
  });
});

describe('Royal Wish Vault – inbox', () => {
  it('lists wishes newest first with time and unread state; reads one; marks read/unread; deletes', async () => {
    const { vault } = await setup();
    const token = await login(vault);
    const list = json(await call(vault, 'list', {}, token)).wishes;
    expect(list).toHaveLength(2);
    expect(list.every((w) => w.read === false && typeof w.createdAt === 'number')).toBe(true);
    const [first] = list;
    expect(json(await call(vault, 'read', { id: first.id }, token)).wish.text).toBe(first.text);
    expect((await call(vault, 'mark', { id: first.id, read: true }, token)).status).toBe(200);
    expect(json(await call(vault, 'read', { id: first.id }, token)).wish.read).toBe(true);
    expect((await call(vault, 'mark', { id: first.id, read: false }, token)).status).toBe(200);
    expect(json(await call(vault, 'read', { id: first.id }, token)).wish.read).toBe(false);
    expect((await call(vault, 'delete', { id: first.id }, token)).status).toBe(200);
    expect(json(await call(vault, 'list', {}, token)).wishes.map((w) => w.id)).not.toContain(first.id);
    expect((await call(vault, 'read', { id: first.id }, token)).status).toBe(404);
  });

  it('validates ids and actions', async () => {
    const { vault } = await setup();
    const token = await login(vault);
    expect((await call(vault, 'read', { id: '../../etc' }, token)).status).toBe(400);
    expect((await call(vault, 'mark', { id: '00000000-0000-4000-8000-000000000000', read: 'yes' }, token)).status).toBe(400);
    expect((await call(vault, 'explode', {}, token)).status).toBe(400);
    expect((await call(vault, 'delete', { id: '00000000-0000-4000-8000-000000000000' }, token)).status).toBe(404);
  });
});

describe('RESET ENTIRE EXPERIENCE – never touches the wishes', () => {
  it('changes only the experience epoch: wishes, contents and read states survive; credentials and settings unchanged', async () => {
    const env = { ...ENV };
    const envSnapshot = JSON.stringify(env);
    const { vault, store } = await setup({ env });
    const token = await login(vault);
    const [a] = json(await call(vault, 'list', {}, token)).wishes;
    await call(vault, 'mark', { id: a.id, read: true }, token);
    const before = await store.listWishes();

    const experience = createExperienceHandler({ env, store });
    const epochBefore = json(await experience({ method: 'GET', headers: {} })).epoch;
    const r = await call(vault, 'reset-experience', {}, token);
    expect(r.status).toBe(200);
    const { epoch } = json(r);
    expect(epoch).toBeTruthy();
    expect(epoch).not.toBe(epochBefore);
    expect(json(await experience({ method: 'GET', headers: {} })).epoch).toBe(epoch);

    expect(await store.listWishes()).toEqual(before); // same wishes, same text, same read flags
    expect(JSON.stringify(env)).toBe(envSnapshot); // access code & settings untouched
    expect((await call(vault, 'login', { code: CODE })).status).toBe(200); // same code still works
  });

  it('on the real database, the reset writes a single key and no wish key', async () => {
    const fake = createFakeUpstash();
    const store = createRedisStore({ url: 'https://x.upstash.io', token: 'test-token', fetchImpl: fake.fetchImpl });
    const vault = createVaultHandler({ env: ENV, store });
    await store.addWish({ text: 'keep me', createdAt: 1 });
    const token = await login(vault);
    const wishKeysBefore = fake.keys().filter((k) => k.startsWith('prism:vault:wish:') || k === KEYS.index);
    fake.log.length = 0;
    await call(vault, 'reset-experience', {}, token);
    const writes = fake.log.filter(([op]) => !['GET', 'EXISTS', 'HGETALL', 'ZRANGE'].includes(op));
    expect(writes).toEqual([['SET', KEYS.epoch, expect.any(String)]]);
    expect(fake.keys().filter((k) => k.startsWith('prism:vault:wish:') || k === KEYS.index)).toEqual(wishKeysBefore);
    expect((await store.listWishes()).map((w) => w.text)).toEqual(['keep me']);
  });
});

describe('vault cross-origin', () => {
  it('allows the Authorization header for allowed origins and refuses others', async () => {
    const env = { ...ENV, WISH_ALLOWED_ORIGINS: 'https://wilan789pro.github.io' };
    const { vault } = await setup({ env });
    const pre = await vault({ method: 'OPTIONS', headers: { origin: 'https://wilan789pro.github.io' }, rawBody: '', ip: 'x' });
    expect(pre.status).toBe(204);
    expect(pre.headers['Access-Control-Allow-Headers']).toContain('Authorization');
    const evil = await vault({ method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, rawBody: '{"action":"login","code":"x"}', ip: 'x' });
    expect(evil.status).toBe(403);
  });
});
