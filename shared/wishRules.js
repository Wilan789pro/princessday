/**
 * WISH RULES – shared by the browser (instant feedback) and the server
 * (authoritative check). Pure functions, no I/O, no logging.
 */

export const WISH_MAX_LENGTH = 500;

/** Characters, counted as the user perceives them (emoji = 1). */
export function wishLength(text) {
  return Array.from(String(text)).length;
}

// Control characters other than tab / newline / carriage return.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

/**
 * @param {unknown} input
 * @returns {{ ok: true, value: string } | { ok: false, error: 'not-text' | 'empty' | 'too-long' | 'invalid-characters' }}
 * The returned value is the wish exactly as written (never altered).
 */
export function validateWish(input) {
  if (typeof input !== 'string') return { ok: false, error: 'not-text' };
  if (input.trim().length === 0) return { ok: false, error: 'empty' };
  if (wishLength(input) > WISH_MAX_LENGTH) return { ok: false, error: 'too-long' };
  if (CONTROL_CHARS.test(input)) return { ok: false, error: 'invalid-characters' };
  return { ok: true, value: input };
}

/** Lower-case and strip accents so "Être RICHE" and "etre riche" compare equal. */
export function normalizeForMatching(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’‘`´]/g, "'");
}

/*
 * Whole-word patterns for financial-ambition wishes (English + French).
 * Kept deliberately narrow: "enrich", "Richard", "fortunate", "Argentina",
 * "rich in love", "good fortune" and "en argent" (made of silver) do NOT match.
 */
const WEALTH_PATTERNS = [
  // rich / richer / richest / riches – but not "rich in/with …" (rich in love)
  /\brich(?:er|est|es)?\b(?!\s+(?:in|with)\b)/,
  /\bwealth(?:y|ier|iest)?\b/,
  /\b(?:multi)?millionaires?\b/,
  /\bbillionaires?\b/,
  /\bmoney\b/,
  /(?<!\bgood\s)(?<!\bbonne\s)\bfortunes?\b(?!\s+tell)/,
  /\blotter(?:y|ies)\b/,
  /\bjackpot\b/,
  /\bbank\s+accounts?\b/,
  /\bmillions?\s+(?:of\s+)?(?:dollars|euros|pounds|rupees)\b/,
  // French
  /\briches?\b(?!\s+(?:en|de)\b)/,
  /\brichesses?\b/,
  /\bmillionnaires?\b/,
  /\bmilliardaires?\b/,
  // "argent" = money, but also silver: skip "en argent", "médaille d'argent", "noces d'argent"
  /(?<!\ben\s)(?<!medaille\sd')(?<!noces\sd')\bargent\b/,
  /\bcompte\s+(?:en\s+banque|bancaire)\b/,
  /\bloto\b/,
  /\bmillions?\s+(?:d'|de\s+)(?:dollars|euros|roupies)\b/,
];

/** True when the wish is about becoming rich / wealthy / having money. */
export function isWealthWish(text) {
  if (typeof text !== 'string') return false;
  const t = normalizeForMatching(text);
  return WEALTH_PATTERNS.some((re) => re.test(t));
}
