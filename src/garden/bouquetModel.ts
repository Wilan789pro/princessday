/**
 * Bouquet specification – the single source of truth for her bouquet.
 * It is plain JSON, stored only in this browser (localStorage), and both the
 * on-screen bouquet, the PNG export and the certificate stamp render from it.
 */
import { FLOWER_TYPES, PALETTE, RIBBONS, type FlowerPart, type FlowerType } from '../content/garden';

export type FlowerColours = Record<FlowerPart, string>;

export interface PlacedFlower {
  id: string;
  type: FlowerType;
  colours: FlowerColours;
  /** 0 … SLOTS.length-1, unique within a bouquet */
  slot: number;
  /** 0.75 … 1.3 */
  scale: number;
  /** degrees, -30 … 30 */
  rotation: number;
}

export interface BouquetSpec {
  version: 1;
  flowers: PlacedFlower[];
  ribbon: string;
}

export const STORAGE_KEY = 'prism:bouquet';
export const MAX_FLOWERS = 7;
export const SCALE_RANGE = [0.75, 1.3] as const;
export const ROTATION_RANGE = [-30, 30] as const;

/** Bouquet canvas is 400 × 500. Heads sit on these points; stems meet at BIND. */
export const BOUQUET_VIEW = { width: 400, height: 500 };
export const BIND = { x: 200, y: 352 };
export const SLOTS: { x: number; y: number; name: string }[] = [
  { x: 200, y: 132, name: 'Top' },
  { x: 128, y: 172, name: 'Upper left' },
  { x: 272, y: 172, name: 'Upper right' },
  { x: 82, y: 240, name: 'Far left' },
  { x: 318, y: 240, name: 'Far right' },
  { x: 158, y: 252, name: 'Lower left' },
  { x: 242, y: 252, name: 'Lower right' },
];

export const DEFAULT_COLOURS: Record<FlowerType, FlowerColours> = {
  rose: { petals: '#5FB3F5', centre: '#1F5FBF', leaves: '#5CB85C', stem: '#2F6B4F' },
  peony: { petals: '#F7C6CF', centre: '#FFE066', leaves: '#5CB85C', stem: '#2F6B4F' },
  daisy: { petals: '#FFFFFF', centre: '#FFE066', leaves: '#5CB85C', stem: '#2F6B4F' },
  lily: { petals: '#A99BEF', centre: '#F2C66D', leaves: '#26A69A', stem: '#2F6B4F' },
  tulip: { petals: '#CFEFFF', centre: '#5FB3F5', leaves: '#5CB85C', stem: '#2F6B4F' },
  starflower: { petals: '#CFEFFF', centre: '#F2C66D', leaves: '#26A69A', stem: '#2F6B4F' },
};

/** The garden's own bouquet: used by The First Bloom and as a fallback. */
export const GARDEN_BOUQUET: BouquetSpec = {
  version: 1,
  ribbon: '#C9D3E0',
  flowers: [
    { id: 'g0', type: 'rose', colours: { petals: '#5FB3F5', centre: '#1F5FBF', leaves: '#5CB85C', stem: '#2F6B4F' }, slot: 0, scale: 1.15, rotation: 0 },
    { id: 'g1', type: 'peony', colours: { petals: '#A99BEF', centre: '#FFFFFF', leaves: '#5CB85C', stem: '#2F6B4F' }, slot: 1, scale: 1, rotation: -10 },
    { id: 'g2', type: 'lily', colours: { petals: '#CFEFFF', centre: '#F2C66D', leaves: '#26A69A', stem: '#2F6B4F' }, slot: 2, scale: 1, rotation: 12 },
    { id: 'g3', type: 'daisy', colours: { petals: '#FFFFFF', centre: '#FFE066', leaves: '#5CB85C', stem: '#2F6B4F' }, slot: 3, scale: 0.85, rotation: -18 },
    { id: 'g4', type: 'starflower', colours: { petals: '#C8A2E8', centre: '#F2C66D', leaves: '#26A69A', stem: '#2F6B4F' }, slot: 4, scale: 0.85, rotation: 16 },
    { id: 'g5', type: 'tulip', colours: { petals: '#1F5FBF', centre: '#5FB3F5', leaves: '#5CB85C', stem: '#2F6B4F' }, slot: 5, scale: 0.9, rotation: -6 },
    { id: 'g6', type: 'rose', colours: { petals: '#F7C6CF', centre: '#F48FB1', leaves: '#5CB85C', stem: '#2F6B4F' }, slot: 6, scale: 0.9, rotation: 8 },
  ],
};

export const emptyBouquet = (): BouquetSpec => ({ version: 1, flowers: [], ribbon: RIBBONS[0].hex });

