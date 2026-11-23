import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { garden } from '../../content/garden';
import { emptyBouquet, loadBouquet, saveBouquet, type BouquetSpec } from '../../garden/bouquetModel';
import { Reveal } from '../PrincessDay/Reveal';
import { BouquetStudio } from './BouquetStudio';
import { FirstBloom } from './FirstBloom';
import { FiveSecrets } from './FiveSecrets';
import { RoyalCertificate } from './RoyalCertificate';
import { WishUponAStar } from './WishUponAStar';
import './Garden.css';

interface Props {
  /** "Return to My Kingdom": scroll back to the existing Closing section. */
  onReturn: () => void;
}

/**
 * CHAPTER IV of Princess Day – THE GARDEN OF WISHES.
 * Five chapters in one continuous scene. Holds the bouquet specification,
 * which is saved only in this browser and reused by the certificate.
 */
export function GardenOfWishes({ onReturn }: Props) {
  const reduced = useReducedMotion();
  const [chapter, setChapter] = useState(0);
  const [reached, setReached] = useState(0);
  const [spec, setSpec] = useState<BouquetSpec>(() => loadBouquet() ?? emptyBouquet());
  const stepsRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    saveBouquet(spec);
  }, [spec]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    stepsRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }, [chapter, reduced]);

  const go = (i: number) => {
    setChapter(i);
    setReached((r) => Math.max(r, i));
  };
  const next = () => go(Math.min(chapter + 1, garden.chapters.length - 1));

  return (
    <section className="section garden" aria-labelledby="garden-title">
      <Reveal>
        <p className="eyebrow">{garden.eyebrow}</p>
        <h2 id="garden-title" className="section-title">
          {garden.title}
        </h2>
        <p className="section-sub">{garden.subtitle}</p>
      </Reveal>

      <nav className="garden__steps" aria-label="Garden chapters" ref={stepsRef}>
        <ol>
          {garden.chapters.map((c, i) => {
            const locked = i > reached;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  className={`garden__step ${i === chapter ? 'is-current' : ''} ${i < reached || (i <= reached && i !== chapter) ? 'is-visited' : ''}`}
                  onClick={() => !locked && go(i)}
                  aria-current={i === chapter ? 'step' : undefined}
                  aria-disabled={locked}
                  aria-label={`Chapter ${c.numeral}: ${c.name}${locked ? ' (not yet reached)' : ''}`}
                >
                  <span className="garden__step-num mono">{c.numeral}</span>
                  <span className="garden__step-name">{c.name}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="garden__stage">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={chapter}
            initial={{ opacity: 0, y: reduced ? 0 : 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : -12 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="garden__chapter-label eyebrow">
              {garden.chapters[chapter].numeral} · {garden.chapters[chapter].name}
            </p>
            {chapter === 0 && <FirstBloom onContinue={next} />}
            {chapter === 1 && <BouquetStudio spec={spec} onChange={setSpec} onContinue={next} />}
            {chapter === 2 && <FiveSecrets onContinue={next} />}
            {chapter === 3 && <WishUponAStar onContinue={next} />}
            {chapter === 4 && <RoyalCertificate spec={spec} onReturn={onReturn} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
