// Settings: language and home base with the same editors as onboarding, look & feel (Reduce motion = the app-wide
// reduceMotionStore, captions, haptics), and links to Privacy & data, photo credits and feedback. From PR #5: Text size
// (applied app-wide), Nearby radius (Explore's default) and Terms & licences as a page.
import { motion, useReducedMotionConfig } from 'motion/react';
import { openHelp } from '../../components/HelpCenter/helpStore';
import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../../components/AppShell/AppShell';
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
} from '../../data/profile/profile';
import { formatBytes, totalBytes } from '../../data/profile/storage';
import { reduceMotionStore, restartTest, testerStore, versionOf } from '../../data/stores';
import { USER_GATE_ENABLED } from '../../components/UserGate/UserGate';
import { RADII_M } from '../../features/nearby/types';
import { paths } from '../../routes';
import Icon from '../OnboardingPage/v3/icons';
import FieldEditor from './v3/FieldEditor';
import { Kraft, SubHeader, Switch } from './v3/Parts';
import book from './v3/Booklet.module.css';
import styles from './v3/MySpace.module.css';

export const TEXT_PREVIEW = 'Bak kwa is sweet, smoky dried pork, grilled over charcoal.';
const km = (m: number) => `${m / 1000} km`;

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
  const [profile] = usePersistentStore(profileV3Store);
  const [editing, setEditing] = useState<FieldKey | null>(null);
  const radiusId = useId();
  const sizeId = useId();
  const language = languageOf(profile.language);
  const base = areaById(profile.base);

  const radiusIndex = Math.max(0, RADII_M.indexOf(prefs.radiusM));

  return (
    <AppShell background="#c8a87a" chrome="status">
      <Kraft />
      <div className={`${styles.screen} ${book.screen} ${styles.kraft}`}>
        <SubHeader title="Settings" />

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
        </div>

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

        <h2 className={styles.kicker}>More</h2>
        <nav className={styles.card} aria-label="More">
          <Link to={`${paths.welcome}?step=1`} className={styles.row}>
            <span className={styles.rowIcon}>
              <Icon name="redo" size={18} />
            </span>
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>Redo onboarding</span>
            </span>
            <Icon name="chevron" size={18} className={styles.rowChevron} />
          </Link>
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
        {USER_GATE_ENABLED && <RestartTest />}
      </div>
      {editing && <FieldEditor field={editing} profile={profile} onClose={() => setEditing(null)} />}
    </AppShell>
  );
}

/** User test only: wipe this phone and go back to the start screen for the next person. Asks once before it clears. */
function RestartTest() {
  const [tester] = usePersistentStore(testerStore);
  const [sure, setSure] = useState(false);
  return (
    <>
      <h2 className={styles.kicker}>User test</h2>
      <div className={styles.card}>
        {sure ? (
          <div className={styles.row}>
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>Clear this phone?</span>
              <span className={styles.rowSub}>Visits, stamps and settings go. The next person starts fresh.</span>
            </span>
            <button type="button" className={styles.restartNo} onClick={() => setSure(false)}>
              Keep
            </button>
            <button type="button" className={styles.restartYes} onClick={restartTest}>
              Restart
            </button>
          </div>
        ) : (
          <button type="button" className={styles.row} onClick={() => setSure(true)}>
            <span className={styles.rowIcon}>
              <Icon name="redo" size={18} />
            </span>
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>Restart test</span>
              {tester.name && <span className={styles.rowSub}>{`${tester.name} · version ${versionOf(tester)}`}</span>}
            </span>
            <Icon name="chevron" size={18} className={styles.rowChevron} />
          </button>
        )}
      </div>
    </>
  );
}
