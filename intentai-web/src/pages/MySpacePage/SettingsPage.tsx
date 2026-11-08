// Settings, Redesign v2 (boards 16–17): the profile row; Explore (the Tourism 2040 ranking, the hunt region and
// together/solo, each edited in a sheet with Save/Cancel, plan A8); Language & place (language, home base); Look &
// feel (Motion and Text size on their own pages, captions, haptics); More (onboarding, privacy, terms,
// photo credits, feedback); and the user-test restart.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../../components/AppShell/AppShell';
import { openHelp } from '../../components/HelpCenter/helpStore';
import HuntModeEditor from '../../components/ProfileEditors/HuntModeEditor';
import TourismRanker from '../../components/ProfileEditors/TourismRanker';
import { REGION_NAMES } from '../../components/RegionMap/regionPaths.generated';
import { RESTART_PATH, USER_GATE_ENABLED } from '../../components/UserGate/UserGate';
import { usePersistentStore } from '../../data/persistentStore';
import { areaById } from '../../data/profile/finds';
import {
  TEXT_SIZE_LABELS,
  holderInitial,
  languageOf,
  mySpacePrefsStore,
  profileV3Store,
  tourismRankingOf,
  updateProfile,
  type FieldKey,
} from '../../data/profile/profile';
import { formatBytes, totalBytes } from '../../data/profile/storage';
import { reduceMotionStore, restartTest, testerStore, versionOf } from '../../data/stores';
import { TOURISM_INFO, type TourismCategory } from '../../data/tourism';
import { huntModeStore, type HuntModeState } from '../../data/v2Stores';
import { showToast } from '../../hooks/useToast';
import { paths } from '../../routes';
import Icon from '../OnboardingPage/v3/icons';
import { Row, RowIcon, Section } from './SettingsParts';
import FieldEditor from './v3/FieldEditor';
import { Kraft, SubHeader, Switch } from './v3/Parts';
import Sheet from './v3/Sheet';
import book from './v3/Booklet.module.css';
import styles from './v3/MySpace.module.css';

/** Up to two letters for the avatar: the first letters of the first two words, or the first two of one word. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return holderInitial(name);
  if (words.length === 1) return Array.from(words[0]).slice(0, 2).join('').toUpperCase();
  return words
    .slice(0, 2)
    .map((w) => Array.from(w)[0])
    .join('')
    .toUpperCase();
}

function Footer({ onCancel, onSave, canSave = true }: { onCancel: () => void; onSave: () => void; canSave?: boolean }) {
  return (
    <>
      <button type="button" className={styles.cancel} onClick={onCancel}>
        Cancel
      </button>
      <button type="button" className={styles.save} onClick={onSave} disabled={!canSave}>
        Save
      </button>
    </>
  );
}

/** Settings › Categories: the same ranker as onboarding; nothing is written until Save. */
export function CategoriesSheet({ onClose }: { onClose: () => void }) {
  const [draft, setDraft] = useState<TourismCategory[]>(() => tourismRankingOf(profileV3Store.get()));
  return (
    <Sheet
      title="Categories"
      subtitle="What Home shows first"
      icon={<Icon name="grid" size={20} />}
      onClose={onClose}
      footer={
        <Footer
          onCancel={onClose}
          onSave={() => {
            updateProfile({ tourismRanking: draft });
            showToast('Categories saved');
            onClose();
          }}
        />
      }
    >
      <TourismRanker value={draft} onChange={setDraft} />
    </Sheet>
  );
}

