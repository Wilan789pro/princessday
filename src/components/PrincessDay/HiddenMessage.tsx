import { Sparkle } from 'lucide-react';

interface Props {
  id: string;
  found: boolean;
  onFind: (id: string) => void;
  style?: React.CSSProperties;
}

/** A tiny glint tucked into the page. Tapping it reveals a hidden message. */
export function HiddenMessage({ id, found, onFind, style }: Props) {
  return (
    <button
      type="button"
      className={`glint ${found ? 'glint--found' : ''}`}
      style={style}
      onClick={() => onFind(id)}
      aria-label={found ? 'Hidden message (found) – show again' : 'A hidden glint – tap to reveal a secret'}
    >
      <Sparkle size={found ? 12 : 14} strokeWidth={1.6} aria-hidden="true" />
    </button>
  );
}
