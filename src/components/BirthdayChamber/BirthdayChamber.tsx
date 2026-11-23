import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { KeyRound, Lock } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { audio } from '../../audio/AudioEngine';
import { project25 } from '../../content/birthday';
import { BIRTHDAY_MS, PRINCESS_DAY_MS } from '../../utils/dates';
import { now } from '../../utils/clock';
import { Crystal } from '../Crystal/Crystal';
import { initialDoorState, pressLockedDoor, type DoorReaction } from '../../utils/refusals';
import './BirthdayChamber.css';

type ChamberState = 'locked' | 'ready' | 'opening' | 'open';
type Phase = 'idle' | 'charge' | 'unlock' | 'light' | 'part' | 'done';

interface Props {
  /** True once the countdown has reached zero. */
  reached: boolean;
  /** Fired when the light breaks through – switches the page to gold. */
  onGold: () => void;
  /** Fired when the doors have fully opened. */
  onOpened: () => void;
}

const SEGMENTS = 25;

function FacetPattern() {
  return (
    <svg className="chamber__facets" viewBox="0 0 100 200" preserveAspectRatio="none" aria-hidden="true">
      <g fill="none" stroke="rgba(168,223,255,0.28)" strokeWidth="0.5">
        <polyline points="100,0 60,40 100,80" />
        <polyline points="100,80 40,100 100,120" />
        <polyline points="100,120 60,160 100,200" />
        <polyline points="60,40 0,30" />
        <polyline points="40,100 0,100" />
        <polyline points="60,160 0,170" />
        <polyline points="60,40 40,100 60,160" />
        <polyline points="0,30 40,100 0,170" />
      </g>
      <g fill="rgba(168,223,255,0.05)">
        <polygon points="100,0 60,40 100,80" />
        <polygon points="100,120 60,160 100,200" />
      </g>
      <g fill="rgba(2,8,20,0.25)">
        <polygon points="60,40 40,100 60,160 100,120 40,100 100,80" />
      </g>
    </svg>
  );
}

