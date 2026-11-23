import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { audio } from '../../audio/AudioEngine';
import { experience } from '../../content/experience';
import { datesTimeline, once, type DatesPhase } from '../../utils/cinematic';
import { Crystal } from '../Crystal/Crystal';
import { WithRoyalName } from '../RoyalName/RoyalName';
import './DateReveal.css';

interface Props {
  /** Called once, when the dates have turned into a single point of light. */
  onContinue: () => void;
  /** Called when the outro starts (the app dims the stars). */
  onOutro?: () => void;
}

/**
 * ACT V – two 18ths, one connection. After they have been read, the cards
 * drift together, the beam contracts into the sapphire, and the sapphire
 * shrinks to a single point of light at the centre of the screen – where
 * THE 25th STAR begins. No tap needed.
 */
export function DateReveal({ onContinue, onOutro }: Props) {
  const reduced = !!useReducedMotion();
  const d = experience.dates;
  const k = reduced ? 0.35 : 1;
  const [phase, setPhase] = useState<DatesPhase>('reveal');
  const coreRef = useRef<HTMLDivElement>(null);
  const [toCentre, setToCentre] = useState({ x: 0, y: 0 });
  const handlers = useRef({ onContinue, onOutro });
  handlers.current = { onContinue, onOutro };

  useEffect(() => {
    const timers = [
      setTimeout(() => audio.chime(0), 400 * k),
      setTimeout(() => audio.chime(2), 1100 * k),
      setTimeout(() => audio.swell(3), 2000 * k),
    ];
    return () => timers.forEach(clearTimeout);
  }, [k]);

  // The automatic hand-over. Timer-driven, fires its callback exactly once,
  // and is cancelled if this scene is left early.
  useEffect(() => {
    const handoff = once(() => handlers.current.onContinue());
    const timers = datesTimeline(reduced).map(({ phase: p, at }) =>
      setTimeout(() => {
        if (p === 'outro') {
          const r = coreRef.current?.getBoundingClientRect();
          if (r) setToCentre({ x: window.innerWidth / 2 - (r.left + r.width / 2), y: window.innerHeight / 2 - (r.top + r.height / 2) });
          handlers.current.onOutro?.();
          audio.setAmbient(0.3, 1.5);
        }
        if (p === 'handoff') handoff();
        else setPhase(p);
      }, at),
    );
    return () => timers.forEach(clearTimeout);
  }, [reduced]);

  const leaving = phase === 'outro' || phase === 'dark';

  const card = (delay: number, from: number) => ({
    initial: { opacity: 0, x: reduced ? 0 : from, filter: reduced ? 'none' : 'blur(10px)' },
    animate: { opacity: 1, x: 0, filter: 'blur(0px)' },
    transition: { delay: delay * k, duration: 1.2, ease: [0.16, 1, 0.3, 1] },
  });

  return (
    <section className={`scene dates ${leaving ? 'dates--leaving' : ''} ${reduced ? 'dates--reduced' : ''}`} aria-labelledby="dates-tagline">
      <motion.p className="eyebrow dates__fade" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        The magic of the 18th
      </motion.p>

      <div className="dates__pair">
        <div className="dates__beam-wrap" aria-hidden="true">
          <motion.div
            className="dates__beam"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 1.9 * k, duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        <div
          ref={coreRef}
          className="dates__core-wrap"
          aria-hidden="true"
          style={leaving && !reduced ? { transform: `translate(${toCentre.x}px, ${toCentre.y}px)` } : undefined}
        >
          <motion.div
            className="dates__core"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 2.4 * k, duration: 0.9, type: 'spring', bounce: 0.4 }}
          >
            <Crystal hue="ice" shape={3} size={30} />
          </motion.div>
        </div>

        <div className="dates__slot dates__slot--left">
          <motion.article className="dates__card glass" {...card(0.4, -30)}>
            <span className="dates__18 serif text-prism">{d.left.day}</span>
            <span className="dates__month mono">{d.left.month.toUpperCase()}</span>
            <span className="dates__label serif">{d.left.label}</span>
          </motion.article>
        </div>

        <div className="dates__slot dates__slot--right">
          <motion.article className="dates__card dates__card--right glass" {...card(1.1, 30)}>
            <span className="dates__18 serif text-prism">{d.right.day}</span>
            <span className="dates__month mono">{d.right.month.toUpperCase()}</span>
            <span className="dates__label serif">
              <WithRoyalName text={d.right.label} />
            </span>
          </motion.article>
        </div>
      </div>

      <h2 id="dates-tagline" className="dates__tagline dates__fade" aria-label={d.tagline}>
        {d.tagline.split(' ').map((word, i) => (
          <motion.span
            key={i}
            aria-hidden="true"
            initial={{ opacity: 0, y: reduced ? 0 : 12, filter: reduced ? 'none' : 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ delay: (3.2 + i * 0.22) * k, duration: 0.9 }}
          >
            {word}
          </motion.span>
        ))}
      </h2>

      {/* the single point of light that THE 25th STAR picks up */}
      <span className={`star-point dates__point ${leaving ? 'is-on' : ''}`} aria-hidden="true" />
    </section>
  );
}
