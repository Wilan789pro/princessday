import { useMemo } from 'react';
import { remainingUntil, type Remaining } from '../utils/dates';
import { useCurrentTime } from './useCurrentTime';

/** Live countdown to an absolute instant. Recomputed from the clock every tick – no stored start value. */
export function useCountdown(targetMs: number): Remaining {
  const nowMs = useCurrentTime();
  return useMemo(() => remainingUntil(targetMs, nowMs), [targetMs, nowMs]);
}
