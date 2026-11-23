import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { project25 } from '../../content/birthday';
import { BIRTHDAY_MS, PRINCESS_DAY_MS, pad2, type Remaining } from '../../utils/dates';
import { now } from '../../utils/clock';
import { Crystal } from '../Crystal/Crystal';
import { WithRoyalName } from '../RoyalName/RoyalName';
import './PrismClock.css';

function Digit({ value }: { value: string }) {
  const reduced = useReducedMotion();
  return (
    <span className="pc-digit">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={value}
          initial={reduced ? { opacity: 0 } : { y: '-35%', opacity: 0, filter: 'blur(4px)' }}
          animate={{ y: '0%', opacity: 1, filter: 'blur(0px)' }}
          exit={reduced ? { opacity: 0 } : { y: '35%', opacity: 0, filter: 'blur(4px)' }}
          transition={{ duration: 0.35, ease: [0.3, 0.7, 0.3, 1] }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Unit({ value, label }: { value: number; label: string }) {
  const text = pad2(value);
  return (
    <div className="pc-unit">
      <div className="pc-unit__digits mono" aria-hidden="true">
        {Array.from(text).map((ch, i) => (
          <Digit key={`${text.length}-${i}`} value={ch} />
        ))}
      </div>
      <span className="pc-unit__label">{label}</span>
    </div>
  );
}

/** The four-unit countdown (shared with THE 25th STAR entrance so both look identical). */
export function CountdownDisplay({ remaining, className = '', hideFromAT = false }: { remaining: Remaining; className?: string; hideFromAT?: boolean }) {
  const { days, hours, minutes, seconds, reached } = remaining;
  const spoken = reached
    ? 'Countdown complete.'
    : `${days} days, ${hours} hours, ${minutes} minutes and ${seconds} seconds remaining.`;
  return (
    <div
      className={`pc-countdown glass ${className}`}
      role={hideFromAT ? undefined : 'timer'}
      aria-label={hideFromAT ? undefined : spoken}
      aria-hidden={hideFromAT || undefined}
    >
      <Unit value={days} label="Days" />
      <span className="pc-sep mono" aria-hidden="true">:</span>
      <Unit value={hours} label="Hours" />
      <span className="pc-sep mono" aria-hidden="true">:</span>
      <Unit value={minutes} label="Minutes" />
      <span className="pc-sep mono" aria-hidden="true">:</span>
      <Unit value={seconds} label="Seconds" />
    </div>
  );
}

function StatusTicker({ done }: { done: boolean }) {
  const msgs = project25.statusMessages;
  const [index, setIndex] = useState(0);
  const [chars, setChars] = useState(0);
  const text = done ? project25.statusReached : msgs[index % msgs.length];

  useEffect(() => {
    if (done) return;
    const id = setInterval(() => setIndex((i) => i + 1), project25.statusIntervalMs);
    return () => clearInterval(id);
  }, [done]);

  useEffect(() => {
    setChars(0);
    const id = setInterval(() => {
      setChars((c) => {
        if (c >= text.length) {
          clearInterval(id);
          return c;
        }
        return c + 1;
      });
    }, 38);
    return () => clearInterval(id);
  }, [text]);

  return (
    <p className="pc-status mono" role="status" aria-live="polite">
      <span className="pc-status__prompt" aria-hidden="true">
        &gt;
      </span>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{text.slice(0, chars)}</span>
      <span className="pc-status__caret" aria-hidden="true" />
    </p>
  );
}

interface Props {
  remaining: Remaining;
}

/** ACT VI – THE 25th STAR: the live countdown to 18.12.2026 00:00 Mauritius. */
export function PrismClock({ remaining }: Props) {
  const p = project25;
  const span = BIRTHDAY_MS - PRINCESS_DAY_MS;
  const progress = Math.min(1, Math.max(0, (now() - PRINCESS_DAY_MS) / span));
  const { reached } = remaining;

  return (
    <section className={`section prismclock ${reached ? 'is-reached' : ''}`} aria-labelledby="p25-title">
      <div className="pc-holo" aria-hidden="true" />

      <header className="pc-header">
        <div className="pc-crystal" aria-hidden="true">
          <span className="pc-crystal__ring" />
          <span className="pc-crystal__ring pc-crystal__ring--2" />
          <Crystal hue={reached ? 'gold' : 'sapphire'} shape={1} size="clamp(70px, 20vw, 96px)" float />
        </div>
        <p className="eyebrow pc-file">{p.eyebrow}</p>
        <h1 id="p25-title" className="pc-title mono">
          {p.name}
        </h1>
        <dl className="pc-meta mono">
          <div>
            <dt className="sr-only">Rises on</dt>
            <dd>{p.destination}</dd>
          </div>
          <div>
            <dt className="sr-only">Status</dt>
            <dd className={reached ? 'pc-meta--ok' : 'pc-meta--warn'}>{reached ? p.accessStatusReached : p.accessStatus}</dd>
          </div>
          <div>
            <dt className="sr-only">Reserved for</dt>
            <dd>
              <WithRoyalName text={p.classification} />
            </dd>
          </div>
        </dl>
      </header>

      <CountdownDisplay remaining={remaining} />

      <p className="pc-tz mono">{p.timezoneNote}</p>

      <StatusTicker done={reached} />

      <div className="pc-progress" aria-label={`Project progress ${Math.round(progress * 100)} percent`} role="img">
        <div className="pc-progress__labels mono" aria-hidden="true">
          <span>18.11</span>
          <span>{Math.round(progress * 100)}%</span>
          <span>18.12</span>
        </div>
        <div className="pc-progress__track">
          <div className="pc-progress__fill" style={{ transform: `scaleX(${progress})` }} />
        </div>
      </div>
    </section>
  );
}
