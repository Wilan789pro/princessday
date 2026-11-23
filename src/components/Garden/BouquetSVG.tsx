import { motion } from 'framer-motion';
import { BIND, BOUQUET_VIEW, SLOTS, type BouquetSpec, type PlacedFlower } from '../../garden/bouquetModel';
import { DESIGNS } from '../../garden/flowerDesigns';
import { FlowerHead, Leaf } from './Flower';

interface Props {
  spec: BouquetSpec;
  /** Midnight backdrop with stars (for display and PNG); off for the certificate stamp. */
  background?: boolean;
  /** Play the "stems gather" assembly animation. Never used for export. */
  gather?: boolean;
  /** Interactive arranging */
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Explicit pixel size (export). */
  pixelWidth?: number;
  idPrefix?: string;
  title?: string;
}

// Deterministic star field so exports are identical every time.
const STARS = Array.from({ length: 46 }, (_, i) => {
  const r = (n: number) => {
    const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  return { x: r(1) * 400, y: r(2) * 330, s: 0.5 + r(3) * 1.3, o: 0.25 + r(4) * 0.6 };
});

function headPoint(f: PlacedFlower) {
  const s = SLOTS[f.slot];
  // Upright (side-view) flowers sit a little lower so their cups line up with the round heads.
  return DESIGNS[f.type].upright ? { x: s.x, y: s.y + 26 } : s;
}

function stemPath(f: PlacedFlower) {
  const h = headPoint(f);
  const cx = h.x + (BIND.x - h.x) * 0.25;
  const cy = h.y + (BIND.y - h.y) * 0.6;
  const bx = BIND.x + (h.x - BIND.x) * 0.2;
  return `M${h.x} ${h.y} Q ${cx} ${cy} ${BIND.x} ${BIND.y} L ${bx.toFixed(1)} 478`;
}

function leafTransform(f: PlacedFlower) {
  const h = headPoint(f);
  const t = 0.55;
  const x = h.x + (BIND.x - h.x) * t;
  const y = h.y + (BIND.y - h.y) * t;
  const left = h.x < BIND.x || (h.x === BIND.x && f.slot % 2 === 0);
  const angle = (Math.atan2(BIND.y - h.y, BIND.x - h.x) * 180) / Math.PI;
  return left
    ? `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(angle - 200).toFixed(1)}) scale(-0.95 0.95)`
    : `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(angle + 20).toFixed(1)}) scale(0.95)`;
}

/**
 * Pure, self-contained SVG of a bouquet spec (no filters, no external refs),
 * so it renders identically on screen, in the PNG export and on the certificate.
 */
export function BouquetSVG({ spec, background = true, gather = false, selectedId, onSelect, pixelWidth, idPrefix = 'bq', title }: Props) {
  const ordered = [...spec.flowers].sort((a, b) => SLOTS[a.slot].y - SLOTS[b.slot].y || a.scale - b.scale);
  const W = BOUQUET_VIEW.width;
  const H = BOUQUET_VIEW.height;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${W} ${H}`}
      width={pixelWidth}
      height={pixelWidth ? Math.round((pixelWidth * H) / W) : undefined}
      role="img"
      aria-label={title ?? 'Bouquet'}
      className="bouquet-svg"
    >
      <defs>
        <radialGradient id={`${idPrefix}-bg`} cx="0.5" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#153a6e" />
          <stop offset="0.55" stopColor="#0b1f3a" />
          <stop offset="1" stopColor="#050d1b" />
        </radialGradient>
        <radialGradient id={`${idPrefix}-glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#a8dfff" stopOpacity="0.32" />
          <stop offset="1" stopColor="#a8dfff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {background && (
        <g>
          <rect width={W} height={H} fill={`url(#${idPrefix}-bg)`} />
          {STARS.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.s} fill="#d8e4f2" fillOpacity={s.o} />
          ))}
          <ellipse cx="200" cy="220" rx="190" ry="170" fill={`url(#${idPrefix}-glow)`} />
        </g>
      )}

      {/* stems & leaves behind every head */}
      {ordered.map((f, i) => (
        <Enter key={`s-${f.id}`} i={i} f={f} gather={gather}>
          <path d={stemPath(f)} fill="none" stroke={f.colours.stem} strokeWidth={4} strokeLinecap="round" />
          <path d={stemPath(f)} fill="none" stroke="#ffffff" strokeOpacity={0.12} strokeWidth={1.2} strokeLinecap="round" />
          <Leaf colour={f.colours.leaves} transform={leafTransform(f)} />
        </Enter>
      ))}

      {ordered.map((f, i) => {
        const h = headPoint(f);
        const r = DESIGNS[f.type].radius * f.scale;
        return (
          <Enter key={`h-${f.id}`} i={i} f={f} gather={gather}>
            <g
              transform={`translate(${h.x} ${h.y}) rotate(${f.rotation}) scale(${f.scale})`}
              onClick={onSelect ? () => onSelect(f.id) : undefined}
              style={onSelect ? { cursor: 'pointer' } : undefined}
            >
              <FlowerHead type={f.type} colours={f.colours} />
            </g>
            {selectedId === f.id && (
              <circle
                cx={h.x}
                cy={DESIGNS[f.type].upright ? h.y - 30 * f.scale : h.y}
                r={r + 6}
                fill="none"
                stroke="#ffffff"
                strokeWidth={1.6}
                strokeDasharray="5 4"
                className="bouquet-selected-ring"
              />
            )}
          </Enter>
        );
      })}

      {spec.flowers.length > 0 &&
        (gather ? (
          <motion.g
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + spec.flowers.length * 0.16, duration: 0.7, type: 'spring', bounce: 0.4 }}
            style={{ transformBox: 'fill-box', originX: 0.5, originY: 0.3 }}
          >
            <Ribbon colour={spec.ribbon} />
          </motion.g>
        ) : (
          <Ribbon colour={spec.ribbon} />
        ))}
    </svg>
  );
}

