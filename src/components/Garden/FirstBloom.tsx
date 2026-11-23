import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, RotateCcw, Sprout } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { audio } from '../../audio/AudioEngine';
import { garden } from '../../content/garden';
import { GARDEN_BOUQUET } from '../../garden/bouquetModel';
import { DESIGNS } from '../../garden/flowerDesigns';
import { drawOn } from '../../garden/motion';
import { FlowerHead, Leaf } from './Flower';

type Phase = 'idle' | 'seed' | 'stem' | 'bud' | 'bloom' | 'more' | 'reveal';
const ORDER: Phase[] = ['idle', 'seed', 'stem', 'bud', 'bloom', 'more', 'reveal'];

const GROUND = { x: 200, y: 372 };
const MAIN = { x: 200, y: 178 };
const MAIN_FLOWER = GARDEN_BOUQUET.flowers[0];
/** Companion flowers that bloom around the first one (taken from the garden's bouquet). */
const COMPANIONS = [
  { f: GARDEN_BOUQUET.flowers[1], x: 126, y: 232, s: 0.9 },
  { f: GARDEN_BOUQUET.flowers[2], x: 274, y: 230, s: 0.9 },
  { f: GARDEN_BOUQUET.flowers[3], x: 152, y: 292, s: 0.75 },
  { f: GARDEN_BOUQUET.flowers[4], x: 250, y: 290, s: 0.75 },
];

const stem = (x: number, y: number) => `M${GROUND.x} ${GROUND.y} Q ${(GROUND.x + x) / 2 + (x === GROUND.x ? 6 : 0)} ${(GROUND.y + y) / 2 + 24} ${x} ${y}`;

