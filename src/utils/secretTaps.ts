/**
 * Five deliberate taps within three seconds on a decorative element open the
 * Royal Wish Vault's login. This is only a hidden entrance – the security is
 * the access code checked by the server.
 */
export const SECRET_TAPS = 5;
export const SECRET_WINDOW_MS = 3000;
/** Taps closer together than this are treated as one (avoids double-fire / bounce). */
export const MIN_TAP_GAP_MS = 60;

export function registerTap(
  times: readonly number[],
  now: number,
  { count = SECRET_TAPS, windowMs = SECRET_WINDOW_MS, minGap = MIN_TAP_GAP_MS } = {},
): { times: number[]; unlocked: boolean } {
  const last = times[times.length - 1];
  if (last !== undefined && now - last < minGap) return { times: [...times], unlocked: false };
  const recent = [...times, now].filter((t) => now - t <= windowMs);
  if (recent.length >= count) return { times: [], unlocked: true };
  return { times: recent, unlocked: false };
}
