import { describe, expect, it } from 'vitest';
import { WISH_MAX_LENGTH, isWealthWish, validateWish, wishLength } from './wishRules.js';

describe('isWealthWish – positive matches', () => {
  const positives = [
    'I want to be rich',
    'Make me RICHER than everyone',
    'the richest princess alive',
    'a wealthy life please',
    'unlimited wealth',
    'I wish to become a millionaire',
    'billionaire by thirty',
    'lots and lots of money',
    'to win the lottery',
    'a bigger bank account',
    'a fortune, obviously',
    'a million dollars',
    'Je veux être riche',
    'ÊTRE RICHE !',
    'devenir millionnaire',
    'milliardaire avant 30 ans',
    "beaucoup d'argent",
    'plein d’argent', // curly apostrophe
    'un compte en banque bien rempli',
    'gagner au loto',
    'des richesses',
  ];
  for (const wish of positives) {
    it(`matches: ${wish}`, () => expect(isWealthWish(wish)).toBe(true));
  }
});

describe('isWealthWish – reasonable negatives', () => {
  const negatives = [
    'I wish for peace and happiness',
    'a life rich in love and laughter',
    'Richard should finally learn to cook',
    'to enrich my mind with good books',
    'see an ostrich at the zoo',
    'I feel fortunate every day',
    'good fortune for my family',
    'a trip to Argentina',
    'une bague en argent',
    "une médaille d'argent aux jeux",
    'a honeymoon somewhere warm',
    'une vie riche en souvenirs',
    '',
  ];
  for (const wish of negatives) {
    it(`does not match: "${wish}"`, () => expect(isWealthWish(wish)).toBe(false));
  }
  it('ignores non-text input', () => {
    expect(isWealthWish(undefined)).toBe(false);
    expect(isWealthWish(42)).toBe(false);
  });
});

describe('validateWish', () => {
  it('accepts a normal wish and returns it unaltered', () => {
    const wish = '  To see the northern lights 🌌\nwith my friends  ';
    expect(validateWish(wish)).toEqual({ ok: true, value: wish });
  });
  it('rejects empty and whitespace-only wishes', () => {
    expect(validateWish('')).toEqual({ ok: false, error: 'empty' });
    expect(validateWish('   \n\t ')).toEqual({ ok: false, error: 'empty' });
  });
  it('rejects non-string input', () => {
    expect(validateWish(null)).toEqual({ ok: false, error: 'not-text' });
    expect(validateWish({ wish: 'x' })).toEqual({ ok: false, error: 'not-text' });
  });
  it(`allows exactly ${WISH_MAX_LENGTH} characters and rejects one more`, () => {
    expect(validateWish('a'.repeat(WISH_MAX_LENGTH)).ok).toBe(true);
    expect(validateWish('a'.repeat(WISH_MAX_LENGTH + 1))).toEqual({ ok: false, error: 'too-long' });
  });
  it('counts emoji as single characters', () => {
    expect(wishLength('💎💎💎')).toBe(3);
    expect(validateWish('💎'.repeat(WISH_MAX_LENGTH)).ok).toBe(true);
  });
  it('rejects control characters', () => {
    expect(validateWish('hello\u0000world')).toEqual({ ok: false, error: 'invalid-characters' });
    expect(validateWish('bell\u0007')).toEqual({ ok: false, error: 'invalid-characters' });
  });
});
