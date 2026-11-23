/**
 * Local-only image export: SVG markup → <img> → <canvas> → PNG Blob.
 * Nothing is uploaded anywhere.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BouquetSVG } from '../components/Garden/BouquetSVG';
import { BOUQUET_VIEW, type BouquetSpec } from './bouquetModel';

/** Static, self-contained SVG markup for a bouquet (no animation). */
export function bouquetMarkup(spec: BouquetSpec, opts: { background?: boolean; pixelWidth?: number; idPrefix?: string } = {}): string {
  return renderToStaticMarkup(
    createElement(BouquetSVG, {
      spec,
      background: opts.background ?? true,
      pixelWidth: opts.pixelWidth ?? BOUQUET_VIEW.width,
      idPrefix: opts.idPrefix ?? 'bqx',
      title: 'Bouquet',
    }),
  );
}

export function loadSvgImage(markup: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not render the image.'));
    // A data URL (rather than a blob URL) keeps Safari from tainting the canvas.
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  });
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encoding failed.'))), 'image/png');
  });
}

/** High-resolution PNG of the bouquet (default 2000 × 2500). */
export async function bouquetPng(spec: BouquetSpec, width = 2000): Promise<Blob> {
  const height = Math.round((width * BOUQUET_VIEW.height) / BOUQUET_VIEW.width);
  const img = await loadSvgImage(bouquetMarkup(spec, { background: true, pixelWidth: width }));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available.');
  ctx.drawImage(img, 0, 0, width, height);
  const blob = await canvasToBlob(canvas);
  canvas.width = canvas.height = 0; // release memory early (iOS)
  return blob;
}

export type SaveResult = 'shared' | 'downloaded' | 'cancelled';

/**
 * Saves a PNG: the share sheet on phones that support sharing files (iPhone:
 * "Save Image" → Photos), otherwise a normal download. Object URLs are revoked.
 */
export async function savePng(blob: Blob, filename: string, title: string): Promise<SaveResult> {
  const file = new File([blob], filename, { type: 'image/png' });
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  if (coarse && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return 'shared';
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return 'cancelled';
      // NotAllowedError etc. → fall through to a download
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  return 'downloaded';
}
