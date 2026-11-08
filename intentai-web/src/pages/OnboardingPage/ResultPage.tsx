// v2 onboarding board 04, /onboarding/result: review the draft (categories, hunt mode, region) on the passport card,
// tap a line to change it in a sheet (the same editors as steps 1–2; Cancel discards, Save updates the draft and you
// stay here), then "Stamp my passport" saves everything through finishTourismOnboarding, the stamp lands
// (reduced-motion safe) and Home opens. No place visit is recorded: the seal is the profile's stampedOn only.
import { motion, useReducedMotionConfig } from 'motion/react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppShell from '../../components/AppShell/AppShell';
import HuntStepEditor from './HuntChoice';
import TourismRanker from '../../components/ProfileEditors/TourismRanker';
import { REGION_NAMES } from '../../components/RegionMap/regionPaths.generated';
import { usePersistentStore } from '../../data/persistentStore';
import { finishTourismOnboarding, holderInitial, localDate, mySpacePrefsStore, profileV3Store, sealDate } from '../../data/profile/profile';
import { onboardingStore, testerStore } from '../../data/stores';
import { TOURISM_INFO } from '../../data/tourism';
import { huntModeStore } from '../../data/v2Stores';
import { paths } from '../../routes';
import { draftFromState, initialDraft, type Draft } from './flow';
import { ProgressHeader } from './parts';
import Icon, { type IconName } from './v3/icons';
import styles from './Onboarding.module.css';

/** How long the stamp animation plays before Home opens. */
export const STAMP_MS = 1100;

function Sheet({ title, onCancel, onSave, canSave, children }: { title: string; onCancel: () => void; onSave: () => void; canSave: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return undefined;
    const opener = document.activeElement as HTMLElement | null;
    if (!dialog.open) dialog.showModal();
    const cancel = (e: Event) => {
      e.preventDefault();
      cancelRef.current();
    };
    dialog.addEventListener('cancel', cancel);
    return () => {
      dialog.removeEventListener('cancel', cancel);
      if (dialog.open) dialog.close();
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  return (
    <dialog ref={ref} className={styles.sheet} aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.sheetTitle}>
        {title}
      </h2>
      <div className={styles.sheetBody}>{children}</div>
      <div className={styles.sheetActions}>
        <button type="button" className={styles.secondary} onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className={styles.primary} onClick={onSave} disabled={!canSave}>
          Save
        </button>
      </div>
    </dialog>
  );
}

function StampRing({ date, landed }: { date: string; landed: boolean }) {
  const reduce = useReducedMotionConfig();
  const ring = useId().replace(/:/g, '');
  if (!landed) return <span className={styles.stampSlot} aria-hidden="true" />;
  return (
    <motion.span
      className={styles.stamp}
      role="img"
      aria-label={`Stamped, ${sealDate(date)}`}
      initial={reduce ? false : { scale: 2.4, opacity: 0, rotate: -30 }}
      animate={{ scale: 1, opacity: 1, rotate: -8 }}
      transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 16 }}
    >
      <svg viewBox="0 0 64 64" width="62" height="62" aria-hidden="true" className={styles.stampRing}>
        <defs>
          <path id={ring} d="M32 32m-24 0a24 24 0 1 1 48 0a24 24 0 1 1-48 0" />
        </defs>
        <circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <text fontFamily="IBM Plex Mono, monospace" fontSize="7" fontWeight="600" letterSpacing="1.2" fill="currentColor">
          <textPath href={`#${ring}`}>{`FINDSG · ${sealDate(date)} · STAMPED ·`}</textPath>
        </text>
      </svg>
      <Icon name="pin" size={20} strokeWidth={2.2} className={styles.stampPin} />
    </motion.span>
  );
}

interface Next {
  icon: IconName;
  tone: string;
  title: string;
  sub: string;
}

