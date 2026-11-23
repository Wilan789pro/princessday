import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { garden } from '../content/garden';
import { isStaticHosting, normaliseApiBase, wishEndpoint } from '../utils/hosting';
import { submitWish, wishDeliveryMode } from './wishClient';

const opts = (endpoint: string | null, fetchImpl: typeof fetch) => ({ endpoint, composeMs: 5000, honeypot: '', fetchImpl });
const jsonResponse = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;

describe('static hosting detection', () => {
  it('is on for the GitHub Pages build mode and off otherwise', () => {
    expect(isStaticHosting({ MODE: 'pages' })).toBe(true);
    expect(isStaticHosting({ MODE: 'production', VITE_STATIC_HOSTING: 'true' })).toBe(true);
    expect(isStaticHosting({ MODE: 'production' })).toBe(false);
    expect(isStaticHosting({ MODE: 'development' })).toBe(false);
  });
});

describe('where wishes go (VITE_API_BASE_URL)', () => {
  it('uses a configured backend, else the same-origin server, else nothing', () => {
    expect(wishEndpoint({ apiBase: 'https://wishes.example.app', staticHosting: true })).toBe('https://wishes.example.app/api/wish');
    expect(wishEndpoint({ apiBase: '', staticHosting: false })).toBe('/api/wish');
    expect(wishEndpoint({ apiBase: '', staticHosting: true })).toBeNull();
  });
  it('only accepts http(s) addresses and trims trailing slashes', () => {
    expect(normaliseApiBase(' https://wishes.example.app/// ')).toBe('https://wishes.example.app');
    expect(normaliseApiBase('javascript:alert(1)')).toBe('');
    expect(normaliseApiBase('wishes.example.app')).toBe('');
    expect(normaliseApiBase(undefined)).toBe('');
  });
});

describe('wish client without a backend (GitHub Pages, no API URL)', () => {
  it('never touches the network and reports an error (not sent) – never success', async () => {
    const fetchImpl = vi.fn();
    expect(await submitWish('To see the aurora', opts(null, fetchImpl as unknown as typeof fetch))).toEqual({ kind: 'error', error: 'not-connected' });
    expect(await wishDeliveryMode(null, fetchImpl as unknown as typeof fetch)).toBe('not-connected');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('still catches the wealth joke and invalid input locally', async () => {
    const fetchImpl = vi.fn();
    const f = fetchImpl as unknown as typeof fetch;
    expect(await submitWish('je veux être millionnaire', opts(null, f))).toEqual({ kind: 'wealth' });
    expect(await submitWish('   ', opts(null, f))).toEqual({ kind: 'error', error: 'empty' });
    expect(await submitWish('x'.repeat(501), opts(null, f))).toEqual({ kind: 'error', error: 'too-long' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('wish client with a backend', () => {
  const API = 'https://wishes.example.app/api/wish';

  it('never sends a wealth wish', async () => {
    const fetchImpl = vi.fn();
    expect(await submitWish('I want lots of money', opts(API, fetchImpl as unknown as typeof fetch))).toEqual({ kind: 'wealth' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('posts cross-origin without cookies; success only when the vault confirms storage', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { status: 'accepted', delivery: 'vault' }));
    expect(await submitWish('a quiet wish', opts(API, fetchImpl))).toEqual({ kind: 'accepted' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(API);
    expect(init).toMatchObject({ method: 'POST', mode: 'cors', credentials: 'omit' });
    expect(JSON.parse(init.body)).toMatchObject({ wish: 'a quiet wish' });
  });

  it('maps server errors (including delivery failure) and network failure honestly', async () => {
    const failed = vi.fn().mockResolvedValue(jsonResponse(503, { status: 'error', error: 'storage-failed' }));
    expect(await submitWish('a quiet wish', opts(API, failed))).toEqual({ kind: 'error', error: 'storage-failed' });
    // an unexpected "accepted" without the vault's confirmation is not trusted
    const odd = vi.fn().mockResolvedValue(jsonResponse(200, { status: 'accepted', delivery: 'dry-run' }));
    expect((await submitWish('a quiet wish', opts(API, odd))).kind).toBe('error');
    const notFound = vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => Promise.reject(new Error('html')) });
    expect(await submitWish('a quiet wish', opts(API, notFound as unknown as typeof fetch))).toEqual({ kind: 'error', error: 'generic' });
    const offline = vi.fn().mockRejectedValue(new TypeError('offline'));
    expect(await submitWish('a quiet wish', opts(API, offline))).toEqual({ kind: 'error', error: 'network' });
  });
});

describe('every error code has a user-facing message that admits the wish was not sent', () => {
  const server = ['wishHandler.js', 'http.js'].map((f) => readFileSync(new URL(`../../server/${f}`, import.meta.url), 'utf8')).join('\n');
  const rules = readFileSync(new URL('../../shared/wishRules.js', import.meta.url), 'utf8');
  const codes = new Set<string>([
    ...[...server.matchAll(/error: '([a-z-]+)'/g)].map((m) => m[1]),
    ...[...rules.matchAll(/error: '([a-z-]+)'/g)].map((m) => m[1]),
    ...[...rules.matchAll(/'(not-text|empty|too-long|invalid-characters)'/g)].map((m) => m[1]),
    'network',
    'generic',
  ]);

  it('covers all of them', () => {
    expect(codes.size).toBeGreaterThan(10);
    for (const code of codes) expect(garden.wish.errors[code], code).toBeTruthy();
  });

  it('server failures say so explicitly', () => {
    for (const code of ['storage-failed', 'storage-unavailable', 'not-connected', 'rate-limited', 'origin', 'too-large', 'network', 'generic']) {
      expect(garden.wish.errors[code]).toMatch(/not sent/i);
    }
  });
});
