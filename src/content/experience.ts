/**
 * STORY TEXT – the connective tissue between acts.
 * Edit freely; nothing here is secret.
 */
import { numberWord } from '../utils/dates';

export const experience = {
  heroName: 'Princess Prism',

  intro: {
    eyebrow: 'Local time · Port Louis',
    lineOne: 'Wait a minute...',
    /** Receives the number of days since 18 November (Mauritius calendar). */
    lineTwo: (daysAgo: number) => {
      if (daysAgo <= 0) return 'Something rather important is happening today.';
      if (daysAgo === 1) return 'Something rather important happened yesterday.';
      if (daysAgo <= 12) return `Something rather important happened ${numberWord(daysAgo)} days ago.`;
      return 'Something rather important happened a little while ago.';
    },
    lineThree: 'And it was not properly celebrated. That needs fixing.',
    beginLabel: 'Begin the experience',
    skipLabel: 'Skip to Project 25',
    soundHint: 'Best with sound on',
  },

  rewind: {
    freezeLabel: 'Temporal lock engaged',
    rewindingLabel: 'Reversing time',
    arrivingLabel: 'Destination acquired',
    durationMs: 8200,
  },

  arrival: {
    dateLine: '18 November 2026',
    weekday: 'Wednesday',
    title: 'Princess Day',
    subtitle: 'Coordinates locked. You are exactly where you are meant to be.',
    continueLabel: 'Enter Princess Day',
  },

  oneMoreThing: {
    finale: 'Happy Princess Day.',
    finaleSub: 'Fin.',
    line: 'One More Thing...',
    continueLabel: 'Tap to continue',
  },

  dates: {
    left: { day: '18', month: 'November', label: 'Princess Day' },
    right: { day: '18', month: 'December', label: "Princess Prism's Birthday" },
    tagline: 'THE UNIVERSE HAS GREAT TASTE.', // keep this line exactly
    continueLabel: 'Open Project 25',
  },
};