/** "What happens next", reworded so it promises nothing the app does not do (plan B6). */
function nextCards(draft: Draft): Next[] {
  const region = draft.region ? REGION_NAMES[draft.region] : 'Your region';
  return [
    { icon: 'sparkle', tone: styles.toneAssist, title: 'Home suggests places from your interests', sub: 'Picked for you, by your categories' },
    draft.mode === 'together'
      ? { icon: 'trophy', tone: styles.toneAccent, title: `${region} leaderboard`, sub: 'Shown with example times' }
      : { icon: 'trophy', tone: styles.toneAccent, title: 'No leaderboard on your own', sub: 'Switch to hunt together any time' },
    { icon: 'cards', tone: styles.toneLei, title: 'Challenges by category', sub: 'Filter them with the category chips' },
    { icon: 'lock', tone: styles.toneCru, title: 'Stays on this phone', sub: 'Your answers and stamps are kept here' },
    { icon: 'pin', tone: styles.tonePaper, title: 'Stamp places you visit', sub: 'Self-reported, with a distance hint' },
    { icon: 'book', tone: styles.toneAtt, title: 'Story volumes to unlock', sub: 'Field archive, one stop at a time' },
  ];
}

export default function ResultPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const reduce = useReducedMotionConfig();
  const [profile] = usePersistentStore(profileV3Store);
  const [hunt] = usePersistentStore(huntModeStore);
  const [onboarding] = usePersistentStore(onboardingStore);
  const [tester] = usePersistentStore(testerStore);
  const [prefs] = usePersistentStore(mySpacePrefsStore);
  const [draft, setDraftState] = useState<Draft>(() => draftFromState(location.state) ?? initialDraft(profile, hunt, onboarding.done));
  const [editing, setEditing] = useState<null | 'explore' | 'hunt'>(null);
  const [edit, setEdit] = useState<Draft>(draft);
  const [stamped, setStamped] = useState<string | null>(null);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const name = tester.name.trim();
  const ready = draft.ranking.length > 0 && Boolean(draft.mode && draft.region);

  const setDraft = (d: Draft) => {
    setDraftState(d);
    navigate(location.pathname, { replace: true, state: { draft: d } });
  };
  const open = (which: 'explore' | 'hunt') => {
    setEdit(draft);
    setEditing(which);
  };
  const save = () => {
    setDraft(edit);
    setEditing(null);
  };

  const stamp = () => {
    if (!ready || stamped) return;
    finishTourismOnboarding({ ranking: draft.ranking, mode: draft.mode, region: draft.region });
    if (prefs.haptics) navigator.vibrate?.(30);
    setStamped(localDate());
    timer.current = window.setTimeout(() => navigate(paths.today), reduce ? 0 : STAMP_MS);
  };

  return (
    <AppShell chrome="none" background="var(--bg-app)">
      <div className={styles.screen}>
        <div className={styles.question}>
          <ProgressHeader step={3} onBack={() => navigate(`${paths.welcome}?step=2`, { state: { draft } })} />
          <div className={`${styles.head} ${styles.headCenter}`}>
            <h1 className={styles.title}>{name ? `You’re all set, ${name}` : 'You’re all set'}</h1>
            <p className={styles.sub}>Tap a line to change it. Everything is editable later.</p>
          </div>

          <section className={styles.passport} aria-label="Your passport">
            <div className={styles.passportTop}>
              <span className={styles.avatar} aria-hidden="true">
                {holderInitial(name || 'W')}
              </span>
              <div className={styles.holder}>
                <span className={styles.holderName}>{name || 'Your passport'}</span>
                <span className={styles.holderLine}>FINDSG · SINGAPORE</span>
              </div>
              <StampRing date={stamped ?? localDate()} landed={stamped !== null} />
            </div>
            <div className={styles.lines}>
              <button
                type="button"
                className={styles.line}
                onClick={() => open('explore')}
                aria-label={`Explore: ${draft.ranking.length ? draft.ranking.map((c) => TOURISM_INFO[c].label).join(', ') : 'nothing picked'}. Change`}
              >
                <span className={styles.lineLabel}>Explore</span>
                <span className={styles.linePills}>
                  {draft.ranking.length ? (
                    draft.ranking.map((c) => (
                      <span key={c} className={styles.pill} style={{ background: `var(--cat-${c}-tint)`, color: `var(--cat-${c}-ink)` }}>
                        {TOURISM_INFO[c].label}
                      </span>
                    ))
                  ) : (
                    <span className={styles.lineEmpty}>Pick at least one</span>
                  )}
                </span>
                <Icon name="chevron" size={16} className={styles.lineChevron} />
              </button>
              <button
                type="button"
                className={styles.line}
                onClick={() => open('hunt')}
                aria-label={`Hunt: ${draft.region ? REGION_NAMES[draft.region] : 'no region'}, ${
                  draft.mode === 'together' ? 'hunting together' : draft.mode === 'solo' ? 'on your own' : 'no mode'
                }. Change`}
              >
                <span className={styles.lineLabel}>Hunt</span>
                <span className={styles.linePills}>
                  {draft.region ? (
                    <span className={`${styles.pill} ${styles.pillDark}`}>
                      <Icon name="plane" size={10} fill="currentColor" className={styles.pillIcon} />
                      {REGION_NAMES[draft.region]}
                    </span>
                  ) : null}
                  {draft.mode ? (
                    <span className={`${styles.pill} ${draft.mode === 'together' ? styles.pillTogether : styles.pillSolo}`}>
                      {draft.mode === 'together' ? 'Hunting together' : 'On your own'}
                    </span>
                  ) : null}
                  {!draft.mode || !draft.region ? <span className={styles.lineEmpty}>Pick a mode and a region</span> : null}
                </span>
                <Icon name="chevron" size={16} className={styles.lineChevron} />
              </button>
            </div>
          </section>

          <section aria-labelledby="next-title">
            <h2 id="next-title" className={styles.nextTitle}>
              What happens next
            </h2>
            <ul className={styles.next}>
              {nextCards(draft).map((n, i) => (
                <motion.li
                  key={n.title}
                  className={styles.nextCard}
                  initial={reduce ? false : { y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={reduce ? { duration: 0 } : { delay: 0.1 + i * 0.05 }}
                >
                  <span className={`${styles.nextIcon} ${n.tone}`} aria-hidden="true">
                    <Icon name={n.icon} size={18} />
                  </span>
                  <span className={styles.nextName}>{n.title}</span>
                  <span className={styles.nextSub}>{n.sub}</span>
                </motion.li>
              ))}
            </ul>
          </section>

          <div className={styles.footer}>
            <button type="button" className={stamped ? `${styles.primary} ${styles.done}` : styles.primary} onClick={stamp} disabled={!ready || stamped !== null}>
              {stamped ? 'Stamped' : 'Stamp my passport'} <Icon name={stamped ? 'check' : 'arrow'} size={18} className={styles.arrow} />
            </button>
          </div>
          <p className={styles.srOnly} role="status">
            {stamped ? `Passport stamped ${sealDate(stamped)}. Opening Home.` : ''}
          </p>
        </div>
      </div>

      {editing === 'explore' ? (
        <Sheet title="What would you like to explore?" onCancel={() => setEditing(null)} onSave={save} canSave={edit.ranking.length > 0}>
          <TourismRanker value={edit.ranking} onChange={(ranking) => setEdit({ ...edit, ranking })} />
        </Sheet>
      ) : null}
      {editing === 'hunt' ? (
        <Sheet title="Hunt with others nearby?" onCancel={() => setEditing(null)} onSave={save} canSave={Boolean(edit.mode && edit.region)}>
          <HuntStepEditor mode={edit.mode} region={edit.region} onMode={(mode) => setEdit({ ...edit, mode })} onRegion={(region) => setEdit({ ...edit, region })} />
        </Sheet>
      ) : null}
    </AppShell>
  );
}
