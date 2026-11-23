import { AnimatePresence, motion, type MotionProps } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { audio } from './audio/AudioEngine';
import { useSound } from './audio/SoundContext';
import { Arrival } from './components/Arrival/Arrival';
import { DevPanel } from './components/Chrome/DevPanel';
import { SoundToggle } from './components/Chrome/SoundToggle';
import { DateReveal } from './components/DateReveal/DateReveal';
import { IntroClock } from './components/IntroClock/IntroClock';
import { OneMoreThing } from './components/OneMoreThing/OneMoreThing';
import { PrincessDay } from './components/PrincessDay/PrincessDay';
import { Project25 } from './components/Project25/Project25';
import { Starfield, type StarMode } from './components/Starfield/Starfield';
import { TimeRewind } from './components/TimeRewind/TimeRewind';
import { TEST_CLOCK_ENABLED, now, syncWithServer } from './utils/clock';
import { BIRTHDAY_MS } from './utils/dates';
import { chooseEntrance } from './utils/cinematic';

const STAGES = ['intro', 'rewind', 'arrival', 'princess', 'oneMore', 'dates', 'project25'] as const;
type Stage = (typeof STAGES)[number];

const REACHED_KEY = 'prism:reached25';

function initialStage(): Stage {
  if (!TEST_CLOCK_ENABLED) return 'intro';
  const s = new URLSearchParams(window.location.search).get('stage');
  return STAGES.includes(s as Stage) ? (s as Stage) : 'intro';
}

function hasReached25(): boolean {
  try {
    return localStorage.getItem(REACHED_KEY) === '1';
  } catch {
    return false;
  }
}

/** Scene wrappers: most stages cross-fade; rewind → arrival cuts on the white flash. */
const sceneMotion: Record<Stage, Pick<MotionProps, 'initial' | 'animate' | 'exit'>> = {
  intro: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0, transition: { duration: 0.6 } } },
  rewind: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 1, transition: { duration: 0 } } },
  arrival: { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 0, transition: { duration: 0.7 } } },
  princess: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0, transition: { duration: 1.2 } } },
  oneMore: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0, transition: { duration: 0.9 } } },
  // The dates end on a single point of light in an already-dark sky, which THE
  // 25th STAR picks up at the same spot: cut instantly, no fade, no blank frame.
  dates: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 1, transition: { duration: 0 } } },
  project25: { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
};

export default function App() {
  const [stage, setStage] = useState<Stage>(initialStage);
  const [gold, setGold] = useState(false);
  const [starsDimmed, setStarsDimmed] = useState(false);
  /** Presentation only: whether THE 25th STAR plays its one-time entrance. */
  const [starEntrance, setStarEntrance] = useState<'cinematic' | 'none'>(() => chooseEntrance());
  const { enabled } = useSound();

  useEffect(() => {
    void syncWithServer();
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (stage === 'project25') {
      try {
        localStorage.setItem(REACHED_KEY, '1');
      } catch {
        /* ignore */
      }
    }
  }, [stage]);

  useEffect(() => {
    document.documentElement.dataset.theme = gold ? 'gold' : 'sapphire';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', gold ? '#0f1424' : '#071426');
  }, [gold]);

  // Pause sound while the phone is locked / tab hidden.
  useEffect(() => {
    const onVis = () => audio.setEnabled(document.hidden ? false : enabled);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [enabled]);

  const startAudio = useCallback(() => {
    audio.init();
    if (enabled) audio.startAmbient();
  }, [enabled]);

  const begin = () => {
    startAudio();
    setStage('rewind');
  };

  const goToStar = useCallback(() => {
    setStarEntrance(chooseEntrance());
    setStage('project25');
  }, []);

  const skip = () => {
    startAudio();
    goToStar();
  };

  const canSkip = hasReached25() || now() >= BIRTHDAY_MS;
  const starMode: StarMode = stage === 'rewind' ? 'warp' : gold ? 'gold' : 'drift';

  const m = sceneMotion[stage];

  return (
    <>
      <Starfield mode={starMode} dimmed={starsDimmed && (stage === 'dates' || stage === 'project25')} />
      <SoundToggle />
      <span className="brand-mark" aria-hidden="true">
        PRISM
      </span>

      <div className="app">
        <AnimatePresence mode="wait">
          <motion.div key={stage} initial={m.initial} animate={m.animate} exit={m.exit} transition={{ duration: 0.8 }}>
            {stage === 'intro' && <IntroClock onBegin={begin} onSkip={canSkip ? skip : undefined} />}
            {stage === 'rewind' && <TimeRewind onComplete={() => setStage('arrival')} />}
            {stage === 'arrival' && <Arrival onContinue={() => setStage('princess')} />}
            {stage === 'princess' && <PrincessDay onComplete={() => setStage('oneMore')} />}
            {stage === 'oneMore' && <OneMoreThing onContinue={() => setStage('dates')} />}
            {stage === 'dates' && <DateReveal onOutro={() => setStarsDimmed(true)} onContinue={goToStar} />}
            {stage === 'project25' && <Project25 onGold={setGold} entrance={starEntrance} onSettled={() => setStarsDimmed(false)} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {TEST_CLOCK_ENABLED && <DevPanel />}
    </>
  );
}
