import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useEffect } from 'react';
import { audio } from '../../audio/AudioEngine';
import { experience } from '../../content/experience';
import { Crystal } from '../Crystal/Crystal';
import { WithRoyalName } from '../RoyalName/RoyalName';
import './DateReveal.css';

interface Props {
  onContinue: () => void;
}

/** ACT V – two 18ths, one connection. */
export function DateReveal({ onContinue }: Props) {
  const reduced = !!useReducedMotion();
  const d = experience.dates;
  const k = reduced ? 0.35 : 1;

  useEffect(() => {
    const timers = [
      setTimeout(() => audio.chime(0), 400 * k),
      setTimeout(() => audio.chime(2), 1100 * k),
      setTimeout(() => audio.swell(3), 2000 * k),
    ];
    return () => timers.forEach(clearTimeout);
  }, [k]);

  const card = (delay: number, from: number) => ({
    initial: { opacity: 0, x: reduced ? 0 : from, filter: reduced ? 'none' : 'blur(10px)' },
    animate: { opacity: 1, x: 0, filter: 'blur(0px)' },
    transition: { delay: delay * k, duration: 1.2, ease: [0.16, 1, 0.3, 1] },
  });

  return (
    <section className="scene dates" aria-labelledby="dates-tagline">
      <motion.p className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        The magic of the 18th
      </motion.p>

      <div className="dates__pair">
        <motion.div
          className="dates__beam"
          aria-hidden="true"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 1.9 * k, duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.div
          className="dates__core"
          aria-hidden="true"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 2.4 * k, duration: 0.9, type: 'spring', bounce: 0.4 }}
        >
          <Crystal hue="ice" shape={3} size={30} />
        </motion.div>

        <motion.article className="dates__card glass" {...card(0.4, -30)}>
          <span className="dates__18 serif text-prism">{d.left.day}</span>
          <span className="dates__month mono">{d.left.month.toUpperCase()}</span>
          <span className="dates__label serif">{d.left.label}</span>
        </motion.article>

        <motion.article className="dates__card dates__card--right glass" {...card(1.1, 30)}>
          <span className="dates__18 serif text-prism">{d.right.day}</span>
          <span className="dates__month mono">{d.right.month.toUpperCase()}</span>
          <span className="dates__label serif">
            <WithRoyalName text={d.right.label} />
          </span>
        </motion.article>
      </div>

      <h2 id="dates-tagline" className="dates__tagline" aria-label={d.tagline}>
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

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 5 * k, duration: 1 }}>
        <button type="button" className="btn btn--primary" onClick={onContinue}>
          {d.continueLabel}
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </motion.div>
    </section>
  );
}
