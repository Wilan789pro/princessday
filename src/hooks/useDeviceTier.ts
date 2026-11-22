import { useReducedMotion } from 'framer-motion';

export type DeviceTier = 'minimal' | 'low' | 'high';

/** Rough capability estimate used to scale particle counts. Computed once. */
const detectedTier: Exclude<DeviceTier, 'minimal'> = (() => {
  if (typeof window === 'undefined') return 'high';
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  if (saveData || cores <= 2 || mem <= 2) return 'low';
  return 'high';
})();

export function useDeviceTier(): DeviceTier {
  const reduced = useReducedMotion();
  return reduced ? 'minimal' : detectedTier;
}
