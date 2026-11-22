import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useRef, useState } from 'react';
import { audio } from '../../audio/AudioEngine';
import { princessDay } from '../../content/princessDay';
import { Reveal } from '../PrincessDay/Reveal';
import './ComplimentGenerator.css';

function shuffled(n: number, avoidFirst?: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  if (avoidFirst !== undefined && a.length > 1 && a[0] === avoidFirst) [a[0], a[1]] = [a[1], a[0]];
  return a;
}

export function ComplimentGenerator({ children }: { children?: React.ReactNode }) {
  const t = princessDay.compliments;
  const reduced = useReducedMotion();
  const bag = useRef<number[]>([]);
  const [current, setCurrent] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [burst, setBurst] = useState(0);

  const next = () => {
    if (bag.current.length === 0) bag.current = shuffled(t.items.length, current ?? undefined);
    const idx = bag.current.shift()!;
    setCurrent(idx);
    setCount((c) => c + 1);
    setBurst((b) => b + 1);
    audio.chime(count + 2);
  };

  return (
    <section className="section compliments" aria-labelledby="compliments-title">
      {children}
      <Reveal>
        <p className="eyebrow">Chapter II</p>
        <h2 id="compliments-title" className="section-title">
          {t.title}
        </h2>
        <p className="section-sub">{t.subtitle}</p>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="glass compliments__card">
          <span className="compliments__index mono" aria-hidden="true">
            № {String(count).padStart(2, '0')}
          </span>
          <div className="compliments__stage" aria-live="polite">
            <AnimatePresence mode="wait">
              {current === null ? (
                <motion.p key="idle" className="compliments__idle" exit={{ opacity: 0 }}>
                  Awaiting input from Her Royal Highness.
                </motion.p>
              ) : (
                <motion.blockquote
                  key={`${current}-${count}`}
                  className="compliments__quote serif"
                  initial={{ opacity: 0, y: 12, filter: reduced ? 'none' : 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -8, filter: reduced ? 'none' : 'blur(6px)' }}
                  transition={{ duration: 0.45 }}
                >
                  “{t.items[current]}”
                </motion.blockquote>
              )}
            </AnimatePresence>
          </div>

          <div className="compliments__action">
            {!reduced && (
              <span key={burst} className={`compliments__burst ${burst ? 'is-on' : ''}`} aria-hidden="true">
                {Array.from({ length: 10 }, (_, i) => (
                  <i key={i} style={{ ['--a' as string]: `${i * 36}deg` }} />
                ))}
              </span>
            )}
            <button type="button" className="btn btn--primary" onClick={next}>
              <Sparkles size={18} aria-hidden="true" />
              {current === null ? t.buttonLabel : t.againLabel}
            </button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
