import { motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { princessDay } from '../../content/princessDay';
import { Crystal } from '../Crystal/Crystal';
import { RoyalName } from '../RoyalName/RoyalName';

export function PrincessDayIntro({ children }: { children?: React.ReactNode }) {
  const reduced = useReducedMotion();
  const t = princessDay.intro;
  const up = (delay: number) => ({
    initial: { opacity: 0, y: reduced ? 0 : 20 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 1.1, ease: [0.16, 1, 0.3, 1] },
  });

  return (
    <header className="scene pd-hero">
      <motion.div className="pd-hero__crown" {...up(0.2)} aria-hidden="true">
        <Crystal hue="lavender" shape={3} size="clamp(46px, 13vw, 64px)" float sparkle={false} className="pd-hero__side" />
        <Crystal hue="sapphire" shape={0} size="clamp(86px, 24vw, 120px)" float />
        <Crystal hue="cyan" shape={3} size="clamp(46px, 13vw, 64px)" float sparkle={false} className="pd-hero__side" />
      </motion.div>
      <motion.p className="eyebrow" {...up(0.5)}>
        {t.eyebrow}
      </motion.p>
      <motion.h1 className="pd-hero__title serif" {...up(0.7)}>
        {t.title}
        <span className="pd-hero__name">
          <RoyalName textClass="text-prism" />
        </span>
      </motion.h1>
      <motion.p className="pd-hero__body" {...up(1.1)}>
        {t.body}
      </motion.p>
      <motion.div className="pd-hero__hint" {...up(1.6)} aria-hidden="true">
        <span>{t.scrollHint}</span>
        <ChevronDown size={18} />
      </motion.div>
      {children}
    </header>
  );
}
