import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { audio } from './AudioEngine';

interface SoundState {
  enabled: boolean;
  toggle: () => void;
}

const SoundCtx = createContext<SoundState>({ enabled: true, toggle: () => {} });

const KEY = 'prism:sound';

export function SoundProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem(KEY) !== 'off';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    audio.setEnabled(enabled);
    try {
      localStorage.setItem(KEY, enabled ? 'on' : 'off');
    } catch {
      /* private mode */
    }
  }, [enabled]);

  const toggle = useCallback(() => {
    setEnabled((v) => {
      const next = !v;
      if (next) {
        // Toggling on is itself a gesture: safe to unlock audio here.
        audio.init();
        audio.setEnabled(true);
        audio.startAmbient();
      }
      return next;
    });
  }, []);

  return <SoundCtx.Provider value={{ enabled, toggle }}>{children}</SoundCtx.Provider>;
}

export const useSound = () => useContext(SoundCtx);