/** Settings › Hunt region: together/solo and the region, saved together on Save. */
export function HuntSheet({ onClose }: { onClose: () => void }) {
  const [draft, setDraft] = useState<HuntModeState>(() => huntModeStore.get());
  return (
    <Sheet
      title="Hunt region"
      subtitle="Where Hunt and Home look first"
      icon={<Icon name="plane" size={20} />}
      onClose={onClose}
      footer={
        <Footer
          onCancel={onClose}
          onSave={() => {
            huntModeStore.set(draft);
            showToast('Hunt region saved');
            onClose();
          }}
        />
      }
    >
      <HuntModeEditor
        mode={draft.mode}
        region={draft.region}
        onMode={(mode) => setDraft((d) => ({ ...d, mode }))}
        onRegion={(region) => setDraft((d) => ({ ...d, region }))}
      />
    </Sheet>
  );
}

type Open = FieldKey | 'categories' | 'hunt' | null;

export default function SettingsPage() {
  const [prefs, setPrefs] = usePersistentStore(mySpacePrefsStore);
  const [reduceMotion] = usePersistentStore(reduceMotionStore);
  const [profile] = usePersistentStore(profileV3Store);
  const [hunt, setHunt] = usePersistentStore(huntModeStore);
  const [tester] = usePersistentStore(testerStore);
  const [open, setOpen] = useState<Open>(null);
  const language = languageOf(profile.language);
  const base = areaById(profile.base);
  const ranking = tourismRankingOf(profile);
  const together = hunt.mode === 'together';
  const name = tester.name.trim();
  const modeLine = together ? 'hunting together' : 'exploring on your own';
  const close = () => setOpen(null);

  return (
    <AppShell background="var(--bg-app)" chrome="status">
      <Kraft />
      <div className={`${styles.screen} ${book.screen} ${styles.kraft}`}>
        <SubHeader title="Settings" />

        <section className={styles.profile} aria-label="Profile">
          <span className={styles.avatar} aria-hidden="true">
            {name ? initialsOf(name) : <Icon name="user" size={22} />}
          </span>
          <span className={styles.rowText}>
            <span className={styles.profileName}>{name || 'Your passport'}</span>
            <span className={styles.mono}>{name ? `${name} · ${modeLine}` : modeLine}</span>
          </span>
          <Link to={paths.mySpace} className={styles.edit} aria-label="Edit profile on Passport">
            Edit
          </Link>
        </section>

        <Section title="Explore">
          <div className={styles.card}>
            <button type="button" className={styles.catRow} onClick={() => setOpen('categories')} aria-label={`Categories, ${ranking.length} of 4${ranking.length ? `: ${ranking.map((c) => TOURISM_INFO[c].label).join(', ')}` : ''}`}>
              <span className={styles.catHead}>
                <RowIcon icon="grid" tint="lei" />
                <span className={`${styles.rowTitle} ${styles.rowText}`}>Categories</span>
                <span className={styles.catCount}>{ranking.length} of 4</span>
              </span>
              <span className={styles.chips} aria-hidden="true">
                {ranking.length ? (
                  ranking.map((c) => (
                    <span
                      key={c}
                      className={styles.chip}
                      style={{ '--chip-tint': TOURISM_INFO[c].tint, '--chip-ink': TOURISM_INFO[c].ink, '--chip-dot': TOURISM_INFO[c].fill } as React.CSSProperties}
                    >
                      <span className={styles.chipDot} />
                      {TOURISM_INFO[c].label}
                    </span>
                  ))
                ) : (
                  <span className={styles.chipNone}>None picked: Home shows all four</span>
                )}
              </span>
            </button>
            <Row icon="plane" tint="cru" title="Hunt region" value={hunt.region ? REGION_NAMES[hunt.region] : 'Not set'} onClick={() => setOpen('hunt')} />
            <Row
              icon="people"
              tint="wel"
              title="Public hunts"
              sub="Shows leaderboards. Nothing about you is shared."
              subId="hint-public"
              end={<Switch label="Public hunts" describedBy="hint-public" checked={together} onChange={(on) => setHunt((h) => ({ ...h, mode: on ? 'together' : 'solo' }))} />}
            />
          </div>
        </Section>

        <Section title="Language & place">
          <div className={styles.card}>
            <Row
              icon="globe"
              tint="cru"
              title="Language"
              sub={language && language.id !== 'en' ? 'Cards in English for now' : undefined}
              value={language?.name ?? 'English'}
              lang={language?.lang}
              onClick={() => setOpen('language')}
            />
            <Row icon="pin" tint="att" title="Home base" value={base ? base.name.split(/\s*[&,]\s*/)[0] : 'Not set'} onClick={() => setOpen('base')} />
          </div>
        </Section>

        <Section title="Look & feel">
          <div className={styles.card}>
            <Row icon="motion" tint="lei" title="Motion" value={reduceMotion ? 'Reduced' : 'Full'} to={paths.mySpaceMotion} />
            <Row icon="text" tint="att" title="Text size" value={TEXT_SIZE_LABELS[prefs.textSize]} to={paths.mySpaceTextSize} />
            <Row
              icon="captions"
              tint="wel"
              title="Captions on videos"
              sub={prefs.captions ? 'Shown by default' : 'Off by default'}
              subId="hint-captions"
              end={<Switch label="Captions on videos" describedBy="hint-captions" checked={prefs.captions} onChange={(captions) => setPrefs((p) => ({ ...p, captions }))} />}
            />
            <Row
              icon="vibrate"
              tint="purple"
              title="Haptics"
              sub="Light taps on stamps, where the phone supports it"
              subId="hint-haptics"
              end={<Switch label="Haptics" describedBy="hint-haptics" checked={prefs.haptics} onChange={(haptics) => setPrefs((p) => ({ ...p, haptics }))} />}
            />
          </div>
        </Section>

        <Section title="More">
          <nav className={styles.card} aria-label="More">
            <Row icon="redo" tint="att" title="Redo onboarding" to={`${paths.welcome}?step=1`} />
            <Row icon="lock" tint="wel" title="Privacy & data" value={formatBytes(totalBytes())} to={paths.mySpacePrivacy} />
            <Row icon="book" tint="cru" title="Terms & licences" to={paths.licences} />
            <Row icon="gallery" tint="lei" title="Photo credits" to={paths.credits} />
            <Row icon="feedback" tint="accent" title="Send feedback" onClick={() => openHelp('feedback')} />
          </nav>
        </Section>
        {USER_GATE_ENABLED && <RestartTest />}
        <p className={styles.footerNote}>FindSG · Tourism 2040 categories</p>
      </div>
      {open === 'categories' && <CategoriesSheet onClose={close} />}
      {open === 'hunt' && <HuntSheet onClose={close} />}
      {open && open !== 'categories' && open !== 'hunt' && <FieldEditor field={open} profile={profile} onClose={close} />}
    </AppShell>
  );
}

