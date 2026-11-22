import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { audio } from '../../audio/AudioEngine';
import { experience } from '../../content/experience';
import './OneMoreThing.css';

type Step = 'finale' | 'dark' | 'line' | 'light' | 'ready';

interface Props {
  onContinue: () => void;
}

/**
 * ACT IV – the celebration ends, the screen goes quiet… then: "One More Thing..."
 * Pacing is deliberately slow; the pause is the point.
 */
export function OneMoreThing({ onContinue }: Props) {
  const reduced = !!useReducedMotion();
  const t = experience.oneMoreThing;
  const [step, setStep] = useState<Step>('finale');

  useEffect(() => {
    const k = reduced ? 0.5 : 1;
    audio.setAmbient(0.35, 2);
    const timers = [
      setTimeout(() => {
        setStep('dark');
        audio.setAmbient(0.08, 2.5);
      }, 3600 * k),
      setTimeout(() => {
        setStep('line');
        audio.swell(3.2);
      }, 6200 * k),
      setTimeout(() => {
        setStep('light');
        audio.chime(4);
      }, 8200 * k),
      setTimeout(() => {
        setStep('ready');
        audio.setAmbient(0.6, 3);
      }, 9600 * k),
    ];
    return () => timers.forEach(clearTimeout);
  }, [reduced]);

  const showLine = step === 'line' || step === 'light' || step === 'ready';
  const showLight = step === 'light' || step === 'ready';

  return (
    <section className="scene omt" aria-live="polite">
      <AnimatePresence>
        {step === 'finale' && (
          <motion.div
            key="finale"
            className="omt__finale"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 1.4 } }}
            transition={{ duration: 1.6, delay: 0.3 }}
          >
            <p className="omt__finale-title serif">{t.finale}</p>
            <p className="omt__finale-sub eyebrow">{t.finaleSub}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLight && (
          <motion.div
            key="light"
            className="omt__light"
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.2 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reduced ? 0.5 : 2.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="omt__flare" />
          </motion.div>
        )}
      </AnimatePresence>

      {showLine && (
        <h2 className="omt__line serif" aria-label={t.line}>
          {Array.from(t.line).map((ch, i) => (
            <motion.span
              key={i}
              aria-hidden="true"
              initial={{ opacity: 0, filter: reduced ? 'none' : 'blur(12px)', y: reduced ? 0 : 8 }}
              animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
              transition={{ delay: (reduced ? 0.02 : 0.07) * i, duration: reduced ? 0.3 : 0.9, ease: 'easeOut' }}
            >
              {ch === ' ' ? ' ' : ch}
            </motion.span>
          ))}
        </h2>
      )}

      <AnimatePresence>
        {step === 'ready' && (
          <motion.button
            type="button"
            className="omt__continue"
            onClick={() => {
              audio.click();
              onContinue();
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2 }}
            aria-label="Continue to the next chapter"
          >
            <span className="omt__continue-label eyebrow">{t.continueLabel}</span>
          </motion.button>
        )}
      </AnimatePresence>
    </section>
  );
}
