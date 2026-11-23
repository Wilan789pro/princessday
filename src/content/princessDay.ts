/**
 * PRINCESS DAY CONTENT
 * --------------------
 * Final copy – edit freely. A content test blocks unfinished markers.
 * Tone: sweet, funny, lightly teasing, subtly flirty, genuine. Never heavy.
 *
 * The Garden of Wishes (Chapter IV) has its own content file: src/content/garden.ts
 */

import { ROYAL_NAME } from './royal';

export type CrystalHue = 'sapphire' | 'ice' | 'cyan' | 'lavender' | 'silver';

export interface CrystalContent {
  id: string;
  name: string;
  hue: CrystalHue;
  /** Shape variation, 0–4 */
  shape: number;
  message: string;
}

export const princessDay = {
  intro: {
    eyebrow: 'Wednesday · 18 November 2026',
    title: 'Happy Princess Day,',
    /* the name itself is rendered from ROYAL_NAME (src/content/royal.ts) */
    body: 'A royal celebration, a little late and entirely deserved. Wander at your own pace: everything here was made for you to discover.',
    scrollHint: 'Scroll to begin',
  },

  crystals: {
    title: 'The Crown Crystals',
    subtitle: 'Five crystals, each holding one small truth. Tap them to bring the crown together.',
    completeMessage: 'All five found. The crown is complete, and it suits you perfectly.',
    items: [
      { id: 'brilliance', name: 'Brilliance', hue: 'sapphire', shape: 0, message: 'A mind that is quick, sharp and endlessly curious, and very good at being right a few seconds before everyone else.' },
      { id: 'kindness', name: 'Kindness', hue: 'ice', shape: 1, message: 'The kind of kindness that notices what others miss, then quietly makes things better without waiting for applause.' },
      { id: 'elegance', name: 'Elegance', hue: 'lavender', shape: 2, message: 'Grace that never looks rehearsed. Some people learn elegance; you seem to have arrived with it.' },
      { id: 'mischief', name: 'Mischief', hue: 'cyan', shape: 3, message: 'That spark right before something delightfully chaotic happens. The palace has learned to keep an eye on it.' },
      { id: 'uniqueness', name: 'Uniqueness', hue: 'silver', shape: 4, message: 'One of a kind, in the most literal sense. The universe checked: no duplicates were ever made.' },
    ] satisfies CrystalContent[],
  },

  compliments: {
    title: 'The Royal Compliment Generator',
    subtitle: 'Powered by an unlimited supply of accurate observations.',
    buttonLabel: 'Generate a compliment',
    againLabel: 'Another one',
    /** Shown in a shuffled order without repeats. Add or edit freely. */
    items: [
      'Your taste is so good it should require a licence.',
      'Statistically, you are the reason the average day improves.',
      'You make "being right" look like a lifestyle.',
      'Your laugh has been classified as a renewable energy source.',
      'Even your sarcasm has excellent posture.',
      'You could make a queue at the post office feel like an event.',
      'Somewhere, a crystal is jealous of how you sparkle.',
      'Your instincts have a better track record than most experts.',
      'You are the plot twist that makes the story better.',
      'Your presence is basically a mood upgrade.',
    ],
  },

  decree: {
    title: 'Royal Decree',
    preamble: 'By order of the Celestial Court of Sapphire, on this Eighteenth day of November:',
    articles: [
      `Article I — ${ROYAL_NAME} shall be exempt from all tasks officially deemed boring.`,
      'Article II — Any disagreement today shall be automatically settled in her favour.',
      'Article III — Dessert is mandatory. Seconds are encouraged.',
      'Article IV — Compliments received today may not be argued with.',
    ],
    sealLabel: 'Press the seal to make it official',
    sealedLabel: 'Sealed & official',
    signature: 'The Celestial Court',
  },

  /** Tiny glints hidden across the page. Tap one to reveal its message. */
  hiddenMessages: [
    { id: 'h1', text: 'Secret: the time machine at the very beginning was built for exactly one passenger.' },
    { id: 'h2', text: 'Every shade of blue on this page was chosen on purpose. Your favourite colour deserved a whole sky.' },
    { id: 'h3', text: 'Somewhere up there is a star with no name yet. It is waiting for the eighteenth of December.' },
    { id: 'h4', text: 'The last secret: nobody was supposed to find all four. Naturally, you did.' },
  ],

  closing: {
    title: `Happy Princess Day, ${ROYAL_NAME}.`,
    body: 'Every crystal, every glint and every star on this page was placed with care, simply to make one day a little brighter. Thank you for spending a little time here. Wishing you a Princess Day as lovely as you are.',
    secretsLabel: (found: number, total: number) => `Secrets found: ${found} / ${total}`,
    continueLabel: 'End the celebration',
  },
};
