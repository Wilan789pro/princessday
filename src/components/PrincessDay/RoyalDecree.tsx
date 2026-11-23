import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { audio } from '../../audio/AudioEngine';
import { princessDay } from '../../content/princessDay';
import { Crystal } from '../Crystal/Crystal';
import { Reveal } from './Reveal';
import { WithRoyalName } from '../RoyalName/RoyalName';

export function RoyalDecree({ children }: { children?: React.ReactNode }) {
  const t = princessDay.decree;
  const reduced = useReducedMotion();
  const [sealed, setSealed] = useState(false);

  const seal = () => {
    if (sealed) return;
    audio.clunk();
    setTimeout(() => audio.chime(5), 120);
    setSealed(true);
  };

  return (
    <section className="section decree" aria-labelledby="decree-title">
      {children}
      <Reveal>
        <p className="eyebrow">Chapter III</p>
        <h2 id="decree-title" className="section-title">
          {t.title}
        </h2>
      </Reveal>

      <Reveal delay={0.1}>
        <article className="glass decree__scroll">
          <div className="decree__frame" aria-hidden="true" />
          <p className="decree__preamble serif">{t.preamble}</p>
          <ol className="decree__articles">
            {t.articles.map((a, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: reduced ? 0 : -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ delay: 0.15 * i, duration: 0.6 }}
              >
                <WithRoyalName text={a} />
              </motion.li>
            ))}
          </ol>

          <div className="decree__footer">
            <motion.button
              type="button"
              className={`decree__seal ${sealed ? 'is-sealed' : ''}`}
              onClick={seal}
              aria-pressed={sealed}
              aria-label={sealed ? t.sealedLabel : t.sealLabel}
              initial={false}
              animate={sealed && !reduced ? { scale: [1.6, 0.92, 1], rotate: [-25, 4, -8] } : { scale: 1, rotate: sealed ? -8 : 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
            >
              <span className="decree__seal-ring" aria-hidden="true" />
              <Crystal hue={sealed ? 'ice' : 'sapphire'} shape={2} size={30} sparkle={false} glow={sealed} />
            </motion.button>
            <AnimatePresence mode="wait">
              <motion.p
                key={sealed ? 'sealed' : 'unsealed'}
                className="decree__seal-label"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                aria-live="polite"
              >
                {sealed ? (
                  <>
                    <span className="eyebrow">{t.sealedLabel}</span>
                    <span className="decree__signature serif">— {t.signature}</span>
                  </>
                ) : (
                  <span className="decree__hint">{t.sealLabel}</span>
                )}
              </motion.p>
            </AnimatePresence>
          </div>
        </article>
      </Reveal>
    </section>
  );
}
