import { useEffect, useState } from 'react';
import { testClockQuery } from '../utils/clock';

export type BirthdayBlock =
  | { type: 'text'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'image'; src: string; alt?: string; caption?: string }
  | { type: 'video'; src: string; caption?: string; poster?: string }
  | { type: 'audio'; src: string; caption?: string };

export interface BirthdayContent {
  _placeholder?: boolean;
  eyebrow?: string;
  headline?: string;
  blocks: BirthdayBlock[];
  signature?: string;
}

export type BirthdayAccess =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'open'; content: BirthdayContent }
  | { state: 'server-locked' }
  | { state: 'unavailable' };

/** Private assets are served by the time-gated endpoint, never from /public. */
export function birthdayAssetUrl(src: string): string {
  if (/^(https?:)?\/\//.test(src) || src.startsWith('/') || src.startsWith('data:')) return src;
  const q = testClockQuery();
  return `/api/birthday-asset?name=${encodeURIComponent(src)}${q ? `&${q}` : ''}`;
}

/**
 * Asks the SERVER for the birthday content. The server checks its own clock,
 * so a locked response is returned before 18.12.2026 regardless of the device.
 */
export function useBirthdayAccess(enabled: boolean): BirthdayAccess {
  const [access, setAccess] = useState<BirthdayAccess>({ state: 'idle' });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const load = async (attempt: number) => {
      setAccess({ state: 'loading' });
      try {
        const q = testClockQuery();
        const res = await fetch(`/api/birthday${q ? `?${q}` : ''}`, { cache: 'no-store' });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && data?.status === 'open' && data.content) {
          setAccess({ state: 'open', content: data.content as BirthdayContent });
        } else if (res.status === 403 && data?.status === 'locked') {
          // Device clock may be a few seconds ahead of the server – retry briefly.
          if (attempt < 6) retryTimer = setTimeout(() => load(attempt + 1), 2500);
          else setAccess({ state: 'server-locked' });
        } else {
          setAccess({ state: 'unavailable' });
        }
      } catch {
        if (cancelled) return;
        if (attempt < 3) retryTimer = setTimeout(() => load(attempt + 1), 3000);
        else setAccess({ state: 'unavailable' });
      }
    };

    load(0);
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [enabled]);

  return access;
}
