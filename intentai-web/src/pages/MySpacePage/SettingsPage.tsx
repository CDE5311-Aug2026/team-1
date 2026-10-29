// My Space v3 S2 · Settings: notification choices (kept on this phone; the app sends none), language and home base
// with the same editors as onboarding, look & feel (Reduce motion = the app-wide reduceMotionStore, captions, haptics),
// and links to Privacy & data, photo credits and feedback.
import { motion, useReducedMotionConfig } from 'motion/react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { V3_PHOTO_CREDITS } from '../../assets/v3/credits';
import AppShell from '../../components/AppShell/AppShell';
import { ARTICLE_IMAGES } from '../../data/articleImages';
import placePhotos from '../../data/explore/photos.json';
import { curatedPlace } from '../../features/nearby/catalogue';
import { usePersistentStore } from '../../data/persistentStore';
import { areaById } from '../../data/profile/finds';
import { languageOf, mySpacePrefsStore, profileV3Store, type FieldKey, type MySpacePrefs } from '../../data/profile/profile';
import { formatBytes, totalBytes } from '../../data/profile/storage';
import { reduceMotionStore, settingsStore } from '../../data/stores';
import { paths } from '../../routes';
import Icon, { type IconName } from '../OnboardingPage/v3/icons';
import FieldEditor from './v3/FieldEditor';
import MemorySection from './v3/MemorySection';
import { HelpDialog, SubHeader, Switch } from './v3/Parts';
import Sheet from './v3/Sheet';
import styles from './v3/MySpace.module.css';

type NotifyKey = keyof MySpacePrefs['notify'];
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

function CreditsSheet({ onClose }: { onClose: () => void }) {
  const photos = Object.values(ARTICLE_IMAGES);
  return (
    <Sheet title="Terms & licences" subtitle="Photos used in the app and their licences" icon={<Icon name="book" size={20} />} onClose={onClose}>
      <ul className={styles.credits}>
        {photos.map((p) => (
          <li key={p.url}>
            <span className={styles.creditSubject}>{p.alt}</span>
            <a href={p.url} target="_blank" rel="noreferrer">
              {p.credit}
            </a>
          </li>
        ))}
        {V3_PHOTO_CREDITS.map((c) => (
          <li key={c.file}>
            <span className={styles.creditSubject}>{c.subject}</span>
            <span>{c.credit}</span>
          </li>
        ))}
        <li>
          <span className={styles.creditSubject}>Map picture</span>
          <span>© OpenStreetMap contributors</span>
        </li>
        {Object.entries((placePhotos as { photos: Record<string, { credit: string; source: string }> }).photos).map(([id, p]) => (
          <li key={id}>
            <span className={styles.creditSubject}>{curatedPlace(id)?.name ?? id}</span>
            <a href={p.source} target="_blank" rel="noreferrer">
              {p.credit}, via Wikimedia Commons
            </a>
          </li>
        ))}
        <li>
          <span className={styles.creditSubject}>Community avatars</span>
          <a href="https://www.dicebear.com/styles/notionists/" target="_blank" rel="noreferrer">
            DiceBear “Notionists” by Zoish · CC0 1.0
          </a>
        </li>
        <li>
          <span className={styles.creditSubject}>Demo community</span>
          <span>This demo build shows illustrative community members, questions and activity.</span>
        </li>
      </ul>
      <button type="button" className={styles.save} onClick={onClose}>
        Done
      </button>
    </Sheet>
  );
}

export default function SettingsPage() {
  const [prefs, setPrefs] = usePersistentStore(mySpacePrefsStore);
  const [reduceMotion, setReduceMotion] = usePersistentStore(reduceMotionStore);
  const [settings] = usePersistentStore(settingsStore);
  const [profile] = usePersistentStore(profileV3Store);
  const [editing, setEditing] = useState<FieldKey | null>(null);
  const [credits, setCredits] = useState(false);
  const [help, setHelp] = useState(false);
  const [params] = useSearchParams();
  const language = languageOf(profile.language);
  const base = areaById(profile.base);

  const setNotify = (key: NotifyKey, on: boolean) => setPrefs((p) => ({ ...p, notify: { ...p.notify, [key]: on } }));

  return (
    <AppShell background="#edebe5">
      <div className={styles.screen}>
        <SubHeader />
        <h1 className={styles.pageTitle}>Settings</h1>

        <h2 className={styles.kicker}>Notifications</h2>
        <div className={styles.card}>
          {NOTIFY.map((n) => (
            <div key={n.key} className={styles.switchRow}>
              <span className={styles.rowIcon}>
                <Icon name={n.icon} size={18} />
              </span>
              <span className={styles.rowText}>
                <span className={styles.rowTitle}>{n.title}</span>
                <span className={styles.rowSub} id={`hint-${n.key}`}>
                  {n.key === 'occasions' && settings.occasions ? 'Flag occasions is on' : n.key === 'nearYou' && settings.local ? 'Answer as a local is on' : n.sub}
                </span>
              </span>
              <Switch label={n.title} describedBy={`hint-${n.key}`} checked={prefs.notify[n.key]} onChange={(on) => setNotify(n.key, on)} />
            </div>
          ))}
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
          <button type="button" className={styles.row} onClick={() => setCredits(true)}>
            <span className={styles.rowIcon}>
              <Icon name="book" size={18} />
            </span>
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>Terms & licences</span>
              <span className={styles.rowSub}>Photo credits</span>
            </span>
            <Icon name="chevron" size={18} className={styles.rowChevron} />
          </button>
          <button type="button" className={styles.row} onClick={() => setHelp(true)}>
            <span className={styles.rowIcon}>
              <Icon name="help" size={18} />
            </span>
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>Send feedback</span>
            </span>
            <Icon name="chevron" size={18} className={styles.rowChevron} />
          </button>
        </nav>
        <p className={styles.footerNote}>IntentAI · beta</p>
      </div>
      {editing && <FieldEditor field={editing} profile={profile} onClose={() => setEditing(null)} />}
      {credits && <CreditsSheet onClose={() => setCredits(false)} />}
      {help && <HelpDialog onClose={() => setHelp(false)} />}
    </AppShell>
  );
}
