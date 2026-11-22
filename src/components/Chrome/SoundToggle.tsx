import { Volume2, VolumeX } from 'lucide-react';
import { useSound } from '../../audio/SoundContext';

export function SoundToggle() {
  const { enabled, toggle } = useSound();
  return (
    <button
      type="button"
      className="sound-toggle"
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? 'Sound on – tap to mute' : 'Sound off – tap to enable'}
    >
      {enabled ? <Volume2 size={20} aria-hidden="true" /> : <VolumeX size={20} aria-hidden="true" />}
    </button>
  );
}
