import { afterEach, describe, expect, it, vi } from 'vitest';
import { garden } from '../content/garden';

// The PNG export path: real drawing code, with the browser-only image helpers stubbed.
vi.mock('./exportImage', async (importOriginal) => {
  const real = await importOriginal<typeof import('./exportImage')>();
  return {
    ...real,
    loadSvgImage: vi.fn(async () => ({}) as HTMLImageElement),
    canvasToBlob: vi.fn(async () => new Blob(['png'], { type: 'image/png' })),
  };
});

import {
  CERT_H,
  CERT_W,
  DEFAULT_LAYOUT,
  WISH_LAYOUT,
  WISH_TEXT_BOX,
  certificateLayout,
  drawCertificate,
  layoutWish,
  quoted,
  renderCertificatePng,
  wishParagraphs,
  wrapToWidth,
  type Measure,
} from './certificateCanvas';
import { canvasToBlob } from './exportImage';

/** Text width ≈ 0.5 em per character – a stand-in for real font metrics. */
const pxOf = (font: string) => Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 10);
const measure: Measure = (font, text) => Array.from(text).length * pxOf(font) * 0.5;

type Call = { text: string; x: number; y: number; font: string };

/** A CanvasRenderingContext2D stand-in that records every fillText with its transformed position. */
function recordingContext() {
  const texts: Call[] = [];
  let m = { a: 1, e: 0, f: 0 };
  const stack: (typeof m)[] = [];
  const state: Record<string, unknown> = { font: '10px serif' };
  const api: Record<string, unknown> = {
    save: () => stack.push({ ...m }),
    restore: () => (m = stack.pop() ?? { a: 1, e: 0, f: 0 }),
    translate: (x: number, y: number) => (m = { ...m, e: m.e + x * m.a, f: m.f + y * m.a }),
    scale: (k: number) => (m = { ...m, a: m.a * k }),
    rotate: () => {},
    measureText: (t: string) => ({ width: measure(String(state.font), t) }),
    fillText: (text: string, x: number, y: number) => texts.push({ text, x: m.e + x * m.a, y: m.f + y * m.a, font: String(state.font) }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
  };
  const ctx = new Proxy(state, {
    get: (t, k: string) => (k in api ? api[k] : k in t ? t[k] : () => {}),
    set: (t, k: string, v) => ((t[k] = v), true),
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, texts };
}

const SHORT = 'To dance in the rain with you.';
const LONG = Array.from({ length: 62 }, (_, i) => `wish${i % 10}xx`).join(' ') + ' tail';
const MULTI = 'For my family: health.\n\nFor my friends: laughter.\nFor me: courage.';

const wishLines = (texts: Call[], wish: string | null) => {
  const words = new Set((wish ?? '').split(/\s+/).filter((w) => w.length > 3));
  return texts.filter((t) => t.text.split(' ').some((w) => words.has(w.replace(/…$/, ''))));
};

describe('wish text layout on the certificate', () => {
  it('a short wish is drawn large, on one line', () => {
    const L = layoutWish(SHORT, measure);
    expect(L.size).toBe(WISH_TEXT_BOX.maxPx);
    expect(L.lines).toEqual([SHORT]);
    expect(L.truncated).toBe(false);
  });

  it('a 500-character wish wraps, shrinks to fit, and every line stays inside the box', () => {
    expect(Array.from(LONG).length).toBe(500);
    const L = layoutWish(quoted(LONG), measure);
    expect(L.lines.length).toBeGreaterThan(3);
    expect(L.size).toBeGreaterThanOrEqual(WISH_TEXT_BOX.minPx);
    expect(L.size).toBeLessThan(WISH_TEXT_BOX.maxPx);
    expect(L.height).toBeLessThanOrEqual(WISH_TEXT_BOX.maxHeight);
    expect(L.truncated).toBe(false);
    for (const line of L.lines) expect(measure(`${L.size}px`, line)).toBeLessThanOrEqual(WISH_TEXT_BOX.maxWidth);
    expect(L.lines.join(' ')).toBe(quoted(LONG)); // nothing lost
  });

  it('keeps her line breaks, folding runs of blank lines into one paragraph break', () => {
    expect(wishParagraphs('a\n\n\n\nb\r\nc\n\n')).toEqual(['a', '', 'b', 'c']);
    const L = layoutWish(MULTI, measure);
    expect(L.lines).toEqual(['For my family: health.', '', 'For my friends: laughter.', 'For me: courage.']);
  });

  it('breaks a single word that is too long for a line', () => {
    const lines = wrapToWidth('x'.repeat(120), (s) => s.length * 20, 1000);
    expect(lines).toEqual(['x'.repeat(50), 'x'.repeat(50), 'x'.repeat(20)]);
  });

  it('never overflows, even for pathological input (hundreds of line breaks)', () => {
    const L = layoutWish(Array.from({ length: 250 }, () => 'a').join('\n'), measure);
    expect(L.truncated).toBe(true);
    expect(L.height).toBeLessThanOrEqual(WISH_TEXT_BOX.maxHeight);
    expect(L.lines.at(-1)).toMatch(/…$/);
  });
});

describe('the Royal Seal certificate with her wish', () => {
  it('keeps the A4 size at 300 DPI', () => {
    expect([CERT_W, CERT_H]).toEqual([2480, 3508]);
  });

  it('draws a dedicated wish section with every line inside the panel and the certificate', () => {
    for (const wish of [SHORT, LONG, MULTI]) {
      const { ctx, texts } = recordingContext();
      drawCertificate(ctx, {} as HTMLImageElement, wish);
      const p = WISH_LAYOUT.wishPanel!;
      expect(texts.some((t) => t.text === garden.certificate.wishHeading.charAt(0))).toBe(true);
      const lines = wishLines(texts, quoted(wish));
      expect(lines.length).toBeGreaterThan(0);
      for (const l of lines) {
        const half = measure(l.font, l.text) / 2;
        expect(l.x - half).toBeGreaterThanOrEqual(p.x);
        expect(l.x + half).toBeLessThanOrEqual(p.x + p.w);
        expect(l.y).toBeGreaterThan(p.y + 92);
        expect(l.y).toBeLessThan(p.y + p.h);
      }
      // the wish appears in full
      expect(lines.map((l) => l.text).join(' ').replace(/\s+/g, ' ')).toBe(quoted(wish).replace(/\s+/g, ' '));
    }
  });

  it('keeps the floral stamp, sapphire seal and signature clear of the wish panel', () => {
    const p = WISH_LAYOUT.wishPanel!;
    const stampTop = WISH_LAYOUT.stamp.y - (330 + 26) * WISH_LAYOUT.stamp.scale;
    const sealTop = WISH_LAYOUT.seal.y - 270 * 1.1 * WISH_LAYOUT.seal.scale;
    expect(stampTop).toBeGreaterThan(p.y + p.h);
    expect(sealTop).toBeGreaterThan(p.y + p.h);
    expect(p.y).toBeGreaterThan(WISH_LAYOUT.dateY);
    const { ctx, texts } = recordingContext();
    drawCertificate(ctx, {} as HTMLImageElement, LONG);
    expect(texts.some((t) => t.text === garden.certificate.signature)).toBe(true);
    // the stamp's circular label is still drawn
    expect(texts.filter((t) => t.text === 'G').length).toBeGreaterThan(0);
  });

  it('without a wish: the original layout, with no empty wish section', () => {
    expect(certificateLayout(null)).toBe(DEFAULT_LAYOUT);
    expect(certificateLayout('   \n  ')).toBe(DEFAULT_LAYOUT);
    expect(DEFAULT_LAYOUT.wishPanel).toBeNull();
    const { ctx, texts } = recordingContext();
    drawCertificate(ctx, {} as HTMLImageElement, null);
    const all = texts.map((t) => t.text).join('');
    expect(all).not.toContain('HERWISHUPONASTAR');
    expect(texts.some((t) => t.text.includes('“'))).toBe(false);
    // the original positions are unchanged
    expect(texts.find((t) => t.text === garden.certificate.dateLine)?.y).toBe(2060);
    expect(texts.find((t) => t.text === garden.certificate.awardedTo)?.y).toBe(1230);
  });
});

describe('the wish is part of the exported PNG, not just the web page', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('renderCertificatePng paints her wish onto the very canvas that becomes the PNG', async () => {
    const { ctx, texts } = recordingContext();
    const canvas = { width: 0, height: 0, getContext: () => ctx };
    vi.stubGlobal('document', { createElement: () => canvas });
    let size: number[] = [];
    vi.mocked(canvasToBlob).mockImplementationOnce(async (c: HTMLCanvasElement) => {
      size = [c.width, c.height];
      return new Blob(['png'], { type: 'image/png' });
    });

    const blob = await renderCertificatePng(null, SHORT);
    expect(blob.type).toBe('image/png');
    expect(vi.mocked(canvasToBlob)).toHaveBeenCalledWith(canvas);
    expect(size).toEqual([2480, 3508]);
    expect(texts.map((t) => t.text)).toContain(quoted(SHORT));
  });

  it('without a wish the exported certificate carries no wish text', async () => {
    const { ctx, texts } = recordingContext();
    vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });
    await renderCertificatePng(null, null);
    expect(texts.map((t) => t.text).join(' ')).not.toContain('dance in the rain');
    expect(texts.some((t) => t.text === garden.certificate.signature)).toBe(true);
  });
});
