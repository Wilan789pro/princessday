import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { project25 } from './birthday';
import { experience } from './experience';
import { garden } from './garden';
import { princessDay } from './princessDay';
import { ROYAL_NAME } from './royal';

/** Every user-facing string in the content files (functions are called with sample values). */
export function collectStrings(value: unknown, out: string[] = [], key = ''): string[] {
  // Keys starting with "dev" hold development-only notes that production never renders.
  if (/^dev[A-Z]/.test(key)) return out;
  if (typeof value === 'string') out.push(value);
  else if (typeof value === 'function') {
    for (const sample of [[0], [1], [4], [3, 5]]) {
      try {
        const r = (value as (...a: number[]) => unknown)(...sample);
        if (typeof r === 'string') out.push(r);
      } catch {
        /* not a text builder */
      }
    }
  } else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => collectStrings(v, out, k));
  return out;
}

const CONTENT = { princessDay, experience, project25, garden };
const ALL = collectStrings(CONTENT);
const INDEX_HTML = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

describe('royal identity', () => {
  it('is exactly ❤️💎 Princess Prism 💎❤️™', () => {
    expect(ROYAL_NAME).toBe('❤️💎 Princess Prism 💎❤️™');
  });

  it('never appears as a bare or differently styled variant in shipped content', () => {
    for (const s of ALL) {
      const bare = s.split(/princess prism/i).length - 1;
      const exact = s.split(ROYAL_NAME).length - 1;
      expect(bare, `"${s}"`).toBe(exact);
    }
  });

  it('is used by the greetings, decree, date label, certificate and browser title', () => {
    expect(princessDay.closing.title).toContain(ROYAL_NAME);
    expect(princessDay.decree.articles[0]).toContain(ROYAL_NAME);
    expect(experience.dates.right.label).toBe(`The Birthday of ${ROYAL_NAME}`);
    expect(garden.certificate.name).toBe(ROYAL_NAME);
    expect(project25.classification).toContain(ROYAL_NAME);
    expect(experience.heroName).toBe(ROYAL_NAME);
    expect(INDEX_HTML).toContain(`<title>${ROYAL_NAME}</title>`);
    expect(INDEX_HTML).toContain(`name="apple-mobile-web-app-title" content="${ROYAL_NAME}"`);
  });
});

describe('THE 25th STAR', () => {
  it('replaces every visible PROJECT 25 wording', () => {
    for (const s of ALL) expect(s, `"${s}"`).not.toMatch(/project\s*25|\bproject\b/i);
    expect(INDEX_HTML).not.toMatch(/project\s*25/i);
  });

  it('is the name of the countdown, the reveal and the navigation labels', () => {
    expect(experience.starName).toBe('THE 25th STAR');
    expect(project25.name).toBe(experience.starName);
    expect(project25.unlocked.lines[0]).toBe(experience.starName);
    expect(experience.intro.skipLabel).toContain(experience.starName);
  });

  it('drops the old classified-file framing from the countdown', () => {
    for (const s of collectStrings(project25)) expect(s).not.toMatch(/FILE 25|CLASSIFICATION|T-ZERO|DESTINATION:/);
  });
});

describe('launch gate: no unfinished copy ships', () => {
  const UNFINISHED = /\[\s*placeholder|placeholder|coming soon|to be written|lorem ipsum|\bTODO\b|\bTBD\b|\bFIXME\b|\[\s*the birthday message|caption (one|two|three|four)/i;

  it('no shipped user-visible string contains a placeholder or draft marker', () => {
    const offenders = ALL.filter((s) => UNFINISHED.test(s));
    expect(offenders).toEqual([]);
  });

  it('every crystal and hidden glint has a real message', () => {
    for (const c of princessDay.crystals.items) expect(c.message.length, c.id).toBeGreaterThan(40);
    expect(princessDay.hiddenMessages).toHaveLength(4);
    for (const h of princessDay.hiddenMessages) expect(h.text.length, h.id).toBeGreaterThan(30);
    expect(princessDay.closing.body.length).toBeGreaterThan(80);
  });

  it('wish messages are honest about where a wish goes and whether it was sent', () => {
    // the confirmation is the agreed wording, and is shown only after storage succeeded
    expect(garden.wish.acceptedVault).toBe(
      'Your wish has found its way to the stars. Some wishes are meant to travel quietly. Thank you for sharing yours.',
    );
    // visitors are told plainly where a wish goes
    expect(garden.wish.disclosureVault).toMatch(/privately/i);
    expect(garden.wish.disclosureVault).toMatch(/person who made this garden/i);
    // when nothing can be sent, the copy says so
    expect(garden.wish.disclosureNotConnected).toMatch(/not connected/i);
    expect(garden.wish.disclosureUnavailable).toMatch(/not ready/i);
    expect(garden.wish.errors['not-connected']).toMatch(/not sent/i);
    // no leftover email wording anywhere in the wish copy
    expect(JSON.stringify(garden.wish)).not.toMatch(/email|e-mail/i);
    expect(project25.reveal.staticHosting).toMatch(/not connected/i);
  });
});
