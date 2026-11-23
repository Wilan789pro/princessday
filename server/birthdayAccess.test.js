import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { UNLOCK_AT_MS, birthdayAssetResponse, birthdayResponse, resolveNow } from './birthdayAccess.js';

describe('birthday access restrictions (unchanged by the Garden)', () => {
  it('stays locked one second before 18.12.2026 00:00 Mauritius and reveals no content', async () => {
    const r = await birthdayResponse(UNLOCK_AT_MS - 1000);
    expect(r.status).toBe(403);
    const body = JSON.parse(r.body);
    expect(body.status).toBe('locked');
    expect(body).not.toHaveProperty('content');
  });

  it('keeps private birthday assets locked before the date', async () => {
    const r = await birthdayAssetResponse('anything.jpg', UNLOCK_AT_MS - 1);
    expect(r.status).toBe(403);
  });

  it('rejects path tricks in asset names after the date', async () => {
    expect((await birthdayAssetResponse('../birthday-content.json', UNLOCK_AT_MS + 1)).status).not.toBe(200);
    expect((await birthdayAssetResponse('.hidden.jpg', UNLOCK_AT_MS + 1)).status).toBe(400);
  });

  it('ignores the test clock unless explicitly allowed (production)', () => {
    const before = Date.now();
    expect(resolveNow('2027-01-01T00:00:00+04:00', false)).toBeGreaterThanOrEqual(before);
    expect(resolveNow('2027-01-01T00:00:00+04:00', true)).toBe(Date.parse('2027-01-01T00:00:00+04:00'));
  });
});

describe('public repository guard', () => {
  it('the committed birthday-content.json is still only the development placeholder', () => {
    // The repository is public. Real birthday content must NOT be committed
    // here: it would become publicly readable, including in Git history.
    const json = JSON.parse(readFileSync(new URL('./birthday-content.json', import.meta.url), 'utf8'));
    expect(json._placeholder).toBe(true);
  });
});
