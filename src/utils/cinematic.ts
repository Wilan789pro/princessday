/**
 * Timings and small helpers for the two cinematic hand-overs:
 *   1. the two 18ths → automatic outro → a single point of light
 *   2. THE 25th STAR entrance (played once per browser)
 * Progression is driven by these timers, never by animation-complete
 * callbacks, so an interrupted animation can never strand the visitor.
 */

// ------------------------------------------------------------ the two 18ths
export type DatesPhase = 'reveal' | 'hold' | 'outro' | 'dark' | 'handoff';

export interface PhaseStep<P extends string> {
  phase: P;
  /** ms from the start of the sequence */
  at: number;
}

/** When the tagline has finished appearing (DateReveal's own reveal timings). */
export const DATES_REVEAL_DONE_MS = 5000;

export function datesTimeline(reduced: boolean): PhaseStep<DatesPhase>[] {
  // Reading time stays generous even with reduced motion: the dates must be read.
  const k = reduced ? 0.35 : 1;
  const revealDone = DATES_REVEAL_DONE_MS * k;
  const hold = 3200; // a pause so both dates (and the tagline) can be read
  const outro = reduced ? 400 : 1800; // cards converge, beam contracts, sapphire → point
  const dark = reduced ? 150 : 500;
  return [
    { phase: 'reveal', at: 0 },
    { phase: 'hold', at: revealDone },
    { phase: 'outro', at: revealDone + hold },
    { phase: 'dark', at: revealDone + hold + outro },
    { phase: 'handoff', at: revealDone + hold + outro + dark },
  ];
}

// ------------------------------------------------------------ THE 25th STAR entrance
export type EntrancePhase = 'point' | 'gather' | 'digits' | 'hold' | 'title' | 'details' | 'chamber' | 'done';
export const ENTRANCE_ORDER: EntrancePhase[] = ['point', 'gather', 'digits', 'hold', 'title', 'details', 'chamber', 'done'];

export function entranceTimeline(reduced: boolean): PhaseStep<EntrancePhase>[] {
  if (reduced) {
    // A short, gentle crossfade – the whole entrance stays under two seconds.
    return [
      { phase: 'point', at: 0 },
      { phase: 'digits', at: 150 },
      { phase: 'title', at: 650 },
      { phase: 'details', at: 1000 },
      { phase: 'chamber', at: 1300 },
      { phase: 'done', at: 1700 },
    ];
  }
  return [
    { phase: 'point', at: 0 },
    { phase: 'gather', at: 250 },
    { phase: 'digits', at: 1200 },
    { phase: 'hold', at: 2200 },
    { phase: 'title', at: 5200 },
    { phase: 'details', at: 6600 },
    { phase: 'chamber', at: 8000 },
    { phase: 'done', at: 9500 },
  ];
}

export const phaseAtLeast = (current: EntrancePhase, target: EntrancePhase) =>
  ENTRANCE_ORDER.indexOf(current) >= ENTRANCE_ORDER.indexOf(target);

// ------------------------------------------------------------ "play once" flag
/** Versioned so a future redesign of the entrance can be shown once again. */
export const ENTRANCE_SEEN_KEY = 'prism:star-entrance:v1';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
const browserStorage = (): StorageLike | null => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
};

export function hasSeenEntrance(storage: StorageLike | null = browserStorage()): boolean {
  try {
    return storage?.getItem(ENTRANCE_SEEN_KEY) === '1';
  } catch {
    return false; // storage blocked: just play the entrance; nothing else depends on it
  }
}

export function markEntranceSeen(storage: StorageLike | null = browserStorage()): void {
  try {
    storage?.setItem(ENTRANCE_SEEN_KEY, '1');
  } catch {
    /* private mode / quota: harmless – the entrance may simply play again */
  }
}

/** Which entrance THE 25th STAR should play. Presentation only – never affects time or access. */
export function chooseEntrance(storage: StorageLike | null = browserStorage()): 'cinematic' | 'none' {
  return hasSeenEntrance(storage) ? 'none' : 'cinematic';
}

/** Wraps a callback so it can run at most once. */
export function once<A extends unknown[]>(fn: (...a: A) => void): (...a: A) => void {
  let done = false;
  return (...a: A) => {
    if (done) return;
    done = true;
    fn(...a);
  };
}

/**
 * Whether the chamber may open itself because the countdown reached zero while
 * the visitor was watching. Only DEFERS during the entrance; the decision to
 * open is still the chamber's own `reached` logic.
 */
export function shouldAutoOpen(o: { reached: boolean; lockedOnMount: boolean; state: string; entranceRunning: boolean }): boolean {
  return o.reached && o.lockedOnMount && o.state === 'locked' && !o.entranceRunning;
}
