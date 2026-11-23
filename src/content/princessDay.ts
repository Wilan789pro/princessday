/**
 * PRINCESS DAY CONTENT
 * --------------------
 * Everything in this file is a PLACEHOLDER to be refined together.
 * Tone: sweet, funny, lightly teasing, subtly flirty, genuine. Never heavy.
 *
 * The Garden of Wishes (Chapter IV) has its own content file: src/content/garden.ts
 */

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
    title: 'Happy Princess Day',
    name: 'Princess Prism',
    body: 'An official celebration, slightly late, entirely deserved. Explore at your own royal pace.', // PLACEHOLDER
    scrollHint: 'Scroll to begin',
  },

  crystals: {
    title: 'The Crown Crystals',
    subtitle: 'Five crystals. Each one holds a small truth. Tap to reveal them all.', // PLACEHOLDER
    completeMessage: 'All five recovered. The crown is complete, as expected.', // PLACEHOLDER
    items: [
      { id: 'brilliance', name: 'Brilliance', hue: 'sapphire', shape: 0, message: '[Placeholder] A mind that is quick, sharp, and occasionally a little terrifying in an argument.' },
      { id: 'kindness', name: 'Kindness', hue: 'ice', shape: 1, message: '[Placeholder] The rare sort of kindness that notices things nobody mentioned.' },
      { id: 'elegance', name: 'Elegance', hue: 'lavender', shape: 2, message: '[Placeholder] Effortless. Annoyingly effortless, frankly.' },
      { id: 'mischief', name: 'Mischief', hue: 'cyan', shape: 3, message: '[Placeholder] That specific look right before something chaotic happens.' },
      { id: 'uniqueness', name: 'Uniqueness', hue: 'silver', shape: 4, message: '[Placeholder] No duplicates were ever made. The universe checked.' },
    ] satisfies CrystalContent[],
  },

  compliments: {
    title: 'The Royal Compliment Generator',
    subtitle: 'Powered by an unlimited supply of accurate observations.',
    buttonLabel: 'Generate a compliment',
    againLabel: 'Another one',
    /** PLACEHOLDERS – replace/extend. Shown in a shuffled order without repeats. */
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
    preamble: 'By order of the Celestial Court of Sapphire, on this Eighteenth day of November:', // PLACEHOLDER
    articles: [
      'Article I — Princess Prism shall be exempt from all tasks officially deemed boring.',
      'Article II — Any disagreement today shall be automatically settled in her favour.',
      'Article III — Dessert is mandatory. Seconds are encouraged.',
      'Article IV — Compliments received today may not be argued with.',
    ], // PLACEHOLDERS
    sealLabel: 'Press the seal to make it official',
    sealedLabel: 'Sealed & official',
    signature: 'The Celestial Court',
  },

  /** Tiny glints hidden across the page. Tap one to reveal its message. */
  hiddenMessages: [
    { id: 'h1', text: '[Placeholder] You found one. Of course you did.' },
    { id: 'h2', text: '[Placeholder] Observant. Noted.' },
    { id: 'h3', text: '[Placeholder] This one was hidden especially well. Apparently not well enough.' },
    { id: 'h4', text: '[Placeholder] Last secret. Or is it?' },
  ],

  closing: {
    title: 'Happy Princess Day, Princess Prism.',
    body: '[Placeholder] Thank you for letting the universe rewind for you. It does not do that for just anyone.',
    secretsLabel: (found: number, total: number) => `Secrets found: ${found} / ${total}`,
    continueLabel: 'End the celebration',
  },
};
