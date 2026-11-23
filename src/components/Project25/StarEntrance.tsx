import { animate, motion } from 'framer-motion';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { project25 } from '../../content/birthday';
import { phaseAtLeast, type EntrancePhase } from '../../utils/cinematic';
import type { Remaining } from '../../utils/dates';
import { CountdownDisplay } from '../PrismClock/PrismClock';

interface Props {
  phase: EntrancePhase;
  remaining: Remaining;
  reduced: boolean;
  /** The real countdown on the page – the overlay glides onto it. */
  target: () => HTMLElement | null;
  onSkip: () => void;
}

/**
 * Full-screen layer for THE 25th STAR's first-visit entrance: a point of light
 * becomes the countdown, which then glides into its place on the page.
 * Purely visual – the page underneath is the real, working countdown.
 */
export function StarEntrance({ phase, remaining, reduced, target, onSkip }: Props) {
  const clockRef = useRef<HTMLDivElement>(null);
  const landing = phaseAtLeast(phase, 'title');

  // Match the real countdown's width so the hand-over is pixel-identical.
  useLayoutEffect(() => {
    const t = target();
    if (t && clockRef.current) clockRef.current.style.width = `${t.getBoundingClientRect().width}px`;
  }, [target]);

  // FLIP: fly the centred countdown onto the real one.
  useEffect(() => {
    if (!landing || reduced) return;
    const el = clockRef.current;
    const t = target();
    if (!el || !t) return;
    const from = el.getBoundingClientRect();
    const to = t.getBoundingClientRect();
    const scale = to.width / from.width;
    const controls = animate(
      el,
      {
        x: to.left + to.width / 2 - (from.left + from.width / 2),
        y: to.top + to.height / 2 - (from.top + from.height / 2),
        scale,
      },
      { duration: 1.3, ease: [0.65, 0, 0.35, 1] as [number, number, number, number] },
    );
    return () => controls.stop();
  }, [landing, reduced, target]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onSkip();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSkip]);

  const showDigits = phaseAtLeast(phase, 'digits');
  // Slightly larger while alone on screen – but never wider than a small phone allows.
  const holdScale = typeof window !== 'undefined' && window.innerWidth > 480 ? 1.08 : 1;

  return (
    <div className={`star-entrance star-entrance--${phase} ${landing ? 'is-landing' : ''}`} aria-hidden="false">
      <div className="star-entrance__veil" aria-hidden="true" />

      <span className="star-point star-entrance__point" aria-hidden="true" />
      <span className="star-entrance__ring" aria-hidden="true" />
      <span className="star-entrance__ring star-entrance__ring--2" aria-hidden="true" />

      <div className="star-entrance__centre">
        {/* outer: glides onto the real countdown (FLIP); inner: emerges from the point */}
        <div ref={clockRef} className="star-entrance__clock">
          <motion.div
            className={phase === 'hold' ? 'is-heartbeat' : ''}
            initial={false}
            animate={showDigits ? { opacity: 1, filter: 'blur(0px)', scale: holdScale } : { opacity: 0, filter: reduced ? 'none' : 'blur(14px)', scale: 0.6 }}
            transition={{ duration: reduced ? 0.3 : 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <CountdownDisplay remaining={remaining} hideFromAT />
          </motion.div>
        </div>
        <p className="star-entrance__date mono" aria-hidden="true">
          {project25.entrance.dateLine}
        </p>
      </div>

      <button type="button" className="star-entrance__skip" onClick={onSkip}>
        {project25.entrance.skipLabel}
      </button>
    </div>
  );
}
