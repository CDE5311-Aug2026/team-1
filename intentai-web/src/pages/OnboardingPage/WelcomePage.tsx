// v2 onboarding, boards 01–03. /onboarding is the Welcome (board 01, variant B: film strips of real places); the
// questions are /onboarding?step=1 (the name on your passport, first; owner, 10 Nov 2026), ?step=2 (what to
// explore, board 02) and ?step=3 (hunt with others + region, board 03), so the browser's Back goes to the previous question. Answers stay a draft (component state, mirrored into the history
// entry) until the review's "Stamp my passport"; nothing is written to the profile here.
import { motion, useReducedMotionConfig } from 'motion/react';
import { useRef, useState } from 'react';
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
import { huntModeStore, passportNameStore } from '../../data/v2Stores';
import { paths } from '../../routes';
import { draftFromState, draftName, initialDraft, parseStep, type Draft } from './flow';
import NameField, { Initial } from './NameField';
import { FeedPreview, ProgressHeader } from './parts';
import FilmWall, { FILM_FRAMES } from './v3/FilmWall';
import Icon, { type IconName } from './v3/icons';
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
        <Icon name="lock" size={14} /> Four quick questions · everything stays on this phone
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
      <ProgressHeader step={2} onBack={() => goTo(1)} />
      <div className={styles.head}>
        <span className={styles.kicker}>Question 2 of 4</span>
        <h1 className={styles.title}>
          What would you like{' '}
          <br />
          to explore?
        </h1>
      </div>
      <TourismRanker value={draft.ranking} onChange={(ranking) => setDraft({ ...draft, ranking })} />
      <FeedPreview ranking={draft.ranking} />
      <div className={styles.footer}>
        <button type="button" className={styles.primary} disabled={!ok} onClick={() => goTo(3)}>
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
      <ProgressHeader step={3} onBack={() => goTo(2)} />
      <div className={styles.head}>
        <span className={styles.kicker}>Question 3 of 4</span>
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

/** What the next three steps ask, shown on question 1 so the whole run is clear before it starts. */
const AHEAD: { step: number; icon: IconName; tone: string; title: string; sub: string }[] = [
  { step: 2, icon: 'grid', tone: styles.toneAtt, title: 'What you’d like to explore', sub: 'Rank Attractions, Wellness, Leisure and Cruise. Home leads with your first pick.' },
  { step: 3, icon: 'trophy', tone: styles.toneAccent, title: 'How you hunt, and where', sub: 'Hunt together or on your own, then choose your home region on the map.' },
  { step: 4, icon: 'pin', tone: styles.tonePaper, title: 'Review and stamp', sub: 'Check your answers, change any line, then stamp your passport.' },
];

/** Question 1: the name on the passport, written on a passport card whose picture is the name's first letter, and
 *  what the next three steps ask. Continue checks the name (name.ts); a problem shows under the field and focus goes
 *  back to it. Enter in the field is Continue. */
function NameStep({ draft, setDraft, goTo }: StepProps) {
  const [tried, setTried] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const typed = draft.name.trim().length > 0;
  const shown = draftName(draft) ?? (typed ? draft.name.trim() : '');
  const go = () => {
    if (draftName(draft)) goTo(2);
    else {
      setTried(true);
      input.current?.focus();
    }
  };
  return (
    <form
      className={styles.question}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        go();
      }}
    >
      <ProgressHeader step={1} onBack={() => goTo(0)} />
      <div className={styles.head}>
        <span className={styles.kicker}>Question 1 of 4</span>
        <h1 className={styles.title}>Whose passport is this?</h1>
        <p className={styles.sub}>Start with your name. It goes on your passport, and its first letter becomes your picture.</p>
      </div>

      <section className={styles.passport} aria-label="Your passport">
        <div className={styles.passportTop}>
          <span className={styles.avatar} aria-hidden="true">
            <Initial name={draft.name} size={22} />
          </span>
          <div className={styles.holder}>
            <span className={shown ? styles.holderName : `${styles.holderName} ${styles.holderEmpty}`}>{shown || 'Your name'}</span>
            <span className={styles.holderLine}>FINDSG · SINGAPORE</span>
          </div>
          <span className={styles.stampSlot} aria-hidden="true" />
        </div>
        <div className={styles.lines}>
          <NameField
            value={draft.name}
            onChange={(name) => setDraft({ ...draft, name })}
            showError={tried}
            onBlur={() => typed && setTried(true)}
            inputRef={input}
            avatar={false}
          />
        </div>
      </section>

      <section aria-labelledby="ahead-title">
        <h2 id="ahead-title" className={styles.nextTitle}>
          Up next · 3 quick steps
        </h2>
        <ol className={styles.ahead}>
          {AHEAD.map((a) => (
            <li key={a.step} className={styles.aheadItem}>
              <span className={`${styles.nextIcon} ${a.tone}`} aria-hidden="true">
                <Icon name={a.icon} size={18} />
              </span>
              <span className={styles.aheadText}>
                <span className={styles.nextName}>{a.title}</span>
                <span className={styles.nextSub}>{a.sub}</span>
              </span>
              <span className={styles.aheadStep}>
                <span className={styles.srOnly}>Step </span>
                {a.step}/4
              </span>
            </li>
          ))}
        </ol>
      </section>

      <p className={`${styles.local} ${styles.localTight}`}>
        <Icon name="lock" size={14} /> Stays on this phone · change any of it later
      </p>

      <div className={styles.footer}>
        <button type="submit" className={styles.primary} disabled={!typed}>
          {typed ? 'Continue' : 'Type your name'} {typed ? <Icon name="arrow" size={18} className={styles.arrow} /> : null}
        </button>
      </div>
    </form>
  );
}

export default function WelcomePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile] = usePersistentStore(profileV3Store);
  const [hunt] = usePersistentStore(huntModeStore);
  const [onboarding] = usePersistentStore(onboardingStore);
  const [passportName] = usePersistentStore(passportNameStore);
  const step = parseStep(params.get('step'));
  const [draft, setDraftState] = useState<Draft>(
    () => draftFromState(location.state) ?? initialDraft(profile, hunt, onboarding.done, passportName.name),
  );

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
        {step === 0 ? (
          <Welcome onStart={() => goTo(1)} />
        ) : step === 1 ? (
          <NameStep {...props} />
        ) : step === 2 ? (
          <ExploreStep {...props} />
        ) : (
          <HuntStep {...props} />
        )}
      </div>
    </AppShell>
  );
}
