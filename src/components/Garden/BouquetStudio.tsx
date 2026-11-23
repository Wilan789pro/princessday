import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeftRight,
  ArrowRight,
  Download,
  Minus,
  PaintBucket,
  Plus,
  RotateCcw,
  RotateCw,
  Sparkles,
  Trash2,
  Undo2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { audio } from '../../audio/AudioEngine';
import { FLOWER_TYPES, PALETTE, PART_LABELS, RIBBONS, garden, type FlowerPart, type FlowerType } from '../../content/garden';
import {
  DEFAULT_COLOURS,
  GARDEN_BOUQUET,
  MAX_FLOWERS,
  SLOTS,
  addFlower,
  moveFlower,
  removeFlower,
  updateFlower,
  type BouquetSpec,
  type FlowerColours,
} from '../../garden/bouquetModel';
import { bouquetPng, savePng } from '../../garden/exportImage';
import { DESIGNS } from '../../garden/flowerDesigns';
import { BouquetSVG } from './BouquetSVG';
import { ColourPalette } from './ColourPalette';
import { FlowerFull, FlowerHead } from './Flower';

interface Props {
  spec: BouquetSpec;
  onChange: (spec: BouquetSpec) => void;
  onContinue: () => void;
}

type Tab = 'colour' | 'arrange';
type Snapshot = { type: FlowerType; colours: FlowerColours };
const PARTS: FlowerPart[] = ['petals', 'centre', 'leaves', 'stem'];
const SLOT_ORDER = [3, 1, 5, 0, 6, 2, 4]; // left → right
/** Upright (side-view) flowers grow above the stem point, so frame them higher. */
const thumbBox = (t: FlowerType) => (DESIGNS[t].upright ? '-50 -72 100 100' : '-56 -56 112 112');

