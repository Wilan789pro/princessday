import { motion } from 'framer-motion';
import type { FlowerPart, FlowerType } from '../../content/garden';
import type { FlowerColours } from '../../garden/bouquetModel';
import { DESIGNS, LEAF_PATH, LEAF_VEIN, centreBehindPetals } from '../../garden/flowerDesigns';

const OUTLINE = 'rgba(7,20,38,0.32)';

interface HeadProps {
  type: FlowerType;
  colours: FlowerColours;
  /** Animate petals unfolding from their base (layer by layer). */
  unfold?: { delay: number; stagger?: number };
  selected?: FlowerPart | null;
  onPart?: (p: FlowerPart) => void;
}

/**
 * A flower head drawn around (0,0). Pure SVG – safe to render to static markup
 * for PNG export (no CSS filters, no external references).
 */
export function FlowerHead({ type, colours, unfold, selected, onPart }: HeadProps) {
  const design = DESIGNS[type];
  const stagger = unfold?.stagger ?? 0.18;
  const click = (p: FlowerPart) => (onPart ? { onClick: () => onPart(p), style: { cursor: 'pointer' } } : {});

  const petals = (
    <g className={`fpart ${selected === 'petals' ? 'is-selected' : ''}`} {...click('petals')}>
      {design.petals.map((p, i) => {
        const inner = (
          <>
            <path className="fp-main" d={p.d} fill={colours.petals} stroke={OUTLINE} strokeWidth={0.8} />
            {p.shade !== 0 && (
              <path d={p.d} fill={p.shade > 0 ? '#ffffff' : '#020814'} fillOpacity={Math.abs(p.shade)} />
            )}
            <path d={p.d} transform="scale(0.55)" fill="#ffffff" fillOpacity={0.2} />
          </>
        );
        return (
          <g key={i} transform={`translate(${p.tx ?? 0} 0) rotate(${p.rotate})`}>
            {unfold ? (
              <motion.g
                style={{ transformBox: 'fill-box', originX: 0.5, originY: 1 }}
                initial={{ scale: 0.05, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: unfold.delay + p.layer * stagger + (i % 5) * 0.03, duration: 0.9, ease: [0.2, 0.8, 0.3, 1] }}
              >
                {inner}
              </motion.g>
            ) : (
              inner
            )}
          </g>
        );
      })}
    </g>
  );

  const centre = (
    <g className={`fpart ${selected === 'centre' ? 'is-selected' : ''}`} {...click('centre')}>
      {design.centre.map((c, i) =>
        c.line ? (
          <path key={i} d={c.d} fill="none" stroke={colours.centre} strokeWidth={1.6} strokeLinecap="round" />
        ) : (
          <g key={i}>
            <path className="fp-main" d={c.d} fill={colours.centre} stroke={OUTLINE} strokeWidth={0.6} />
            {c.shade ? <path d={c.d} fill={c.shade > 0 ? '#ffffff' : '#020814'} fillOpacity={Math.abs(c.shade)} /> : null}
          </g>
        ),
      )}
    </g>
  );

  const animatedCentre = unfold ? (
    <motion.g
      style={{ transformBox: 'fill-box', originX: 0.5, originY: 0.5 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: unfold.delay + 0.1, duration: 0.6 }}
    >
      {centre}
    </motion.g>
  ) : (
    centre
  );

  return centreBehindPetals(type) ? (
    <g>
      {animatedCentre}
      {petals}
    </g>
  ) : (
    <g>
      {petals}
      {animatedCentre}
    </g>
  );
}

export function Leaf({ colour, transform, selected }: { colour: string; transform?: string; selected?: boolean }) {
  return (
    <g transform={transform}>
      <path className={`fp-main ${selected ? 'is-selected-path' : ''}`} d={LEAF_PATH} fill={colour} stroke={OUTLINE} strokeWidth={0.7} />
      <path d={LEAF_PATH} transform="scale(0.6)" fill="#ffffff" fillOpacity={0.14} />
      <path d={LEAF_VEIN} fill="none" stroke="#020814" strokeOpacity={0.25} strokeWidth={0.8} />
    </g>
  );
}

interface FullProps {
  type: FlowerType;
  colours: FlowerColours;
  selected?: FlowerPart | null;
  onPart?: (p: FlowerPart) => void;
  title?: string;
}

/** A single flower with stem and leaves, used in the colouring studio (200 × 300). */
export function FlowerFull({ type, colours, selected, onPart, title }: FullProps) {
  const upright = DESIGNS[type].upright;
  const headY = upright ? 120 : 96;
  const click = (p: FlowerPart) => (onPart ? { onClick: () => onPart(p), style: { cursor: 'pointer' } } : {});
  return (
    <svg viewBox="0 0 200 300" className="flower-full" role="img" aria-label={title}>
      <g className={`fpart ${selected === 'stem' ? 'is-selected' : ''}`} {...click('stem')}>
        {/* wide invisible hit area so the thin stem is easy to tap */}
        <path d={`M100 ${headY} C 104 170 96 230 100 292`} stroke="transparent" strokeWidth={22} fill="none" />
        <path className="fp-main fp-stem" d={`M100 ${headY} C 104 170 96 230 100 292`} stroke={colours.stem} strokeWidth={5} fill="none" strokeLinecap="round" />
      </g>
      <g className={`fpart ${selected === 'leaves' ? 'is-selected' : ''}`} {...click('leaves')}>
        <Leaf colour={colours.leaves} transform="translate(101 196) rotate(-8) scale(1.25)" />
        <Leaf colour={colours.leaves} transform="translate(99 238) scale(-1.2 1.2) rotate(-4)" />
      </g>
      <g transform={`translate(100 ${headY}) scale(1.45)`}>
        <FlowerHead type={type} colours={colours} selected={selected} onPart={onPart} />
      </g>
    </svg>
  );
}
