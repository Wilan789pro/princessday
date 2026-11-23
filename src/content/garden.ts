/**
 * THE GARDEN OF WISHES – all editable text, colours and presets.
 * Nothing here is secret (it ships in the public bundle). No personal data.
 */

import { ROYAL_NAME } from './royal';

export type FlowerType = 'rose' | 'peony' | 'daisy' | 'lily' | 'tulip' | 'starflower';
export type FlowerPart = 'petals' | 'centre' | 'leaves' | 'stem';
export type SecretSymbol = 'star' | 'butterfly' | 'moon' | 'crown' | 'diamond';

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
    { id: 'secrets', numeral: 'III', name: 'Five Little Secrets' },
    { id: 'wish', numeral: 'IV', name: 'A Wish Upon a Star' },
    { id: 'seal', numeral: 'V', name: 'The Royal Seal' },
  ],

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

  secrets: {
    intro: 'Five flowers are keeping something to themselves. Tap each one to coax it open.',
    progress: (n: number) => `${n} / 5 secrets`,
    crownLine: 'Five flowers. Five little secrets. One very unmistakable princess.',
    continueLabel: 'Continue',
    /**
     * Linked to the existing crown crystals by `crystalId` (hue + gem shape are
     * read from princessDay.crystals). Messages are NEW and editable.
     */
    items: [
      {
        id: 'radiance',
        crystalId: 'brilliance',
        name: 'Radiance',
        flower: 'starflower' as FlowerType,
        symbol: 'star' as SecretSymbol,
        colours: { petals: '#CFEFFF', centre: '#F2C66D', leaves: '#5CB85C', stem: '#2F6B4F' },
        message: 'You walk into a room and the lighting improves. Scientists remain baffled.',
      },
      {
        id: 'kindness',
        crystalId: 'kindness',
        name: 'Kindness',
        flower: 'daisy' as FlowerType,
        symbol: 'butterfly' as SecretSymbol,
        colours: { petals: '#FFFFFF', centre: '#FFE066', leaves: '#5CB85C', stem: '#2F6B4F' },
        message: 'You are kind in the quiet ways, the ones that never ask to be noticed. They were noticed.',
      },
      {
        id: 'elegance',
        crystalId: 'elegance',
        name: 'Elegance',
        flower: 'lily' as FlowerType,
        symbol: 'moon' as SecretSymbol,
        colours: { petals: '#A99BEF', centre: '#F2C66D', leaves: '#26A69A', stem: '#2F6B4F' },
        message: 'Even the moon takes notes on how to make an entrance.',
      },
      {
        id: 'mischief',
        crystalId: 'mischief',
        name: 'Mischief',
        flower: 'tulip' as FlowerType,
        symbol: 'crown' as SecretSymbol,
        colours: { petals: '#5FB3F5', centre: '#1F5FBF', leaves: '#5CB85C', stem: '#2F6B4F' },
        message: 'Behind the royal composure lives a small, delightful agent of chaos. The crown is tilted on purpose.',
      },
      {
        id: 'unpredictable',
        crystalId: 'uniqueness',
        name: 'Unpredictable',
        flower: 'peony' as FlowerType,
        symbol: 'diamond' as SecretSymbol,
        colours: { petals: '#C8A2E8', centre: '#FFFFFF', leaves: '#26A69A', stem: '#2F6B4F' },
        message: 'Impossible to predict, impossible to forget. A rare cut, and there are no copies.',
      },
    ],
  },

  wish: {
    intro: 'A star is passing over the garden. It only stops for those who ask nicely.',
    starLabel: 'Catch the shooting star',
    prompt: 'Make a wish',
    placeholder: 'Write your wish here…',
    sendLabel: 'Send my wish to the stars',
    skipLabel: 'Keep it to myself',
    anotherPrompt: 'Now… another wish?',
    disclosureLive:
      'Sending delivers your wish privately, by email, to the person who made this garden. It is never shown on this website or stored here.',
    disclosureDryRun:
      'Wish delivery is not switched on yet. If you send a wish now it is only checked, then discarded: it is not emailed, shown or saved anywhere.',
    acceptedLive: 'Your wish has been sent privately to the stars.',
    acceptedDryRun: 'The stars heard you. (Delivery is not switched on yet, so the wish was not emailed or saved.)',
    keptPrivate: 'Kept between you and the stars. That works too.',
    errors: {
      empty: 'Even a tiny wish needs at least one word.',
      'too-long': 'That wish is a little long for one star (500 characters at most).',
      'invalid-characters': 'That wish contains characters the stars cannot read.',
      'rate-limited': 'The stars need a short rest. Try again a little later.',
      network: 'The stars could not be reached just now. Your wish was not sent.',
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
