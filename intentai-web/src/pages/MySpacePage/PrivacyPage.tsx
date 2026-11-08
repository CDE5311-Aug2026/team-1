// Privacy & data (Redesign v2, board 20; was My Space v3 S3): permissions this app actually uses, what is stored on this phone per area with real
// sizes (Clear with Undo), what leaves the phone (with PR #5's page-timing switch), export a copy, and "Hold to delete all
// my data".
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/AppShell/AppShell';
import { allStamps } from '../../data/moments/moments';
import { usePersistentStore } from '../../data/persistentStore';
import { huntVisits } from '../../data/moments/huntVisits';
import { clearProfileData, localDate, mySpacePrefsStore } from '../../data/profile/profile';
import { STORAGE_AREAS, areaBytes, clearArea, exportData, formatBytes, totalBytes, type StorageAreaId } from '../../data/profile/storage';
import {
  askThreadsStore,
  deleteAllData,
  explorePersonalStore,
  insightsStore,
  openedCardsStore, placeStoriesStore,
  questionsStore,
  settingsStore,
  tipsStore,
} from '../../data/stores';
import { showToast } from '../../hooks/useToast';
import { paths } from '../../routes';
import { tracker } from '../../usage/appTracker';
import Icon from '../OnboardingPage/v3/icons';
import { RowIcon, Section } from './SettingsParts';
import { Kraft, SubHeader, Switch } from './v3/Parts';
import book from './v3/Booklet.module.css';
import StorageBar, { AREA_LOOK } from './v3/StorageBar';
import styles from './v3/MySpace.module.css';
import { searchRecentStore } from '../../data/v2Stores';

/** Board 20: each storage area keeps its tinted icon square. */
const AREA_TINT: Record<StorageAreaId, string> = {
  passport: styles.tAtt,
  ask: styles.tLei,
  community: styles.tCru,
  search: styles.tWel,
  profile: styles.tPurple,
};

/** How long "Hold to delete" must be held. */
export const HOLD_MS = 1600;

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function HoldToDelete({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const start = useRef<number | null>(null);
  const frame = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = () => {
    start.current = null;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    if (timer.current !== null) clearTimeout(timer.current);
    frame.current = null;
    timer.current = null;
    setProgress(0);
  };

  const begin = () => {
    if (start.current !== null) return;
    start.current = performance.now();
    const tick = () => {
      if (start.current === null) return;
      setProgress(Math.min(1, (performance.now() - start.current) / HOLD_MS));
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    timer.current = setTimeout(() => {
      stop();
      onDone();
    }, HOLD_MS);
  };

  useEffect(() => stop, []);

  const key = (e: KeyboardEvent, down: boolean) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (down) begin();
    else stop();
  };

  return (
    <button
      type="button"
      className={styles.hold}
      onPointerDown={begin}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => key(e, true)}
      onKeyUp={(e) => key(e, false)}
      onContextMenu={(e) => e.preventDefault()}
      aria-describedby="hold-hint"
    >
      <span className={styles.holdFill} style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />
      <Icon name="trash" size={18} />
      <span>Hold to delete all my data</span>
    </button>
  );
}

