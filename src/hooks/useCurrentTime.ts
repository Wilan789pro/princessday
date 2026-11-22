import { useSyncExternalStore } from 'react';
import { getTickSnapshot, subscribeTick } from '../utils/clock';

/** Current instant (ms), re-rendering once per second on the second boundary. */
export function useCurrentTime(): number {
  return useSyncExternalStore(subscribeTick, getTickSnapshot, getTickSnapshot);
}
