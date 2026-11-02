// Onboarding v3 (Figma O1–O7). O1 lives at /onboarding; the questions at /onboarding?step=1…2, one per screen, so the
// browser's Back goes to the previous question. Onboarding asks only what chooses places: which place tags come first,
// and where Nearby starts. "Stamp my passport" finishes and opens O8 (ResultPage).
import { motion, useReducedMotionConfig } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import logo from '../../assets/brand/findsg-logo.png';
import lion from '../../assets/v3/onboarding/lion.png';
import AppShell from '../../components/AppShell/AppShell';
import BlurText from '../../components/reactbits/BlurText';
import { topicPhoto } from '../../data/profile/finds';
import { usePersistentStore } from '../../data/persistentStore';
import {
  ONBOARDING_FIELDS,
  TOPICS,
  finishOnboarding,
  mySpacePrefsStore,
  profileV3Store,
  toggleHidden,
  updateProfile,
} from '../../data/profile/profile';
import { paths } from '../../routes';
import { onboardingStore } from '../../data/stores';
import FilmWall, { FILM_FRAMES } from './v3/FilmWall';
import Icon from './v3/icons';
import Passport from './v3/Passport';
import { BaseMap, PreviewCard, TopicRanker } from './v3/Pickers';
import { previewFor } from './v3/previews';
import useInitial from './v3/useInitial';
import styles from './Onboarding.module.css';

type Step = (typeof ONBOARDING_FIELDS)[number];

const TITLES: Record<Step, string> = {
  topics: 'Which places do you want to find first?',
  base: 'Where do you spend most of your time?',
};

const USES: Record<Step, string> = {
  topics: 'Tap in order. Home shows your #1 first in every area',
  base: 'Tap the map to set where Nearby searches from',
};

const STEPS = ONBOARDING_FIELDS.length;

export function parseStep(raw: string | null): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= STEPS ? n : 0;
}

function Welcome({ onStart }: { onStart: () => void }) {
  const reduce = useReducedMotionConfig();
  return (
    <div className={styles.welcome}>
      {/* strips of film drifting behind the passport: Singapore's buildings, old and today */}
      <div className={styles.wallWrap} data-allow-bleed>
        <FilmWall />
      </div>
      <img className={styles.logo} src={logo} alt="FindSG" width={44} height={44} />
      <motion.div
        className={styles.book}
        aria-hidden="true"
        initial={reduce ? false : { y: 24, rotate: -4, opacity: 0 }}
        animate={reduce ? { opacity: 1 } : { y: [0, -6, 0], rotate: 0, opacity: 1 }}
        transition={
          reduce
            ? { duration: 0 }
            : { y: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }, rotate: { duration: 0.6 }, opacity: { duration: 0.4 } }
        }
      >
        <span className={styles.bookFace}>
          <img src={lion} alt="" width={62} height={62} />
        </span>
        <span className={styles.bookTitle}>PASSPORT</span>
        <span className={styles.bookSub}>INTENTAI · SINGAPORE</span>
      </motion.div>
      <h1 className={styles.welcomeTitle}>
        <BlurText as="span" text="Welcome to the" trigger="load" delay={70} className={styles.welcomeLine} />
        <BlurText as="span" text="Singapore Treasure Hunt" trigger="load" delay={70} className={styles.welcomeLine} />
      </h1>
      <p className={styles.welcomeLead}>Find landmarks, culture, food and nature around you, and collect a stamp for every place.</p>
      <ul className={styles.circles}>
        {TOPICS.map((t, i) => {
          const photo = topicPhoto(t.id);
          return (
            <motion.li
              key={t.id}
              initial={reduce ? false : { y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: reduce ? 0 : 0.5 + i * 0.08 }}
            >
              <span className={styles.circle}>{photo && <img src={photo.src} alt="" />}</span>
              {t.label}
            </motion.li>
          );
        })}
      </ul>
      <p className={styles.local}>
        <Icon name="lock" size={14} /> Two quick questions · everything stays on this phone
      </p>
      {/* User test: usage timings (time only) go to the team's dashboard. */}
      <p className={styles.notice}>We record how long you spend on each page, anonymously, to improve the app.</p>
      <details className={styles.credits}>
        <summary>Photo credits</summary>
        <ul>
          {FILM_FRAMES.map((f) => (
            <li key={f.file}>
              {f.name} ({f.year === 'Today' ? 'today' : f.year}): {f.credit}
            </li>
          ))}
        </ul>
      </details>
      <div className={styles.footer}>
        <button type="button" className={styles.primary} onClick={onStart}>
          Start the hunt <Icon name="arrow" size={18} />
        </button>
      </div>
    </div>
  );
}

