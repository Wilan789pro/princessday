import { ArrowRight } from 'lucide-react';
import { princessDay } from '../../content/princessDay';
import { Crystal } from '../Crystal/Crystal';
import { Reveal } from './Reveal';
import { WithRoyalName } from '../RoyalName/RoyalName';

interface Props {
  secretsFound: number;
  secretsTotal: number;
  onContinue: () => void;
}

export function Closing({ secretsFound, secretsTotal, onContinue }: Props) {
  const t = princessDay.closing;
  return (
    <section className="section closing" aria-labelledby="closing-title">
      <Reveal>
        <div className="closing__crown" aria-hidden="true">
          <Crystal hue="ice" shape={1} size={42} float sparkle={false} />
          <Crystal hue="sapphire" shape={0} size={80} float />
          <Crystal hue="lavender" shape={1} size={42} float sparkle={false} />
        </div>
        <h2 id="closing-title" className="closing__title serif">
          <WithRoyalName text={t.title} />
        </h2>
        <p className="closing__body">{t.body}</p>
        <p className="closing__secrets mono">{t.secretsLabel(secretsFound, secretsTotal)}</p>
        <button type="button" className="btn btn--primary" onClick={onContinue}>
          {t.continueLabel}
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </Reveal>
    </section>
  );
}