/** CHAPTER II – colour flowers, then arrange them into her own bouquet. */
export function BouquetStudio({ spec, onChange, onContinue }: Props) {
  const b = garden.bouquet;
  const reduced = useReducedMotion();
  const [tab, setTab] = useState<Tab>(spec.flowers.length >= 2 ? 'arrange' : 'colour');
  const [type, setType] = useState<FlowerType>('rose');
  const [drafts, setDrafts] = useState<Record<FlowerType, FlowerColours>>(() => structuredClone(DEFAULT_COLOURS));
  const [part, setPart] = useState<FlowerPart>('petals');
  const [brush, setBrush] = useState<string | null>(null);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [gatherKey, setGatherKey] = useState(0);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const pngRef = useRef<{ key: string; blob: Blob } | null>(null);

  const colours = drafts[type];
  const full = spec.flowers.length >= MAX_FLOWERS;
  const specKey = useMemo(() => JSON.stringify(spec), [spec]);
  const selected = spec.flowers.find((f) => f.id === selectedId) ?? null;

  // Prepare the PNG ahead of time once the bouquet has been gathered, so the
  // download / share sheet opens instantly (iOS requires a fresh tap for sharing).
  useEffect(() => {
    if (!gatherKey || spec.flowers.length === 0) return;
    let cancelled = false;
    const id = setTimeout(() => {
      bouquetPng(spec)
        .then((blob) => {
          if (!cancelled) pngRef.current = { key: specKey, blob };
        })
        .catch(() => {});
    }, 2600);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [gatherKey, specKey, spec]);

  const announce = (msg: string) => setStatus(msg);

  const paint = (p: FlowerPart, hex: string) => {
    if (drafts[type][p] === hex) return;
    setHistory((h) => [...h.slice(-40), { type, colours: { ...drafts[type] } }]);
    setDrafts((d) => ({ ...d, [type]: { ...d[type], [p]: hex } }));
    audio.click();
  };

  const tapPart = (p: FlowerPart) => {
    setPart(p);
    if (brush) {
      paint(p, brush);
      announce(`${PART_LABELS[p]} painted`);
    } else announce(`${PART_LABELS[p]} selected – choose a colour`);
  };

  const pickColour = (hex: string) => {
    setBrush(hex);
    paint(part, hex);
    const name = PALETTE.find((c) => c.hex === hex)?.name ?? 'Colour';
    announce(`${PART_LABELS[part]}: ${name}`);
  };

  const fillAll = () => {
    if (!brush) return announce('Choose a colour first');
    setHistory((h) => [...h.slice(-40), { type, colours: { ...colours } }]);
    setDrafts((d) => ({ ...d, [type]: { petals: brush, centre: brush, leaves: brush, stem: brush } }));
    audio.click();
    announce('Whole flower filled');
  };

  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    setType(last.type);
    setDrafts((d) => ({ ...d, [last.type]: last.colours }));
    announce('Undone');
  };

  const resetFlower = () => {
    setHistory((h) => [...h.slice(-40), { type, colours: { ...colours } }]);
    setDrafts((d) => ({ ...d, [type]: { ...DEFAULT_COLOURS[type] } }));
    announce('Flower reset');
  };

  const add = () => {
    if (full) return;
    const nextSpec = addFlower(spec, type, colours);
    onChange(nextSpec);
    audio.chime(nextSpec.flowers.length);
    announce(`Added to your bouquet (${nextSpec.flowers.length} of ${MAX_FLOWERS})`);
  };

  const shiftSlot = (dir: -1 | 1) => {
    if (!selected) return;
    const i = SLOT_ORDER.indexOf(selected.slot);
    const to = SLOT_ORDER[(i + dir + SLOT_ORDER.length) % SLOT_ORDER.length];
    onChange(moveFlower(spec, selected.id, to));
    announce(`Moved to ${SLOTS[to].name.toLowerCase()}`);
  };

  const gather = () => {
    setGatherKey((k) => k + 1);
    setSelectedId(null);
    audio.swell(2.5);
    announce('The stems gather into a bouquet');
  };

  const download = async () => {
    if (saving || spec.flowers.length === 0) return;
    setSaving(true);
    try {
      const ready = pngRef.current?.key === specKey ? pngRef.current.blob : await bouquetPng(spec);
      const r = await savePng(ready, 'my-royal-bouquet.png', 'My royal bouquet');
      announce(r === 'cancelled' ? 'Saving cancelled' : r === 'shared' ? 'Bouquet ready to save' : 'Bouquet downloaded');
    } catch {
      announce('Sorry, the bouquet image could not be created on this device.');
    } finally {
      setSaving(false);
    }
  };

  const finish = () => {
    if (spec.flowers.length === 0) onChange(structuredClone(GARDEN_BOUQUET));
    onContinue();
  };

  return (
    <div className="studio">
      <p className="garden__lead">{b.intro}</p>

      <div className="studio__tabs" role="tablist" aria-label="Bouquet studio">
        {(['colour', 'arrange'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`studio__tab ${tab === t ? 'is-on' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'colour' ? b.colourTab : `${b.arrangeTab} (${spec.flowers.length})`}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {tab === 'colour' ? (
          <motion.div
            key="colour"
            className="studio__panel studio__colour"
            role="tabpanel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="studio__types" role="group" aria-label={b.chooseFlower}>
              {FLOWER_TYPES.map((f) => (
                <button
                  key={f.type}
                  type="button"
                  className={`studio__type ${f.type === type ? 'is-on' : ''}`}
                  onClick={() => setType(f.type)}
                  aria-pressed={f.type === type}
                >
                  <svg viewBox={thumbBox(f.type)} aria-hidden="true">
                    <FlowerHead type={f.type} colours={drafts[f.type]} />
                  </svg>
                  <span>{f.name}</span>
                </button>
              ))}
            </div>

            <div className="studio__workbench">
              <div className="garden-scene studio__canvas">
                <FlowerFull
                  type={type}
                  colours={colours}
                  selected={part}
                  onPart={tapPart}
                  title={`${FLOWER_TYPES.find((f) => f.type === type)?.name}. Tap a part to paint it.`}
                />
                <p className="studio__hint">{brush ? 'Tap any part to paint it' : 'Pick a colour below'}</p>
              </div>

              <div className="studio__controls">
                <p className="studio__label">{b.choosePart}</p>
                <div className="studio__parts" role="group" aria-label={b.choosePart}>
                  {PARTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`studio__part ${part === p ? 'is-on' : ''}`}
                      onClick={() => setPart(p)}
                      aria-pressed={part === p}
                    >
                      <span className="studio__part-dot" style={{ background: colours[p] }} aria-hidden="true" />
                      {PART_LABELS[p]}
                    </button>
                  ))}
                </div>

                <p className="studio__label">{b.chooseColour}</p>
                <ColourPalette colours={PALETTE} value={brush} onPick={pickColour} label={b.chooseColour} />

                <div className="studio__tools">
                  <button type="button" className="btn btn--ghost btn--small" onClick={fillAll} disabled={!brush}>
                    <PaintBucket size={16} aria-hidden="true" /> {b.fillAll}
                  </button>
                  <button type="button" className="btn btn--ghost btn--small" onClick={undo} disabled={history.length === 0}>
                    <Undo2 size={16} aria-hidden="true" /> {b.undo}
                  </button>
                  <button type="button" className="btn btn--ghost btn--small" onClick={resetFlower}>
                    <RotateCcw size={16} aria-hidden="true" /> {b.resetFlower}
                  </button>
                </div>

                <button type="button" className="btn btn--primary studio__add" onClick={add} disabled={full}>
                  <Plus size={18} aria-hidden="true" /> {full ? b.bouquetFull : b.addToBouquet}
                </button>
                {spec.flowers.length > 0 && (
                  <button type="button" className="studio__link" onClick={() => setTab('arrange')}>
                    Arrange my bouquet ({spec.flowers.length}) →
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="arrange"
            className="studio__panel studio__arrange"
            role="tabpanel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="garden-scene studio__bouquet">
              <BouquetSVG
                key={gatherKey}
                spec={spec}
                gather={gatherKey > 0 && !reduced}
                selectedId={selectedId}
                onSelect={(id) => setSelectedId((s) => (s === id ? null : id))}
                idPrefix="studio"
                title={`Your bouquet with ${spec.flowers.length} flowers`}
              />
              {spec.flowers.length === 0 && <p className="studio__empty">{b.emptyBouquet}</p>}
            </div>

            <div className="studio__controls">
              {spec.flowers.length > 0 && (
                <>
                  <p className="studio__label">Tap a flower to adjust it</p>
                  <div className="studio__chips" role="group" aria-label="Flowers in your bouquet">
                    {[...spec.flowers]
                      .sort((a, c) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(c.slot))
                      .map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          className={`studio__chip ${selectedId === f.id ? 'is-on' : ''}`}
                          onClick={() => setSelectedId((s) => (s === f.id ? null : f.id))}
                          aria-pressed={selectedId === f.id}
                          aria-label={`${FLOWER_TYPES.find((t) => t.type === f.type)?.name}, ${SLOTS[f.slot].name.toLowerCase()}`}
                        >
                          <svg viewBox={thumbBox(f.type)} aria-hidden="true">
                            <FlowerHead type={f.type} colours={f.colours} />
                          </svg>
                        </button>
                      ))}
                  </div>

                  <div className={`studio__adjust ${selected ? '' : 'is-disabled'}`} aria-live="polite">
                    <button type="button" className="studio__icon" onClick={() => shiftSlot(-1)} disabled={!selected} aria-label="Move left">
                      <ArrowLeftRight size={18} aria-hidden="true" style={{ transform: 'scaleX(-1)' }} />
                    </button>
                    <button type="button" className="studio__icon" onClick={() => shiftSlot(1)} disabled={!selected} aria-label="Move right">
                      <ArrowLeftRight size={18} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="studio__icon"
                      onClick={() => selected && onChange(updateFlower(spec, selected.id, { scale: selected.scale - 0.1 }))}
                      disabled={!selected}
                      aria-label="Smaller"
                    >
                      <Minus size={18} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="studio__icon"
                      onClick={() => selected && onChange(updateFlower(spec, selected.id, { scale: selected.scale + 0.1 }))}
                      disabled={!selected}
                      aria-label="Larger"
                    >
                      <Plus size={18} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="studio__icon"
                      onClick={() => selected && onChange(updateFlower(spec, selected.id, { rotation: selected.rotation - 8 }))}
                      disabled={!selected}
                      aria-label="Tilt left"
                    >
                      <RotateCcw size={18} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="studio__icon"
                      onClick={() => selected && onChange(updateFlower(spec, selected.id, { rotation: selected.rotation + 8 }))}
                      disabled={!selected}
                      aria-label="Tilt right"
                    >
                      <RotateCw size={18} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="studio__icon studio__icon--danger"
                      onClick={() => {
                        if (!selected) return;
                        onChange(removeFlower(spec, selected.id));
                        setSelectedId(null);
                        announce('Flower removed');
                      }}
                      disabled={!selected}
                      aria-label="Remove flower"
                    >
                      <Trash2 size={18} aria-hidden="true" />
                    </button>
                  </div>

                  <p className="studio__label">{b.ribbon}</p>
                  <ColourPalette
                    colours={RIBBONS}
                    value={spec.ribbon}
                    onPick={(hex) => onChange({ ...spec, ribbon: hex })}
                    label="Ribbon colour"
                    compact
                  />

                  <div className="studio__tools">
                    <button type="button" className="btn btn--ghost btn--small" onClick={gather}>
                      <Sparkles size={16} aria-hidden="true" /> {b.gather}
                    </button>
                    <button type="button" className="btn btn--ghost btn--small" onClick={download} disabled={saving}>
                      <Download size={16} aria-hidden="true" /> {saving ? 'Preparing…' : b.download}
                    </button>
                  </div>
                </>
              )}
              {!full && (
                <button type="button" className="studio__link" onClick={() => setTab('colour')}>
                  ← Colour another flower
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>
      {status && (
        <p className="studio__status" aria-hidden="true">
          {status}
        </p>
      )}

      <div className="garden__actions">
        <button type="button" className="btn btn--primary" onClick={finish}>
          {spec.flowers.length === 0 ? b.useGardenBouquet : b.continueLabel} <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
