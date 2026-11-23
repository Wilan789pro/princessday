import { AnimatePresence, animate, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { audio } from '../../audio/AudioEngine';
import { garden } from '../../content/garden';
import { princessDay } from '../../content/princessDay';
import { Crystal } from '../Crystal/Crystal';
import { drawOn } from '../../garden/motion';
import { FlowerHead } from './Flower';
import { SecretSymbol } from './SecretSymbol';

const SESSION_KEY = 'prism:garden-secrets';
const ITEMS = garden.secrets.items;
/** The crown crystal each flower is linked to (hue + gem shape reused, not duplicated). */
const crystalFor = (crystalId: string) => princessDay.crystals.items.find((c) => c.id === crystalId);

/** Crown positions (percent of the crown box): centre is the highest point. */
const CROWN = [
  { x: 13, y: 60, s: 0.82 },
  { x: 31, y: 38, s: 0.92 },
  { x: 50, y: 24, s: 1.08 },
  { x: 69, y: 38, s: 0.92 },
  { x: 87, y: 60, s: 0.82 },
];

function readFound(): string[] {
  try {
    const raw = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((id) => ITEMS.some((s) => s.id === id)) : [];
  } catch {
    return [];
  }
}

function FlowerArt({ index, open }: { index: number; open: boolean }) {
  const s = ITEMS[index];
  return (
    <svg viewBox="-60 -64 120 120" className="secret__art" aria-hidden="true">
      <motion.g
        initial={false}
        animate={{ scale: open ? 1 : 0.58, rotate: open ? 0 : -18, opacity: open ? 1 : 0.72 }}
        transition={{ type: 'spring', stiffness: 160, damping: 14 }}
      >
        <FlowerHead type={s.flower} colours={s.colours} />
      </motion.g>
    </svg>
  );
}

/** CHAPTER III – five flowers, five secrets, one floral crown. */
export function FiveSecrets({ onContinue }: { onContinue: () => void }) {
  const t = garden.secrets;
  const reduced = useReducedMotion();
  const [found, setFound] = useState<string[]>(readFound);
  const [active, setActive] = useState<string | null>(null);
  const complete = found.length === ITEMS.length;
  const [crowned, setCrowned] = useState(complete);
  /*
   * The crown formation is a manual FLIP animation (measure each flower in the
   * grid, then fly it from there to its crown position). Shared-layout ids
   * were avoided on purpose: they kept the chapter transition from finishing.
   */
  const gridEls = useRef<Record<string, HTMLElement | null>>({});
  const crownEls = useRef<Record<string, HTMLElement | null>>({});
  const fromRects = useRef<Record<string, DOMRect>>({});
  const activeItem = ITEMS.find((s) => s.id === active);

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(found));
    } catch {
      /* private mode */
    }
  }, [found]);

  useEffect(() => {
    if (!complete || crowned) return;
    const id = setTimeout(() => {
      for (const s of ITEMS) {
        const el = gridEls.current[s.id];
        if (el) fromRects.current[s.id] = el.getBoundingClientRect();
      }
      setCrowned(true);
      audio.golden();
    }, reduced ? 300 : 1500);
    return () => clearTimeout(id);
  }, [complete, crowned, reduced]);

  useLayoutEffect(() => {
    if (!crowned || reduced) return;
    const controls = ITEMS.map((s, i) => {
      const el = crownEls.current[s.id];
      const from = fromRects.current[s.id];
      if (!el || !from) return null;
      const to = el.getBoundingClientRect();
      const dx = from.left + from.width / 2 - (to.left + to.width / 2);
      const dy = from.top + from.height / 2 - (to.top + to.height / 2);
      const sc = to.width ? from.width / to.width : 1;
      return animate(el, { x: [dx, 0], y: [dy, 0], scale: [sc, 1] }, { type: 'spring', stiffness: 90, damping: 16, delay: i * 0.07 });
    });
    fromRects.current = {};
    return () => controls.forEach((c) => c?.stop());
  }, [crowned, reduced]);

  const reveal = (id: string, i: number) => {
    audio.chime(i + 1);
    setActive(id);
    setFound((f) => (f.includes(id) ? f : [...f, id]));
  };

  return (
    <div className="secrets">
      <p className="garden__lead">{t.intro}</p>

        <div className={`garden-scene secrets__scene ${crowned ? 'is-crowned' : ''}`}>
          {!crowned ? (
            <ul className="secrets__grid" role="list">
              {ITEMS.map((s, i) => {
                const open = found.includes(s.id);
                return (
                  <li key={s.id}>
                    <motion.button
                      ref={(el) => {
                        gridEls.current[s.id] = el;
                      }}
                      type="button"
                      className={`secret ${open ? 'is-open' : ''} ${active === s.id ? 'is-active' : ''}`}
                      onClick={() => reveal(s.id, i)}
                      aria-pressed={active === s.id}
                      aria-label={open ? `${s.name}: show the secret again` : `A closed flower with a ${s.symbol}. Tap to reveal its secret`}
                    >
                      <motion.span
                        className="secret__symbol"
                        animate={open ? { y: -6, scale: 1.15 } : reduced ? {} : { y: [0, -5, 0] }}
                        transition={open ? { type: 'spring' } : { duration: 2.6 + i * 0.3, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <SecretSymbol kind={s.symbol} colour={open ? '#ffffff' : '#a8dfff'} />
                        {open && !reduced && <span className="secret__burst" aria-hidden="true" />}
                      </motion.span>
                      <FlowerArt index={i} open={open} />
                      <span className="secret__name">{open ? s.name : '· · ·'}</span>
                    </motion.button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="crown" role="group" aria-label="A floral crown made of the five flowers">
              <svg className="crown__band" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <motion.path
                  d="M4 70 Q 50 96 96 70"
                  fill="none"
                  stroke="#a8dfff"
                  strokeWidth="1.4"
                  {...drawOn(0.5, reduced ? 0 : 1.2, false)}
                />
                <motion.path
                  d="M4 74 Q 50 100 96 74"
                  fill="none"
                  stroke="#c9d3e0"
                  strokeOpacity="0.5"
                  strokeWidth="0.8"
                  {...drawOn(0.7, reduced ? 0 : 1.2, false)}
                />
              </svg>
              <span className="crown__glow" aria-hidden="true" />
              {ITEMS.map((s, i) => (
                <button
                  key={s.id}
                  ref={(el) => {
                    crownEls.current[s.id] = el;
                  }}
                  type="button"
                  className="crown__flower"
                  style={{ left: `${CROWN[i].x}%`, top: `${CROWN[i].y}%`, width: `${26 * CROWN[i].s}%` }}
                  onClick={() => reveal(s.id, i)}
                  aria-label={`${s.name}: show the secret again`}
                >
                  <FlowerArt index={i} open />
                </button>
              ))}
              {ITEMS.slice(0, 4).map((s, i) => {
                const c = crystalFor(s.crystalId);
                const x = (CROWN[i].x + CROWN[i + 1].x) / 2;
                const y = (CROWN[i].y + CROWN[i + 1].y) / 2 + 14;
                return (
                  <motion.span
                    key={`gem-${s.id}`}
                    className="crown__gem"
                    style={{ left: `${x}%`, top: `${y}%` }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: (reduced ? 0 : 1) + i * 0.12, type: 'spring' }}
                    aria-hidden="true"
                  >
                    <Crystal hue={c?.hue ?? 'sapphire'} shape={c?.shape ?? 0} size={22} sparkle={false} />
                  </motion.span>
                );
              })}
              {!reduced && (
                <span className="crown__sparkles" aria-hidden="true">
                  {Array.from({ length: 10 }, (_, i) => (
                    <i key={i} style={{ left: `${8 + i * 9}%`, top: `${18 + ((i * 37) % 50)}%`, animationDelay: `${i * 0.35}s` }} />
                  ))}
                </span>
              )}
            </div>
          )}
        </div>

      <p className="secrets__progress mono" aria-live="polite">
        {t.progress(found.length)}
      </p>

      <div className="secrets__panel-wrap">
        <AnimatePresence mode="wait">
          {activeItem && (
            <motion.div
              key={activeItem.id}
              className="glass secrets__panel"
              initial={{ opacity: 0, y: 14, filter: reduced ? 'none' : 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45 }}
              aria-live="polite"
            >
              <p className="eyebrow secrets__panel-title">
                <span className="secrets__panel-icon">
                  <SecretSymbol kind={activeItem.symbol} colour="#a8dfff" />
                </span>
                {activeItem.name}
              </p>
              <p className="secrets__message serif">{activeItem.message}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {crowned && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduced ? 0 : 1.6, duration: 1 }}>
            <p className="secrets__crown-line serif">{t.crownLine}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="garden__actions">
        <button type="button" className={`btn ${complete ? 'btn--primary' : 'btn--ghost'}`} onClick={onContinue}>
          {t.continueLabel} <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
