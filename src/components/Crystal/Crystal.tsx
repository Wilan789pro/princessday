import { useId } from 'react';
import './Crystal.css';

export type Hue = 'sapphire' | 'ice' | 'cyan' | 'lavender' | 'silver' | 'gold';

const HUES: Record<Hue, [string, string, string, string]> = {
  sapphire: ['#CFEFFF', '#398BFF', '#1555A6', '#0B1F3A'],
  ice: ['#FFFFFF', '#A8DFFF', '#5AA9E6', '#1555A6'],
  cyan: ['#E8FFFF', '#66E5F5', '#1FA2C4', '#0B3A5A'],
  lavender: ['#F1EDFF', '#A99BEF', '#6A5BD1', '#2A2466'],
  silver: ['#FFFFFF', '#D8E4F2', '#8FA6C4', '#3B4E6B'],
  gold: ['#FFF6DD', '#F2C66D', '#C8902E', '#6B4710'],
};

type Facet = [string, number];
const SHAPES: { outline: string; facets: Facet[] }[] = [
  {
    // brilliant
    outline: '28,18 72,18 92,42 50,112 8,42',
    facets: [
      ['28,18 72,18 64,30 36,30', 0.35],
      ['28,18 36,30 8,42', 0.18],
      ['72,18 92,42 64,30', -0.15],
      ['8,42 36,30 64,30 92,42', 0.08],
      ['8,42 50,42 50,112', 0.06],
      ['50,42 92,42 50,112', -0.28],
      ['30,42 70,42 50,112', 0.12],
    ],
  },
  {
    // hexagonal prism
    outline: '50,4 82,28 82,92 50,116 18,92 18,28',
    facets: [
      ['50,4 50,28 18,28', 0.32],
      ['50,4 82,28 50,28', 0.05],
      ['18,28 50,28 50,92 18,92', 0.12],
      ['50,28 82,28 82,92 50,92', -0.22],
      ['18,92 50,92 50,116', -0.05],
      ['50,92 82,92 50,116', -0.35],
      ['38,28 48,28 48,92 38,92', 0.2],
    ],
  },
  {
    // emerald cut
    outline: '30,8 70,8 90,28 90,92 70,112 30,112 10,92 10,28',
    facets: [
      ['38,26 62,26 72,36 72,84 62,94 38,94 28,84 28,36', 0.16],
      ['30,8 70,8 62,26 38,26', 0.36],
      ['10,28 30,8 38,26 28,36', 0.22],
      ['10,28 28,36 28,84 10,92', 0.12],
      ['90,28 90,92 72,84 72,36', -0.25],
      ['30,112 70,112 62,94 38,94', -0.3],
      ['70,8 90,28 72,36 62,26', 0.02],
    ],
  },
  {
    // shard
    outline: '50,4 88,46 50,116 12,46',
    facets: [
      ['50,4 50,46 12,46', 0.3],
      ['50,4 88,46 50,46', 0.02],
      ['12,46 50,46 50,116', 0.1],
      ['50,46 88,46 50,116', -0.3],
      ['50,4 58,46 50,116 42,46', 0.12],
    ],
  },
  {
    // pear
    outline: '50,6 76,40 86,72 72,102 50,114 28,102 14,72 24,40',
    facets: [
      ['50,6 50,40 24,40', 0.32],
      ['50,6 76,40 50,40', 0.05],
      ['24,40 50,40 50,72 14,72', 0.15],
      ['50,40 76,40 86,72 50,72', -0.15],
      ['14,72 50,72 50,114 28,102', 0.02],
      ['50,72 86,72 72,102 50,114', -0.3],
    ],
  },
];

interface Props {
  hue?: Hue;
  shape?: number;
  size?: number | string;
  glow?: boolean;
  float?: boolean;
  sparkle?: boolean;
  className?: string;
}

/** Faceted SVG gem used throughout the experience. Purely decorative. */
export function Crystal({ hue = 'sapphire', shape = 0, size = 120, glow = true, float = false, sparkle = true, className = '' }: Props) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [c1, c2, c3, c4] = HUES[hue];
  const s = SHAPES[((shape % SHAPES.length) + SHAPES.length) % SHAPES.length];

  return (
    <span
      className={`crystal ${glow ? 'crystal--glow' : ''} ${float ? 'crystal--float' : ''} ${className}`}
      style={{ width: size, ['--crystal-glow' as string]: c2 }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 120" className="crystal__svg">
        <defs>
          <linearGradient id={`g${id}`} x1="0.1" y1="0" x2="0.9" y2="1">
            <stop offset="0" stopColor={c1} />
            <stop offset="0.38" stopColor={c2} />
            <stop offset="0.75" stopColor={c3} />
            <stop offset="1" stopColor={c4} />
          </linearGradient>
          <linearGradient id={`i${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#66E5F5" stopOpacity="0" />
            <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#A99BEF" stopOpacity="0" />
          </linearGradient>
          <clipPath id={`c${id}`}>
            <polygon points={s.outline} />
          </clipPath>
        </defs>
        <polygon points={s.outline} fill={`url(#g${id})`} />
        {s.facets.map(([pts, shade], i) => (
          <polygon
            key={i}
            points={pts}
            fill={shade > 0 ? '#ffffff' : '#020814'}
            fillOpacity={Math.abs(shade)}
            stroke="#ffffff"
            strokeOpacity={0.22}
            strokeWidth={0.6}
          />
        ))}
        <g clipPath={`url(#c${id})`}>
          <rect className="crystal__sheen" x="-60" y="0" width="40" height="120" fill={`url(#i${id})`} />
        </g>
        <polygon points={s.outline} fill="none" stroke="#ffffff" strokeOpacity={0.5} strokeWidth={1} />
      </svg>
      {sparkle && <span className="crystal__sparkle" />}
    </span>
  );
}
