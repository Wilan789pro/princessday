/**
 * THE 25th STAR – PUBLIC PRESENTATION TEXT ONLY
 * ---------------------------------------------
 * (Internal identifiers keep the historical name `project25` for compatibility.)
 * This file ships in the public bundle, so it must contain NOTHING secret.
 * The real birthday message/content lives in server/birthday-content.json
 * and is only delivered by /api/birthday after 18.12.2026 00:00 (Mauritius).
 */

import { ROYAL_NAME } from './royal';

export const project25 = {
  name: 'THE 25th STAR',
  eyebrow: 'STAR № 25',
  destination: 'RISES ON 18.12.2026',
  accessStatus: 'STILL BELOW THE HORIZON',
  accessStatusReached: 'THE STAR HAS RISEN',
  classification: `RESERVED FOR ${ROYAL_NAME}`,
  timezoneNote: 'MIDNIGHT · 00:00:00 · PORT LOUIS (UTC+4)',

  /** Rotating status ticker. */
  statusMessages: [
    'CHARTING THE NIGHT SKY.',
    'TWENTY-FOUR STARS ALREADY IN PLACE.',
    'POLISHING THE STARLIGHT.',
    'FINAL ALIGNMENT.',
    'THE 25th STAR IS APPROACHING.',
  ],
  statusReached: 'THE 25th STAR HAS RISEN.',
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
    lines: ['THE 25th STAR', 'ACCESS GRANTED', 'LEVEL 25 UNLOCKED'],
    /** Followed by the royal name (rendered from ROYAL_NAME) and headlineEnd. */
    headlineStart: 'Happy 25th Birthday,',
    headlineEnd: '!',
  },

  reveal: {
    loading: 'Receiving the starlight…',
    /** Shown in production when the server still holds the development placeholder. */
    notReady: 'The chamber is open, but the message inside is still being written. It will be worth the wait.',
    /** Development builds only – never shown in production. */
    devPlaceholderNote:
      'Development placeholder: the real birthday content has not been written yet. Edit server/birthday-content.json.',
    serverLocked:
      'The chamber opened on this device, but the server says it is not time yet. The transmission stays sealed until 18.12.2026.',
    unavailable:
      'The message could not be reached just now. Please try again in a moment.',
    /** Shown on static hosting (GitHub Pages), where there is no server to release the content. */
    staticHosting:
      'The chamber is open. Its message is kept somewhere safer than this page, and the private messenger that delivers it is not connected yet.',
  },
};