/** Gathering animation wrapper (plain <g> when not animating, e.g. for export). */
function Enter({ i, f, gather, children }: { i: number; f: PlacedFlower; gather: boolean; children: React.ReactNode }) {
  if (!gather) return <g>{children}</g>;
  return (
    <motion.g
      initial={{ x: (headPoint(f).x - BIND.x) * 0.9, y: -60, opacity: 0 }}
      animate={{ x: 0, y: 0, opacity: 1 }}
      transition={{ delay: 0.15 + i * 0.16, duration: 1.1, ease: [0.2, 0.8, 0.3, 1] }}
    >
      {children}
    </motion.g>
  );
}

function Ribbon({ colour }: { colour: string }) {
  const { x, y } = BIND;
  const loop = `M${x} ${y} C ${x - 30} ${y - 26} ${x - 52} ${y - 12} ${x - 44} ${y + 6} C ${x - 37} ${y + 20} ${x - 14} ${y + 12} ${x} ${y} Z`;
  const tail = `M${x - 3} ${y + 4} L ${x - 24} ${y + 62} L ${x - 13} ${y + 56} L ${x - 8} ${y + 68} L ${x + 4} ${y + 8} Z`;
  return (
    <g>
      <path d={`M${x - 26} ${y - 8} L ${x + 26} ${y - 8} L ${x + 22} ${y + 10} L ${x - 22} ${y + 10} Z`} fill={colour} stroke="rgba(7,20,38,0.35)" strokeWidth={0.8} />
      <path d={tail} fill={colour} stroke="rgba(7,20,38,0.35)" strokeWidth={0.8} />
      <path d={tail} transform={`translate(${2 * x} 0) scale(-1 1)`} fill={colour} stroke="rgba(7,20,38,0.35)" strokeWidth={0.8} />
      <path d={tail} transform={`translate(${2 * x} 0) scale(-1 1)`} fill="#020814" fillOpacity={0.15} />
      <path d={loop} fill={colour} stroke="rgba(7,20,38,0.35)" strokeWidth={0.8} />
      <path d={loop} transform={`translate(${2 * x} 0) scale(-1 1)`} fill={colour} stroke="rgba(7,20,38,0.35)" strokeWidth={0.8} />
      <path d={loop} fill="#ffffff" fillOpacity={0.18} transform={`translate(${x * 0.18} ${y * 0.18}) scale(0.82)`} />
      <ellipse cx={x} cy={y + 1} rx={8} ry={9} fill={colour} stroke="rgba(7,20,38,0.4)" strokeWidth={0.8} />
      <ellipse cx={x - 2} cy={y - 2} rx={3} ry={3.5} fill="#ffffff" fillOpacity={0.35} />
    </g>
  );
}
