import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { audio } from '../../audio/AudioEngine';
import { princessDay } from '../../content/princessDay';
import { Crystal } from '../Crystal/Crystal';
import { Reveal } from '../PrincessDay/Reveal';
import './CrystalCollection.css';

export function CrystalCollection({ children }: { children?: React.ReactNode }) {
  const t = princessDay.crystals;
  const reduced = useReducedMotion();
  const [collected, setCollected] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const activeItem = t.items.find((c) => c.id === active);
  const complete = collected.length === t.items.length;

  const select = (id: string, index: number) => {
    audio.chime(index);
    setActive(id);
    setCollected((c) => (c.includes(id) ? c : [...c, id]));
  };

  return (
    <section className="section crystals" aria-labelledby="crystals-title">
      {children}
      <Reveal>
        <p className="eyebrow">Chapter I</p>
        <h2 id="crystals-title" className="section-title">
          {t.title}
        </h2>
        <p className="section-sub">{t.subtitle}</p>
      </Reveal>

      <Reveal delay={0.15}>
        <ul className="crystals__grid" role="list">
          {t.items.map((c, i) => {
            const isCollected = collected.includes(c.id);
            const isActive = active === c.id;
            return (
              <li key={c.id}>
                <motion.button
                  type="button"
                  className={`crystals__item ${isCollected ? 'is-collected' : ''} ${isActive ? 'is-active' : ''}`}
                  onClick={() => select(c.id, i)}
                  aria-pressed={isActive}
                  aria-label={isCollected ? `${c.name} crystal – collected. Show message` : `Reveal the ${c.name} crystal`}
                  whileTap={reduced ? undefined : { scale: 0.9 }}
                  animate={isActive && !reduced ? { rotate: [0, -8, 6, 0], y: [0, -10, 0] } : { rotate: 0, y: 0 }}
                  transition={{ duration: 0.7 }}
                >
                  <span className="crystals__pedestal" aria-hidden="true" />
                  <Crystal hue={c.hue} shape={c.shape} size="100%" float={!reduced} glow={isCollected} sparkle={isCollected} />
                  <span className="crystals__label">{isCollected ? c.name : '?'}</span>
                </motion.button>
              </li>
            );
          })}
        </ul>
      </Reveal>

      <p className="crystals__progress mono" aria-live="polite">
        {collected.length} / {t.items.length} collected
      </p>

      <div className="crystals__panel-wrap">
        <AnimatePresence mode="wait">
          {activeItem ? (
            <motion.div
              key={activeItem.id}
              className={`glass crystals__panel crystals__panel--${activeItem.hue}`}
              initial={{ opacity: 0, y: 16, filter: reduced ? 'none' : 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.45 }}
              aria-live="polite"
            >
              <p className="eyebrow">{activeItem.name}</p>
              <p className="crystals__message serif">{activeItem.message}</p>
            </motion.div>
          ) : (
            <motion.p key="empty" className="crystals__empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              Tap a crystal.
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {complete && (
          <motion.p
            className="crystals__complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            ✦ {t.completeMessage}
          </motion.p>
        )}
      </AnimatePresence>
    </section>
  );
}
