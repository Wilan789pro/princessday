import { Fragment } from 'react';
import { ROYAL_NAME, ROYAL_NAME_PARTS } from '../../content/royal';
import './RoyalName.css';

interface Props {
  /** Gradient/text class for the words only (e.g. "text-prism", "text-gold"). */
  textClass?: string;
  className?: string;
}

/**
 * ❤️💎 Princess Prism 💎❤️™
 * - The colour emoji and ™ stay OUTSIDE any gradient text (background-clip:text
 *   would hide or flatten them).
 * - Each emoji group is bound to its neighbouring word, so narrow screens break
 *   it symmetrically as "❤️💎 Princess / Prism 💎❤️™", never leaving emoji alone.
 * - Screen readers get the exact name once, from the shared constant.
 */
export function RoyalName({ textClass = '', className = '' }: Props) {
  const { before, core, after } = ROYAL_NAME_PARTS;
  const words = core.split(' ');
  const first = words[0];
  const last = words.length > 1 ? words[words.length - 1] : '';
  const middle = words.slice(1, -1).join(' ');
  return (
    <span className={`royal-name ${className}`}>
      <span className="sr-only">{ROYAL_NAME}</span>
      <span aria-hidden="true">
        <span className="royal-name__group">
          <span className="royal-name__emoji">{before}</span> <span className={textClass}>{first}</span>
        </span>
        {middle && (
          <>
            {' '}
            <span className={textClass}>{middle}</span>
          </>
        )}
        {last && (
          <>
            {' '}
            <span className="royal-name__group">
              <span className={textClass}>{last}</span> <span className="royal-name__emoji">{after}</span>
            </span>
          </>
        )}
      </span>
    </span>
  );
}

/** Renders a content string, replacing every occurrence of the royal name with <RoyalName />. */
export function WithRoyalName({ text, textClass }: { text: string; textClass?: string }) {
  const parts = text.split(ROYAL_NAME);
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i < parts.length - 1 && <RoyalName textClass={textClass} />}
        </Fragment>
      ))}
    </>
  );
}