/** ACT VI-B – the sealed vault door, and its opening ceremony. */
export function BirthdayChamber({ reached, onGold, onOpened }: Props) {
  const c = project25.chamber;
  const reduced = !!useReducedMotion();
  const [state, setState] = useState<ChamberState>(reached ? 'ready' : 'locked');
  const [phase, setPhase] = useState<Phase>('idle');
  /** Locked-door refusals: cosmetic only, never involved in opening the chamber. */
  const [pokes, setPokes] = useState(0);
  const [refusal, setRefusal] = useState<{ message: string; reaction: DoorReaction } | null>(null);
  const doorState = useRef(initialDoorState());
  const lastDoorSound = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cbs = useRef({ onGold, onOpened });
  cbs.current = { onGold, onOpened };
  const wasLockedOnMount = useRef(!reached);

  const particles = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => {
        const a = (i / 28) * Math.PI * 2 + Math.random() * 0.4;
        const r = 120 + Math.random() * 120;
        return { x: Math.cos(a) * r, y: Math.sin(a) * r, d: Math.random() * 1.2, s: 2 + Math.random() * 3 };
      }),
    [],
  );

  const progress = Math.min(1, Math.max(0, (now() - PRINCESS_DAY_MS) / (BIRTHDAY_MS - PRINCESS_DAY_MS)));
  const lit = phase === 'idle' ? Math.floor(progress * SEGMENTS) : SEGMENTS;

  const open = () => {
    if (state === 'opening' || state === 'open') return;
    setState('opening');
    rootRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    const k = reduced ? 0.25 : 1;
    const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms * k));
    setPhase('charge');
    audio.charge(2.6 * k);
    at(2600, () => {
      setPhase('unlock');
      audio.clunk();
    });
    at(3700, () => {
      setPhase('light');
      audio.swell(2);
      cbs.current.onGold();
    });
    at(4500, () => {
      setPhase('part');
      audio.golden();
    });
    at(7600, () => {
      setPhase('done');
      setState('open');
      cbs.current.onOpened();
    });
  };

  // Live transition: the countdown hit zero while she was here → open automatically.
  useEffect(() => {
    if (reached && wasLockedOnMount.current && state === 'locked') {
      wasLockedOnMount.current = false;
      const id = setTimeout(open, 900);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reached]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const refusalContent = useMemo(
    () => ({ opening: c.curiousLines, pool: [...c.curiousLines, ...c.refusals], special: c.specialRefusals }),
    [c],
  );

  /**
   * A press on the LOCKED door: picks the next refusal and a small reaction.
   * Deliberately touches nothing else – not state, phase, reached or open().
   */
  const pressDoor = () => {
    const r = pressLockedDoor(doorState.current, refusalContent);
    doorState.current = r.state;
    setRefusal({ message: r.message, reaction: r.reaction });
    setPokes(r.state.presses);
    const t = performance.now();
    if (t - lastDoorSound.current > 250) {
      lastDoorSound.current = t;
      if (r.state.presses % 2 === 1) audio.clunk();
      else audio.chime(r.state.presses % 7);
    }
  };

  const showRays = phase === 'part' || phase === 'done';

  return (
    <section className="section chamber" aria-labelledby="chamber-title" ref={rootRef}>
      <p className="eyebrow">Chamber 25</p>
      <h2 id="chamber-title" className="chamber__title mono">
        {c.name}
      </h2>
      <p className="section-sub">{c.description}</p>

      <div className={`chamber__vault chamber--${state} chamber--phase-${phase}`}>
        <div className="chamber__interior" aria-hidden="true">
          <span className="chamber__interior-glow" />
          <span className="chamber__25 serif text-gold">25</span>
        </div>

        <div className="chamber__leaf chamber__leaf--l" aria-hidden="true">
          <FacetPattern />
        </div>
        <div className="chamber__leaf chamber__leaf--r" aria-hidden="true">
          <FacetPattern />
        </div>
        <span className="chamber__seam" aria-hidden="true" />

        <div className="chamber__lock" aria-hidden="true">
          <motion.div
            key={pokes}
            className="chamber__lock-inner"
            animate={
              pokes && !reduced && state === 'locked'
                ? refusal?.reaction === 'wobble'
                  ? { rotate: [0, -9, 7, -4, 2, 0] }
                  : refusal?.reaction === 'shake'
                    ? { x: [0, -8, 8, -6, 6, 0] }
                    : { scale: [1, 1.06, 1] }
                : {}
            }
            transition={{ duration: 0.45 }}
          >
            <svg viewBox="0 0 120 120" className="chamber__ring">
              {Array.from({ length: SEGMENTS }, (_, i) => (
                <rect
                  key={i}
                  x="58"
                  y="4"
                  width="4"
                  height="12"
                  rx="2"
                  className={i < lit ? 'is-lit' : ''}
                  style={{ transitionDelay: phase === 'charge' ? `${i * 70}ms` : '0ms' }}
                  transform={`rotate(${(i * 360) / SEGMENTS} 60 60)`}
                />
              ))}
              <circle cx="60" cy="60" r="38" className="chamber__ring-core" />
            </svg>
            <span className="chamber__bolt chamber__bolt--t" />
            <span className="chamber__bolt chamber__bolt--b" />
            <span className="chamber__bolt chamber__bolt--l" />
            <span className="chamber__bolt chamber__bolt--r" />
            <span className="chamber__gem">
              <Crystal hue={phase === 'light' || phase === 'part' ? 'gold' : 'sapphire'} shape={2} size={34} sparkle={false} />
            </span>
          </motion.div>
        </div>

        {state === 'locked' && pokes > 0 && !reduced && (
          <span key={pokes} className={`chamber__poke chamber__poke--${refusal?.reaction ?? 'shake'}`} aria-hidden="true" />
        )}

        <div className="chamber__particles" aria-hidden="true">
          {particles.map((p, i) => (
            <i
              key={i}
              style={{
                ['--x' as string]: `${p.x}px`,
                ['--y' as string]: `${p.y}px`,
                ['--d' as string]: `${p.d}s`,
                width: p.s,
                height: p.s,
              }}
            />
          ))}
        </div>

        {state === 'locked' && (
          <button
            type="button"
            className="chamber__hit"
            onClick={pressDoor}
            aria-label="The 25th Chamber. Access restricted, sealed until 18 December 2026. Try the door."
            aria-describedby="chamber-refusal"
          />
        )}
        {state === 'ready' && (
          <button type="button" className="chamber__hit" onClick={open} aria-label="Open the 25th Chamber" />
        )}
      </div>

      <p id="chamber-refusal" className="sr-only" aria-live="polite" aria-atomic="true">
        {state === 'locked' && refusal ? refusal.message : ''}
      </p>
      <div className="chamber__status" aria-live="polite">
        {state === 'locked' && (
          <>
            <p className="chamber__locked mono">
              <Lock size={14} aria-hidden="true" /> {c.lockedTitle}
            </p>
            <p className="chamber__sealed mono">{c.lockedSub}</p>
            {/* One complete line per press, replaced instantly – rapid taps never cut a message short. */}
            {pokes > 0 && refusal && (
              <div className="glass chamber__curious" aria-hidden="true">
                <motion.p
                  key={pokes}
                  className={`serif chamber__curious-lead${pokes <= 1 ? '' : ' chamber__curious-lead--small'}`}
                  initial={reduced ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  {refusal.message}
                </motion.p>
                <p className="chamber__attempts mono" aria-hidden="true">
                  Attempt {pokes}
                </p>
              </div>
            )}
            {pokes === 0 && <p className="chamber__tap-hint">{c.doorHint}</p>}
          </>
        )}
        {state === 'ready' && (
          <button type="button" className="btn btn--gold" onClick={open}>
            <KeyRound size={18} aria-hidden="true" /> {c.readyLabel}
          </button>
        )}
        {state === 'opening' && <p className="chamber__locked mono chamber__opening">UNSEALING…</p>}
      </div>

      <AnimatePresence>
        {showRays && (
          <motion.div
            className="goldrays"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'done' ? 0.35 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: phase === 'done' ? 3 : 1.2 }}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
