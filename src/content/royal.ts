/**
 * THE ROYAL IDENTITY – single source of truth.
 * Every visible use of her name must come from here, exactly as written.
 * (A content test fails if a bare or differently-styled variant appears.)
 */
export const ROYAL_NAME_PARTS = {
  before: '❤️💎',
  core: 'Princess Prism',
  after: '💎❤️™',
} as const;

export const ROYAL_NAME = `${ROYAL_NAME_PARTS.before} ${ROYAL_NAME_PARTS.core} ${ROYAL_NAME_PARTS.after}`;