/** User test only: wipe this phone and go back to the start screen for the next person. Asks once before it clears. */
function RestartTest() {
  const [tester] = usePersistentStore(testerStore);
  const [sure, setSure] = useState(false);
  return (
    <Section title="User test">
      <div className={styles.card}>
        {sure ? (
          <div className={styles.switchRow}>
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>Clear this phone?</span>
              <span className={styles.rowSub}>Visits, stamps and settings go. The next person starts fresh.</span>
            </span>
            <button type="button" className={styles.restartNo} onClick={() => setSure(false)}>
              Keep
            </button>
            <button
              type="button"
              className={styles.restartYes}
              onClick={() => {
                const version = versionOf(testerStore.get());
                void restartTest(version).then((done) => {
                  if (!done) window.location.assign(`${RESTART_PATH}?v=${version}`);
                });
              }}
            >
              Restart
            </button>
          </div>
        ) : (
          <button type="button" className={styles.row} onClick={() => setSure(true)}>
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>Restart test</span>
              {tester.name && <span className={styles.mono}>{`${tester.name} · version ${versionOf(tester)} · redesign v2`}</span>}
            </span>
            <span className={styles.pillBtn} aria-hidden="true">
              Restart
            </span>
          </button>
        )}
      </div>
    </Section>
  );
}