/** CHAPTER I – a single seed becomes a bouquet. */
export function FirstBloom({ onContinue }: { onContinue: () => void }) {
  const reduced = !!useReducedMotion();
  const [phase, setPhase] = useState<Phase>(reduced ? 'reveal' : 'idle');
  const [run, setRun] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const at = (p: Phase) => ORDER.indexOf(phase) >= ORDER.indexOf(p);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const plant = () => {
    audio.init();
    audio.click();
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRun((r) => r + 1);
    if (reduced) {
      setPhase('reveal');
      return;
    }
    setPhase('seed');
    const seq: [number, Phase, () => void][] = [
      [1100, 'stem', () => audio.chime(0)],
      [2500, 'bud', () => {}],
      [3200, 'bloom', () => audio.chime(2)],
      [5000, 'more', () => audio.chime(4)],
      [7300, 'reveal', () => audio.swell(3)],
    ];
    for (const [ms, p, fx] of seq) {
      timers.current.push(
        setTimeout(() => {
          setPhase(p);
          fx();
        }, ms),
      );
    }
  };

  const draw = (delay = 0, duration = 1.3) => drawOn(delay, duration);

  return (
    <div className="bloom">
      <div className="garden-scene bloom__scene">
        <svg viewBox="0 0 400 440" className="bloom__svg" role="img" aria-label="A moonlit garden where a seed grows into a bouquet">
          <defs>
            <radialGradient id="bloom-moon" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="0.35" stopColor="#cfefff" stopOpacity="0.5" />
              <stop offset="1" stopColor="#a8dfff" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="bloom-halo" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#a8dfff" stopOpacity="0.55" />
              <stop offset="1" stopColor="#a8dfff" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="bloom-sheen" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.16" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* moon */}
          <circle cx="322" cy="70" r="60" fill="url(#bloom-moon)" />
          <circle cx="322" cy="70" r="22" fill="#eef6ff" />
          <circle cx="331" cy="64" r="20" fill="#0b1f3a" fillOpacity="0.92" />

          {/* ground */}
          <path d="M0 382 Q 90 352 200 370 T 400 362 V 440 H 0 Z" fill="#061226" />
          <path d="M0 382 Q 90 352 200 370 T 400 362" fill="none" stroke="#a8dfff" strokeOpacity="0.18" strokeWidth="1.2" />

          <motion.g
            key={run}
            animate={at('reveal') && !reduced ? { scale: 0.84, y: -6 } : { scale: 1, y: 0 }}
            transition={{ duration: 1.6, ease: [0.4, 0, 0.2, 1] }}
            style={{ transformBox: 'view-box', originX: 0.5, originY: 0.85 }}
          >
            {/* glow behind the first flower */}
            <motion.circle
              cx={MAIN.x}
              cy={MAIN.y}
              r="110"
              fill="url(#bloom-halo)"
              initial={{ opacity: 0 }}
              animate={{ opacity: at('bloom') ? 1 : 0 }}
              transition={{ duration: 1.6, delay: at('bloom') ? 1.2 : 0 }}
            />

            {/* seed */}
            <AnimatePresence>
              {(phase === 'idle' || phase === 'seed') && (
                <motion.g
                  key="seed"
                  initial={{ y: 0, opacity: 1 }}
                  animate={phase === 'seed' ? { y: GROUND.y - 60, opacity: 1 } : { y: [0, -6, 0] }}
                  exit={{ opacity: 0, scale: 2, transition: { duration: 0.5 } }}
                  transition={phase === 'seed' ? { duration: 1.1, ease: [0.5, 0, 0.75, 0] } : { duration: 3, repeat: Infinity }}
                >
                  <circle cx={GROUND.x} cy="60" r="16" fill="url(#bloom-halo)" />
                  <circle cx={GROUND.x} cy="60" r="4.5" fill="#ffffff" />
                </motion.g>
              )}
            </AnimatePresence>

            {/* companions (behind the main flower) */}
            {at('more') &&
              COMPANIONS.map((c, i) => (
                <g key={c.f.id}>
                  <motion.path d={stem(c.x, c.y)} fill="none" stroke={c.f.colours.stem} strokeWidth={3.2} strokeLinecap="round" {...draw(i * 0.15, 1)} />
                  <g transform={`translate(${c.x} ${c.y}) rotate(${c.f.rotation}) scale(${c.s})`}>
                    <FlowerHead type={c.f.type} colours={c.f.colours} unfold={{ delay: 0.8 + i * 0.18, stagger: 0.14 }} />
                  </g>
                </g>
              ))}

            {/* main stem + leaves */}
            {at('stem') && (
              <>
                <motion.path d={stem(MAIN.x, MAIN.y)} fill="none" stroke={MAIN_FLOWER.colours.stem} strokeWidth={4.2} strokeLinecap="round" {...draw(0, 1.4)} />
                {[
                  { t: 'translate(201 300) rotate(-12)', d: 0.9 },
                  { t: 'translate(199 330) scale(-1 1) rotate(-6)', d: 1.15 },
                ].map((l, i) => (
                  <motion.g
                    key={i}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: l.d, duration: 0.8, ease: [0.2, 0.8, 0.3, 1] }}
                    style={{ transformBox: 'fill-box', originX: i === 0 ? 0 : 1, originY: 0.7 }}
                  >
                    <Leaf colour={MAIN_FLOWER.colours.leaves} transform={l.t} />
                  </motion.g>
                ))}
              </>
            )}

            {/* bud, then the opening flower */}
            <AnimatePresence>
              {phase === 'bud' && (
                <motion.ellipse
                  key="bud"
                  cx={MAIN.x}
                  cy={MAIN.y - 8}
                  rx="11"
                  ry="17"
                  fill={MAIN_FLOWER.colours.petals}
                  stroke="rgba(7,20,38,0.35)"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.4, opacity: 0, transition: { duration: 0.5 } }}
                  transition={{ duration: 0.6 }}
                  style={{ transformBox: 'fill-box', originX: 0.5, originY: 1 }}
                />
              )}
            </AnimatePresence>
            {at('bloom') && (
              <g transform={`translate(${MAIN.x} ${MAIN.y}) scale(${DESIGNS[MAIN_FLOWER.type].upright ? 1.2 : 1.45})`}>
                <FlowerHead type={MAIN_FLOWER.type} colours={MAIN_FLOWER.colours} unfold={reduced ? undefined : { delay: 0, stagger: 0.32 }} />
              </g>
            )}

            {/* ribbon once the bouquet is revealed */}
            {at('reveal') && (
              <motion.g initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduced ? 0 : 0.9, duration: 0.8 }}>
                <path d="M184 352 L216 352 L213 364 L187 364 Z" fill="#c9d3e0" />
                <path d="M200 356 C 178 336 160 346 168 360 C 175 372 190 364 200 356 Z" fill="#c9d3e0" />
                <path d="M200 356 C 222 336 240 346 232 360 C 225 372 210 364 200 356 Z" fill="#b4c2d6" />
                <ellipse cx="200" cy="357" rx="6" ry="7" fill="#d8e4f2" />
              </motion.g>
            )}
          </motion.g>

          {/* light moving across the petals */}
          {at('reveal') && !reduced && (
            <motion.rect
              y="90"
              width="120"
              height="300"
              fill="url(#bloom-sheen)"
              initial={{ x: -140 }}
              animate={{ x: 440 }}
              transition={{ duration: 2.6, delay: 1.4, repeat: Infinity, repeatDelay: 3.5, ease: 'easeInOut' }}
            />
          )}
        </svg>

        {phase === 'idle' && (
          <div className="bloom__start">
            <button type="button" className="btn btn--primary" onClick={plant}>
              <Sprout size={18} aria-hidden="true" /> {garden.bloom.plantLabel}
            </button>
          </div>
        )}
      </div>

      <div className="bloom__after" aria-live="polite">
        <AnimatePresence>
          {phase === 'reveal' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduced ? 0 : 1.2, duration: 1 }}>
              <p className="bloom__message serif">{garden.bloom.message}</p>
              <div className="garden__actions">
                <button type="button" className="btn btn--primary" onClick={onContinue}>
                  {garden.bloom.continueLabel} <ArrowRight size={18} aria-hidden="true" />
                </button>
                {!reduced && (
                  <button type="button" className="btn btn--ghost btn--small" onClick={plant}>
                    <RotateCcw size={16} aria-hidden="true" /> {garden.bloom.replayLabel}
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
