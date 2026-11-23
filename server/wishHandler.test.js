import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { allowedOrigins, createWishHandler, MAX_BODY_BYTES, missingEmailSettings, readRawBody } from './wishHandler.js';

const CONFIGURED = { RESEND_API_KEY: 'test-key', WISH_TO_EMAIL: 'to@example.invalid', WISH_FROM_EMAIL: 'from@example.invalid' };

const post = (body, extra = {}) => ({
  method: 'POST',
  headers: { 'content-type': 'application/json', ...(extra.headers ?? {}) },
  rawBody: typeof body === 'string' ? body : JSON.stringify(body),
  ip: extra.ip ?? '203.0.113.1',
});

const ok = (wish) => ({ wish, composeMs: 5000 });
const json = (r) => JSON.parse(r.body);

afterEach(() => vi.restoreAllMocks());

describe('dry-run mode (no email configured)', () => {
  it('reports dry-run, never calls the sender and never echoes the wish', async () => {
    const send = vi.fn();
    const handle = createWishHandler({ env: {}, send });
    const wish = 'To see the aurora borealis';
    const r = await handle(post(ok(wish)));
    expect(r.status).toBe(200);
    expect(json(r)).toEqual({ status: 'accepted', delivery: 'dry-run' });
    expect(r.body).not.toContain(wish);
    expect(send).not.toHaveBeenCalled();
  });

  it('GET reports the delivery mode without secrets', async () => {
    expect(json(await createWishHandler({ env: {} })({ method: 'GET', headers: {}, rawBody: '', ip: 'x' }))).toEqual({
      delivery: 'dry-run',
    });
    const r = await createWishHandler({ env: CONFIGURED })({ method: 'GET', headers: {}, rawBody: '', ip: 'x' });
    expect(json(r)).toEqual({ delivery: 'email' });
    expect(r.body).not.toContain('test-key');
    expect(r.body).not.toContain('example.invalid');
  });

  it('does not log the wish anywhere', async () => {
    const spies = ['log', 'info', 'warn', 'error', 'debug'].map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    const wish = 'a very private wish 12345';
    await createWishHandler({ env: {} })(post(ok(wish)));
    await createWishHandler({ env: CONFIGURED, send: () => Promise.reject(new Error(wish)) })(post(ok(wish)));
    for (const spy of spies) {
      for (const call of spy.mock.calls) expect(JSON.stringify(call)).not.toContain(wish);
    }
  });
});

describe('configured delivery (sender is a test double – no network)', () => {
  it('passes the wish to the sender exactly as written', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const wish = '  Spaces, émojis 💎 and\nnew lines stay intact  ';
    const r = await createWishHandler({ env: CONFIGURED, send })(post(ok(wish)));
    expect(json(r)).toEqual({ status: 'accepted', delivery: 'email' });
    expect(send).toHaveBeenCalledWith({ apiKey: 'test-key', to: CONFIGURED.WISH_TO_EMAIL, from: CONFIGURED.WISH_FROM_EMAIL, text: wish });
  });

  it('reports a delivery failure honestly', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = await createWishHandler({ env: CONFIGURED, send: () => Promise.reject(new Error('x')) })(post(ok('a wish')));
    expect(r.status).toBe(502);
    expect(json(r).status).toBe('error');
  });
});

describe('wealth wish backstop', () => {
  it('is rejected as a joke and never delivered, even when email is configured', async () => {
    const send = vi.fn();
    const r = await createWishHandler({ env: CONFIGURED, send })(post(ok('I want to be a billionaire')));
    expect(json(r)).toEqual({ status: 'rejected', reason: 'wealth' });
    expect(send).not.toHaveBeenCalled();
  });
});

describe('invalid input', () => {
  const handle = () => createWishHandler({ env: CONFIGURED, send: vi.fn() });
  it.each([
    ['empty', ok('   '), 'empty'],
    ['too long', ok('x'.repeat(501)), 'too-long'],
    ['not text', ok(123), 'not-text'],
    ['control chars', ok('hi\u0000'), 'invalid-characters'],
  ])('rejects %s', async (_n, body, error) => {
    const r = await handle()(post(body));
    expect(r.status).toBe(400);
    expect(json(r).error).toBe(error);
  });
  it('rejects malformed JSON', async () => {
    expect((await handle()(post('{nope'))).status).toBe(400);
  });
  it('rejects the wrong content type and method', async () => {
    expect((await handle()({ ...post(ok('a')), headers: { 'content-type': 'text/plain' } })).status).toBe(415);
    expect((await handle()({ method: 'DELETE', headers: {}, rawBody: '', ip: 'x' })).status).toBe(405);
  });
  it('rejects oversized bodies', async () => {
    const r = await handle()(post(JSON.stringify({ wish: 'a', composeMs: 5000, pad: 'x'.repeat(MAX_BODY_BYTES) })));
    expect(r.status).toBe(413);
  });
  it('rejects the honeypot and instant submissions', async () => {
    expect((await handle()(post({ ...ok('a wish'), website: 'http://spam' }))).status).toBe(400);
    expect((await handle()(post({ wish: 'a wish', composeMs: 10 }))).status).toBe(400);
  });
  it('enforces an allowed origin when configured', async () => {
    const h = createWishHandler({ env: { WISH_ALLOWED_ORIGINS: 'https://prism.example' }, send: vi.fn() });
    expect((await h(post(ok('a wish'), { headers: { origin: 'https://evil.example' } }))).status).toBe(403);
    expect((await h(post(ok('a wish'), { headers: { origin: 'https://prism.example' } }))).status).toBe(200);
  });
});

