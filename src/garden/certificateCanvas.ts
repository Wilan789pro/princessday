/**
 * CERTIFICATE OF EXTRAORDINARY PRINCESSHOOD – drawn from scratch on a Canvas
 * (A4 portrait at 300 DPI: 2480 × 3508). Not a screenshot. Rendered locally.
 * The floral stamp is rendered from the saved bouquet specification.
 */
import { garden } from '../content/garden';
import { bouquetForCertificate, type BouquetSpec } from './bouquetModel';
import { bouquetMarkup, canvasToBlob, loadSvgImage } from './exportImage';

export const CERT_W = 2480;
export const CERT_H = 3508;

const SERIF = "'Cormorant Garamond', 'Times New Roman', Georgia, serif";
const SANS = "'Manrope Variable', 'Manrope', system-ui, sans-serif";
const INK = '#14386f';
const INK_SOFT = '#3a4f70';
const SILVER = '#9fb0c8';

/** Markup for the miniature floral stamp – always derived from the bouquet spec. */
export function certificateStampMarkup(spec: BouquetSpec | null): string {
  return bouquetMarkup(bouquetForCertificate(spec), { background: false, pixelWidth: 640, idPrefix: 'cert' });
}

export async function ensureCertificateFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  await Promise.allSettled([
    document.fonts.load(`600 120px 'Cormorant Garamond'`),
    document.fonts.load(`italic 500 80px 'Cormorant Garamond'`),
    document.fonts.load(`500 80px 'Cormorant Garamond'`),
    document.fonts.load(`600 60px 'Manrope Variable'`),
  ]);
  await document.fonts.ready;
}

// ---------------------------------------------------------------- text helpers
function spacedWidth(ctx: CanvasRenderingContext2D, text: string, spacing: number) {
  const chars = Array.from(text);
  return chars.reduce((w, c) => w + ctx.measureText(c).width, 0) + spacing * (chars.length - 1);
}

function drawSpaced(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, spacing: number) {
  let x = cx - spacedWidth(ctx, text, spacing) / 2;
  ctx.textAlign = 'left';
  for (const c of Array.from(text)) {
    ctx.fillText(c, x, y);
    x += ctx.measureText(c).width + spacing;
  }
  ctx.textAlign = 'center';
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, max: number, maxWidth: number, spacingEm = 0) {
  let size = max;
  for (; size > 20; size -= 4) {
    ctx.font = font(size);
    if (spacedWidth(ctx, text, size * spacingEm) <= maxWidth) break;
  }
  return size;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

// ---------------------------------------------------------------- ornaments
function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.75, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r * 0.75, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function divider(ctx: CanvasRenderingContext2D, cx: number, y: number, half: number) {
  const g = ctx.createLinearGradient(cx - half, 0, cx + half, 0);
  g.addColorStop(0, 'rgba(31,79,150,0)');
  g.addColorStop(0.5, 'rgba(31,79,150,0.85)');
  g.addColorStop(1, 'rgba(31,79,150,0)');
  ctx.strokeStyle = g;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx - half, y);
  ctx.lineTo(cx - 40, y);
  ctx.moveTo(cx + 40, y);
  ctx.lineTo(cx + half, y);
  ctx.stroke();
  diamond(ctx, cx, y, 22, INK);
  diamond(ctx, cx - 70, y, 10, SILVER);
  diamond(ctx, cx + 70, y, 10, SILVER);
}

/** Scroll flourish in one corner; (sx, sy) = direction multipliers. */
function cornerFlourish(ctx: CanvasRenderingContext2D, x: number, y: number, sx: number, sy: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, sy);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 260);
  ctx.bezierCurveTo(0, 120, 30, 40, 120, 20);
  ctx.bezierCurveTo(70, 60, 60, 120, 110, 140);
  ctx.bezierCurveTo(150, 155, 175, 120, 160, 95);
  ctx.moveTo(260, 0);
  ctx.bezierCurveTo(120, 0, 40, 30, 20, 120);
  ctx.bezierCurveTo(60, 70, 120, 60, 140, 110);
  ctx.bezierCurveTo(155, 150, 120, 175, 95, 160);
  ctx.stroke();
  ctx.strokeStyle = SILVER;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 330);
  ctx.bezierCurveTo(0, 150, 150, 0, 330, 0);
  ctx.stroke();
  diamond(ctx, 52, 52, 26, INK);
  diamond(ctx, 52, 52, 12, '#a8dfff');
  ctx.restore();
}

function crownEmblem(ctx: CanvasRenderingContext2D, cx: number, y: number) {
  ctx.save();
  ctx.translate(cx, y);
  const g = ctx.createLinearGradient(0, -90, 0, 60);
  g.addColorStop(0, '#5fb3f5');
  g.addColorStop(1, '#14386f');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-150, 50);
  ctx.lineTo(-170, -60);
  ctx.lineTo(-90, 0);
  ctx.lineTo(0, -100);
  ctx.lineTo(90, 0);
  ctx.lineTo(170, -60);
  ctx.lineTo(150, 50);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.fillRect(-150, 50, 300, 26);
  for (const [x, yy, r] of [
    [-170, -72, 16],
    [0, -114, 22],
    [170, -72, 16],
  ] as const) {
    diamond(ctx, x, yy, r, '#a8dfff');
  }
  diamond(ctx, 0, 20, 26, '#cfefff');
  diamond(ctx, -80, 28, 14, '#cfefff');
  diamond(ctx, 80, 28, 14, '#cfefff');
  ctx.restore();
}