function Question({ step, goTo }: { step: number; goTo: (n: number) => void }) {
  const navigate = useNavigate();
  const [profile] = usePersistentStore(profileV3Store);
  const [prefs] = usePersistentStore(mySpacePrefsStore);
  const initial = useInitial();
  const field = ONBOARDING_FIELDS[step - 1];
  const last = step === STEPS;
  const answered = field === 'topics' ? profile.topics.length > 0 : Boolean(profile.base);

  const next = () => {
    if (!answered) return;
    if (last) {
      finishOnboarding();
      if (prefs.haptics) navigator.vibrate?.(30);
      navigate(paths.onboardingResult);
    } else goTo(step + 1);
  };

  const picker =
    field === 'topics' ? (
      <TopicRanker value={profile.topics} onChange={(topics) => updateProfile({ topics })} />
    ) : (
      <BaseMap value={profile.base} onChange={(base) => updateProfile({ base })} />
    );

  return (
    <div className={styles.question}>
      <div className={styles.progressRow}>
        <button type="button" className={styles.back} aria-label="Back" onClick={() => goTo(step - 1)}>
          <Icon name="back" size={22} />
        </button>
        <div
          className={styles.progress}
          role="progressbar"
          aria-label="Questions"
          aria-valuemin={0}
          aria-valuemax={STEPS}
          aria-valuenow={step}
          aria-valuetext={`Question ${step} of ${STEPS}`}
        >
          {ONBOARDING_FIELDS.map((f, i) => (
            <span key={f} className={styles.segment}>
              <span className={styles.segmentFill} style={{ width: i < step - 1 ? '100%' : i === step - 1 ? (answered ? '100%' : '35%') : '0%' }} />
            </span>
          ))}
        </div>
        <span className={styles.count}>
          {step}/{STEPS}
        </span>
        <ExitButton />
      </div>
      <Passport profile={profile} initial={initial} fields={ONBOARDING_FIELDS} active={field} onToggleHidden={toggleHidden} />
      <BlurText key={field} as="h1" text={TITLES[field]} trigger="load" delay={50} className={styles.title} />
      <p className={styles.use}>
        <span className={styles.useDot} aria-hidden="true" />
        {USES[field]}
      </p>
      {picker}
      <PreviewCard preview={previewFor(field, profile)} />
      <div className={styles.footer}>
        <button type="button" className={styles.primary} onClick={next} disabled={!answered}>
          {last ? 'Stamp my passport' : 'Continue'} <Icon name="arrow" size={18} />
        </button>
      </div>
    </div>
  );
}

/**
 * Leave onboarding. Someone who finished it before goes back to My Space with their answers kept as they are now;
 * a first-time user skips the rest (what they answered so far is kept) and lands on Home.
 */
function ExitButton() {
  const navigate = useNavigate();
  const [onboarding] = usePersistentStore(onboardingStore);
  const returning = onboarding.done;
  return (
    <button
      type="button"
      className={styles.back}
      aria-label={returning ? 'Leave onboarding' : 'Skip onboarding for now'}
      onClick={() => {
        if (returning) navigate(paths.mySpace);
        else {
          finishOnboarding();
          navigate(paths.today);
        }
      }}
    >
      <Icon name="close" size={20} />
    </button>
  );
}

export default function WelcomePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const step = parseStep(params.get('step'));
  const goTo = (n: number) => {
    navigate(n <= 0 ? paths.welcome : `${paths.welcome}?step=${n}`);
    document.documentElement.scrollTop = 0;
  };

  return (
    <AppShell chrome="none" background="#edebe5">
      <div className={styles.screen}>{step === 0 ? <Welcome onStart={() => goTo(1)} /> : <Question key={step} step={step} goTo={goTo} />}</div>
    </AppShell>
  );
}
