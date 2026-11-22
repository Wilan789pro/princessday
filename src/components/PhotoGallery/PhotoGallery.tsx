import { useRef, useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { princessDay, type Photo } from '../../content/princessDay';
import { Reveal } from '../PrincessDay/Reveal';
import { Lightbox } from './Lightbox';
import './PhotoGallery.css';

/**
 * THE LITTLE MOMENTS – replaceable photographs.
 * Add files to /public/photos and set `src` in src/content/princessDay.ts.
 */
export function PhotoGallery({ children }: { children?: React.ReactNode }) {
  const g = princessDay.gallery;
  const photos: Photo[] = g.photos;
  const real = photos.filter((p) => p.src);
  const [open, setOpen] = useState<number | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  if (import.meta.env.PROD && g.hideWhenEmpty && real.length === 0) return null;

  return (
    <section className="section gallery" aria-labelledby="gallery-title">
      {children}
      <Reveal>
        <p className="eyebrow">Chapter IV</p>
        <h2 id="gallery-title" className="section-title">
          {g.title}
        </h2>
        <p className="section-sub">{g.subtitle}</p>
      </Reveal>

      <ul className="gallery__grid" role="list">
        {photos.map((photo, i) => {
          const realIndex = photo.src ? real.indexOf(photo) : -1;
          return (
            <li key={i} className="gallery__cell" style={{ ['--tilt' as string]: `${[-3, 2.5, -1.5, 3, -2.5, 1.5][i % 6]}deg` }}>
              <Reveal delay={0.08 * (i % 3)}>
                {photo.src ? (
                  <button
                    type="button"
                    className="gallery__frame"
                    onClick={(e) => {
                      openerRef.current = e.currentTarget;
                      setOpen(realIndex);
                    }}
                    aria-label={`Open photo: ${photo.caption || photo.alt}`}
                  >
                    <span className="gallery__img-wrap">
                      <img src={photo.src} alt={photo.alt} loading="lazy" decoding="async" />
                    </span>
                    {photo.caption && <span className="gallery__caption serif">{photo.caption}</span>}
                  </button>
                ) : (
                  <figure className="gallery__frame gallery__frame--empty">
                    <span className="gallery__img-wrap">
                      <span className="gallery__placeholder">
                        <ImageIcon size={26} strokeWidth={1.2} aria-hidden="true" />
                        <span>Photograph {i + 1}</span>
                        <span className="gallery__dev">add to /public/photos</span>
                      </span>
                    </span>
                    {photo.caption && <figcaption className="gallery__caption serif">{photo.caption}</figcaption>}
                  </figure>
                )}
              </Reveal>
            </li>
          );
        })}
      </ul>

      {open !== null && (
        <Lightbox
          photos={real}
          index={open}
          onIndex={setOpen}
          onClose={() => {
            setOpen(null);
            openerRef.current?.focus();
          }}
        />
      )}
    </section>
  );
}
