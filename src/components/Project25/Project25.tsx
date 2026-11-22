import { useEffect, useRef, useState } from 'react';
import { useBirthdayAccess } from '../../hooks/useBirthdayAccess';
import { useCountdown } from '../../hooks/useCountdown';
import { BIRTHDAY_MS } from '../../utils/dates';
import { BirthdayChamber } from '../BirthdayChamber/BirthdayChamber';
import { BirthdayReveal } from '../BirthdayReveal/BirthdayReveal';
import { PrismClock } from '../PrismClock/PrismClock';

interface Props {
  onGold: (gold: boolean) => void;
}

/** ACT VI + VII – countdown, sealed chamber, and the birthday reveal once open. */
export function Project25({ onGold }: Props) {
  const remaining = useCountdown(BIRTHDAY_MS);
  const [opened, setOpened] = useState(false);
  const access = useBirthdayAccess(opened);
  const revealRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (opened) {
      const id = setTimeout(() => revealRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 400);
      return () => clearTimeout(id);
    }
  }, [opened]);

  return (
    <main className="project25">
      <PrismClock remaining={remaining} />
      <BirthdayChamber reached={remaining.reached} onGold={() => onGold(true)} onOpened={() => setOpened(true)} />
      <div ref={revealRef}>{opened && <BirthdayReveal access={access} />}</div>
    </main>
  );
}
