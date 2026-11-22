import { motion, useReducedMotion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { experience } from '../../content/experience';
import { Crystal } from '../Crystal/Crystal';
import './Arrival.css';

interface Props {
  onContinue: () => void;
}

/** The destination screen: 18 November 2026 · Wednesday · Princess Day. */
export function Arrival({ onContinue }: Props) {
  const reduced = useReducedMotion();
  const a = experience.arrival;
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: reduced ? 0 : 24, filter: reduced ? 'none' : 'blur(10px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    transition: { delay, duration: 1.3, ease: [0.16, 1, 0.3, 1] },
  });

  return (
    <section className="scene arrival" aria-labelledby="arrival-title">
      <motion.div
        className="arrival__flash"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: reduced ? 0.3 : 1.6, ease: 'easeOut' }}
        aria-hidden="true"
      />
      <div className="arrival__rays" aria-hidden="true" />

      <motion.p className="eyebrow" {...rise(0.5)}>
        Coordinates locked
      </motion.p>

      <motion.div className="arrival__date" {...rise(0.7)}>
        <span className="arrival__18 serif text-prism">18</span>
        <span className="arrival__month mono">{a.dateLine.replace(/^18\s*/, '').toUpperCase()}</span>
      </motion.div>

      <motion.p className="arrival__weekday mono" {...rise(1.1)}>
        {a.weekday.toUpperCase()}
      </motion.p>

      <motion.div className="arrival__divider" {...rise(1.4)} aria-hidden="true">
        <span />
        <Crystal hue="ice" shape={3} size={22} sparkle={false} />
        <span />
      </motion.div>

      <motion.h1 id="arrival-title" className="arrival__title serif" {...rise(1.7)}>
        {a.title.toUpperCase()}
      </motion.h1>

      <motion.p className="arrival__sub" {...rise(2.3)}>
        {a.subtitle}
      </motion.p>

      <motion.div {...rise(3)}>
        <button type="button" className="btn btn--primary" onClick={onContinue}>
          {a.continueLabel}
          <ArrowDown size={18} aria-hidden="true" />
        </button>
      </motion.div>
    </section>
  );
}
