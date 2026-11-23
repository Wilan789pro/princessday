/**
 * Flower head geometry. Every petal is an UPWARD shape whose base sits at the
 * bottom-centre of its bounding box, then rotated into place around (0,0).
 * That lets petals "unfold" by scaling from their base.
 * (0,0) is where the stem attaches.
 */
import type { FlowerType } from '../content/garden';

export interface PetalDef {
  d: string;
  rotate: number;
  tx?: number;
  layer: number;
  /** >0 lighten, <0 darken (overlay opacity) */
  shade: number;
}

export interface CentreDef {
  d: string;
  /** overlay tone on top of the centre colour */
  shade?: number;
  /** drawn as a stroke in a darker tone instead of a fill */
  line?: boolean;
}

export interface Design {
  petals: PetalDef[];
  centre: CentreDef[];
  /** Rough visual radius, used for layout and hit areas. */
  radius: number;
  /** Side-view flowers grow upward from the stem point instead of around it. */
  upright?: boolean;
}

const round = (w: number, h: number, b = 0) =>
  `M0 ${-b} C ${-w} ${-b - h * 0.25} ${-w} ${-b - h * 0.95} 0 ${-b - h} C ${w} ${-b - h * 0.95} ${w} ${-b - h * 0.25} 0 ${-b} Z`;

const point = (w: number, h: number, b = 0) =>
  `M0 ${-b} C ${-w} ${-b - h * 0.35} ${-w * 0.45} ${-b - h * 0.82} 0 ${-b - h} C ${w * 0.45} ${-b - h * 0.82} ${w} ${-b - h * 0.35} 0 ${-b} Z`;

const notched = (w: number, h: number, b = 0) =>
  `M0 ${-b} C ${-w} ${-b - h * 0.2} ${-w * 1.05} ${-b - h} ${-w * 0.35} ${-b - h} Q 0 ${-b - h * 0.86} ${w * 0.35} ${-b - h} C ${w * 1.05} ${-b - h} ${w} ${-b - h * 0.2} 0 ${-b} Z`;

const circle = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0 Z`;

const ring = (count: number, offset: number, d: string, layer: number, shade: number): PetalDef[] =>
  Array.from({ length: count }, (_, i) => ({ d, rotate: offset + (360 / count) * i, layer, shade }));

export const DESIGNS: Record<FlowerType, Design> = {
  rose: {
    radius: 44,
    petals: [
      ...ring(5, 0, round(19, 42), 0, -0.14),
      ...ring(5, 36, round(15, 32), 1, 0),
      ...ring(5, 15, round(11, 22), 2, 0.1),
      ...ring(3, 60, round(7, 13), 3, 0.18),
    ],
    centre: [
      { d: circle(0, 0, 5) },
      { d: 'M0 -1 C 4 -2 4 4 0 4 C -5 4 -5 -4 0 -5 C 7 -6 7 6 0 7', line: true },
    ],
  },
  peony: {
    radius: 42,
    petals: [
      ...ring(9, 0, notched(18, 40), 0, -0.14),
      ...ring(8, 20, notched(15, 30), 1, 0),
      ...ring(6, 10, notched(11, 20), 2, 0.12),
    ],
    centre: [
      { d: circle(0, 0, 6) },
      ...Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return { d: circle(Math.cos(a) * 8.5, Math.sin(a) * 8.5, 2.2), shade: -0.15 };
      }),
    ],
  },
  daisy: {
    radius: 46,
    petals: [...ring(16, 0, round(5.5, 44, 6), 0, -0.06), ...ring(16, 11.25, round(5, 38, 6), 1, 0.08)],
    centre: [
      { d: circle(0, 0, 12) },
      ...Array.from({ length: 9 }, (_, i) => {
        const a = i * 2.4;
        const r = 2.2 + i * 0.95;
        return { d: circle(Math.cos(a) * r, Math.sin(a) * r, 1.3), shade: -0.22 };
      }),
    ],
  },
  lily: {
    radius: 50,
    petals: [...ring(3, 0, point(15, 50), 0, -0.1), ...ring(3, 60, point(13, 46), 1, 0.06)],
    centre: [
      ...Array.from({ length: 6 }, (_, i) => {
        const a = ((i * 60 + 30) * Math.PI) / 180;
        const x = Math.sin(a) * 22;
        const y = -Math.cos(a) * 22;
        return { d: `M0 0 L${x.toFixed(2)} ${y.toFixed(2)}`, line: true };
      }),
      ...Array.from({ length: 6 }, (_, i) => {
        const a = ((i * 60 + 30) * Math.PI) / 180;
        return { d: circle(Math.sin(a) * 22, -Math.cos(a) * 22, 2.6) };
      }),
      { d: circle(0, 0, 4) },
    ],
  },
  tulip: {
    radius: 40,
    upright: true,
    petals: [
      { d: point(20, 62), rotate: -16, tx: -5, layer: 0, shade: -0.12 },
      { d: point(20, 62), rotate: 16, tx: 5, layer: 0, shade: -0.12 },
      { d: round(18, 54), rotate: 0, layer: 1, shade: 0.08 },
    ],
    // The tulip's "centre" is its inner petal, glimpsed between the outer ones.
    centre: [{ d: 'M-9 -30 C -10 -48 -4 -60 0 -64 C 4 -60 10 -48 9 -30 Z' }],
  },
  starflower: {
    radius: 48,
    petals: [...ring(5, 0, point(17, 48), 0, -0.1), ...ring(5, 36, point(10, 32), 1, 0.12)],
    centre: [
      { d: 'M0 -10 L7.5 0 L0 10 L-7.5 0 Z' },
      { d: 'M0 -10 L7.5 0 L0 0 Z', shade: 0.35 },
      { d: 'M0 10 L-7.5 0 L0 0 Z', shade: -0.25 },
    ],
  },
};

/** Leaf shape pointing right from (0,0). Mirror with scale(-1,1). */
export const LEAF_PATH = 'M0 0 C 8 -15 28 -21 42 -14 C 31 -1 15 5 0 0 Z';
export const LEAF_VEIN = 'M1 -1 Q 20 -9 40 -13';

/** Draw order for petals inside a flower: tulip centre sits *behind* the outer petals. */
export const centreBehindPetals = (type: FlowerType) => type === 'tulip';
