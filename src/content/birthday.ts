/**
 * PROJECT 25 – PUBLIC PRESENTATION TEXT ONLY
 * ------------------------------------------
 * This file ships in the public bundle, so it must contain NOTHING secret.
 * The real birthday message/content lives in server/birthday-content.json
 * and is only delivered by /api/birthday after 18.12.2026 00:00 (Mauritius).
 */

export const project25 = {
  name: 'PROJECT 25',
  destination: 'DESTINATION: 18.12.2026',
  accessStatus: 'ACCESS STATUS: RESTRICTED',
  classification: 'CLASSIFICATION: PRINCESS PRISM ONLY',
  timezoneNote: 'T-ZERO · 00:00:00 · PORT LOUIS (UTC+4)',

  /** Rotating status ticker. */
  statusMessages: [
    'PROJECT INITIALISED.',
    'PREPARATIONS UNDERWAY.',
    'CRYSTAL MATRIX STABLE.',
    'FINAL CALIBRATION.',
    'BIRTHDAY TRANSMISSION APPROACHING.',
  ],
  statusIntervalMs: 5200,

  chamber: {
    name: 'THE 25TH CHAMBER',
    description: 'Something has been placed inside. It is sealed until the clock says otherwise.',
    lockedTitle: 'ACCESS RESTRICTED',
    lockedSub: 'SEALED UNTIL 18.12.2026',
    curiousLines: [
      'Well, well. Someone is curious.',
      'Unfortunately, even royalty must respect the countdown.',
      'Come back on December 18.',
    ],
    readyLabel: 'Open the chamber',
  },

  unlocked: {
    lines: ['PROJECT 25', 'ACCESS GRANTED', 'LEVEL 25 UNLOCKED'],
    headline: 'HAPPY 25TH BIRTHDAY, PRINCESS PRISM!',
  },

  reveal: {
    loading: 'Decrypting transmission…',
    placeholderNote:
      'Development placeholder: the real birthday content has not been written yet. Edit server/birthday-content.json.',
    serverLocked:
      'The chamber opened on this device, but the server says it is not time yet. The transmission stays sealed until 18.12.2026.',
    unavailable:
      'The transmission could not be reached. Please refresh in a moment.',
    /** Shown on static hosting (GitHub Pages), where there is no server to release the content. */
    staticHosting:
      'The chamber is open, but its transmission is not available on this version of the site yet.',
  },
};
