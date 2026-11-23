import type { SecretSymbol as Kind } from '../../content/garden';

const star = Array.from({ length: 10 }, (_, i) => {
  const r = i % 2 === 0 ? 11 : 4.6;
  const a = (Math.PI / 5) * i - Math.PI / 2;
  return `${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`;
}).join(' ');

/** Small symbolic emblems for the Five Little Secrets (24 × 24, centred). */
export function SecretSymbol({ kind, colour = '#ffffff' }: { kind: Kind; colour?: string }) {
  return (
    <svg viewBox="-12 -12 24 24" aria-hidden="true" className="secret-symbol">
      {kind === 'star' && <polygon points={star} fill={colour} />}
      {kind === 'butterfly' && (
        <g fill={colour}>
          <path d="M0 -2 C -3 -10 -12 -11 -11 -3 C -10 2 -4 1 0 0 C 4 1 10 2 11 -3 C 12 -11 3 -10 0 -2 Z" />
          <path d="M0 1 C -3 3 -9 4 -8 9 C -6 12 -2 8 0 3 C 2 8 6 12 8 9 C 9 4 3 3 0 1 Z" opacity="0.8" />
          <path d="M0 -6 L0 7" stroke="#0b1f3a" strokeWidth="1.4" strokeLinecap="round" />
        </g>
      )}
      {kind === 'moon' && <path d="M3 -10.5 A10.5 10.5 0 1 0 3 10.5 A8.4 8.4 0 1 1 3 -10.5 Z" fill={colour} />}
      {kind === 'crown' && (
        <g fill={colour}>
          <path d="M-10 5 L-11 -6 L-5 -0.5 L0 -9 L5 -0.5 L11 -6 L10 5 Z" />
          <rect x="-10" y="6.5" width="20" height="3" rx="1" />
        </g>
      )}
      {kind === 'diamond' && (
        <g>
          <path d="M-9.5 -3 L-5 -8.5 L5 -8.5 L9.5 -3 L0 10 Z" fill={colour} />
          <path d="M-9.5 -3 L9.5 -3 M-3 -3 L0 10 L3 -3 M-5 -8.5 L-3 -3 M5 -8.5 L3 -3" fill="none" stroke="#0b1f3a" strokeOpacity="0.45" strokeWidth="0.9" />
        </g>
      )}
    </svg>
  );
}
