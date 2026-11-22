import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Volume2 } from 'lucide-react';
import { experience } from '../../content/experience';
import { useCurrentTime } from '../../hooks/useCurrentTime';
import { MONTHS, PRINCESS_DAY_MS, WEEKDAYS, calendarDaysBetween, pad2 } from '../../utils/dates';
import { getZonedParts } from '../../utils/timezone';
import { Crystal } from '../Crystal/Crystal';
import { useSound } from '../../audio/SoundContext';
import './IntroClock.css';

interface Props {
  onBegin: () => void;
  onSkip?: () => void;
}

export function IntroClock({ onBegin, onSkip }: Props) {
  const nowMs = useCurrentTime();
  const reduced = useReducedMotion();
  const { enabled } = useSound();
  const p = getZonedParts(nowMs);
  const daysAgo = calendarDaysBetween(PRINCESS_DAY_MS, nowMs);
  const t = experience.intro;

  const fade = (delay: number) => ({
    initial: { opacity: 0, y: reduced ? 0 : 14, filter: reduced ? 'none' : 'blur(8px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    transition: { delay: reduced ? delay * 0.3 : delay, duration: 1.2, ease: [0.16, 1, 0.3, 1] },
  });

  return (
    <section className="scene intro" aria-labelledby="intro-time">
      <motion.div className="intro__crystal" {...fade(0.2)}>
        <div className="intro__halo" />
        <Crystal hue="sapphire" shape={0} size="clamp(92px, 26vw, 130px)" float />
      </motion.div>

      <motion.p className="eyebrow" {...fade(0.4)}>
        {t.eyebrow}
      </motion.p>

      <motion.div className="intro__clock" {...fade(0.6)}>
        <time id="intro-time" className="intro__time mono" dateTime={new Date(nowMs).toISOString()} aria-live="off">
          <span>{pad2(p.hour)}</span>
          <span className="intro__colon">:</span>
          <span>{pad2(p.minute)}</span>
          <span className="intro__colon">:</span>
          <span className="intro__sec">{pad2(p.second)}</span>
        </time>
        <div className="intro__date">
          <span className="intro__weekday">{WEEKDAYS[p.weekday]}</span>
          <span className="intro__dot" aria-hidden="true" />
          <span>
            {p.day} {MONTHS[p.month - 1]} {p.year}
          </span>
        </div>
      </motion.div>

      <div className="intro__lines">
        <motion.p className="intro__line1 serif" {...fade(1.6)}>
          {t.lineOne}
        </motion.p>
        <motion.p className="intro__line2" {...fade(3.0)}>
          {t.lineTwo(daysAgo)}
        </motion.p>
        <motion.p className="intro__line3" {...fade(4.3)}>
          {t.lineThree}
        </motion.p>
      </div>

      <motion.div className="intro__actions" {...fade(5.3)}>
        <button type="button" className="btn btn--primary" onClick={onBegin}>
          {t.beginLabel}
          <ArrowRight size={18} aria-hidden="true" />
        </button>
        {enabled && (
          <span className="intro__hint">
            <Volume2 size={14} aria-hidden="true" /> {t.soundHint}
          </span>
        )}
        {onSkip && (
          <button type="button" className="intro__skip" onClick={onSkip}>
            {t.skipLabel}
          </button>
        )}
      </motion.div>
    </section>
  );
}
