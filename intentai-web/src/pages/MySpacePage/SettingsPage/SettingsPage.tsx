import { useId, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import Toggle from '../../../components/Toggle/Toggle';
import { categoryLabel } from '../../../data/culture';
import { canonicalPrefs } from '../../../data/culturePrefs';
import type { Onboarding } from '../../../data/domain';
import { usePersistentStore } from '../../../data/persistentStore';
import { TEXT_SCALE, TEXT_SIZE_LABELS, type Preferences } from '../../../data/preferences';
import { formatBytes, useStorageReport } from '../../../data/storage';
import { culturePrefsStore, onboardingStore, preferencesStore, settingsStore } from '../../../data/stores';
import { showToast } from '../../../hooks/useToast';
import { paths } from '../../../routes';
import { langLabel } from '../../Onboarding/options';
import { step as baseStep } from '../../Onboarding/steps/Base';
import { step as languageStep } from '../../Onboarding/steps/Language';
import LinkList from '../LinkList/LinkList';
import { FEEDBACK_TOAST } from '../MySpacePage';
import MySpaceLayout from '../MySpaceLayout/MySpaceLayout';
import { ChevronRight, Help, Shield } from '../icons';
import styles from './SettingsPage.module.css';

export const NEEDS_OCCASIONS = 'Turn on Flag occasions in My Space first';
export const NEEDS_LOCAL = 'Turn on Answer as a local in My Space first';
export const TEXT_PREVIEW = 'Bak kwa is sweet, smoky dried pork, grilled over charcoal.';

type NotifyKey = keyof Preferences['notify'];
const NOTIFY: { key: NotifyKey; label: string; sub: string }[] = [
  { key: 'answers', label: 'Local answers', sub: 'When a local answers your question' },
  { key: 'recap', label: 'Recap reminders', sub: 'A 1-minute recap of your cards' },
  { key: 'occasions', label: 'Occasions', sub: 'Needs Flag occasions in My Space' },
  { key: 'near', label: 'Questions near you', sub: 'Only while Answer as a local is on' },
];

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly (readonly [T, string])[];
  value: T;
  onChange: (v: T) => void;
}) {
  const index = options.findIndex(([v]) => v === value);
  return (
    <div role="radiogroup" aria-label={label} className={styles.segmented}>
      <span className={styles.thumb} style={{ transform: `translateX(${index * 100}%)` }} aria-hidden="true" />
      {options.map(([v, text], i) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={v === value}
          tabIndex={v === value ? 0 : -1}
          className={styles.segment}
          onClick={() => onChange(v)}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
            e.preventDefault();
            const next = options[(i + (e.key === 'ArrowRight' ? 1 : options.length - 1)) % options.length][0];
            onChange(next);
            (e.currentTarget.parentElement?.querySelectorAll('button')[options.findIndex(([o]) => o === next)] as HTMLElement | undefined)?.focus();
          }}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

function Row({ label, sub, children, below }: { label: string; sub?: string; children?: ReactNode; below?: ReactNode }) {
  return (
    <div className={styles.row}>
      <div className={styles.rowMain}>
        <span className={styles.rowText}>
          <span className={styles.rowLabel}>{label}</span>
          {sub && <span className={styles.rowSub}>{sub}</span>}
        </span>
        {children}
      </div>
      {below}
    </div>
  );
}

function ExpandRow({ label, value, open, onToggle, children }: { label: string; value: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div className={styles.row}>
      <button type="button" className={styles.expand} aria-expanded={open} onClick={onToggle}>
        <span className={styles.rowText}>
          <span className={styles.rowLabel}>{label}</span>
          <span className={styles.rowSub}>{value}</span>
        </span>
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} aria-hidden="true">
          <ChevronRight />
        </span>
      </button>
      {open && <div className={styles.panel}>{children}</div>}
    </div>
  );
}

/** Canvas S2: notifications, language and home base, look and feel, more. */
export default function SettingsPage() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = usePersistentStore(preferencesStore);
  const [settings] = usePersistentStore(settingsStore);
  const [onboarding, setOnboarding] = usePersistentStore(onboardingStore);
  const [culture] = usePersistentStore(culturePrefsStore);
  const { bytes } = useStorageReport();
  const [open, setOpen] = useState<'lang' | 'base' | null>(null);
  const radiusId = useId();
  const sizeId = useId();

  const set = (patch: Partial<Preferences>) => setPrefs((p) => ({ ...p, ...patch }));
  const blocked: Partial<Record<NotifyKey, string>> = {
    ...(settings.occasions ? {} : { occasions: NEEDS_OCCASIONS }),
    ...(settings.local ? {} : { near: NEEDS_LOCAL }),
  };

  // Language and home base are the onboarding answers: edited here with the same controls, saved at once.
  const updateOnboarding = (patch: Partial<Onboarding>) => {
    setOnboarding((o) => ({ ...o, ...patch }));
    if (patch.language) showToast(`Cards will use ${langLabel(patch.language)}`);
    if (patch.base) showToast(`Nearby now starts from ${patch.base.label.replace(/^Near /, 'near ')}`);
  };
  const stepProps = { data: onboarding, update: updateOnboarding, toast: (m: string) => showToast(m), next: () => {}, embedded: true };
  const LanguageBody = languageStep.Body;
  const BaseBody = baseStep.Body;
  const topics = canonicalPrefs(culture.categories).categories.map(categoryLabel).join(', ');

  return (
    <MySpaceLayout subPage={{ title: 'Settings' }}>
      <div className={styles.body}>
        <h2 className={styles.heading}>Notifications</h2>
        <div className={styles.card}>
          {NOTIFY.map(({ key, label, sub }) => (
            <Row
              key={key}
              label={label}
              sub={sub}
              below={
                key === 'recap' && prefs.notify.recap ? (
                  <div className={styles.indent}>
                    <Segmented
                      label="Recap reminder time"
                      options={[
                        ['morning', 'Morning'],
                        ['evening', 'Evening'],
                      ]}
                      value={prefs.recapTime}
                      onChange={(recapTime) => set({ recapTime })}
                    />
                  </div>
                ) : undefined
              }
            >
              <Toggle
                label={label}
                checked={prefs.notify[key]}
                disabled={key in blocked}
                onBlocked={() => showToast(blocked[key]!)}
                onChange={(on) => {
                  setPrefs((p) => ({ ...p, notify: { ...p.notify, [key]: on } }));
                  showToast(`${label} ${on ? 'on' : 'off'}`);
                }}
              />
            </Row>
          ))}
        </div>

        <h2 className={styles.heading}>Language &amp; place</h2>
        {/* Answers are personal: taps in here are never named in usage timings. */}
        <div className={styles.card} data-no-track>
          <ExpandRow
            label="Language"
            value={onboarding.language ? langLabel(onboarding.language) : 'Not set'}
            open={open === 'lang'}
            onToggle={() => setOpen((o) => (o === 'lang' ? null : 'lang'))}
          >
            <LanguageBody {...stepProps} />
          </ExpandRow>
          <ExpandRow
            label="Home base"
            value={onboarding.base?.label ?? 'Not set'}
            open={open === 'base'}
            onToggle={() => setOpen((o) => (o === 'base' ? null : 'base'))}
          >
            <BaseBody {...stepProps} />
          </ExpandRow>
          <div className={styles.row}>
            <div className={styles.rowMain}>
              <label htmlFor={radiusId} className={styles.rowLabel}>
                Nearby radius
              </label>
              <span className={styles.value}>{prefs.radiusKm} km</span>
            </div>
            <input
              id={radiusId}
              type="range"
              min={1}
              max={10}
              step={1}
              value={prefs.radiusKm}
              aria-valuetext={`${prefs.radiusKm} kilometres`}
              className={styles.range}
              onChange={(e) => set({ radiusKm: Number(e.target.value) })}
            />
          </div>
        </div>

        <h2 className={styles.heading}>Look &amp; feel</h2>
        <div className={styles.card}>
          <Row
            label="Motion"
            below={
              <div className={styles.indent}>
                <Segmented
                  label="Motion"
                  options={[
                    ['full', 'Full'],
                    ['reduced', 'Reduced'],
                  ]}
                  value={prefs.motion}
                  onChange={(motion) => set({ motion })}
                />
              </div>
            }
          />
          <div className={styles.row}>
            <div className={styles.rowMain}>
              <label htmlFor={sizeId} className={styles.rowLabel}>
                Text size
              </label>
              <span className={styles.value}>{TEXT_SIZE_LABELS[prefs.textSize]}</span>
            </div>
            <input
              id={sizeId}
              type="range"
              min={0}
              max={4}
              step={1}
              value={prefs.textSize}
              aria-valuetext={TEXT_SIZE_LABELS[prefs.textSize]}
              className={styles.range}
              onChange={(e) => set({ textSize: Number(e.target.value) as Preferences['textSize'] })}
            />
            <p className={styles.preview} style={{ fontSize: `${0.875 * TEXT_SCALE[prefs.textSize]}rem` }}>
              {TEXT_PREVIEW}
            </p>
          </div>
          <Row label="Captions on videos" sub="Shown by default">
            <Toggle label="Captions on videos" checked={prefs.captions} onChange={(captions) => set({ captions })} />
          </Row>
          <Row label="Haptics" sub="Light taps on stamps and swipes">
            <Toggle label="Haptics" checked={prefs.haptics} onChange={(haptics) => set({ haptics })} />
          </Row>
        </div>

        <h2 className={styles.heading}>More</h2>
        <LinkList
          rows={[
            {
              label: 'Privacy & data',
              value: formatBytes(bytes.total),
              icon: <Shield />,
              tone: ['#e6f4ea', '#1e6b34'],
              onSelect: () => navigate(paths.mySpacePrivacy),
            },
            {
              label: 'Today’s topics',
              value: topics,
              icon: <span>1</span>,
              tone: ['#fff3ea', '#a3410b'],
              onSelect: () => navigate(`${paths.todaySetup}?from=my-space`),
            },
            { label: 'Terms & licences', icon: <span>©</span>, tone: ['#f6f5f2', '#23211d'], onSelect: () => navigate(paths.licences) },
            { label: 'Send feedback', icon: <Help />, tone: ['#dce7ff', '#1e3a8a'], onSelect: () => showToast(FEEDBACK_TOAST) },
          ]}
        />
      </div>
    </MySpaceLayout>
  );
}
