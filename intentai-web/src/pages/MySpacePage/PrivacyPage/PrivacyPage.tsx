import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Toggle from '../../../components/Toggle/Toggle';
import { useLocationFlow } from '../../../features/nearby/components/LocationFlow';
import { usePersistentStore } from '../../../data/persistentStore';
import type { PermState, Preferences } from '../../../data/preferences';
import { clearGroup, exportJson, formatBytes, useStorageReport, type ClearableGroup, type StorageGroup } from '../../../data/storage';
import { deleteAllData, placeStoriesStore, preferencesStore, questionsStore } from '../../../data/stores';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { showToast } from '../../../hooks/useToast';
import { paths } from '../../../routes';
import { tracker } from '../../../usage/appTracker';
import MySpaceLayout from '../MySpaceLayout/MySpaceLayout';
import { SEGMENTS } from '../PrivacyCard/PrivacyCard';
import { passportStats } from '../stats';
import { Download, Lock } from '../icons';
import HoldToDelete from './HoldToDelete/HoldToDelete';
import styles from './PrivacyPage.module.css';

export const EXPORT_MS = 1400;
const FILE = 'intentai-data.json';

type PermKey = keyof Preferences['permissions'];
const PERMS: { key: PermKey; label: string; used: string; states: readonly [string, string] }[] = [
  { key: 'calendar', label: 'Calendar', used: 'Titles only, for occasions', states: ['Titles only', 'Off'] },
  { key: 'notifications', label: 'Notifications', used: 'Local answers and recaps', states: ['On', 'Off'] },
  { key: 'camera', label: 'Camera', used: 'Photos for Ask a local', states: ['Ask each time', 'Never'] },
];

function PermTile({ label, used, state, on, onTap }: { label: string; used: string; state: string; on: boolean; onTap: () => void }) {
  return (
    <button type="button" className={`${styles.perm} ${on ? styles.permOn : ''}`} onClick={onTap} aria-label={`${label}: ${state}. ${used}`}>
      <span className={styles.permTop}>
        <span className={styles.permChip} aria-hidden="true">
          {label[0]}
        </span>
        <span className={styles.pill}>
          <span className={styles.pillDot} aria-hidden="true" />
          {state}
        </span>
      </span>
      <span className={styles.permLabel}>{label}</span>
      <span className={styles.permUsed}>{used}</span>
    </button>
  );
}

function download(json: string) {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = FILE;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function DeletedDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return undefined;
    if (!dialog.open) dialog.showModal();
    ctaRef.current?.focus();
    // No way back to data that no longer exists: Escape does nothing.
    const cancel = (e: Event) => e.preventDefault();
    dialog.addEventListener('cancel', cancel);
    return () => dialog.removeEventListener('cancel', cancel);
  }, []);
  return (
    <dialog ref={ref} className={styles.deleted} aria-labelledby="deleted-title">
      <span className={styles.check} aria-hidden="true">
        ✓
      </span>
      <h2 id="deleted-title" className={styles.deletedTitle}>
        Everything is deleted
      </h2>
      <p className={styles.deletedBody}>This phone no longer holds any of your IntentAI data.</p>
      <button ref={ctaRef} type="button" className={styles.cta} onClick={() => navigate(paths.onboarding)}>
        Make a new passport
      </button>
    </dialog>
  );
}

