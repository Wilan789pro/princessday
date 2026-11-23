import { Check } from 'lucide-react';
import type { PaletteColour } from '../../content/garden';

interface Props {
  colours: PaletteColour[];
  value: string | null;
  onPick: (hex: string) => void;
  label: string;
  /** Smaller swatches, e.g. for ribbons */
  compact?: boolean;
}

/** Accessible swatch grid: each swatch is a ≥44px button with a name and a check mark when chosen. */
export function ColourPalette({ colours, value, onPick, label, compact }: Props) {
  return (
    <div className={`palette ${compact ? 'palette--compact' : ''}`} role="group" aria-label={label}>
      {colours.map((c) => {
        const on = value?.toUpperCase() === c.hex.toUpperCase();
        const light = isLight(c.hex);
        return (
          <button
            key={c.hex}
            type="button"
            className={`palette__swatch ${on ? 'is-on' : ''}`}
            style={{ ['--swatch' as string]: c.hex }}
            onClick={() => onPick(c.hex)}
            aria-pressed={on}
            aria-label={c.name}
            title={c.name}
          >
            {on && <Check size={18} strokeWidth={3} color={light ? '#0b1f3a' : '#ffffff'} aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}

function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 160;
}
