import { describe, expect, it, vi } from 'vitest';
import { isStaticHosting } from '../utils/hosting';
import { submitWish, wishDeliveryMode } from './wishClient';

const opts = (staticHosting: boolean, fetchImpl: typeof fetch) => ({ staticHosting, composeMs: 5000, honeypot: '', fetchImpl });

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

describe('wish client on static hosting (GitHub Pages)', () => {
  it('never touches the network and reports dry-run, not delivery', async () => {
    const fetchImpl = vi.fn();
    expect(await submitWish('To see the aurora', opts(true, fetchImpl as unknown as typeof fetch))).toEqual({
      kind: 'accepted',
      delivery: 'dry-run',
    });
    expect(await wishDeliveryMode(true, fetchImpl as unknown as typeof fetch)).toBe('dry-run');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('still catches the wealth joke and invalid input locally', async () => {
    const fetchImpl = vi.fn();
    const f = fetchImpl as unknown as typeof fetch;
    expect(await submitWish('je veux être millionnaire', opts(true, f))).toEqual({ kind: 'wealth' });
    expect(await submitWish('   ', opts(true, f))).toEqual({ kind: 'error', error: 'empty' });
    expect(await submitWish('x'.repeat(501), opts(true, f))).toEqual({ kind: 'error', error: 'too-long' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('wish client with a server', () => {
  it('never sends a wealth wish', async () => {
    const fetchImpl = vi.fn();
    expect(await submitWish('I want lots of money', opts(false, fetchImpl as unknown as typeof fetch))).toEqual({ kind: 'wealth' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('passes through the server’s dry-run answer', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { status: 'accepted', delivery: 'dry-run' }));
    expect(await submitWish('a quiet wish', opts(false, fetchImpl))).toEqual({ kind: 'accepted', delivery: 'dry-run' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('reports a missing backend as an error instead of a fake success', async () => {
    const notFound = vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => Promise.reject(new Error('html')) });
    expect(await submitWish('a quiet wish', opts(false, notFound as unknown as typeof fetch))).toEqual({ kind: 'error', error: 'generic' });
    const offline = vi.fn().mockRejectedValue(new TypeError('offline'));
    expect(await submitWish('a quiet wish', opts(false, offline))).toEqual({ kind: 'error', error: 'network' });
  });
});