/** Canvas S3: permissions, what is stored (with Clear and Undo), what leaves the phone, export and delete. */
export default function PrivacyPage() {
  const [prefs, setPrefs] = usePersistentStore(preferencesStore);
  const [stories] = usePersistentStore(placeStoriesStore);
  const [questions] = usePersistentStore(questionsStore);
  const { bytes, empty } = useStorageReport();
  const location = useLocationFlow();
  const reduced = useReducedMotion();
  const [exporting, setExporting] = useState<'idle' | 'running' | 'done'>('idle');
  const [deleted, setDeleted] = useState(false);
  const [clearedHere, setClearedHere] = useState<ClearableGroup[]>([]);
  const exportTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(exportTimer.current), []);

  const stats = passportStats(stories, questions);
  const rows: { group: StorageGroup; label: string; sub: string }[] = [
    { group: 'passport', label: 'Passport & cards', sub: `${stats.stamps} stamps · ${stats.cards} cards` },
    { group: 'ask', label: 'Ask chats', sub: 'Saved answers and history' },
    { group: 'community', label: 'Community', sub: `${questions.length} questions` },
    { group: 'profile', label: 'Profile & settings', sub: 'What the app knows' },
  ];
  const color = Object.fromEntries(SEGMENTS) as Record<string, string>;
  const total = bytes.total || 1;

  const tapPerm = (key: PermKey, label: string, states: readonly [string, string]) => {
    const next = (1 - prefs.permissions[key]) as PermState;
    setPrefs((p) => ({ ...p, permissions: { ...p.permissions, [key]: next } }));
    showToast(`${label}: ${states[next]}`);
  };

  const clear = (group: ClearableGroup, label: string) => {
    const undo = clearGroup(group);
    setClearedHere((c) => [...c, group]);
    showToast(`${label} cleared`, { undo });
  };

  const startExport = () => {
    if (exporting === 'running') return;
    setExporting('running');
    exportTimer.current = window.setTimeout(
      () => {
        download(exportJson());
        setExporting('done');
        showToast(`${FILE} is ready`);
      },
      reduced ? 0 : EXPORT_MS,
    );
  };

  const deleteAll = () => {
    deleteAllData();
    // Open timings and queued taps from before the delete must not be written back.
    tracker.discard();
    setDeleted(true);
  };

  return (
    <MySpaceLayout subPage={{ title: 'Privacy & data' }}>
      <div className={styles.body}>
        <section aria-label="Summary" className={styles.summary}>
          <span className={styles.lock} aria-hidden="true">
            <Lock />
          </span>
          <span>
            <span className={styles.summaryTitle}>Your data stays on this phone</span>
            <span className={styles.summaryBody}>Only questions you post to Community, and anonymous page timing while it is on, leave it, never your name or location.</span>
          </span>
        </section>

        <h2 className={styles.heading}>Permissions</h2>
        <div className={styles.perms}>
          <PermTile
            label="Location"
            used="Nearby and check-ins"
            state={location.enabled ? 'While using' : 'Never'}
            on={location.enabled}
            onTap={() => {
              if (location.enabled) {
                location.turnOff();
                showToast('Location: Never');
              } else location.start();
            }}
          />
          {PERMS.map(({ key, label, used, states }) => (
            <PermTile key={key} label={label} used={used} state={states[prefs.permissions[key]]} on={prefs.permissions[key] === 0} onTap={() => tapPerm(key, label, states)} />
          ))}
        </div>
        {location.dialog}

        <div className={styles.headingRow}>
          <h2 className={styles.heading}>Stored on this phone</h2>
          <span className={styles.total}>{formatBytes(bytes.total)}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.bar} aria-hidden="true">
            {SEGMENTS.filter(([key]) => bytes[key] > 0).map(([key, c]) => (
              <span key={key} style={{ width: `${(bytes[key] / total) * 100}%`, background: c }} />
            ))}
          </span>
          {rows.map(({ group, label, sub }) => {
            const isEmpty = group !== 'profile' && empty[group];
            const note = group !== 'profile' && clearedHere.includes(group) ? 'Cleared' : 'Nothing stored';
            return (
              <div key={group} className={styles.store}>
                <span className={styles.storeChip} style={{ background: color[group], opacity: isEmpty ? 0.35 : 1 }} aria-hidden="true" />
                <span className={styles.storeText}>
                  <span className={styles.storeLabel}>{label}</span>
                  <span className={styles.storeSub}>{isEmpty ? note : sub}</span>
                </span>
                <span className={styles.size}>{formatBytes(bytes[group])}</span>
                {group !== 'profile' && !isEmpty && (
                  <button type="button" className={styles.clear} aria-label={`Clear ${label}`} onClick={() => clear(group, label)}>
                    Clear
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <h2 className={styles.heading}>What leaves the phone</h2>
        <div className={styles.card}>
          <div className={styles.leave}>
            <span className={styles.storeText}>
              <span className={styles.storeLabel}>Questions you post</span>
              <span className={styles.storeSub}>Text and place only, never your name</span>
            </span>
            <span className={styles.always}>Always</span>
          </div>
          <div className={styles.leave}>
            <span className={styles.storeText}>
              <span className={styles.storeLabel}>Anonymous page timing</span>
              <span className={styles.storeSub}>
                How long screens stay open, never what you type · {formatBytes(bytes.timing)} on this phone
              </span>
            </span>
            <Toggle label="Anonymous page timing" checked={prefs.usageTiming} onChange={(usageTiming) => setPrefs((p) => ({ ...p, usageTiming }))} />
          </div>
        </div>

        <h2 className={styles.heading}>Your copy</h2>
        <button type="button" className={`${styles.export} ${exporting === 'running' ? styles.exporting : ''}`} onClick={startExport} aria-busy={exporting === 'running'}>
          <span className={styles.exportFill} aria-hidden="true" />
          <span className={styles.exportChip} aria-hidden="true">
            <Download />
          </span>
          <span className={styles.storeText}>
            <span className={styles.storeLabel}>
              {exporting === 'running' ? 'Preparing your file…' : exporting === 'done' ? 'Export ready' : 'Export my data'}
            </span>
            <span className={styles.storeSub}>
              {exporting === 'done' ? `${FILE} · ${formatBytes(bytes.total)} · tap to export again` : 'One file you can keep or move to a new phone'}
            </span>
          </span>
        </button>

        <h2 className={`${styles.heading} ${styles.danger}`}>Delete</h2>
        <div className={styles.deleteCard}>
          <p className={styles.deleteCopy}>Removes your passport, stamps, cards, chats, questions and settings from this phone. This can’t be undone.</p>
          <HoldToDelete onDelete={deleteAll} />
        </div>
      </div>
      {deleted && <DeletedDialog />}
    </MySpaceLayout>
  );
}
