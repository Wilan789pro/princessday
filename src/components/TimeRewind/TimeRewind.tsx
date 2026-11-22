import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { audio } from '../../audio/AudioEngine';
import { experience } from '../../content/experience';
import { MONTHS, PRINCESS_DAY_MS, WEEKDAYS, calendarDaysBetween, pad2 } from '../../utils/dates';
import { now } from '../../utils/clock';
import { getTimezoneOffsetMs, getZonedParts } from '../../utils/timezone';
import './TimeRewind.css';

type Phase = 'freeze' | 'rewind' | 'arrive' | 'flash';

interface Props {
  onComplete: () => void;
}

/** Spins up, races backwards, then decelerates into the destination. */
const cinematicEase = (p: number) => 1 - Math.pow(1 - Math.pow(p, 1.6), 5);

export function TimeRewind({ onComplete }: Props) {
  const reduced = !!useReducedMotion();
  const startRef = useRef(now());
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  const [phase, setPhase] = useState<Phase>('freeze');
  const [frame, setFrame] = useState({ sim: startRef.current, vel: 0 });

  useEffect(() => {
    const start = startRef.current;
    const dest = PRINCESS_DAY_MS;
    const span = start - dest;
    const dayDiff = Math.max(1, Math.abs(calendarDaysBetween(dest, start)));
    const freezeMs = reduced ? 700 : 1300;
    const duration = reduced ? Math.min(4000, 700 * dayDiff) : experience.rewind.durationMs;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let raf = 0;

    timers.push(
      setTimeout(() => {
        setPhase('rewind');
        if (!reduced) audio.rewind(duration / 1000);
        const t0 = performance.now();
        let lastSim = start;
        let lastT = t0;
        let lastSec = Math.floor(start / 1000);

        const loop = (t: number) => {
          // rAF timestamps can precede t0 on the first frame – clamp to avoid NaN.
          const p = Math.min(1, Math.max(0, (t - t0) / duration));
          const e = reduced ? Math.floor(p * dayDiff) / dayDiff : cinematicEase(p);
          const sim = p >= 1 ? dest : start - span * e;
          const dt = Math.max(1, t - lastT);
          const vel = Math.abs(sim - lastSim) / dt; // simulated ms per real ms
          lastSim = sim;
          lastT = t;
          setFrame({ sim, vel });

          const sec = Math.floor(sim / 1000);
          if (sec !== lastSec) {
            lastSec = sec;
            audio.tick(reduced ? 0 : 55);
          }

          if (p < 1) {
            raf = requestAnimationFrame(loop);
          } else {
            setPhase('arrive');
            timers.push(
              setTimeout(() => {
                setPhase('flash');
                audio.flash();
                timers.push(setTimeout(() => completeRef.current(), reduced ? 200 : 520));
              }, reduced ? 900 : 1500),
            );
          }
        };
        raf = requestAnimationFrame(loop);
      }, freezeMs),
    );

    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  const { sim, vel } = frame;
  const p = getZonedParts(sim);
  const offset = getTimezoneOffsetMs(sim);
  const sod = (((sim + offset) % 86_400_000) + 86_400_000) % 86_400_000;
  const hourAngle = ((sod / 3_600_000) % 12) * 30;
  const minuteAngle = ((sod / 60_000) % 60) * 6;
  const secondAngle = ((sod / 1000) % 60) * 6;
  // Fast motion: fade the second hand so it doesn't strobe.
  const secondOpacity = phase === 'rewind' ? Math.max(0.12, Math.min(1, 1 - Math.log10(Math.max(1, vel)) / 3)) : 1;

  const left = Math.max(0, sim - PRINCESS_DAY_MS);
  const ls = Math.floor(left / 1000);
  const delta = `${Math.floor(ls / 86400)}d ${pad2(Math.floor((ls % 86400) / 3600))}h ${pad2(Math.floor((ls % 3600) / 60))}m ${pad2(ls % 60)}s`;

  const label =
    phase === 'freeze'
      ? experience.rewind.freezeLabel
      : phase === 'rewind'
        ? experience.rewind.rewindingLabel
        : experience.rewind.arrivingLabel;

  return (
    <section className={`scene rewind rewind--${phase} ${reduced ? 'rewind--reduced' : ''}`} aria-label="Rewinding time">
      {!reduced && (
        <div className="rewind__tunnel" aria-hidden="true">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className="rewind__ring" style={{ animationDelay: `${-i * 0.32}s` }} />
          ))}
        </div>
      )}

      <div className="rewind__hud">
        <p className="eyebrow rewind__status">
          <span className="rewind__led" aria-hidden="true" /> {label}
        </p>
        <p className="rewind__delta mono" aria-hidden="true">
          {phase === 'arrive' || phase === 'flash' ? 'Δ 0d 00h 00m 00s' : `Δ −${delta}`}
        </p>
      </div>

      <div className="rewind__clock">
        <svg viewBox="0 0 200 200" className="rewind__face" aria-hidden="true">
          <defs>
            <linearGradient id="rw-ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#A8DFFF" />
              <stop offset="0.5" stopColor="#398BFF" />
              <stop offset="1" stopColor="#A99BEF" />
            </linearGradient>
            <radialGradient id="rw-face" cx="0.5" cy="0.4" r="0.7">
              <stop offset="0" stopColor="#123a6e" stopOpacity="0.85" />
              <stop offset="1" stopColor="#071426" stopOpacity="0.9" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="95" fill="url(#rw-face)" stroke="url(#rw-ring)" strokeWidth="2" />
          <g className="rewind__dashes">
            <circle cx="100" cy="100" r="88" fill="none" stroke="#66E5F5" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="2 6" />
          </g>
          {Array.from({ length: 60 }, (_, i) => {
            const major = i % 5 === 0;
            return (
              <line
                key={i}
                x1="100"
                y1={major ? 14 : 17}
                x2="100"
                y2={22}
                stroke={major ? '#D8E4F2' : '#6f87a6'}
                strokeWidth={major ? 2 : 0.8}
                strokeLinecap="round"
                transform={`rotate(${i * 6} 100 100)`}
              />
            );
          })}
          <g transform={`rotate(${hourAngle} 100 100)`}>
            <line x1="100" y1="108" x2="100" y2="54" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
          </g>
          <g transform={`rotate(${minuteAngle} 100 100)`}>
            <line x1="100" y1="112" x2="100" y2="32" stroke="#A8DFFF" strokeWidth="3" strokeLinecap="round" />
          </g>
          <g transform={`rotate(${secondAngle} 100 100)`} opacity={secondOpacity}>
            <line x1="100" y1="118" x2="100" y2="22" stroke="#66E5F5" strokeWidth="1.2" strokeLinecap="round" />
          </g>
          <circle cx="100" cy="100" r="5" fill="#398BFF" stroke="#fff" strokeWidth="1.5" />
        </svg>
        <div className="rewind__clock-glow" aria-hidden="true" />
      </div>

      <div className="rewind__readout">
        <div className="rewind__digital mono" aria-hidden="true">
          {pad2(p.hour)}:{pad2(p.minute)}:{pad2(p.second)}
        </div>

        <div className="rewind__calendar" aria-hidden="true">
          <div className="rewind__cal-head">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={`${p.year}-${p.month}`}
                initial={{ y: -16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 16, opacity: 0 }}
                transition={{ duration: 0.35 }}
              >
                {MONTHS[p.month - 1]} {p.year}
              </motion.span>
            </AnimatePresence>
          </div>
          <div className="rewind__cal-page-wrap">
            <AnimatePresence initial={false}>
              <motion.div
                key={`${p.year}-${p.month}-${p.day}`}
                className="rewind__cal-page"
                initial={reduced ? { opacity: 0 } : { rotateX: 105, opacity: 0.4 }}
                animate={reduced ? { opacity: 1 } : { rotateX: 0, opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.25, delay: 0.1 } }}
                transition={{ duration: reduced ? 0.3 : 0.38, ease: [0.3, 0.7, 0.3, 1] }}
              >
                <span className="rewind__cal-day serif">{p.day}</span>
                <span className="rewind__cal-weekday">{WEEKDAYS[p.weekday]}</span>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {phase === 'arrive' ? 'Arrived: Wednesday, 18 November 2026. Princess Day.' : ''}
      </p>

      <AnimatePresence>
        {phase === 'flash' && (
          <motion.div
            className="rewind__flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reduced ? 0.2 : 0.45, ease: 'easeIn' }}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
