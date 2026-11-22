import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Photo } from '../../content/princessDay';

interface Props {
  photos: Photo[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}

/** Full-screen viewer: swipe, arrow keys, Escape. */
export function Lightbox({ photos, index, onIndex, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const many = photos.length > 1;
  const go = (d: number) => onIndex((index + d + photos.length) % photos.length);
  const photo = photos[index];

  useEffect(() => {
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' && many) go(1);
      else if (e.key === 'ArrowLeft' && many) go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return createPortal(
    <motion.div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={photo.caption || photo.alt}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <button ref={closeRef} type="button" className="lightbox__btn lightbox__close" onClick={onClose} aria-label="Close photo">
        <X size={22} />
      </button>

      <AnimatePresence mode="wait" initial={false}>
        <motion.figure
          key={index}
          className="lightbox__figure"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.25 }}
          drag={many ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.6}
          onDragEnd={(_, info) => {
            if (info.offset.x < -60) go(1);
            else if (info.offset.x > 60) go(-1);
          }}
        >
          <img src={photo.src} alt={photo.alt} draggable={false} />
          {photo.caption && <figcaption className="serif">{photo.caption}</figcaption>}
        </motion.figure>
      </AnimatePresence>

      {many && (
        <>
          <button type="button" className="lightbox__btn lightbox__prev" onClick={() => go(-1)} aria-label="Previous photo">
            <ChevronLeft size={24} />
          </button>
          <button type="button" className="lightbox__btn lightbox__next" onClick={() => go(1)} aria-label="Next photo">
            <ChevronRight size={24} />
          </button>
          <p className="lightbox__count mono" aria-live="polite">
            {index + 1} / {photos.length}
          </p>
        </>
      )}
    </motion.div>,
    document.body,
  );
}
