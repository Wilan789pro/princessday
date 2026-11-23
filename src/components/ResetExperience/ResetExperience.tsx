import { motion, useReducedMotion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { reset as t } from '../../content/reset';
import { clearVisitorProgress, startUrl } from '../../utils/experienceState';
import './ResetExperience.css';

interface Props {
  onClose: () => void;
}

/**
 * RESET ENTIRE EXPERIENCE – opened only by visiting the site with ?reset.
 * Clears this browser's "prism:" keys (progress, bouquet, her wish, entrance
 * flags) and restarts from the very beginning. This device only; no server.
 */
export function ResetExperience({ onClose }: Props) {
  const reduced = useReducedMotion();
  const [done, setDone] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !done) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [done, onClose]);

  const confirm = () => {
    clearVisitorProgress();
    setDone(true);
    setTimeout(() => window.location.replace(startUrl()), reduced ? 600 : 2000);
  };

  return (
    <motion.div className="reset" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="reset__dialog" role="alertdialog" aria-modal="true" aria-labelledby="reset-title" aria-describedby="reset-body">
        <p className="reset__eyebrow mono">{t.eyebrow}</p>
        <h2 id="reset-title" className="reset__title serif">
          {t.title}
        </h2>
        {done ? (
          <p id="reset-body" className="reset__done serif" role="status">
            {t.done}
          </p>
        ) : (
          <>
            <p id="reset-body" className="reset__body">
              {t.body}
            </p>
            <div className="reset__actions">
              <button type="button" className="btn btn--ghost btn--small" onClick={onClose} autoFocus>
                {t.cancel}
              </button>
              <button type="button" className="btn btn--small reset__confirm" onClick={confirm}>
                <RotateCcw size={15} aria-hidden="true" /> {t.confirm}
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
