import { useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { audio } from '../../audio/AudioEngine';
import { useBirthdayAccess } from '../../hooks/useBirthdayAccess';
import { useCountdown } from '../../hooks/useCountdown';
import { ENTRANCE_ORDER, entranceTimeline, markEntranceSeen, phaseAtLeast, type EntrancePhase } from '../../utils/cinematic';
import { BIRTHDAY_MS } from '../../utils/dates';
import { BirthdayChamber } from '../BirthdayChamber/BirthdayChamber';
import { BirthdayReveal } from '../BirthdayReveal/BirthdayReveal';
import { PrismClock } from '../PrismClock/PrismClock';
import { StarEntrance } from './StarEntrance';
import './Project25.css';

interface Props {
  onGold: (gold: boolean) => void;
  /** 'cinematic' plays the one-time entrance; 'none' shows the finished page. */
  entrance?: 'cinematic' | 'none';
  /** Called once the entrance no longer needs a darkened sky (or immediately for 'none'). */
  onSettled?: () => void;
}

/**
 * ACT VI + VII – THE 25th STAR: countdown, sealed chamber, and the birthday
 * reveal once open. The entrance is presentation only: the countdown keeps
 * running underneath and the chamber's own logic decides when it may open.
 */
export function Project25({ onGold, entrance = 'none', onSettled }: Props) {
  const remaining = useCountdown(BIRTHDAY_MS);
  const reduced = !!useReducedMotion();
  const [opened, setOpened] = useState(false);
  const access = useBirthdayAccess(opened);
  const revealRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState<EntrancePhase>(entrance === 'cinematic' ? 'point' : 'done');
  const settledRef = useRef(onSettled);
  settledRef.current = onSettled;
  const entering = phase !== 'done';

  const finish = useCallback(() => {
    setPhase('done');
    markEntranceSeen();
  }, []);

  // Drive the entrance from timers (never from animation callbacks).
  useEffect(() => {
    if (entrance !== 'cinematic') {
      settledRef.current?.();
      return;
    }
    window.scrollTo(0, 0);
    audio.setAmbient(0.25, 1.5);
    const timers = entranceTimeline(reduced).map(({ phase: p, at }) =>
      setTimeout(() => {
        if (p === 'done') finish();
        else setPhase((cur) => (ENTRANCE_ORDER.indexOf(p) > ENTRANCE_ORDER.indexOf(cur) ? p : cur));
        if (!reduced) {
          if (p === 'gather') audio.charge(1.1);
          if (p === 'digits') audio.chime(4);
          if (p === 'title') audio.swell(3);
        }
        if (p === 'details') {
          audio.setAmbient(0.6, 2);
          settledRef.current?.();
        }
      }, at),
    );
    return () => timers.forEach(clearTimeout);
  }, [entrance, reduced, finish]);

  // A few audible seconds while the countdown is alone on screen.
  useEffect(() => {
    if (phase !== 'hold') return;
    const id = setInterval(() => audio.tick(0), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Keep the page still until the chamber appears; always restore scrolling.
  useEffect(() => {
    if (!entering || phaseAtLeast(phase, 'chamber')) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [entering, phase]);

  const skip = useCallback(() => {
    finish();
    settledRef.current?.();
    audio.setAmbient(0.6, 1);
  }, [finish]);

  useEffect(() => {
    if (opened) {
      const id = setTimeout(() => revealRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 400);
      return () => clearTimeout(id);
    }
  }, [opened]);

  const target = useCallback(() => rootRef.current?.querySelector<HTMLElement>('.pc-countdown') ?? null, []);

  const stageClasses = entering
    ? ['p25-entering', ...(['title', 'details', 'chamber'] as const).filter((p) => phaseAtLeast(phase, p)).map((p) => `p25-at-${p}`)].join(' ')
    : '';

  return (
    <main className={`project25 ${stageClasses}`} ref={rootRef}>
      <PrismClock remaining={remaining} />
      <div aria-hidden={entering && !phaseAtLeast(phase, 'chamber') ? true : undefined} className="p25-chamber-wrap">
        <BirthdayChamber
          reached={remaining.reached}
          holdAutoOpen={entering}
          onGold={() => onGold(true)}
          onOpened={() => setOpened(true)}
        />
      </div>
      <div ref={revealRef}>{opened && <BirthdayReveal access={access} />}</div>

      {entering && !phaseAtLeast(phase, 'details') && (
        <StarEntrance phase={phase} remaining={remaining} reduced={reduced} target={target} onSkip={skip} />
      )}
    </main>
  );
}
