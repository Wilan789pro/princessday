import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Castle, Download } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { audio } from '../../audio/AudioEngine';
import { garden } from '../../content/garden';
import type { BouquetSpec } from '../../garden/bouquetModel';
import { renderCertificatePng } from '../../garden/certificateCanvas';
import { savePng } from '../../garden/exportImage';
import { drawOn } from '../../garden/motion';

type Phase = 'forming' | 'ready' | 'pressed' | 'revealed' | 'error';

interface Props {
  spec: BouquetSpec;
  onReturn: () => void;
}

/** CHAPTER V – the seal forms, she presses it, the certificate appears. */
export function RoyalCertificate({ spec, onReturn }: Props) {
  const s = garden.seal;
  const reduced = !!useReducedMotion();
  const [phase, setPhase] = useState<Phase>('forming');
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const blobRef = useRef<Blob | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setPhase('ready'), reduced ? 200 : 2400);
    return () => clearTimeout(id);
  }, [reduced]);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const press = async () => {
    if (phase !== 'ready') return;
    setPhase('pressed');
    audio.clunk();
    setTimeout(() => audio.chime(5), 140);
    const minDelay = new Promise((r) => setTimeout(r, reduced ? 100 : 1100));
    try {
      const [blob] = await Promise.all([renderCertificatePng(spec), minDelay]);
      blobRef.current = blob;
      const u = URL.createObjectURL(blob);
      urlRef.current = u;
      setUrl(u);
      setPhase('revealed');
      audio.golden();
    } catch {
      setPhase('error');
    }
  };

  const save = async () => {
    if (!blobRef.current) return;
    const r = await savePng(blobRef.current, 'certificate-of-extraordinary-princesshood.png', 'Certificate of Extraordinary Princesshood');
    setStatus(r === 'cancelled' ? 'Saving cancelled' : r === 'shared' ? 'Certificate ready to save' : 'Certificate downloaded');
  };

  return (
    <div className="seal">
      <p className="garden__lead">{s.intro}</p>

      <AnimatePresence mode="wait">
        {phase !== 'revealed' ? (
          <motion.div
            key="letter"
            className="seal__letter"
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.5 } }}
          >
            <p className="seal__court eyebrow">By order of the Celestial Court</p>
            <p className="seal__title serif">{garden.certificate.titleMain}</p>
            <motion.button
              type="button"
              className={`seal__button seal__button--${phase}`}
              onClick={press}
              disabled={phase !== 'ready'}
              aria-label={phase === 'ready' ? s.pressLabel : s.forming}
              animate={phase === 'pressed' && !reduced ? { scale: [1, 1.18, 0.9, 1] } : {}}
              transition={{ duration: 0.6 }}
            >
              <svg viewBox="-60 -60 120 120" aria-hidden="true">
                <defs>
                  <radialGradient id="seal-wax" cx="0.35" cy="0.3" r="0.8">
                    <stop offset="0" stopColor="#6aa9f2" />
                    <stop offset="0.45" stopColor="#1f5fbf" />
                    <stop offset="1" stopColor="#0b2a5c" />
                  </radialGradient>
                </defs>
                <motion.path
                  d={waxPath()}
                  fill="url(#seal-wax)"
                  initial={{ scale: reduced ? 1 : 0.15, opacity: reduced ? 1 : 0.3 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: reduced ? 0 : 1.6, ease: [0.2, 0.9, 0.3, 1.2] }}
                  style={{ transformBox: 'fill-box', originX: 0.5, originY: 0.5 }}
                />
                <motion.circle
                  r="34"
                  fill="none"
                  stroke="#ffffff"
                  strokeOpacity="0.45"
                  strokeWidth="2"
                  {...drawOn(reduced ? 0 : 1.1, reduced ? 0 : 1, false)}
                />
                <motion.g initial={{ opacity: reduced ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ delay: reduced ? 0 : 1.7, duration: 0.6 }}>
                  <path d="M-16 -6 L-9 -15 L9 -15 L16 -6 L0 19 Z" fill="#cfefff" fillOpacity="0.85" />
                  <path d="M-16 -6 L16 -6 M-6 -6 L0 19 L6 -6" fill="none" stroke="#0b2a5c" strokeOpacity="0.5" strokeWidth="1.4" />
                </motion.g>
              </svg>
              {phase === 'pressed' && !reduced && <span className="seal__ripple" aria-hidden="true" />}
            </motion.button>
            <p className="seal__hint" aria-live="polite">
              {phase === 'forming' && s.forming}
              {phase === 'ready' && s.pressLabel}
              {phase === 'pressed' && s.preparing}
              {phase === 'error' && 'The certificate could not be drawn on this device.'}
            </p>
            {phase === 'error' && (
              <button type="button" className="btn btn--ghost btn--small" onClick={() => setPhase('ready')}>
                Try again
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="certificate"
            className="seal__reveal"
            initial={{ opacity: 0, y: 30, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: reduced ? 0.2 : 1.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="seal__frame">
              <img
                src={url ?? ''}
                alt={`${garden.certificate.titleTop} ${garden.certificate.titleMain}, awarded to Princess Prism. ${garden.certificate.citation} Sealed with a sapphire seal and stamped with her bouquet.`}
              />
            </div>
            <div className="garden__actions">
              <button type="button" className="btn btn--primary" onClick={save}>
                <Download size={18} aria-hidden="true" /> {s.saveLabel}
              </button>
              <button type="button" className="btn btn--ghost" onClick={onReturn}>
                <Castle size={18} aria-hidden="true" /> {s.returnLabel}
              </button>
            </div>
            <p className="seal__status" role="status">
              {status}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function waxPath() {
  const pts: string[] = [];
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const r = 52 * (1 + 0.05 * Math.sin(a * 7) + 0.03 * Math.sin(a * 13 + 1.3));
    pts.push(`${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`);
  }
  return `M${pts.join(' L')} Z`;
}