describe('best-effort rate limiting', () => {
  it('limits one client to 5 wishes per hour', async () => {
    let t = Date.parse('2026-11-23T10:00:00Z');
    const h = createWishHandler({ env: {}, now: () => t });
    for (let i = 0; i < 5; i++) expect((await h(post(ok(`wish ${i}`)))).status).toBe(200);
    expect((await h(post(ok('one more')))).status).toBe(429);
    expect((await h(post(ok('other client'), { ip: '198.51.100.7' }))).status).toBe(200);
    t += 61 * 60 * 1000;
    expect((await h(post(ok('later')))).status).toBe(200);
  });
});

describe('cross-origin (GitHub Pages → separately hosted API)', () => {
  const PAGES = 'https://wilan789pro.github.io';
  const env = { ...CONFIGURED, WISH_ALLOWED_ORIGINS: `${PAGES}, https://other.example/` };
  const fromPages = { headers: { origin: PAGES } };

  it('answers an allowed preflight with 204 and CORS headers, processing nothing', async () => {
    const send = vi.fn();
    const r = await createWishHandler({ env, send })({ method: 'OPTIONS', headers: { origin: PAGES }, rawBody: '', ip: 'x' });
    expect(r.status).toBe(204);
    expect(r.body).toBe('');
    expect(r.headers['Access-Control-Allow-Origin']).toBe(PAGES);
    expect(r.headers['Access-Control-Allow-Methods']).toContain('POST');
    expect(r.headers['Access-Control-Allow-Headers']).toContain('Content-Type');
    expect(r.headers.Vary).toBe('Origin');
    expect(send).not.toHaveBeenCalled();
  });

  it('delivers an allowed POST and returns the CORS header with it', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const r = await createWishHandler({ env, send })(post(ok('a wish from the garden'), fromPages));
    expect(r.status).toBe(200);
    expect(r.headers['Access-Control-Allow-Origin']).toBe(PAGES);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('accepts listed origins written with a trailing slash', async () => {
    const r = await createWishHandler({ env, send: vi.fn() })({ method: 'GET', headers: { origin: 'https://other.example' }, rawBody: '', ip: 'x' });
    expect(r.headers['Access-Control-Allow-Origin']).toBe('https://other.example');
  });

  it('refuses any other origin – preflight and POST – without CORS headers or delivery', async () => {
    const send = vi.fn();
    const h = createWishHandler({ env, send });
    for (const method of ['OPTIONS', 'POST', 'GET']) {
      const r = await h({ ...post(ok('a wish')), method, headers: { 'content-type': 'application/json', origin: 'https://evil.example' } });
      expect(r.status, method).toBe(403);
      expect(r.headers['Access-Control-Allow-Origin']).toBeUndefined();
    }
    expect(send).not.toHaveBeenCalled();
  });

  it('keeps CORS headers on error answers so the page can show the right message', async () => {
    const h = createWishHandler({ env, send: () => Promise.reject(new Error('down')) });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const bad = await h(post(ok('   '), fromPages));
    expect(bad.status).toBe(400);
    expect(bad.headers['Access-Control-Allow-Origin']).toBe(PAGES);
    const failed = await h(post(ok('a wish'), fromPages));
    expect(failed.status).toBe(502);
    expect(JSON.parse(failed.body).error).toBe('delivery-failed');
    expect(failed.headers['Access-Control-Allow-Origin']).toBe(PAGES);
  });

  it('without an allow-list, gives no CORS headers (same-origin pages only)', async () => {
    const r = await createWishHandler({ env: {}, send: vi.fn() })(post(ok('a wish'), fromPages));
    expect(r.headers['Access-Control-Allow-Origin']).toBeUndefined();
  });
});

describe('configuration warnings (names only, never values)', () => {
  it('warns once when only some email settings exist, and stays in dry-run', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const send = vi.fn();
    const env = { RESEND_API_KEY: 'secret-value-123', WISH_TO_EMAIL: 'someone@example.invalid' };
    const h = createWishHandler({ env, send });
    expect(missingEmailSettings(env)).toEqual(['WISH_FROM_EMAIL']);
    expect(warn).toHaveBeenCalledTimes(1);
    const msg = String(warn.mock.calls[0][0]);
    expect(msg).toContain('WISH_FROM_EMAIL');
    expect(msg).not.toContain('secret-value-123');
    expect(msg).not.toContain('someone@example.invalid');
    expect(JSON.parse((await h(post(ok('a wish')))).body)).toEqual({ status: 'accepted', delivery: 'dry-run' });
    expect(send).not.toHaveBeenCalled();
  });

  it('is silent when nothing or everything is configured (with an allow-list)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    createWishHandler({ env: {} });
    createWishHandler({ env: { ...CONFIGURED, WISH_ALLOWED_ORIGINS: 'https://wilan789pro.github.io' } });
    expect(warn).not.toHaveBeenCalled();
    expect(missingEmailSettings({})).toEqual([]);
    expect(missingEmailSettings(CONFIGURED)).toEqual([]);
  });

  it('points out a missing allow-list when delivery is configured', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    createWishHandler({ env: CONFIGURED });
    expect(String(warn.mock.calls[0][0])).toContain('WISH_ALLOWED_ORIGINS');
    expect(allowedOrigins({ WISH_ALLOWED_ORIGINS: ' https://a.example/ ,, https://b.example ' })).toEqual(['https://a.example', 'https://b.example']);
  });
});

describe('oversized requests', () => {
  it('answers 413 when the body reader reports an overflow or the declared length is too big', async () => {
    const h = createWishHandler({ env: {}, send: vi.fn() });
    expect((await h({ ...post(ok('a')), rawBody: null })).status).toBe(413);
    expect((await h({ ...post(ok('a')), headers: { 'content-type': 'application/json', 'content-length': String(MAX_BODY_BYTES + 1) } })).status).toBe(413);
  });

  it('readRawBody stops buffering past the limit', async () => {
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
