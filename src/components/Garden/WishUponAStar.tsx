import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Sparkles, Star } from 'lucide-react';
import { useRef, useState } from 'react';
import { WISH_MAX_LENGTH, wishLength } from '../../../shared/wishRules.js';
import { audio } from '../../audio/AudioEngine';
import { garden } from '../../content/garden';
import { makeWish } from '../../garden/starWish';

type Mode = 'sky' | 'writing' | 'accepted' | 'kept';

interface Props {
  onContinue: () => void;
  /** Her wish for the Royal Seal certificate (null when she keeps it to herself). */
  onWish: (wish: string | null) => void;
}

/**
 * CHAPTER III – a shooting star and an optional wish.
 * The wish never leaves the device: it is handed to the Garden, which keeps it
 * for this visit and writes it on the Royal Seal certificate. The wealth joke
 * is caught here and never kept.
 */
export function WishUponAStar({ onContinue, onWish }: Props) {
  const w = garden.wish;
  const reduced = !!useReducedMotion();
  const [mode, setMode] = useState<Mode>('sky');
  const [text, setText] = useState('');
  const [joke, setJoke] = useState(false);
  const [error, setError] = useState('');
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const length = wishLength(text);

  const catchStar = () => {
    audio.init();
    audio.chime(5);
    setMode('writing');
    setTimeout(() => areaRef.current?.focus({ preventScroll: true }), 450);
  };

  const showJoke = () => {
    setText('');
    setJoke(true);
    setError('');
    audio.chime(3);
    setTimeout(() => areaRef.current?.focus({ preventScroll: true }), 50);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const r = makeWish(text);
    if (r.kind === 'wealth') return showJoke();
    if (r.kind === 'error') return setError(w.errors[r.error] ?? w.errors.generic);
    // An ordinary wish: it will be waiting on her Royal Seal certificate.
    onWish(r.wish);
    setText('');
    setJoke(false);
    setMode('accepted');
    audio.golden();
  };

  const keep = () => {
    onWish(null);
    setText('');
    setJoke(false);
    setMode('kept');
    audio.chime(1);
  };

  const writing = mode === 'writing';

  return (
    <div className="wish">
      <p className="garden__lead">{w.intro}</p>

      <div className={`garden-scene wish__sky wish__sky--${mode}`}>
        {/* the shooting star crosses once, then waits to be caught */}
        {!reduced && mode === 'sky' && (
          <motion.span
            className="wish__shooter"
            aria-hidden="true"
            initial={{ x: '-30%', y: '-20%', opacity: 0 }}
            animate={{ x: ['-30%', '120%'], y: ['-20%', '55%'], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.8, delay: 0.4, ease: 'easeIn', repeat: Infinity, repeatDelay: 4 }}
          />
        )}

        <AnimatePresence>
          {mode === 'sky' && (
            <motion.button
              key="star"
              type="button"
              className="wish__star"
              onClick={catchStar}
              aria-label={w.starLabel}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 2.4, transition: { duration: 0.5 } }}
              transition={{ delay: reduced ? 0 : 2.2, type: 'spring' }}
            >
              <Star size={30} fill="#ffffff" aria-hidden="true" />
            </motion.button>
          )}
        </AnimatePresence>

        {mode === 'sky' && (
          <motion.button
            type="button"
            className="btn btn--ghost btn--small wish__catch"
            onClick={catchStar}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reduced ? 0 : 2.6 }}
          >
            {w.starLabel}
          </motion.button>
        )}

        <AnimatePresence mode="wait">
          {writing && (
            <motion.form
              key="form"
              className="wish__form glass"
              onSubmit={submit}
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.3, y: -160, transition: { duration: 0.8, ease: 'easeIn' } }}
              noValidate
            >
              <AnimatePresence>
                {joke && (
                  <motion.div
                    className="wish__joke"
                    role="status"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <p className="wish__joke-text serif">{w.wealthResponse}</p>
                    <p className="wish__another">{w.anotherPrompt}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <label htmlFor="wish-text" className="wish__label serif">
                {joke ? w.anotherPrompt : w.prompt}
              </label>
              <textarea
                id="wish-text"
                ref={areaRef}
                className="wish__area"
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (error) setError('');
                }}
                placeholder={w.placeholder}
                rows={4}
                autoComplete="off"
                spellCheck
                aria-describedby="wish-disclosure wish-count"
                aria-invalid={length > WISH_MAX_LENGTH || undefined}
              />
              <div className="wish__meta">
                <span id="wish-count" className={`wish__count mono ${length > WISH_MAX_LENGTH ? 'is-over' : ''}`}>
                  {length} / {WISH_MAX_LENGTH}
                </span>
              </div>
              {error && (
                <p className="wish__error" role="alert">
                  {error}
                </p>
              )}
              <p id="wish-disclosure" className="wish__disclosure">
                {w.disclosure}
              </p>
              <div className="garden__actions">
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={length === 0 || length > WISH_MAX_LENGTH}
                >
                  <Sparkles size={17} aria-hidden="true" /> {w.sendLabel}
                </button>
                <button type="button" className="btn btn--ghost btn--small" onClick={keep}>
                  {w.skipLabel}
                </button>
              </div>
            </motion.form>
          )}

          {(mode === 'accepted' || mode === 'kept') && (
            <motion.div
              key="done"
              className="wish__done"
              role="status"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reduced ? 0 : 0.3 }}
            >
              <motion.span
                className="wish__orb"
                aria-hidden="true"
                initial={{ y: 60, scale: 0.6 }}
                animate={{ y: [60, -20, 0], scale: [0.6, 1.2, 1] }}
                transition={{ duration: reduced ? 0 : 1.6 }}
              />
              <p className="wish__done-text serif">
                {mode === 'kept' ? w.keptPrivate : w.accepted}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="garden__actions">
        <button type="button" className={`btn ${mode === 'accepted' || mode === 'kept' ? 'btn--primary' : 'btn--ghost'}`} onClick={onContinue}>
          {w.continueLabel} <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
