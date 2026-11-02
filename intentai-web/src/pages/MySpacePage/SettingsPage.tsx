// My Space v3 S2 · Settings: notification choices (kept on this phone; the app sends none), language and home base
// with the same editors as onboarding, look & feel (Reduce motion = the app-wide reduceMotionStore, captions, haptics),
// and links to Privacy & data, photo credits and feedback. From PR #5: Text size (applied app-wide), Nearby radius (Explore's
// default), Today's topics, Terms & licences as a page, and notification switches that wait for their My Space switch.
import { motion, useReducedMotionConfig } from 'motion/react';
import { openHelp } from '../../components/HelpCenter/helpStore';
import { useId, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AppShell from '../../components/AppShell/AppShell';
import { categoryLabel } from '../../data/culture';
import { canonicalPrefs } from '../../data/culturePrefs';
import { usePersistentStore } from '../../data/persistentStore';
import { areaById } from '../../data/profile/finds';
import {
  TEXT_SCALE,
  TEXT_SIZES,
  TEXT_SIZE_LABELS,
  languageOf,
  mySpacePrefsStore,
  profileV3Store,
  type FieldKey,
  type MySpacePrefs,
} from '../../data/profile/profile';
import { formatBytes, totalBytes } from '../../data/profile/storage';
import { culturePrefsStore, reduceMotionStore, settingsStore } from '../../data/stores';
import { RADII_M } from '../../features/nearby/types';
import { showToast } from '../../hooks/useToast';
import { paths } from '../../routes';
import Icon, { type IconName } from '../OnboardingPage/v3/icons';
import FieldEditor from './v3/FieldEditor';
import MemorySection from './v3/MemorySection';
import { SubHeader, Switch } from './v3/Parts';
import styles from './v3/MySpace.module.css';

type NotifyKey = keyof MySpacePrefs['notify'];
export const NEEDS_OCCASIONS = 'Turn on Flag occasions in My Space first';
export const NEEDS_LOCAL = 'Turn on Answer as a local in My Space first';
export const TEXT_PREVIEW = 'Bak kwa is sweet, smoky dried pork, grilled over charcoal.';
const km = (m: number) => `${m / 1000} km`;

const NOTIFY: { key: NotifyKey; icon: IconName; title: string; sub: string }[] = [
  { key: 'localAnswers', icon: 'chat', title: 'Local answers', sub: 'When a local answers your question' },
  { key: 'recaps', icon: 'cards', title: 'Recap reminders', sub: 'A 1-minute recap of your cards' },
  { key: 'occasions', icon: 'calendar', title: 'Occasions', sub: 'Needs Flag occasions in My Space' },
  { key: 'nearYou', icon: 'pin', title: 'Questions near you', sub: 'Only while Answer as a local is on' },
];

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className={styles.segmented} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} className={styles.segment} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function MotionPreview({ reduced }: { reduced: boolean }) {
  const reduce = useReducedMotionConfig();
  return (
    <span className={styles.motionPreview} aria-hidden="true">
      <motion.span
        className={styles.motionDot}
        animate={reduced || reduce ? { x: 0 } : { x: [0, 22, 0] }}
        transition={reduced || reduce ? { duration: 0 } : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />
    </span>
  );
}

export default function SettingsPage() {
  const [prefs, setPrefs] = usePersistentStore(mySpacePrefsStore);
  const [reduceMotion, setReduceMotion] = usePersistentStore(reduceMotionStore);
  const [settings] = usePersistentStore(settingsStore);
  const [profile] = usePersistentStore(profileV3Store);
  const [culture] = usePersistentStore(culturePrefsStore);
  const [editing, setEditing] = useState<FieldKey | null>(null);
  const radiusId = useId();
  const sizeId = useId();
  const [params] = useSearchParams();
  const language = languageOf(profile.language);
  const base = areaById(profile.base);

  const setNotify = (key: NotifyKey, on: boolean) => setPrefs((p) => ({ ...p, notify: { ...p.notify, [key]: on } }));
  // A notification that needs a My Space switch waits for it: shown off and unavailable, with the reason.
  const blocked: Partial<Record<NotifyKey, string>> = {
    ...(settings.occasions ? {} : { occasions: NEEDS_OCCASIONS }),
    ...(settings.local ? {} : { nearYou: NEEDS_LOCAL }),
  };
  const radiusIndex = Math.max(0, RADII_M.indexOf(prefs.radiusM));
  const topics = canonicalPrefs(culture.categories).categories.map(categoryLabel).join(', ');

  return (
    <AppShell background="#edebe5">
      <div className={styles.screen}>
        <SubHeader />
        <h1 className={styles.pageTitle}>Settings</h1>

        <h2 className={styles.kicker}>Notifications</h2>
        <div className={styles.card}>
          {NOTIFY.map((n) => {
            const needs = blocked[n.key];
            return (
              <div key={n.key} className={styles.switchRow}>
                <span className={styles.rowIcon}>
                  <Icon name={n.icon} size={18} />
                </span>
                <span className={styles.rowText}>
                  <span className={styles.rowTitle}>{n.title}</span>
                  <span className={needs ? `${styles.rowSub} ${styles.blockedHint}` : styles.rowSub} id={`hint-${n.key}`}>
                    {needs ?? (n.key === 'occasions' ? 'Flag occasions is on' : n.key === 'nearYou' ? 'Answer as a local is on' : n.sub)}
                  </span>
                </span>
                <Switch
                  label={n.title}
                  describedBy={`hint-${n.key}`}
                  checked={!needs && prefs.notify[n.key]}
                  disabled={!!needs}
                  onBlocked={() => showToast(needs!)}
                  onChange={(on) => setNotify(n.key, on)}
                />
              </div>
            );
          })}
          <div className={styles.rowPad}>
            <Segmented
              label="When"
              value={prefs.notifyTime}
              options={[
                { id: 'morning', label: 'Morning' },
                { id: 'evening', label: 'Evening' },
              ]}
              onChange={(notifyTime) => setPrefs((p) => ({ ...p, notifyTime }))}
            />
          </div>
        </div>

        <h2 className={styles.kicker}>Language & place</h2>
        <div className={styles.card}>
          <button type="button" className={styles.row} onClick={() => setEditing('language')}>
            <span className={`${styles.rowIcon} ${styles.rowIconBlue}`} lang={language?.lang}>
              {language?.mark ?? 'EN'}
            </span>
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>Language</span>
              {language && language.id !== 'en' && <span className={styles.rowSub}>Cards in English for now</span>}
            </span>
            <span className={styles.rowValue} lang={language?.lang}>
              {language?.name ?? 'English'}
            </span>
            <Icon name="chevron" size={18} className={styles.rowChevron} />
          </button>
          <button type="button" className={styles.row} onClick={() => setEditing('base')}>
            <span className={styles.rowIcon}>
              <Icon name="pin" size={18} />
            </span>
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>Home base</span>
            </span>
            <span className={styles.rowValue}>{base ? base.name.split(/\s*[&,]\s*/)[0] : 'Not set'}</span>
            <Icon name="chevron" size={18} className={styles.rowChevron} />
          </button>
          <div className={styles.rowPad}>
            <div className={styles.sliderHead}>
              <span className={styles.rowIcon}>
                <Icon name="radius" size={18} />
              </span>
              <label htmlFor={radiusId} className={styles.rowTitle}>
                Nearby radius
              </label>
              <span className={styles.rowValue}>{km(prefs.radiusM)}</span>
            </div>
            <input
              id={radiusId}
              type="range"
              className={styles.range}
              min={0}
              max={RADII_M.length - 1}
              step={1}
              value={radiusIndex}
              aria-valuetext={`${prefs.radiusM / 1000} kilometres`}
              aria-describedby={`${radiusId}-hint`}
              onChange={(e) => setPrefs((p) => ({ ...p, radiusM: RADII_M[Number(e.target.value)] ?? p.radiusM }))}
            />
            <span className={styles.rangeTicks} aria-hidden="true">
              {RADII_M.map((r) => (
                <span key={r}>{km(r)}</span>
              ))}
            </span>
            <span className={styles.rowSub} id={`${radiusId}-hint`}>
              How far Nearby searches around you or your home base
            </span>
          </div>
          <button type="button" className={styles.row} onClick={() => setEditing('topics')}>
            <span className={styles.rowIcon}>
              <Icon name="star" size={18} />
            </span>
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>Today’s topics</span>
              <span className={styles.rowSub}>{topics}</span>
            </span>
            <Icon name="chevron" size={18} className={styles.rowChevron} />
          </button>
        </div>

        <MemorySection highlight={params.get('section') === 'memory'} />

        <h2 className={styles.kicker}>Look & feel</h2>
        <div className={styles.card}>
          <div className={styles.rowPad}>
            <div className={styles.inlineHead}>
              <span className={styles.rowIcon}>
                <Icon name="motion" size={18} />
              </span>
              <span className={styles.rowTitle}>Motion</span>
              <MotionPreview reduced={reduceMotion} />
            </div>
            <Segmented
              label="Motion"
              value={reduceMotion ? 'reduced' : 'full'}
              options={[
                { id: 'full', label: 'Full' },
                { id: 'reduced', label: 'Reduced' },
              ]}
              onChange={(v) => setReduceMotion(v === 'reduced')}
            />
          </div>
          <div className={styles.rowPad}>
            <div className={styles.sliderHead}>
              <span className={styles.rowIcon}>
                <Icon name="text" size={18} />
              </span>
              <label htmlFor={sizeId} className={styles.rowTitle}>
                Text size
              </label>
              <span className={styles.rowValue}>{TEXT_SIZE_LABELS[prefs.textSize]}</span>
            </div>
            <input
              id={sizeId}
              type="range"
              className={styles.range}
              min={0}
              max={TEXT_SIZES.length - 1}
              step={1}
              value={prefs.textSize}
              aria-valuetext={TEXT_SIZE_LABELS[prefs.textSize]}
              onChange={(e) => {
                const textSize = TEXT_SIZES[Number(e.target.value)];
                if (textSize !== undefined) setPrefs((p) => ({ ...p, textSize }));
              }}
            />
            {/* Root-relative, so it shows the new size even before the page reflows around it. */}
            <p className={styles.textPreview} data-testid="text-preview" style={{ fontSize: `${0.9375 * TEXT_SCALE[prefs.textSize]}rem` }}>
              {TEXT_PREVIEW}
            </p>
          </div>
          <div className={styles.switchRow}>
            <span className={styles.rowIcon}>
              <Icon name="captions" size={18} />
            </span>
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>Captions on videos</span>
              <span className={styles.rowSub} id="hint-captions">
                {prefs.captions ? 'Shown by default' : 'Off by default'}
              </span>
            </span>
            <Switch label="Captions on videos" describedBy="hint-captions" checked={prefs.captions} onChange={(captions) => setPrefs((p) => ({ ...p, captions }))} />
          </div>
          <div className={styles.switchRow}>
            <span className={styles.rowIcon}>
              <Icon name="vibrate" size={18} />
            </span>
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>Haptics</span>
              <span className={styles.rowSub} id="hint-haptics">
                Light taps on stamps, where the phone supports it
              </span>
            </span>
            <Switch label="Haptics" describedBy="hint-haptics" checked={prefs.haptics} onChange={(haptics) => setPrefs((p) => ({ ...p, haptics }))} />
          </div>
        </div>

        <h2 className={styles.kicker}>Onboarding</h2>
        <div className={styles.card}>
          <Link to={`${paths.welcome}?step=1`} className={styles.row}>
            <span className={styles.rowIcon}>
              <Icon name="redo" size={18} />
            </span>
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>Redo onboarding</span>
              <span className={styles.rowSub}>Your answers are kept; change any of them. Leave any time with ✕.</span>
            </span>
            <Icon name="chevron" size={18} className={styles.rowChevron} />
          </Link>
        </div>

        <h2 className={styles.kicker}>More</h2>
        <nav className={styles.card} aria-label="More">
          <Link to={paths.mySpacePrivacy} className={styles.row}>
            <span className={styles.rowIcon}>
              <Icon name="shield" size={18} />
            </span>
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>Privacy & data</span>
            </span>
            <span className={styles.rowValue}>{formatBytes(totalBytes())}</span>
            <Icon name="chevron" size={18} className={styles.rowChevron} />
          </Link>
          <Link to={paths.licences} className={styles.row}>
            <span className={styles.rowIcon}>
              <Icon name="book" size={18} />
            </span>
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>Terms & licences</span>
              <span className={styles.rowSub}>Photo credits</span>
            </span>
            <Icon name="chevron" size={18} className={styles.rowChevron} />
          </Link>
          <button type="button" className={styles.row} onClick={() => openHelp('feedback')}>
            <span className={styles.rowIcon}>
              <Icon name="help" size={18} />
            </span>
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>Send feedback</span>
            </span>
            <Icon name="chevron" size={18} className={styles.rowChevron} />
          </button>
        </nav>
        <p className={styles.footerNote}>FindSG · beta</p>
      </div>
      {editing && <FieldEditor field={editing} profile={profile} onClose={() => setEditing(null)} />}
    </AppShell>
  );
}
