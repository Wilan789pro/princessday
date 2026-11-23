import { describe, expect, it } from 'vitest';
import {
  GARDEN_BOUQUET,
  MAX_FLOWERS,
  STORAGE_KEY,
  addFlower,
  bouquetForCertificate,
  emptyBouquet,
  loadBouquet,
  moveFlower,
  removeFlower,
  sanitizeBouquet,
  saveBouquet,
  updateFlower,
  DEFAULT_COLOURS,
  type BouquetSpec,
} from './bouquetModel';
import { certificateStampMarkup } from './certificateCanvas';
import { bouquetMarkup } from './exportImage';
import { garden } from '../content/garden';
import { princessDay } from '../content/princessDay';

function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    raw: m,
  };
}

function herBouquet(): BouquetSpec {
  let s = emptyBouquet();
  s = addFlower(s, 'rose', { petals: '#F48FB1', centre: '#7E57C2', leaves: '#26A69A', stem: '#2F6B4F' });
  s = addFlower(s, 'lily', { petals: '#FF7F6E', centre: '#FFE066', leaves: '#5CB85C', stem: '#2F6B4F' });
  return { ...s, ribbon: '#F2C66D' };
}

describe('bouquet persistence (localStorage["prism:bouquet"])', () => {
  it('saves and restores the exact specification', () => {
    const store = memoryStorage();
    const spec = herBouquet();
    expect(saveBouquet(spec, store)).toBe(true);
    expect(store.raw.has(STORAGE_KEY)).toBe(true);
    expect(STORAGE_KEY).toBe('prism:bouquet');
    expect(loadBouquet(store)).toEqual(spec);
  });

  it('returns null for missing or corrupt data instead of throwing', () => {
    const store = memoryStorage();
    expect(loadBouquet(store)).toBeNull();
    store.setItem(STORAGE_KEY, '{not json');
    expect(loadBouquet(store)).toBeNull();
    expect(loadBouquet(null)).toBeNull();
  });

  it('sanitizes tampered data', () => {
    const dirty = {
      version: 1,
      ribbon: 'javascript:alert(1)',
      flowers: [
        { id: 'a', type: 'rose', slot: 0, scale: 99, rotation: -400, colours: { petals: 'url(#x)', centre: '#123456' } },
        { id: 'b', type: 'cactus', slot: 1 },
        { id: 'c', type: 'daisy', slot: 0 }, // duplicate slot
        { id: 'd', type: 'lily', slot: 42 },
      ],
    };
    const clean = sanitizeBouquet(dirty)!;
    expect(clean.flowers).toHaveLength(1);
    const f = clean.flowers[0];
    expect(f.scale).toBe(1.3);
    expect(f.rotation).toBe(-30);
    expect(f.colours.petals).toBe(DEFAULT_COLOURS.rose.petals);
    expect(f.colours.centre).toBe('#123456');
    expect(clean.ribbon).toMatch(/^#[0-9A-F]{6}$/);
  });
});

describe('bouquet operations', () => {
  it('adds up to 7 flowers into unique slots', () => {
    let s = emptyBouquet();
    for (let i = 0; i < 9; i++) s = addFlower(s, 'daisy', DEFAULT_COLOURS.daisy);
    expect(s.flowers).toHaveLength(MAX_FLOWERS);
    expect(new Set(s.flowers.map((f) => f.slot)).size).toBe(MAX_FLOWERS);
  });
  it('moves (swapping), resizes within limits and removes', () => {
    let s = herBouquet();
    const [a, b] = s.flowers;
    s = moveFlower(s, a.id, b.slot);
    expect(s.flowers.find((f) => f.id === a.id)!.slot).toBe(b.slot);
    expect(s.flowers.find((f) => f.id === b.id)!.slot).toBe(a.slot);
    s = updateFlower(s, a.id, { scale: 5, rotation: 12 });
    expect(s.flowers.find((f) => f.id === a.id)).toMatchObject({ scale: 1.3, rotation: 12 });
    s = removeFlower(s, a.id);
    expect(s.flowers.map((f) => f.id)).toEqual([b.id]);
  });
});

describe('certificate uses her saved bouquet', () => {
  it('renders the stamp from the restored specification', () => {
    const store = memoryStorage();
    saveBouquet(herBouquet(), store);
    const restored = loadBouquet(store);
    const markup = certificateStampMarkup(restored);
    for (const hex of ['#F48FB1', '#7E57C2', '#FF7F6E', '#FFE066', '#F2C66D']) expect(markup).toContain(hex);
    expect(markup).toBe(bouquetMarkup(restored!, { background: false, pixelWidth: 640, idPrefix: 'cert' }));
  });

  it("falls back to the garden's bouquet only when hers is empty", () => {
    expect(bouquetForCertificate(null)).toBe(GARDEN_BOUQUET);
    expect(bouquetForCertificate(emptyBouquet())).toBe(GARDEN_BOUQUET);
    const mine = herBouquet();
    expect(bouquetForCertificate(mine)).toBe(mine);
  });

  it('produces self-contained SVG suitable for canvas export', () => {
    const markup = bouquetMarkup(GARDEN_BOUQUET, { pixelWidth: 2000 });
    expect(markup.startsWith('<svg')).toBe(true);
    expect(markup).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(markup).toContain('width="2000"');
    expect(markup).not.toMatch(/foreignObject|<image|href="http/);
  });
});

describe('Garden chapters (Five Little Secrets removed)', () => {
  it('has exactly four chapters, numbered I–IV, in order', () => {
    expect(garden.chapters.map((c) => c.id)).toEqual(['bloom', 'bouquet', 'wish', 'seal']);
    expect(garden.chapters.map((c) => c.numeral)).toEqual(['I', 'II', 'III', 'IV']);
  });
  it('no longer references the removed chapter anywhere in the Garden content', () => {
    const text = JSON.stringify(garden);
    expect(text).not.toMatch(/five little secrets|"secrets"|crownLine|unpredictable/i);
    expect('secrets' in garden).toBe(false);
  });
  it('keeps the original crystal collection untouched', () => {
    expect(princessDay.crystals.items.map((c) => c.name)).toEqual(['Brilliance', 'Kindness', 'Elegance', 'Mischief', 'Uniqueness']);
  });
});

describe('wealth response text', () => {
  it('is exactly the required wording', () => {
    expect(garden.wish.wealthResponse).toBe(
      'I know, I know... 😂💎\n\nA modest wish from a princess with very ambitious financial expectations.\n\nMay your bank account grow faster than your royal ego.\n\nAnd when you become ridiculously wealthy, please remember the humble people who supported your royal ambitions.',
    );
  });
});
