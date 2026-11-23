/**
 * THE GARDEN OF WISHES – all editable text, colours and presets.
 * Nothing here is secret (it ships in the public bundle). No personal data.
 */

import { ROYAL_NAME } from './royal';

export type FlowerType = 'rose' | 'peony' | 'daisy' | 'lily' | 'tulip' | 'starflower';
export type FlowerPart = 'petals' | 'centre' | 'leaves' | 'stem';

export interface PaletteColour {
  name: string;
  hex: string;
}

/** The colouring palette. Hex values must be 6-digit (#RRGGBB). */
export const PALETTE: PaletteColour[] = [
  { name: 'Sapphire', hex: '#1F5FBF' },
  { name: 'Sky blue', hex: '#5FB3F5' },
  { name: 'Ice blue', hex: '#CFEFFF' },
  { name: 'Lavender', hex: '#A99BEF' },
  { name: 'Lilac', hex: '#C8A2E8' },
  { name: 'Purple', hex: '#7E57C2' },
  { name: 'Pink', hex: '#F48FB1' },
  { name: 'Blush', hex: '#F7C6CF' },
  { name: 'Coral', hex: '#FF7F6E' },
  { name: 'Yellow', hex: '#FFE066' },
  { name: 'Gold', hex: '#F2C66D' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Silver', hex: '#C9D3E0' },
  { name: 'Teal', hex: '#26A69A' },
  { name: 'Green', hex: '#5CB85C' },
  { name: 'Forest', hex: '#2F6B4F' },
];

export const RIBBONS: PaletteColour[] = [
  { name: 'Silver', hex: '#C9D3E0' },
  { name: 'Sapphire', hex: '#1F5FBF' },
  { name: 'Ice blue', hex: '#CFEFFF' },
  { name: 'Lavender', hex: '#A99BEF' },
  { name: 'Blush', hex: '#F7C6CF' },
  { name: 'Gold', hex: '#F2C66D' },
];

export const FLOWER_TYPES: { type: FlowerType; name: string }[] = [
  { type: 'rose', name: 'Rose' },
  { type: 'peony', name: 'Peony' },
  { type: 'daisy', name: 'Daisy' },
  { type: 'lily', name: 'Lily' },
  { type: 'tulip', name: 'Tulip' },
  { type: 'starflower', name: 'Starflower' },
];

export const PART_LABELS: Record<FlowerPart, string> = {
  petals: 'Petals',
  centre: 'Centre',
  leaves: 'Leaves',
  stem: 'Stem',
};

export const garden = {
  eyebrow: 'Chapter IV',
  title: 'The Garden of Wishes',
  subtitle: 'A moonlit garden, planted especially for today. Take your time.',

  chapters: [
    { id: 'bloom', numeral: 'I', name: 'The First Bloom' },
    { id: 'bouquet', numeral: 'II', name: 'The Grand Bouquet' },
    { id: 'wish', numeral: 'III', name: 'A Wish Upon a Star' },
    { id: 'seal', numeral: 'IV', name: 'The Royal Seal' },
  ] as const,

  bloom: {
    plantLabel: 'Plant the seed',
    message: 'Some things are worth taking a little time to bloom. These ones were made to brighten your day.',
    continueLabel: 'Enter the garden',
    replayLabel: 'Watch again',
  },

  bouquet: {
    intro: 'Colour your flowers, then arrange them into a bouquet that is entirely yours.',
    colourTab: 'Colour',
    arrangeTab: 'Arrange',
    chooseFlower: 'Choose a flower',
    choosePart: 'Choose a part',
    chooseColour: 'Choose a colour',
    fillAll: 'Fill whole flower',
    undo: 'Undo',
    resetFlower: 'Reset flower',
    addToBouquet: 'Add to bouquet',
    bouquetFull: 'Your bouquet is full (7 flowers)',
    emptyBouquet: 'Your bouquet is empty. Colour a flower and add it.',
    ribbon: 'Ribbon',
    gather: 'Gather the bouquet',
    download: 'Download bouquet',
    continueLabel: 'Continue',
    useGardenBouquet: "Continue with the garden's bouquet",
  },

  wish: {
    intro: 'A star is passing over the garden. It only stops for those who ask nicely.',
    starLabel: 'Catch the shooting star',
    prompt: 'Make a wish',
    placeholder: 'Write your wish here…',
    sendLabel: 'Send my wish to the stars',
    skipLabel: 'Keep it to myself',
    anotherPrompt: 'Now… another wish?',
    /** Shown under the wish box when the Royal Wish Vault is reachable. */
    disclosureVault:
      'Sending delivers your wish privately to the person who made this garden. It is never shown on this website, and it cannot be reopened here once sent.',
    /** The backend answered, but its storage is not set up yet: nothing can be sent. */
    disclosureUnavailable: 'Wish delivery is not ready yet, so a wish cannot be sent right now.',
    /** No backend connected (e.g. GitHub Pages without VITE_API_BASE_URL): nothing can be sent. */
    disclosureNotConnected: 'Wish delivery is not connected yet, so a wish cannot be sent from this version of the site.',
    /** Shown only after the vault has confirmed the wish was stored. */
    acceptedVault:
      'Your wish has found its way to the stars. Some wishes are meant to travel quietly. Thank you for sharing yours.',
    keptPrivate: 'Kept between you and the stars. That works too.',
    /** Every error code the client or server can return has a message. */
    errors: {
      empty: 'Even a tiny wish needs at least one word.',
      'not-text': 'Even a tiny wish needs at least one word.',
      'too-long': 'That wish is a little long for one star (500 characters at most).',
      'invalid-characters': 'That wish contains characters the stars cannot read.',
      'rate-limited': 'The stars need a short rest. Please try again a little later. Your wish was not sent.',
      rejected: 'That was very quick. Take a breath and send it again in a moment. Your wish was not sent.',
      origin: 'Wishes cannot be sent from this page. Your wish was not sent.',
      'content-type': 'The stars could not read that request. Your wish was not sent.',
      'bad-json': 'The stars could not read that request. Your wish was not sent.',
      'method-not-allowed': 'The stars could not read that request. Your wish was not sent.',
      'too-large': 'That wish was too large to carry. Your wish was not sent.',
      network: 'The stars could not be reached just now. Your wish was not sent.',
      'storage-unavailable': 'Wish delivery is not ready yet. Your wish was not sent; please try again later.',
      'storage-failed': 'The stars could not keep it just now. Your wish was not sent; please try again.',
      'not-connected': 'Wish delivery is not connected yet, so your wish was not sent.',
      generic: 'Something went wrong. Your wish was not sent.',
    } as Record<string, string>,
    /** Exact text required by the brief. Do not rewrite. */
    wealthResponse:
      'I know, I know... 😂💎\n\nA modest wish from a princess with very ambitious financial expectations.\n\nMay your bank account grow faster than your royal ego.\n\nAnd when you become ridiculously wealthy, please remember the humble people who supported your royal ambitions.',
    continueLabel: 'Continue',
  },

  seal: {
    intro: 'One last formality. The Celestial Court insists.',
    pressLabel: 'Press the sapphire seal',
    forming: 'The seal is forming…',
    saveLabel: 'Save My Certificate',
    returnLabel: 'Return to My Kingdom',
    preparing: 'Inscribing the certificate…',
  },

  certificate: {
    titleTop: 'CERTIFICATE OF',
    titleMain: 'EXTRAORDINARY PRINCESSHOOD',
    awardedTo: 'Awarded to',
    name: ROYAL_NAME,
    citation: 'For outstanding achievements in elegance, mischief, individuality and general royal conduct.',
    stampLabel: 'THE GARDEN OF WISHES',
    dateLine: 'Given on the eighteenth day of November, 2026',
    signature: 'The Celestial Court',
    signatureRole: 'Keepers of the Garden',
  },
};