function circularText(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, r: number) {
  const chars = Array.from(text);
  const total = chars.reduce((w, c) => w + ctx.measureText(c).width, 0) + chars.length * 14;
  let angle = -Math.PI / 2 - total / r / 2;
  for (const c of chars) {
    const w = ctx.measureText(c).width;
    angle += (w / 2 + 7) / r;
    ctx.save();
    ctx.translate(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillText(c, 0, 0);
    ctx.restore();
    angle += (w / 2 + 7) / r;
  }
}

function floralStamp(ctx: CanvasRenderingContext2D, bouquet: HTMLImageElement, cx: number, cy: number, r: number) {
  ctx.save();
  // perforated outer edge
  ctx.fillStyle = '#f9fbff';
  ctx.beginPath();
  const teeth = 64;
  for (let i = 0; i <= teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? r + 26 : r + 12;
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.shadowColor = 'rgba(20,56,111,0.25)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 8;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = SILVER;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 86, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = INK;
  ctx.font = `700 34px ${SANS}`;
  circularText(ctx, `${garden.certificate.stampLabel}  ✦`, cx, cy, r - 50);

  // inner disc with the bouquet she made
  ctx.beginPath();
  ctx.arc(cx, cy, r - 90, 0, Math.PI * 2);
  ctx.clip();
  const g = ctx.createRadialGradient(cx, cy - 40, 10, cx, cy, r);
  g.addColorStop(0, '#173f78');
  g.addColorStop(1, '#0a1c38');
  ctx.fillStyle = g;
  ctx.fill();
  // The bouquet artwork spans roughly x 40–360 and centres near (200, 270) in
  // its 400 × 500 viewBox: scale that region to fill the disc.
  const k = ((r - 90) * 2 * 1.12) / 360;
  ctx.drawImage(bouquet, cx - 200 * k, cy - 268 * k, 400 * k, 500 * k);
  ctx.restore();
}

function waxSeal(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save();
  // ribbon tails
  for (const dir of [-1, 1]) {
    ctx.fillStyle = dir < 0 ? '#c9d3e0' : '#b4c2d6';
    ctx.beginPath();
    ctx.moveTo(cx + dir * 40, cy + 60);
    ctx.lineTo(cx + dir * 150, cy + r + 230);
    ctx.lineTo(cx + dir * 95, cy + r + 190);
    ctx.lineTo(cx + dir * 60, cy + r + 250);
    ctx.lineTo(cx - dir * 10, cy + 80);
    ctx.closePath();
    ctx.fill();
  }
  // irregular wax edge (deterministic)
  ctx.beginPath();
  const n = 90;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const wobble = 1 + 0.045 * Math.sin(a * 7) + 0.03 * Math.sin(a * 13 + 1.3) + 0.02 * Math.sin(a * 23 + 0.4);
    ctx.lineTo(cx + Math.cos(a) * r * wobble, cy + Math.sin(a) * r * wobble);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r * 1.05);
  g.addColorStop(0, '#5fa2f0');
  g.addColorStop(0.45, '#1f5fbf');
  g.addColorStop(1, '#0b2a5c');
  ctx.fillStyle = g;
  ctx.shadowColor = 'rgba(7,20,38,0.45)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 14;
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // pressed inner ring
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.74, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(2,8,20,0.35)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx + 3, cy + 4, r * 0.74, 0, Math.PI * 2);
  ctx.stroke();

  // embossed gem + stars
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = 'rgba(207,239,255,0.85)';
  ctx.beginPath();
  ctx.moveTo(-r * 0.32, -r * 0.12);
  ctx.lineTo(-r * 0.18, -r * 0.3);
  ctx.lineTo(r * 0.18, -r * 0.3);
  ctx.lineTo(r * 0.32, -r * 0.12);
  ctx.lineTo(0, r * 0.38);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(11,42,92,0.55)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-r * 0.32, -r * 0.12);
  ctx.lineTo(r * 0.32, -r * 0.12);
  ctx.moveTo(-r * 0.12, -r * 0.12);
  ctx.lineTo(0, r * 0.38);
  ctx.lineTo(r * 0.12, -r * 0.12);
  ctx.stroke();
  for (const [x, y, s] of [
    [-r * 0.5, -r * 0.42, 14],
    [r * 0.5, -r * 0.42, 14],
    [0, -r * 0.56, 18],
  ] as const) {
    diamond(ctx, x, y, s, 'rgba(207,239,255,0.8)');
  }
  ctx.restore();
  // highlight
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.35, cy - r * 0.45, r * 0.32, r * 0.16, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- main
export function drawCertificate(ctx: CanvasRenderingContext2D, bouquet: HTMLImageElement) {
  const W = CERT_W;
  const H = CERT_H;
  const cx = W / 2;
  const c = garden.certificate;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // paper
  const paper = ctx.createLinearGradient(0, 0, W, H);
  paper.addColorStop(0, '#f8fafe');
  paper.addColorStop(0.5, '#eef3fa');
  paper.addColorStop(1, '#e2eaf5');
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, W, H);
  const vig = ctx.createRadialGradient(cx, H * 0.45, H * 0.2, cx, H * 0.45, H * 0.75);
  vig.addColorStop(0, 'rgba(255,255,255,0)');
  vig.addColorStop(1, 'rgba(20,56,111,0.10)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // faint watermark gem
  ctx.save();
  ctx.globalAlpha = 0.045;
  ctx.translate(cx, H * 0.47);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(-520, -200);
  ctx.lineTo(-300, -470);
  ctx.lineTo(300, -470);
  ctx.lineTo(520, -200);
  ctx.lineTo(0, 620);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // borders
  ctx.strokeStyle = SILVER;
  ctx.lineWidth = 12;
  ctx.strokeRect(90, 90, W - 180, H - 180);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.strokeRect(140, 140, W - 280, H - 280);
  ctx.strokeStyle = SILVER;
  ctx.lineWidth = 2;
  ctx.strokeRect(165, 165, W - 330, H - 330);
  cornerFlourish(ctx, 165, 165, 1, 1);
  cornerFlourish(ctx, W - 165, 165, -1, 1);
  cornerFlourish(ctx, 165, H - 165, 1, -1);
  cornerFlourish(ctx, W - 165, H - 165, -1, -1);
  diamond(ctx, cx, 140, 22, INK);
  diamond(ctx, cx, H - 140, 22, INK);
  diamond(ctx, 140, H / 2, 22, INK);
  diamond(ctx, W - 140, H / 2, 22, INK);

  crownEmblem(ctx, cx, 520);

  // title
  ctx.fillStyle = INK_SOFT;
  ctx.font = `600 62px ${SANS}`;
  drawSpaced(ctx, c.titleTop, cx, 760, 26);
  const titleFont = (px: number) => `600 ${px}px ${SERIF}`;
  const tSize = fitFont(ctx, c.titleMain, titleFont, 150, 1950, 0.08);
  ctx.font = titleFont(tSize);
  const tg = ctx.createLinearGradient(cx - 900, 0, cx + 900, 0);
  tg.addColorStop(0, '#14386f');
  tg.addColorStop(0.5, '#1f5fbf');
  tg.addColorStop(1, '#14386f');
  ctx.fillStyle = tg;
  drawSpaced(ctx, c.titleMain, cx, 930, tSize * 0.08);
  divider(ctx, cx, 1040, 620);

  // recipient
  ctx.fillStyle = INK_SOFT;
  ctx.font = `italic 500 84px ${SERIF}`;
  ctx.fillText(c.awardedTo, cx, 1230);
  const nameFont = (px: number) => `600 ${px}px ${SERIF}`;
  const nSize = fitFont(ctx, c.name, nameFont, 150, 1900);
  ctx.font = nameFont(nSize);
  ctx.fillStyle = INK;
  ctx.fillText(c.name, cx, 1420);
  divider(ctx, cx, 1510, 460);

  // citation
  ctx.font = `italic 500 76px ${SERIF}`;
  ctx.fillStyle = '#26395a';
  wrap(ctx, c.citation, 1700).forEach((line, i) => ctx.fillText(line, cx, 1680 + i * 104));

  ctx.font = `italic 500 58px ${SERIF}`;
  ctx.fillStyle = INK_SOFT;
  ctx.fillText(c.dateLine, cx, 2060);

  // stamp + seal
  floralStamp(ctx, bouquet, 790, 2560, 330);
  waxSeal(ctx, 1700, 2540, 270);

  // signature
  ctx.strokeStyle = SILVER;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 420, 3160);
  ctx.lineTo(cx + 420, 3160);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = `italic 500 96px ${SERIF}`;
  ctx.fillText(c.signature, cx, 3130);
  ctx.fillStyle = INK_SOFT;
  ctx.font = `600 38px ${SANS}`;
  drawSpaced(ctx, c.signatureRole.toUpperCase(), cx, 3230, 12);
}

/** Renders the full-resolution certificate and returns it as a PNG Blob. */
export async function renderCertificatePng(spec: BouquetSpec | null): Promise<Blob> {
  await ensureCertificateFonts();
  const bouquet = await loadSvgImage(certificateStampMarkup(spec));
  const canvas = document.createElement('canvas');
  canvas.width = CERT_W;
  canvas.height = CERT_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available.');
  drawCertificate(ctx, bouquet);
  const blob = await canvasToBlob(canvas);
  canvas.width = canvas.height = 0;
  return blob;
}