// ---------------------------------------------------------------- validation
const HEX = /^#[0-9A-F]{6}$/i;
const TYPES = new Set<string>(FLOWER_TYPES.map((f) => f.type));
const PARTS: FlowerPart[] = ['petals', 'centre', 'leaves', 'stem'];
const clamp = (n: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, n));

/** Returns a clean spec, or null if the data is unusable. Never throws. */
export function sanitizeBouquet(data: unknown): BouquetSpec | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (d.version !== 1 || !Array.isArray(d.flowers)) return null;
  const used = new Set<number>();
  const flowers: PlacedFlower[] = [];
  for (const raw of d.flowers.slice(0, MAX_FLOWERS)) {
    if (!raw || typeof raw !== 'object') continue;
    const f = raw as Record<string, unknown>;
    if (typeof f.type !== 'string' || !TYPES.has(f.type)) continue;
    const slot = Number(f.slot);
    if (!Number.isInteger(slot) || slot < 0 || slot >= SLOTS.length || used.has(slot)) continue;
    const c = (f.colours ?? {}) as Record<string, unknown>;
    const def = DEFAULT_COLOURS[f.type as FlowerType];
    const colours = Object.fromEntries(
      PARTS.map((p) => [p, typeof c[p] === 'string' && HEX.test(c[p] as string) ? (c[p] as string).toUpperCase() : def[p]]),
    ) as FlowerColours;
    used.add(slot);
    flowers.push({
      id: typeof f.id === 'string' && f.id.length <= 40 ? f.id : `f${slot}`,
      type: f.type as FlowerType,
      colours,
      slot,
      scale: Number.isFinite(Number(f.scale)) ? clamp(Number(f.scale), SCALE_RANGE) : 1,
      rotation: Number.isFinite(Number(f.rotation)) ? clamp(Number(f.rotation), ROTATION_RANGE) : 0,
    });
  }
  const ribbon = typeof d.ribbon === 'string' && HEX.test(d.ribbon) ? d.ribbon.toUpperCase() : RIBBONS[0].hex;
  return { version: 1, flowers, ribbon };
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
const browserStorage = (): StorageLike | null => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
};

export function saveBouquet(spec: BouquetSpec, storage: StorageLike | null = browserStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(spec));
    return true;
  } catch {
    return false; // private mode / quota
  }
}

export function loadBouquet(storage: StorageLike | null = browserStorage()): BouquetSpec | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? sanitizeBouquet(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/** The bouquet the certificate should use: hers if she made one, otherwise the garden's. */
export function bouquetForCertificate(spec: BouquetSpec | null): BouquetSpec {
  return spec && spec.flowers.length > 0 ? spec : GARDEN_BOUQUET;
}

// ---------------------------------------------------------------- operations
export function firstFreeSlot(spec: BouquetSpec): number {
  // Fill in a pleasing order: centre, then outwards.
  const order = [0, 1, 2, 5, 6, 3, 4];
  const used = new Set(spec.flowers.map((f) => f.slot));
  return order.find((s) => !used.has(s)) ?? -1;
}

let counter = 0;
export function addFlower(spec: BouquetSpec, type: FlowerType, colours: FlowerColours): BouquetSpec {
  const slot = firstFreeSlot(spec);
  if (slot < 0) return spec;
  const id = `f${Date.now().toString(36)}${(counter++).toString(36)}`;
  return { ...spec, flowers: [...spec.flowers, { id, type, colours: { ...colours }, slot, scale: 1, rotation: 0 }] };
}

export function updateFlower(spec: BouquetSpec, id: string, patch: Partial<Pick<PlacedFlower, 'scale' | 'rotation'>>): BouquetSpec {
  return {
    ...spec,
    flowers: spec.flowers.map((f) =>
      f.id !== id
        ? f
        : {
            ...f,
            scale: patch.scale !== undefined ? clamp(patch.scale, SCALE_RANGE) : f.scale,
            rotation: patch.rotation !== undefined ? clamp(patch.rotation, ROTATION_RANGE) : f.rotation,
          },
    ),
  };
}

/** Moves a flower to another slot, swapping with whoever is there. */
export function moveFlower(spec: BouquetSpec, id: string, toSlot: number): BouquetSpec {
  const me = spec.flowers.find((f) => f.id === id);
  if (!me || toSlot < 0 || toSlot >= SLOTS.length) return spec;
  const other = spec.flowers.find((f) => f.slot === toSlot);
  return {
    ...spec,
    flowers: spec.flowers.map((f) => (f.id === id ? { ...f, slot: toSlot } : other && f.id === other.id ? { ...f, slot: me.slot } : f)),
  };
}

export function removeFlower(spec: BouquetSpec, id: string): BouquetSpec {
  return { ...spec, flowers: spec.flowers.filter((f) => f.id !== id) };
}

export const isPaletteColour = (hex: string) => PALETTE.some((p) => p.hex.toUpperCase() === hex.toUpperCase());