export default function PrivacyPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = usePersistentStore(settingsStore);
  const [personal] = usePersistentStore(explorePersonalStore);
  const [opened] = usePersistentStore(openedCardsStore);
  const [stories] = usePersistentStore(placeStoriesStore);
  const [threads] = usePersistentStore(askThreadsStore);
  const [insights] = usePersistentStore(insightsStore);
  const [questions] = usePersistentStore(questionsStore);
  const [tips] = usePersistentStore(tipsStore);
  const [prefs, setPrefs] = usePersistentStore(mySpacePrefsStore);
  const [recent] = usePersistentStore(searchRecentStore);
  // Sizes are read from storage on each render; the stores above re-render the page after a Clear.
  const total = totalBytes();
  const stamps = allStamps(personal, opened, stories).filter((s) => s.collected).length;
  const subs: Record<StorageAreaId, string> = {
    passport: `${plural(stamps, 'stamp')} · ${plural(opened.length, 'card')}`,
    ask: `${plural(threads.length, 'chat')} · ${plural(insights.length, 'saved answer')}`,
    community: `${plural(questions.length, 'question')} · ${plural(tips.length, 'local tip')}`,
    search: `${plural(recent.length, 'recent search', 'recent searches')}`,
    profile: 'What the app knows',
  };
  const sizes = STORAGE_AREAS.map((a) => areaBytes(a));

  const clear = (index: number) => {
    const area = STORAGE_AREAS[index];
    const undo = clearArea(area);
    // On-site Hunt progress is never cleared here: its stamps stay, and saying so explains why they still show.
    const kept = area.id === 'passport' && huntVisits().length > 0;
    showToast(kept ? `${area.label} cleared. Hunt check-ins stay` : `${area.label} cleared`, { undo });
  };

  const download = () => {
    const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `findsg-data-${localDate()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Your data file is ready');
  };

  const deleteAll = () => {
    const deleted = deleteAllData();
    clearProfileData();
    // Open timings and queued taps from before the delete must not be sent under the old ids.
    tracker.discard();
    navigate(paths.welcome, { replace: true });
    // Said once it is true: photos go last, and can fail.
    void deleted.then((done) => showToast(done ? 'All your data is deleted from this phone' : 'Your data is deleted, but some journal photos could not be removed'));
  };

  return (
    <AppShell background="var(--bg-app)" chrome="status">
      <Kraft />
      <div className={`${styles.screen} ${book.screen} ${styles.kraft}`}>
        <SubHeader title="Privacy & data" back={paths.mySpace} />
        <section className={styles.hero}>
          <span className={styles.heroShield} aria-hidden="true">
            <Icon name="lock" size={20} />
          </span>
          <div>
            <h2 className={styles.heroTitle}>Your data stays on this phone</h2>
            <p className={styles.heroText}>
              {prefs.usageTiming
                ? 'Nothing you type leaves it, except what you send in the Help Centre. Only anonymous page timings are sent, to improve the app.'
                : 'Nothing leaves it: anonymous page timing is off. Only what you send in the Help Centre goes out.'}{' '}
              Public hunts only change what this phone shows; your position is never sent.
            </p>
          </div>
        </section>

        <Section title="Permissions">
          <ul className={styles.permGrid}>
            <li>
              {/* Home's Near you, asking for location as the map's Locate key does (?locate=1, DiscoveryHome) */}
              <button type="button" className={styles.perm} onClick={() => navigate(`${paths.today}?lvl=near&locate=1`)}>
                <span className={styles.permTop}>
                  <span className={`${styles.permIcon} ${styles.tCru}`}>
                    <Icon name="pin" size={18} />
                  </span>
                  <span className={settings.location ? styles.permOn : styles.permOff}>{settings.location ? 'While using' : 'Off'}</span>
                </span>
                <span className={styles.rowTitle}>Location</span>
                <span className={styles.rowSub}>Near you and check-ins</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                className={styles.perm}
                aria-pressed={settings.occasions}
                onClick={() => setSettings((s) => ({ ...s, occasions: !s.occasions }))}
              >
                <span className={styles.permTop}>
                  <span className={`${styles.permIcon} ${styles.tPurple}`}>
                    <Icon name="calendar" size={18} />
                  </span>
                  <span className={settings.occasions ? styles.permOn : styles.permOff}>{settings.occasions ? 'Titles only' : 'Off'}</span>
                </span>
                <span className={styles.rowTitle}>Calendar</span>
                <span className={styles.rowSub}>Titles only, for occasions</span>
              </button>
            </li>
            <li>
              <div className={styles.perm}>
                <span className={styles.permTop}>
                  <span className={`${styles.permIcon} ${styles.tAccent}`}>
                    <Icon name="bell" size={18} />
                  </span>
                  <span className={styles.permOff}>Not used</span>
                </span>
                <span className={styles.rowTitle}>Notifications</span>
                <span className={styles.rowSub}>The app sends none yet</span>
              </div>
            </li>
            <li>
              <div className={styles.perm}>
                <span className={styles.permTop}>
                  <span className={`${styles.permIcon} ${styles.tLei}`}>
                    <Icon name="camera" size={18} />
                  </span>
                  <span className={styles.permOff}>Not used</span>
                </span>
                <span className={styles.rowTitle}>Camera</span>
                <span className={styles.rowSub}>The app doesn’t ask for it</span>
              </div>
            </li>
          </ul>
        </Section>

        <Section title="Stored on this phone" aside={<span className={styles.total}>{` · ${formatBytes(total)}`}</span>}>
          <div className={styles.card}>
            <StorageBar sizes={sizes} />
            {STORAGE_AREAS.map((a, i) => (
              <div key={a.id} className={styles.storeRow}>
                <span className={`${styles.rowIcon} ${AREA_TINT[a.id]}`} aria-hidden="true">
                  <Icon name={AREA_LOOK[a.id].icon} size={18} />
                </span>
                <span className={styles.rowText}>
                  <span className={styles.rowTitle}>{a.label}</span>
                  <span className={styles.rowSub}>{subs[a.id]}</span>
                </span>
                <span className={styles.size}>{formatBytes(sizes[i])}</span>
                {a.clear.length > 0 ? (
                  <button type="button" className={styles.clear} onClick={() => clear(i)} aria-label={`Clear ${a.label}`}>
                    Clear
                  </button>
                ) : (
                  <span className={styles.clearSpacer} aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        </Section>

        <Section title="What leaves the phone">
          <div className={styles.card}>
            <div className={styles.switchRow}>
              <span className={styles.rowText}>
                <span className={styles.rowTitle}>Anonymous page timing</span>
                <span className={styles.rowSub} id="hint-timing">
                  {prefs.usageTiming
                    ? 'We record how long you spend on each page and which buttons you press, never what you type'
                    : 'Off: nothing is sent. A copy stays on this phone for your test session'}
                </span>
              </span>
              <Switch
                label="Anonymous page timing"
                describedBy="hint-timing"
                checked={prefs.usageTiming}
                onChange={(usageTiming) => {
                  setPrefs((p) => ({ ...p, usageTiming }));
                  showToast(usageTiming ? 'Page timing on' : 'Page timing off: nothing leaves this phone');
                }}
              />
            </div>
            <div className={styles.switchRow}>
              <span className={styles.rowText}>
                <span className={styles.rowTitle}>Help Centre questions and feedback</span>
                <span className={styles.rowSub}>Sent when you tap Send: questions to answer you, feedback to the team, with the screen’s name</span>
              </span>
              <span className={styles.permOn}>When sent</span>
            </div>
            <div className={styles.switchRow}>
              <span className={styles.rowText}>
                <span className={styles.rowTitle}>Public hunts</span>
                <span className={styles.rowSub}>Only changes what this phone shows</span>
              </span>
              <span className={styles.permOff}>Never</span>
            </div>
            <div className={styles.switchRow}>
              <span className={styles.rowText}>
                <span className={styles.rowTitle}>Questions you post</span>
                <span className={styles.rowSub}>Kept on this phone in this version</span>
              </span>
              <span className={styles.permOff}>Never</span>
            </div>
          </div>
        </Section>

        <Section title="Your copy">
          <button type="button" className={styles.exportBtn} onClick={download}>
            <RowIcon icon="download" tint="cru" />
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>Export my data</span>
              <span className={styles.rowSub}>One readable file. Journal photos are not in it or in the sizes above</span>
            </span>
            <span className={styles.pillBtn} aria-hidden="true">
              Export
            </span>
          </button>
        </Section>

        <Section title="Delete">
          <div className={styles.card}>
            <p className={styles.deleteText} id="hold-hint">
              Removes your passport, stamps, Hunt progress, journal, cards, photos, chats, questions, searches and settings from this phone. This
              can’t be undone.
            </p>
            <HoldToDelete onDone={deleteAll} />
          </div>
        </Section>
      </div>
    </AppShell>
  );
}
