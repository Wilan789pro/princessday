import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { VaultError, createVaultClient } from './vaultClient';

const ok = (body: object) => ({ ok: true, json: async () => ({ status: 'ok', ...body }) });
const err = (status: number, error: string) => ({ ok: false, status, json: async () => ({ status: 'error', error }) });

describe('vault client', () => {
  it('logs in with the code and sends the session token – never the code – on later calls', async () => {
    const f = vi.fn().mockResolvedValueOnce(ok({ token: 'tok' })).mockResolvedValueOnce(ok({ wishes: [] }));
    const c = createVaultClient('https://api.example/api/vault', f as unknown as typeof fetch);
    expect(await c.login('secret-code')).toBe('tok');
    await c.list('tok');
    const [, loginInit] = f.mock.calls[0];
    expect(JSON.parse(loginInit.body)).toEqual({ action: 'login', code: 'secret-code' });
    expect(loginInit.headers.Authorization).toBeUndefined();
    const [, listInit] = f.mock.calls[1];
    expect(listInit.headers.Authorization).toBe('Bearer tok');
    expect(listInit.body).not.toContain('secret-code');
    expect(listInit).toMatchObject({ method: 'POST', credentials: 'omit' });
  });

  it('sends the right actions for reading, marking, deleting, logging out and resetting', async () => {
    const f = vi.fn().mockResolvedValue(ok({ wish: { id: 'a' }, epoch: 'e2' }));
    const c = createVaultClient('/api/vault', f as unknown as typeof fetch);
    await c.read('t', 'a');
    await c.mark('t', 'a', true);
    await c.remove('t', 'a');
    await c.logout('t');
    expect(await c.resetExperience('t')).toBe('e2');
    expect(f.mock.calls.map(([, i]) => JSON.parse(i.body))).toEqual([
      { action: 'read', id: 'a' },
      { action: 'mark', id: 'a', read: true },
      { action: 'delete', id: 'a' },
      { action: 'logout' },
      { action: 'reset-experience' },
    ]);
  });

  it('turns server, network and missing-backend failures into coded errors', async () => {
    const wrong = createVaultClient('/api/vault', vi.fn().mockResolvedValue(err(401, 'wrong-code')) as unknown as typeof fetch);
    await expect(wrong.login('x')).rejects.toEqual(new VaultError('wrong-code'));
    const offline = createVaultClient('/api/vault', vi.fn().mockRejectedValue(new TypeError('x')) as unknown as typeof fetch);
    await expect(offline.list('t')).rejects.toEqual(new VaultError('network'));
    const none = createVaultClient(null, vi.fn() as unknown as typeof fetch);
    expect(none.connected).toBe(false);
    await expect(none.login('x')).rejects.toEqual(new VaultError('not-connected'));
  });
});

describe('the vault stays hidden from ordinary visitors', () => {
  const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
  const intro = readFileSync(new URL('../components/IntroClock/IntroClock.tsx', import.meta.url), 'utf8');

  it('is code-split and only mounted after the secret gesture', () => {
    expect(app).toMatch(/lazy\(\(\) => import\('\.\/components\/Vault\/RoyalWishVault'\)\)/);
    expect(app).toMatch(/\{vaultOpen && \(/);
    expect(app).toMatch(/onSecret=\{\(\) => setVaultOpen\(true\)\}/);
    expect(intro).toMatch(/onPointerUp=\{tapSapphire\}/);
    expect(intro).toMatch(/registerTap\(/);
  });

  it('has no visible link, button or text pointing to it anywhere in the visitor experience', async () => {
    // Every string a visitor can see (content objects, not code comments).
    const { princessDay } = await import('../content/princessDay');
    const { experience } = await import('../content/experience');
    const { project25 } = await import('../content/birthday');
    const { garden } = await import('../content/garden');
    const values = (v: unknown): string[] =>
      typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(values) : v && typeof v === 'object' ? Object.values(v).flatMap(values) : [];
    const visible = values([princessDay, experience, project25, garden]);
    expect(visible.length).toBeGreaterThan(50);
    for (const text of visible) expect(text).not.toMatch(/vault|admin|inbox/i);
  });
});
