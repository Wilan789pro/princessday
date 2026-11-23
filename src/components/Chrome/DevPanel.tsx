import { useState } from 'react';
import { Clock } from 'lucide-react';
import { TEST_NOW_ACTIVE, now } from '../../utils/clock';
import { getZonedParts } from '../../utils/timezone';
import { formatLongDate, formatTime } from '../../utils/dates';
import { useCurrentTime } from '../../hooks/useCurrentTime';
import './DevPanel.css';

/**
 * Developer-only test clock & stage jumper.
 * Rendered only in `vite dev` (or with VITE_ENABLE_TEST_CLOCK=true).
 * It changes the *virtual* clock via ?now=…, never the real target date.
 */
const PRESETS: { label: string; now?: string; stage?: string }[] = [
  { label: 'Real time · intro' },
  { label: '22 Nov (4 days after)', now: '2026-11-22T21:30:00+04:00' },
  { label: '10 s before birthday → 25th Star', now: '2026-12-17T23:59:50+04:00', stage: 'project25' },
  { label: 'After birthday → 25th Star', now: '2026-12-18T09:00:00+04:00', stage: 'project25' },
  { label: 'Jump: Princess Day', stage: 'princess' },
  { label: 'Jump: One More Thing', stage: 'oneMore' },
  { label: 'Jump: Dates', stage: 'dates' },
  { label: 'Jump: THE 25th STAR', stage: 'project25' },
];

function hrefFor(p: { now?: string; stage?: string }) {
  const q = new URLSearchParams();
  if (p.now) q.set('now', p.now);
  if (p.stage) q.set('stage', p.stage);
  const s = q.toString();
  return `${window.location.pathname}${s ? `?${s}` : ''}`;
}

export function DevPanel() {
  const [open, setOpen] = useState(false);
  const t = useCurrentTime();
  const p = getZonedParts(t || now());
  return (
    <div className="devpanel">
      <button type="button" className="devpanel__toggle mono" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Clock size={13} aria-hidden="true" /> TEST {TEST_NOW_ACTIVE ? '· VIRTUAL' : ''}
      </button>
      {open && (
        <div className="devpanel__body">
          <p className="mono devpanel__now">
            {formatLongDate(p)} {formatTime(p)} MU
          </p>
          {PRESETS.map((preset) => (
            <a key={preset.label} href={hrefFor(preset)} className="devpanel__link">
              {preset.label}
            </a>
          ))}
          <p className="devpanel__note">Dev only – hidden in production builds.</p>
        </div>
      )}
    </div>
  );
}
