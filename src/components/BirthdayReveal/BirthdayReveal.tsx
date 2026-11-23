import { motion, useReducedMotion } from 'framer-motion';
import { project25 } from '../../content/birthday';
import { birthdayAssetUrl, type BirthdayAccess, type BirthdayBlock } from '../../hooks/useBirthdayAccess';
import { Crystal } from '../Crystal/Crystal';
import './BirthdayReveal.css';

function Block({ block }: { block: BirthdayBlock }) {
  switch (block.type) {
    case 'heading':
      return <h3 className="br-heading serif">{block.text}</h3>;
    case 'text':
      return <p className="br-text">{block.text}</p>;
    case 'image':
      return (
        <figure className="br-figure">
          <img src={birthdayAssetUrl(block.src)} alt={block.alt ?? ''} loading="lazy" decoding="async" />
          {block.caption && <figcaption className="serif">{block.caption}</figcaption>}
        </figure>
      );
    case 'video':
      return (
        <figure className="br-figure">
          <video
            src={birthdayAssetUrl(block.src)}
            poster={block.poster ? birthdayAssetUrl(block.poster) : undefined}
            controls
            playsInline
            preload="metadata"
          />
          {block.caption && <figcaption className="serif">{block.caption}</figcaption>}
        </figure>
      );
    case 'audio':
      return (
        <figure className="br-figure">
          <audio src={birthdayAssetUrl(block.src)} controls preload="none" />
          {block.caption && <figcaption className="serif">{block.caption}</figcaption>}
        </figure>
      );
    default:
      return null;
  }
}

/** ACT VII – what waits inside. Content arrives from the server, never from the bundle. */
export function BirthdayReveal({ access }: { access: BirthdayAccess }) {
  const r = project25;
  const reduced = useReducedMotion();
  const up = (delay: number) => ({
    initial: { opacity: 0, y: reduced ? 0 : 20, filter: reduced ? 'none' : 'blur(8px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    transition: { delay, duration: 1, ease: [0.16, 1, 0.3, 1] },
  });

  return (
    <section className="section br" aria-labelledby="br-headline" id="birthday">
      <div className="br-banner">
        {r.unlocked.lines.map((line, i) => (
          <motion.p key={line} className={`br-line mono br-line--${i}`} {...up(0.2 + i * 0.5)}>
            {line}
          </motion.p>
        ))}
        <motion.div {...up(1.8)} className="br-crown" aria-hidden="true">
          <Crystal hue="gold" shape={0} size={70} float />
        </motion.div>
        <motion.h2 id="br-headline" className="br-headline serif text-gold" {...up(2.1)}>
          {r.unlocked.headline}
        </motion.h2>
      </div>

      <motion.div className="br-container glass" {...up(2.9)} aria-live="polite">
        {(access.state === 'loading' || access.state === 'idle') && (
          <p className="br-status mono">
            <span className="br-spinner" aria-hidden="true" /> {r.reveal.loading}
          </p>
        )}
        {access.state === 'server-locked' && <p className="br-status">{r.reveal.serverLocked}</p>}
        {access.state === 'unavailable' && <p className="br-status">{r.reveal.unavailable}</p>}
        {access.state === 'static' && <p className="br-status">{r.reveal.staticHosting}</p>}
        {access.state === 'open' && (
          <div className="br-content">
            {access.content._placeholder && <p className="br-dev mono">{r.reveal.placeholderNote}</p>}
            {access.content.eyebrow && <p className="eyebrow br-eyebrow">{access.content.eyebrow}</p>}
            {access.content.headline && <h3 className="br-content-title serif">{access.content.headline}</h3>}
            {access.content.blocks?.map((b, i) => (
              <motion.div key={i} {...up(0.15 * i)}>
                <Block block={b} />
              </motion.div>
            ))}
            {access.content.signature && <p className="br-signature serif">{access.content.signature}</p>}
          </div>
        )}
      </motion.div>
    </section>
  );
}
