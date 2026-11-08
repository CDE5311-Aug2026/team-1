// v2 onboarding, boards 01–03. /onboarding is the Welcome (board 01, variant B: film strips of real places); the
// questions are /onboarding?step=1 (what to explore, board 02) and ?step=2 (hunt with others + region, board 03), so
// the browser's Back goes to the previous question. Answers stay a draft (component state, mirrored into the history
// entry) until the review's "Stamp my passport"; nothing is written to the profile here.
import { motion, useReducedMotionConfig } from 'motion/react';
import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import logo from '../../assets/brand/findsg-logo.png';
import AppShell from '../../components/AppShell/AppShell';
import CategoryGlyph from '../../components/Category/CategoryGlyph';
import HuntStepEditor from './HuntChoice';
import TourismRanker from '../../components/ProfileEditors/TourismRanker';
import { usePersistentStore } from '../../data/persistentStore';
import { profileV3Store } from '../../data/profile/profile';
import { onboardingStore } from '../../data/stores';
import { TOURISM_CATEGORIES, TOURISM_INFO } from '../../data/tourism';
import { huntModeStore } from '../../data/v2Stores';
import { paths } from '../../routes';
import { draftFromState, initialDraft, parseStep, type Draft } from './flow';
import { FeedPreview, ProgressHeader } from './parts';
import FilmWall, { FILM_FRAMES } from './v3/FilmWall';
import Icon from './v3/icons';
import styles from './Onboarding.module.css';

export { parseStep };

function Welcome({ onStart }: { onStart: () => void }) {
  const reduce = useReducedMotionConfig();
  return (
    <div className={styles.welcome}>
      {/* strips of film drifting behind the passport: real Singapore places, old and today (licensed photos) */}
      <div className={styles.wallWrap} data-allow-bleed>
        <FilmWall />
      </div>
      <motion.div
        className={styles.book}
        aria-hidden="true"
        initial={reduce ? false : { y: 24, opacity: 0 }}
        animate={reduce ? { opacity: 1 } : { y: [0, -6, 0], opacity: 1 }}
        transition={reduce ? { duration: 0 } : { y: { duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }, opacity: { duration: 0.4 } }}
      >
        <span className={styles.bookFace}>
          <img src={logo} alt="" width={62} height={62} />
        </span>
        <span className={styles.bookTitle}>PASSPORT</span>
        <span className={styles.bookSub}>FINDSG · SINGAPORE</span>
      </motion.div>
      <h1 className={styles.welcomeTitle}>
        Welcome to the{' '}
        <br />
        Singapore Treasure Hunt
      </h1>
      <p className={styles.welcomeLead}>
        Discover attractions, wellness spots, leisure events and cruise experiences near you, and collect a stamp for every place you visit.
      </p>
      <ul className={styles.circles} aria-label="The four place categories">
        {TOURISM_CATEGORIES.map((c) => (
          <li key={c} style={{ color: `var(--cat-${c}-ink)` }}>
            <span className={styles.circle} style={{ background: `var(--cat-${c}-tint)`, boxShadow: `inset 0 0 0 2px var(--cat-${c})` }} aria-hidden="true">
              <CategoryGlyph category={c} size={24} />
            </span>
            {TOURISM_INFO[c].label}
          </li>
        ))}
      </ul>
      <p className={styles.local}>
        <Icon name="lock" size={14} /> Three quick questions · everything stays on this phone
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
          Start the hunt <Icon name="arrow" size={18} className={styles.arrow} />
        </button>
      </div>
    </div>
  );
}

interface StepProps {
  draft: Draft;
  setDraft: (d: Draft) => void;
  goTo: (n: number) => void;
  onDone: () => void;
}

function ExploreStep({ draft, setDraft, goTo }: StepProps) {
  const ok = draft.ranking.length > 0;
  return (
    <div className={styles.question}>
      <ProgressHeader step={1} onBack={() => goTo(0)} />
      <div className={styles.head}>
        <span className={styles.kicker}>Question 1 of 3</span>
        <h1 className={styles.title}>
          What would you like{' '}
          <br />
          to explore?
        </h1>
      </div>
      <TourismRanker value={draft.ranking} onChange={(ranking) => setDraft({ ...draft, ranking })} />
      <FeedPreview ranking={draft.ranking} />
      <div className={styles.footer}>
        <button type="button" className={styles.primary} disabled={!ok} onClick={() => goTo(2)}>
          {ok ? 'Continue' : 'Pick at least one category'} {ok ? <Icon name="arrow" size={18} className={styles.arrow} /> : null}
        </button>
      </div>
    </div>
  );
}

function HuntStep({ draft, setDraft, goTo, onDone }: StepProps) {
  const ok = Boolean(draft.mode && draft.region);
  return (
    <div className={styles.question}>
      <ProgressHeader step={2} onBack={() => goTo(1)} />
      <div className={styles.head}>
        <span className={styles.kicker}>Question 2 of 3</span>
        <h1 className={styles.title}>Hunt with others nearby?</h1>
        <p className={styles.sub}>Open this weekend’s challenges and see example leaderboards. Nothing about your location is shared.</p>
      </div>
      <HuntStepEditor
        mode={draft.mode}
        region={draft.region}
        onMode={(mode) => setDraft({ ...draft, mode })}
        onRegion={(region) => setDraft({ ...draft, region })}
      />
      <div className={styles.footer}>
        <button type="button" className={styles.primary} disabled={!ok} onClick={onDone}>
          {ok ? 'Continue' : 'Pick a mode and a region'} {ok ? <Icon name="arrow" size={18} className={styles.arrow} /> : null}
        </button>
      </div>
    </div>
  );
}

export default function WelcomePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile] = usePersistentStore(profileV3Store);
  const [hunt] = usePersistentStore(huntModeStore);
  const [onboarding] = usePersistentStore(onboardingStore);
  const step = parseStep(params.get('step'));
  const [draft, setDraftState] = useState<Draft>(() => draftFromState(location.state) ?? initialDraft(profile, hunt, onboarding.done));

  const setDraft = (d: Draft) => {
    setDraftState(d);
    // keep the answers on this history entry, so a reload or Back from the review finds them
    navigate(location.pathname + location.search, { replace: true, state: { draft: d } });
  };
  const goTo = (n: number) => {
    navigate(n <= 0 ? paths.welcome : `${paths.welcome}?step=${n}`, { state: { draft } });
    document.documentElement.scrollTop = 0;
  };
  const onDone = () => navigate(paths.onboardingResult, { state: { draft } });

  const props = { draft, setDraft, goTo, onDone };
  return (
    <AppShell chrome="none">
      <div className={styles.screen}>
        {step === 0 ? <Welcome onStart={() => goTo(1)} /> : step === 1 ? <ExploreStep {...props} /> : <HuntStep {...props} />}
      </div>
    </AppShell>
  );
}
