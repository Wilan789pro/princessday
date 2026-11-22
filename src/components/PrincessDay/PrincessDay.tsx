import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { audio } from '../../audio/AudioEngine';
import { princessDay } from '../../content/princessDay';
import { ComplimentGenerator } from '../ComplimentGenerator/ComplimentGenerator';
import { CrystalCollection } from '../CrystalCollection/CrystalCollection';
import { PhotoGallery } from '../PhotoGallery/PhotoGallery';
import { Closing } from './Closing';
import { HiddenMessage } from './HiddenMessage';
import { PrincessDayIntro } from './PrincessDayIntro';
import { RoyalDecree } from './RoyalDecree';
import './PrincessDay.css';

interface Props {
  onComplete: () => void;
}

/** ACT III – the primary Princess Day celebration. */
export function PrincessDay({ onComplete }: Props) {
  const secrets = princessDay.hiddenMessages;
  const [found, setFound] = useState<string[]>([]);
  const [toast, setToast] = useState<{ id: string; text: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const find = useCallback(
    (id: string) => {
      const msg = secrets.find((s) => s.id === id);
      if (!msg) return;
      audio.chime(7);
      setFound((f) => (f.includes(id) ? f : [...f, id]));
      setToast({ id, text: msg.text });
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 5200);
    },
    [secrets],
  );

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // Glints are placed by index; extra hidden messages beyond 4 are simply not shown.
  const glint = (i: number, style: React.CSSProperties) => {
    const s = secrets[i];
    return s ? <HiddenMessage id={s.id} found={found.includes(s.id)} onFind={find} style={style} /> : null;
  };

  return (
    <main className="princess" id="princess-day">
      <PrincessDayIntro>{glint(0, { top: '22%', right: '9%' })}</PrincessDayIntro>
      <CrystalCollection>{glint(1, { bottom: '6%', left: '6%' })}</CrystalCollection>
      <ComplimentGenerator>{glint(2, { top: '12%', left: '8%' })}</ComplimentGenerator>
      <RoyalDecree>{glint(3, { bottom: '4%', right: '7%' })}</RoyalDecree>
      <PhotoGallery />
      <Closing secretsFound={found.length} secretsTotal={Math.min(secrets.length, 4)} onContinue={onComplete} />

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id + toast.text}
            className="glass toast"
            role="status"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={() => setToast(null)}
          >
            <span className="eyebrow">Secret {secrets.findIndex((s) => s.id === toast.id) + 1} found</span>
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
